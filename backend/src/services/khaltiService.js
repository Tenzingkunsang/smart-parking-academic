/**
 * services/khaltiService.js
 *
 * Production-grade Khalti payment service.
 * - Lazy key loading (safe with dotenv)
 * - Axios timeout on every request
 * - Consistent { success, data, message } response shape
 * - Full refund support
 * - Structured logging (no emoji in production)
 */

const axios = require('axios');

const TIMEOUT_MS = 15_000; // 15 seconds — never let a payment request hang

const ENDPOINTS = {
  live: 'https://khalti.com/api/v2',
  test: 'https://dev.khalti.com/api/v2',
};

class KhaltiService {
  constructor() {
    // Lazy: we read env at call time, not at require() time.
    // This is safe even if dotenv.config() hasn't run yet when this file is first loaded.
    this._client = null;
  }

  /** @returns {string} */
  get mode() {
    return (process.env.KHALTI_MODE || 'test').toLowerCase();
  }

  /** @returns {string} */
  get secretKey() {
    const key = (process.env.KHALTI_SECRET_KEY || '').trim();
    if (!key) {
      throw new Error('KHALTI_SECRET_KEY is not set in environment variables.');
    }
    return key;
  }

  /** @returns {string} */
  get baseURL() {
    return ENDPOINTS[this.mode] || ENDPOINTS.test;
  }

  /**
   * Returns a fresh axios instance.
   * Called per-request so key/mode changes in env are always picked up.
   * @returns {import('axios').AxiosInstance}
   */
  _getClient() {
    return axios.create({
      baseURL: this.baseURL,
      timeout: TIMEOUT_MS,
      headers: {
        Authorization: `Key ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Safely extract a readable error message from an Axios error.
   * @param {Error} error
   * @returns {string}
   */
  _parseError(error) {
    const data = error.response?.data;
    if (!data) return error.message || 'Unknown error';
    if (typeof data === 'string') return data;
    return data.detail || data.error || data.message || JSON.stringify(data);
  }

  /**
   * Initiate a Khalti payment.
   *
   * @param {{
   *   return_url: string,
   *   website_url: string,
   *   amount: number,        // in paisa (NPR * 100)
   *   purchase_order_id: string,
   *   purchase_order_name: string,
   *   customer_info?: object
   * }} payload
   * @returns {Promise<{ success: boolean, data?: { payment_url: string, pidx: string }, message?: string }>}
   */
  async initiatePayment(payload) {
    try {
      if (!payload.amount || payload.amount <= 0) {
        return { success: false, message: 'Invalid payment amount.' };
      }

      const response = await this._getClient().post('/epayment/initiate/', payload);

      console.log(`[Khalti] Payment initiated | order: ${payload.purchase_order_id} | mode: ${this.mode}`);

      return {
        success: true,
        data: {
          payment_url: response.data.payment_url,
          pidx: response.data.pidx,
        },
      };
    } catch (error) {
      const message = this._parseError(error);
      console.error(`[Khalti] initiatePayment failed | order: ${payload.purchase_order_id} | ${message}`);
      return { success: false, message };
    }
  }

  /**
   * Verify / look up a Khalti payment by pidx.
   *
   * @param {string} pidx
   * @returns {Promise<{
   *   success: boolean,
   *   data?: {
   *     status: string,
   *     transactionId: string,
   *     totalAmountNPR: number,  // already converted from paisa
   *     pidx: string
   *   },
   *   message?: string
   * }>}
   */
  async verifyPayment(pidx) {
    try {
      if (!pidx) return { success: false, message: 'pidx is required for verification.' };

      const response = await this._getClient().post('/epayment/lookup/', { pidx });
      const d = response.data;

      if (d.status !== 'Completed') {
        console.warn(`[Khalti] Payment not completed | pidx: ${pidx} | status: ${d.status}`);
        return {
          success: false,
          message: `Payment status is "${d.status}". Expected "Completed".`,
        };
      }

      console.log(`[Khalti] Payment verified | pidx: ${pidx} | txn: ${d.transaction_id}`);

      return {
        success: true,
        data: {
          status: d.status,
          transactionId: d.transaction_id,
          totalAmountNPR: Math.round(d.total_amount / 100), // paisa → NPR
          pidx,
        },
      };
    } catch (error) {
      const message = this._parseError(error);
      console.error(`[Khalti] verifyPayment failed | pidx: ${pidx} | ${message}`);
      return { success: false, message };
    }
  }

  /**
   * Refund a Khalti payment (partial or full).
   *
   * Khalti refund API requires the original transaction_id and amount in paisa.
   *
   * @param {string} transactionId   - from verifyPayment response
   * @param {number} amountNPR       - amount to refund in NPR (we convert to paisa)
   * @returns {Promise<{ success: boolean, data?: { refundId: string }, message?: string }>}
   */
  async refundPayment(transactionId, amountNPR) {
    try {
      if (!transactionId) return { success: false, message: 'transactionId is required for refund.' };
      if (!amountNPR || amountNPR <= 0) return { success: false, message: 'Invalid refund amount.' };

      const amountPaisa = Math.round(amountNPR * 100);

      const response = await this._getClient().post('/payment/refund/', {
        transaction_id: transactionId,
        amount: amountPaisa,
      });

      console.log(`[Khalti] Refund initiated | txn: ${transactionId} | amount: NPR ${amountNPR}`);

      return {
        success: true,
        data: {
          refundId: response.data?.idx || response.data?.transaction_id || 'N/A',
        },
      };
    } catch (error) {
      const message = this._parseError(error);
      console.error(`[Khalti] refundPayment failed | txn: ${transactionId} | ${message}`);
      return { success: false, message };
    }
  }
}

// Export a single shared instance.
// Because all env reads are lazy (inside methods), the singleton is safe
// even if this file is required before dotenv.config() runs.
module.exports = new KhaltiService();