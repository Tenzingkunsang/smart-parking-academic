import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../../config/api';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const token = localStorage.getItem('token');
        const pidx = searchParams.get('pidx');
        const reservationId = searchParams.get('reservationId') || searchParams.get('purchase_order_id');

        if (!token) {
          setError('Please login to verify payment.');
          return;
        }

        if (!pidx || !reservationId) {
          setError('Missing payment callback data from Khalti.');
          return;
        }

        const response = await fetch(`${API_BASE}/payments/khalti/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reservationId, pidx })
        });

        const data = await response.json();
        if (!data.success) {
          setError(data.message || 'Payment verification failed.');
          return;
        }

        setPaymentData({
          transaction_id: data.data?.transactionId || 'N/A',
          total_amount: Math.round((data.data?.amount || 0) * 100),
          status: 'Completed'
        });
      } catch (err) {
        setError('Unable to verify payment. Please contact support if amount was deducted.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
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
        <div className={`icon ${error ? 'failed' : 'success'}`}>{error ? '!' : '✓'}</div>
        <h2>{error ? 'Payment Verification Failed' : 'Payment Successful!'}</h2>
        <p>
          {error
            ? error
            : 'Your parking spot has been reserved successfully'}
        </p>
        <div className="payment-details">
          <div className="detail-row">
            <span>Transaction ID:</span>
            <span>{paymentData?.transaction_id || '-'}</span>
          </div>
          <div className="detail-row">
            <span>Amount Paid:</span>
            <span>NPR {paymentData?.total_amount ? paymentData.total_amount / 100 : 0}</span>
          </div>
        </div>
        <button onClick={() => navigate(error ? '/payment' : '/reservations')} className="btn-primary">
          {error ? 'Try Again' : 'View My Bookings'}
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
