// Khalti Payment Integration Service
class KhaltiService {
  constructor() {
    // Khalti Configuration
    this.config = {
      // Use test mode for development (set to false for production)
      testMode: true,
      
      // Test API Keys (for development)
      testPublicKey: 'test_public_key_dc74e0fd57cb46cd93832aee0a3904fa',
      testSecretKey: 'test_secret_key_b4a7e5c8e9f4d3a2b1c0d9e8f7a6b5c4',
      
      // Live API Keys (get these after successful test)
      // You'll get these from Khalti dashboard after testing
      livePublicKey: '',  // Add your live public key here
      liveSecretKey: '',  // Add your live secret key here
      
      // Khalti API Endpoints
      apiUrl: 'https://khalti.com/api/v2/',
      paymentUrl: 'https://khalti.com/payment/',
      
      // Merchant Information
      merchantId: '9801165557',
      merchantName: 'Parking Nepal',
      merchantEmail: 'tenzingkusang24@gmail.com'
    };
  }

  // Get current public key based on mode
  getPublicKey() {
    return this.config.testMode ? this.config.testPublicKey : this.config.livePublicKey;
  }

  // Get current secret key
  getSecretKey() {
    return this.config.testMode ? this.config.testSecretKey : this.config.liveSecretKey;
  }

  // Initialize Khalti Payment
  async initiatePayment(paymentData) {
    const { amount, orderId, productName, productId, customerInfo } = paymentData;
    
    // Prepare payment payload according to Khalti API v2
    const payload = {
      return_url: `${window.location.origin}/payment-success`,
      website_url: window.location.origin,
      amount: Math.round(amount * 100), // Convert to paisa (NPR * 100)
      purchase_order_id: orderId,
      purchase_order_name: productName,
      customer_info: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      }
    };

    console.log('Initiating Khalti payment with payload:', payload);

    try {
      const response = await fetch(`${this.config.apiUrl}epayment/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.getSecretKey()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Khalti response:', data);
      
      if (data.payment_url) {
        // Open Khalti payment page in new window
        const khaltiWindow = window.open(data.payment_url, '_blank', 'width=500,height=600');
        
        // Poll for payment completion
        return this.pollPaymentStatus(data.pidx, khaltiWindow);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Khalti payment initiation error:', error);
      throw error;
    }
  }

  // Poll payment status
  async pollPaymentStatus(pidx, khaltiWindow) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const status = await this.lookupPayment(pidx);
          
          if (status.status === 'Completed') {
            clearInterval(checkInterval);
            if (khaltiWindow && !khaltiWindow.closed) {
              khaltiWindow.close();
            }
            resolve(status);
          } else if (status.status === 'Expired' || status.status === 'Cancelled') {
            clearInterval(checkInterval);
            reject(new Error(`Payment ${status.status}`));
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 2000); // Check every 2 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (khaltiWindow && !khaltiWindow.closed) {
          khaltiWindow.close();
        }
        reject(new Error('Payment timeout'));
      }, 300000);
    });
  }

  // Lookup payment status
  async lookupPayment(pidx) {
    try {
      const response = await fetch(`${this.config.apiUrl}epayment/lookup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.getSecretKey()}`
        },
        body: JSON.stringify({ pidx })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Payment lookup error:', error);
      throw error;
    }
  }

  // Direct Khalti payment (alternative method using form)
  directPayment(paymentData) {
    const { amount, orderId, productName, customerName, customerEmail, customerPhone } = paymentData;
    
    // Create form and submit to Khalti
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://khalti.com/api/v2/epayment/initiate/';
    form.target = '_blank';
    
    const fields = {
      return_url: `${window.location.origin}/payment-success`,
      website_url: window.location.origin,
      amount: amount * 100,
      purchase_order_id: orderId,
      purchase_order_name: productName,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone
    };
    
    Object.keys(fields).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = fields[key];
      form.appendChild(input);
    });
    
    // Add authorization header
    form.setAttribute('data-auth', `Key ${this.getSecretKey()}`);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  // Test Mode Payment (Simulation for testing)
  simulatePayment(amount, onSuccess, onError) {
    console.log('Simulating Khalti payment for amount:', amount);
    
    // Show Khalti-like payment modal for testing
    const modal = this.createTestPaymentModal(amount, onSuccess, onError);
    document.body.appendChild(modal);
    
    return modal;
  }

  // Create test payment modal (for testing without real API)
  createTestPaymentModal(amount, onSuccess, onError) {
    const modal = document.createElement('div');
    modal.className = 'khalti-test-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
      <div style="background: var(--gray-900); border-radius: 1rem; max-width: 400px; width: 90%; padding: 2rem; text-align: center; border: 1px solid var(--primary-green);">
        <div style="margin-bottom: 1rem;">
          <img src="https://khalti.com/static/img/logo.png" alt="Khalti" style="width: 80px; height: auto;" onerror="this.style.display='none'">
          <div style="font-size: 3rem; margin: 1rem 0;">💰</div>
        </div>
        <h3 style="color: white; margin-bottom: 0.5rem;">Khalti Test Payment</h3>
        <p style="color: var(--gray-400); margin-bottom: 1rem;">Amount: NPR ${amount}</p>
        <div style="margin: 1rem 0; padding: 1rem; background: var(--gray-800); border-radius: 0.5rem;">
          <p style="color: var(--gray-300); font-size: 0.875rem;">Test Mode - Simulated Payment</p>
          <p style="color: var(--primary-green); font-size: 0.75rem; margin-top: 0.5rem;">Use any test credentials</p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button id="khalti-test-success" style="flex: 1; padding: 0.75rem; background: var(--primary-green); color: black; border: none; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">
            Simulate Success
          </button>
          <button id="khalti-test-fail" style="flex: 1; padding: 0.75rem; background: var(--gray-800); color: white; border: 1px solid var(--gray-700); border-radius: 0.5rem; cursor: pointer;">
            Simulate Failure
          </button>
        </div>
      </div>
    `;
    
    modal.querySelector('#khalti-test-success').onclick = () => {
      modal.remove();
      onSuccess({
        pidx: 'test_' + Date.now(),
        total_amount: amount,
        status: 'Completed',
        transaction_id: 'TXN_TEST_' + Date.now()
      });
    };
    
    modal.querySelector('#khalti-test-fail').onclick = () => {
      modal.remove();
      onError({ message: 'Payment failed in test mode' });
    };
    
    return modal;
  }

  // Set to production mode (call this when going live)
  setProductionMode(publicKey, secretKey) {
    this.config.testMode = false;
    this.config.livePublicKey = publicKey;
    this.config.liveSecretKey = secretKey;
  }

  // Set to test mode
  setTestMode() {
    this.config.testMode = true;
  }
}

export default new KhaltiService();
