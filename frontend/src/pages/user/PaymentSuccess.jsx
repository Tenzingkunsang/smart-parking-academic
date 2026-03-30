import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    // Simulate payment verification
    const timer = setTimeout(() => {
      const pidx = searchParams.get('pidx');
      const transactionId = searchParams.get('transaction_id');
      
      setPaymentData({
        pidx: pidx || 'test_' + Date.now(),
        transaction_id: transactionId || 'TXN_' + Date.now(),
        total_amount: 5000, // This would come from the actual payment
        status: 'Completed'
      });
      setVerifying(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [searchParams]);

  if (verifying) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="spinner"></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="payment-success-card">
        <div className="icon success">✓</div>
        <h2>Payment Successful!</h2>
        <p>Your parking spot has been reserved successfully</p>
        <div className="payment-details">
          <div className="detail-row">
            <span>Transaction ID:</span>
            <span>{paymentData?.transaction_id || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span>Amount Paid:</span>
            <span>NPR {paymentData?.total_amount ? paymentData.total_amount / 100 : 0}</span>
          </div>
        </div>
        <button onClick={() => navigate('/reservations')} className="btn-primary">
          View My Bookings
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
