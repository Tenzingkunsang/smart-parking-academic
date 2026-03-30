import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import './TicketPage.css';

const TicketPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { spot, duration, totalAmount, paymentMethod, bookingId } = location.state || {};
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    if (spot && bookingId) {
      // Create QR code data with booking information
      const qrData = JSON.stringify({
        bookingId: bookingId,
        spotNumber: spot.spotNumber,
        location: spot.locationName,
        address: spot.location.address || 'Kathmandu',
        checkInTime: new Date().toISOString(),
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        vehicleType: spot.vehicleType,
        price: spot.price,
        duration: duration
      });
      setQrValue(qrData);
      console.log('QR Code generated for booking:', bookingId);
    }
  }, [spot, bookingId, duration]);

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);
  const checkInTime = new Date();
  const checkInDeadline = new Date(checkInTime.getTime() + 15 * 60 * 1000);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ticket-container">
      <div className="ticket">
        <div className="ticket-header">
          <h1>SmartPark</h1>
          <p>Parking Reservation Ticket</p>
          <div className="ticket-id">ID: {bookingId || 'SP' + Date.now()}</div>
        </div>

        <div className="ticket-body">
          <div className="ticket-section">
            <h3>Parking Details</h3>
            <div className="info-row">
              <span className="label">Location</span>
              <span className="value">{spot.locationName}</span>
            </div>
            <div className="info-row">
              <span className="label">Address</span>
              <span className="value">{spot.location.address || 'Kathmandu'}</span>
            </div>
            <div className="info-row">
              <span className="label">Spot Number</span>
              <span className="value highlight">#{spot.spotNumber}</span>
            </div>
            <div className="info-row">
              <span className="label">Vehicle Type</span>
              <span className="value capitalize">{spot.vehicleType}</span>
            </div>
          </div>

          <div className="ticket-section">
            <h3>Reservation Details</h3>
            <div className="info-row">
              <span className="label">Duration</span>
              <span className="value">{hours} hour(s) ({duration} minutes)</span>
            </div>
            <div className="info-row">
              <span className="label">Check-in Time</span>
              <span className="value">{checkInTime.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="label">Check-in Deadline</span>
              <span className="value deadline">{checkInDeadline.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="ticket-section">
            <h3>Payment Details</h3>
            <div className="info-row">
              <span className="label">Rate</span>
              <span className="value">NPR {spot.price}/hour</span>
            </div>
            <div className="info-row">
              <span className="label">Total Amount</span>
              <span className="value total">NPR {totalAmount}</span>
            </div>
            <div className="info-row">
              <span className="label">Payment Method</span>
              <span className="value capitalize">{paymentMethod || 'Khalti'}</span>
            </div>
            <div className="info-row">
              <span className="label">Payment Status</span>
              <span className="value status-paid">Completed</span>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="ticket-qr">
            <p>Scan this QR code at the parking entrance</p>
            {qrValue ? (
              <div className="qr-code-container">
                <QRCodeCanvas 
                  value={qrValue} 
                  size={180}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
                <p className="qr-hint">Show this QR code to the parking attendant</p>
              </div>
            ) : (
              <div className="qr-loading">
                <p>Generating QR code...</p>
              </div>
            )}
          </div>

          <div className="ticket-notes">
            <h4>Important Notes:</h4>
            <ul>
              <li>✓ Please check in within 15 minutes of your reservation time</li>
              <li>✓ Show this QR code at the entrance for verification</li>
              <li>✓ If you don't check in on time, your reservation will be cancelled</li>
              <li>✓ For assistance, contact the parking attendant</li>
            </ul>
          </div>
        </div>

        <div className="ticket-footer">
          <button className="btn-print" onClick={handlePrint}>
            Print Ticket
          </button>
          <button className="btn-back" onClick={() => navigate('/parking')}>
            Back to Parking
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
