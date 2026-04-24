import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import reservationService from '../../services/reservationService';
import parkingService from '../../services/parkingService';

const ReservationPage = () => {
  const { spotId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [spot, setSpot] = useState(null);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('details'); // details, payment, confirm

  const fetchSpotDetails = useCallback(async () => {
    try {
      let spotData;
      if (location.state?.spot) {
        spotData = location.state.spot;
        if (location.state.duration) {
          setDuration(location.state.duration);
        }
      } else {
        const response = await parkingService.getSpotById(spotId);
        spotData = response.data;
      }
      setSpot(spotData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching spot:', error);
      alert('Failed to load parking spot details');
      navigate('/parking');
    }
  }, [location.state, navigate, spotId]);

  useEffect(() => {
    fetchSpotDetails();
  }, [fetchSpotDetails]);

  const calculateTotal = () => {
    const hours = Math.ceil(duration / 60);
    return hours * (spot?.price || 0);
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      const scheduledArrival = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const response = await reservationService.createReservation(spotId, duration, scheduledArrival);
      setBooking(response.data);
      setStep('payment');
    } catch (error) {
      console.error('Booking error:', error);
      alert(error.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentMethod) => {
    // Simulate payment processing
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('confirm');
      setTimeout(() => {
        navigate(`/ticket/${booking?.reservation._id}`, {
          state: { reservation: booking?.reservation, spot }
        });
      }, 2000);
    }, 1500);
  };

  if (loading && !spot) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Parking spot not found</p>
          <button
            onClick={() => navigate('/parking')}
            className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Back to Parking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className={`flex-1 text-center ${step === 'details' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'details' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="text-sm">Select Details</span>
          </div>
          <div className={`flex-1 text-center ${step === 'payment' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'payment' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="text-sm">Payment</span>
          </div>
          <div className={`flex-1 text-center ${step === 'confirm' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'confirm' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
              3
            </div>
            <span className="text-sm">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Step 1: Booking Details */}
      {step === 'details' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Book Parking Spot</h2>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{spot.locationName}</h3>
            <p className="text-gray-600">Spot #{spot.spotNumber}</p>
            <p className="text-gray-600 mt-1">{spot.location?.address || 'Kathmandu'}</p>
            <div className="mt-2 flex items-center">
              <span className="text-2xl font-bold text-blue-600">NPR {spot.price}</span>
              <span className="text-gray-500 ml-1">/hour</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span>Price per hour:</span>
              <span>NPR {spot.price}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Duration:</span>
              <span>{Math.ceil(duration / 60)} hour(s)</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600 text-xl">NPR {calculateTotal()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/parking')}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBooking}
              disabled={loading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 'payment' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Select Payment Method</h2>
          <p className="text-gray-600 mb-6">Amount to pay: NPR {calculateTotal()}</p>
          
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handlePayment('esewa')}
              className="w-full bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 transition flex items-center justify-between"
            >
              <span>Pay with eSewa</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
            <button
              onClick={() => handlePayment('khalti')}
              className="w-full bg-purple-500 text-white px-4 py-3 rounded hover:bg-purple-600 transition flex items-center justify-between"
            >
              <span>Pay with Khalti</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
            <button
              onClick={() => handlePayment('cash')}
              className="w-full bg-gray-500 text-white px-4 py-3 rounded hover:bg-gray-600 transition flex items-center justify-between"
            >
              <span>Pay on Spot</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => setStep('details')}
            className="w-full text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirm' && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-4">
            Your parking spot has been successfully reserved.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-mono font-bold">{booking?.reservation._id}</p>
            <p className="text-sm text-gray-500 mt-2">QR Code for Check-in</p>
            {booking?.reservation.qrCodeData && (
              <div className="mt-2 flex justify-center">
                <img 
                  src={booking.reservation.qrCodeData} 
                  alt="QR Code"
                  className="w-32 h-32"
                />
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigate(`/ticket/${booking?.reservation._id}`, { 
              state: { reservation: booking?.reservation, spot }
            })}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            View Ticket
          </button>
        </div>
      )}
    </div>
  );
};

export default ReservationPage;