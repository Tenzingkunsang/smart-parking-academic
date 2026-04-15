const axios = require('axios');

class KhaltiService {
  constructor() {
    // Ensure keys are clean of spaces
    this.secretKey = (process.env.KHALTI_SECRET_KEY || '').trim();
    this.mode = (process.env.KHALTI_MODE || 'test').toLowerCase();
    
    // API endpoints
    if (this.mode === 'live') {
      this.baseURL = 'https://khalti.com/api/v2';
      console.log('🚀 Khalti Service: LIVE Mode Active');
    } else {
      this.baseURL = 'https://dev.khalti.com/api/v2';
      console.log('🧪 Khalti Service: TEST Mode Active');
    }
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Key ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initiatePayment(payload) {
    try {
      console.log('📡 Requesting Khalti Initiate...');
      // Khalti v2 endpoint: /epayment/initiate/
      const response = await this.axiosInstance.post('/epayment/initiate/', payload);
      
      return {
        success: true,
        payment_url: response.data.payment_url,
        pidx: response.data.pidx
      };
    } catch (error) {
      const errorData = error.response?.data;
      console.error('❌ Khalti API Error:', errorData || error.message);
      
      return {
        success: false,
        message: errorData?.detail || errorData?.error || 'Payment initiation failed'
      };
    }
  }

  async verifyPayment(pidx) {
    try {
      console.log(`🔍 Verifying pidx: ${pidx}`);
      const response = await this.axiosInstance.post('/epayment/lookup/', { pidx });
      
      return {
        success: true,
        status: response.data.status,
        transactionId: response.data.transaction_id,
        totalAmount: response.data.total_amount / 100
      };
    } catch (error) {
      console.error('❌ Verification Error:', error.response?.data || error.message);
      return { success: false, message: 'Verification failed' };
    }
  }
}

module.exports = new KhaltiService();