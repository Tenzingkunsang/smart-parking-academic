import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import CancelBookingModal from '../CancelBooking/CancelBookingModal';
import { getCancellationStatus } from '../../utils/Cancellationpolicy';
import './TicketPage.css';

const TicketPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    spot,
    duration,
    totalAmount,
    paymentMethod,
    bookingId,
    paymentStatus,
    createdAt,
  } = location.state || {};

  const [qrValue, setQrValue] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStatus, setCancelStatus] = useState(null);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (spot && bookingId) {
      const qrData = JSON.stringify({
        reservationId: bookingId,
        bookingId,
        spotNumber: spot.spotNumber,
        location: spot.locationName,
        address: spot.location?.address || spot.address || 'Kathmandu',
        vehicleType: spot.vehicleType,
        price: spot.price,
        duration,
      });
      setQrValue(qrData);
    }
  }, [spot, bookingId, duration]);

  useEffect(() => {
    if (!createdAt) return;
    const compute = () => setCancelStatus(getCancellationStatus(createdAt));
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!spot) {
    navigate('/parking');
    return null;
  }

  const hours = Math.ceil(duration / 60);
  const checkInTime = new Date();
  const checkInDeadline = new Date(checkInTime.getTime() + 15 * 60 * 1000);
  const isPendingCash = paymentMethod === 'cash' || paymentStatus === 'pending';

  const getPaymentMethodLabel = (method) => {
    if (!method) return 'Khalti';
    if (method === 'cash') return 'Pay on Spot';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const handleCancelled = () => {
    setShowCancelModal(false);
    setIsCancelled(true);
  };

  const getCancelBtnLabel = () => {
    if (!cancelStatus) return 'Cancel Reservation';
    if (!cancelStatus.canCancel) return 'Cancellation Closed';
    if (cancelStatus.refundPercent === 100) return '🔄 Cancel & Full Refund';
    if (cancelStatus.refundPercent === 50) return '🔄 Cancel & 50% Refund';
    return 'Cancel Reservation';
  };

  return (
    <div className="ticket-container">
      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="cancelled-banner">
          <strong>Reservation Cancelled.</strong>{' '}
          {!isPendingCash && 'Your refund will be processed to your Khalti wallet within 3–5 business days.'}
        </div>
      )}

      <div className={`ticket ${isCancelled ? 'ticket-cancelled' : ''}`}>
        {/* Header */}
        <div className="ticket-header">
          <h1>SmartPark</h1>
          <p>Parking Reservation Ticket</p>
          <div className="ticket-id">ID: {bookingId || 'SP' + Date.now()}</div>
          {isCancelled && <div className="cancelled-stamp">CANCELLED</div>}
        </div>

        <div className="ticket-body">
          {/* Parking Details */}
          <div className="ticket-section">
            <h3>Parking Details</h3>
            <div className="info-row">
              <span className="label">Location</span>
              <span className="value">{spot.locationName}</span>
            </div>
            <div className="info-row">
              <span className="label">Address</span>
              <span className="value">{spot.location?.address || 'Kathmandu'}</span>
            </div>
            <div className="info-row">
              <span className="label">Spot Number</span>
              <span className="value highlight">#{spot.spotNumber}</span>
            </div>
            <div className="info-row">
              <span className="label">Vehicle Type</span>
              <span className="value capitalize">{spot.vehicleType || 'Any'}</span>
            </div>
          </div>

          {/* Reservation Details */}
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

          {/* Payment Details */}
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
              <span className="value capitalize">{getPaymentMethodLabel(paymentMethod)}</span>
            </div>
            <div className="info-row">
              <span className="label">Payment Status</span>
              <span className={`value ${isPendingCash ? 'status-pending' : 'status-paid'}`}>
                {isCancelled ? 'Cancelled' : isPendingCash ? 'Pending (Pay on Arrival)' : 'Completed'}
              </span>
            </div>
          </div>

          {/* Pay on Spot Notice */}
          {isPendingCash && !isCancelled && (
            <div className="cash-notice-box">
              <span className="cash-notice-icon">💵</span>
              <div>
                <strong>Pay on Spot Selected</strong>
                <p>Please pay NPR {totalAmount} in cash to the parking attendant when you arrive.</p>
              </div>
            </div>
          )}

          {/* Cancellation Window Info (Khalti only, not cancelled) */}
          {!isPendingCash && !isCancelled && cancelStatus && (
            <div className={`cancel-window-info urgency-${cancelStatus.urgency}`}>
              {cancelStatus.canCancel ? (
                <>
                  <strong>Cancellation available</strong>
                  <p>
                    {cancelStatus.refundPercent === 100
                      ? 'Cancel within the next '
                      : 'Cancel in the next '}
                    <strong>{cancelStatus.minutesLeft} minute(s)</strong>
                    {' '}for a <strong>{cancelStatus.refundPercent}% refund</strong> (NPR {Math.round(totalAmount * cancelStatus.refundPercent / 100)}).
                  </p>
                </>
              ) : (
                <>
                  <strong>Cancellation window closed</strong>
                  <p>The 30-minute cancellation period has passed. No refunds are available.</p>
                </>
              )}
            </div>
          )}

          {/* QR Code */}
          {!isCancelled && (
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
                <div className="qr-loading"><p>Generating QR code...</p></div>
              )}
            </div>
          )}

          {/* Notes */}
          {!isCancelled && (
            <div className="ticket-notes">
              <h4>Important Notes:</h4>
              <ul>
                <li>✓ Please check in within 15 minutes of your reservation time</li>
                <li>✓ Show this QR code at the entrance for verification</li>
                {isPendingCash && <li>✓ Have NPR {totalAmount} ready to pay on arrival</li>}
                <li>✓ If you don't check in on time, your reservation may be cancelled</li>
                <li>✓ For assistance, contact the parking attendant</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ticket-footer">
          {!isCancelled && (
            <>
              <button className="btn-print" onClick={() => window.print()}>
                Print Ticket
              </button>

              {/* Cancel button — shown for both cash and khalti */}
              <button
                className={`btn-cancel-ticket ${
                  cancelStatus && !cancelStatus.canCancel && !isPendingCash
                    ? 'disabled-cancel'
                    : ''
                }`}
                onClick={() => setShowCancelModal(true)}
                disabled={cancelStatus && !cancelStatus.canCancel && !isPendingCash}
                title={
                  cancelStatus && !cancelStatus.canCancel && !isPendingCash
                    ? 'Cancellation window has passed'
                    : 'Cancel this reservation'
                }
              >
                {getCancelBtnLabel()}
              </button>
            </>
          )}

          <button className="btn-back" onClick={() => navigate('/parking')}>
            {isCancelled ? 'Find New Parking' : 'Back to Parking'}
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelBookingModal
          booking={{
            _id: bookingId,
            createdAt: createdAt || new Date().toISOString(),
            paymentMethod,
            totalAmount,
          }}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
};

export default TicketPage;