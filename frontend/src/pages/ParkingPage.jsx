import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const PaymentPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  const booking = location.state?.booking;
  const totalAmount = booking?.totalAmount || 0;

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    
    setLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      navigate(`/ticket/${bookingId}`, {
        state: { booking, paymentMethod }
      });
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Booking ID</p>
          <p className="font-mono font-bold">{bookingId}</p>
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-600">NPR {totalAmount}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Payment Method
          </label>
          
          <div className="space-y-3">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment"
                value="esewa"
                checked={paymentMethod === 'esewa'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-semibold">eSewa</p>
                <p className="text-sm text-gray-500">Pay with eSewa wallet</p>
              </div>
              <img src="/esewa-logo.png" alt="eSewa" className="w-12" />
            </label>
            
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment"
                value="khalti"
                checked={paymentMethod === 'khalti'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-semibold">Khalti</p>
                <p className="text-sm text-gray-500">Pay with Khalti wallet</p>
              </div>
              <img src="/khalti-logo.png" alt="Khalti" className="w-12" />
            </label>
            
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-semibold">Cash</p>
                <p className="text-sm text-gray-500">Pay at the parking location</p>
              </div>
            </label>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            Back
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || !paymentMethod}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Pay NPR ${totalAmount}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;