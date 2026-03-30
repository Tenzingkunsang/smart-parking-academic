import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { spot, duration, totalAmount, pendingReservationId } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/reservations/confirm/${pendingReservationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod,
          paymentStatus: 'completed'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const reservation = data.data;
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
        alert(data.message || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'khalti', name: 'Khalti', description: 'Pay with Khalti wallet' },
    { id: 'esewa', name: 'eSewa', description: 'Pay with eSewa wallet' },
    { id: 'cash', name: 'Cash', description: 'Pay at the parking location' }
  ];

  return (
    <div className="payment-container">
      <div className="payment-hero">
        <h1>Complete Payment</h1>
        <p>Secure payment for your parking reservation</p>
      </div>

      <div className="payment-content">
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

        <div className="payment-methods">
          <h3>Select Payment Method</h3>
          <div className="methods-grid">
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className={`method-card ${paymentMethod === method.id ? 'selected' : ''}`}
                onClick={() => setPaymentMethod(method.id)}
              >
                <div className="method-icon">{method.id === 'cash' ? '💵' : '💳'}</div>
                <div className="method-info">
                  <div className="method-name">{method.name}</div>
                  <div className="method-description">{method.description}</div>
                </div>
                <div className="method-radio">
                  <div className={`radio ${paymentMethod === method.id ? 'checked' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-actions">
          <button className="btn-back" onClick={() => navigate('/parking')}>
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
    </div>
  );
};

export default PaymentPage;
