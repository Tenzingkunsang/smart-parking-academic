import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { spot, duration, totalAmount } = location.state || {};
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const paymentMethods = [
    { id: 'esewa', name: 'eSewa', icon: '💳', description: 'Pay with eSewa wallet' },
    { id: 'khalti', name: 'Khalti', icon: '💳', description: 'Pay with Khalti wallet' },
    { id: 'cash', name: 'Cash', icon: '💵', description: 'Pay at the parking location' }
  ];

  const handlePayment = () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }
    
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      // Navigate to ticket page with booking details
      navigate('/ticket', { 
        state: { 
          spot, 
          duration, 
          totalAmount,
          paymentMethod: selectedMethod,
          bookingId: 'BK' + Date.now()
        } 
      });
    }, 2000);
  };

  const hours = Math.ceil(duration / 60);

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
                className={`method-card ${selectedMethod === method.id ? 'selected' : ''}`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <div className="method-icon">{method.icon}</div>
                <div className="method-info">
                  <div className="method-name">{method.name}</div>
                  <div className="method-description">{method.description}</div>
                </div>
                <div className="method-radio">
                  <div className={`radio ${selectedMethod === method.id ? 'checked' : ''}`} />
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
            disabled={processing || !selectedMethod}
          >
            {processing ? 'Processing...' : `Pay NPR ${totalAmount}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
