import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { spot, duration, totalAmount, pendingReservationId } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState('');

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);

  const handlePayment = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Step: Confirm the pending reservation after payment
      const response = await api.post(`/reservations/confirm/${pendingReservationId}`, {
        paymentMethod,
        paymentStatus: 'completed'
      });
      
      if (response.data.success) {
        const reservation = response.data.data;
        // Navigate to ticket page with confirmed reservation
        navigate('/ticket', {
          state: {
            spot,
            duration,
            totalAmount,
            paymentMethod,
            bookingId: reservation._id,
            paymentStatus: 'completed'
          }
        });
      } else {
        setError(response.data.message || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Cancel pending reservation when user goes back
    const cancelPending = async () => {
      try {
        await api.delete(`/reservations/pending/${pendingReservationId}`);
      } catch (err) {
        console.error('Error cancelling pending reservation:', err);
      }
    };
    cancelPending();
    navigate(-1);
  };

  return (
    <div className="payment-container">
      <div className="payment-hero">
        <h1>Complete Payment</h1>
        <p>Secure payment for your parking reservation</p>
      </div>

      <div className="payment-content">
        {/* Booking Summary */}
        <div className="booking-summary">
          <h3>Booking Summary</h3>
          <div className="summary-details">
            <div className="summary-row">
              <span>Location</span>
              <span className="highlight">{spot.locationName}</span>
            </div>
            <div className="summary-row">
              <span>Spot Number</span>
              <span>#{spot.spotNumber}</span>
            </div>
            <div className="summary-row">
              <span>Duration</span>
              <span>{hours} hour(s) ({duration} minutes)</span>
            </div>
            <div className="summary-row">
              <span>Rate</span>
              <span>NPR {spot.price}/hour</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount</span>
              <span className="total-price">NPR {totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods">
          <h3>Select Payment Method</h3>
          <div className="methods-grid">
            {/* Khalti Payment */}
            <div
              className={`method-card ${paymentMethod === 'khalti' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('khalti')}
            >
              <div className="method-icon">
                <span>💳</span>
              </div>
              <div className="method-info">
                <div className="method-name">Khalti Digital Wallet</div>
                <div className="method-description">Pay with Khalti wallet, eSewa, or Mobile Banking</div>
              </div>
              <div className="method-radio">
                <div className={`radio ${paymentMethod === 'khalti' ? 'checked' : ''}`} />
              </div>
            </div>

            {/* eSewa Payment */}
            <div
              className={`method-card ${paymentMethod === 'esewa' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('esewa')}
            >
              <div className="method-icon">💳</div>
              <div className="method-info">
                <div className="method-name">eSewa</div>
                <div className="method-description">Pay with eSewa wallet</div>
              </div>
              <div className="method-radio">
                <div className={`radio ${paymentMethod === 'esewa' ? 'checked' : ''}`} />
              </div>
            </div>

            {/* Cash Payment */}
            <div
              className={`method-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <div className="method-icon">💵</div>
              <div className="method-info">
                <div className="method-name">Cash</div>
                <div className="method-description">Pay at the parking location</div>
              </div>
              <div className="method-radio">
                <div className={`radio ${paymentMethod === 'cash' ? 'checked' : ''}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <button className="btn-back" onClick={handleBack} disabled={loading}>
            Back
          </button>
          <button 
            className="btn-pay" 
            onClick={handlePayment}
            disabled={loading || !paymentMethod}
          >
            {loading ? 'Processing...' : `Pay NPR ${totalAmount}`}
          </button>
        </div>
      </div>

      <style>{`
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          margin: 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #ef4444;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default PaymentPage;
