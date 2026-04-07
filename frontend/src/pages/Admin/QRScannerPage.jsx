import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API_BASE } from '../../config/api';
import './QRScannerPage.css';

const QRScannerPage = () => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState('checkin');
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const scanningRef = useRef(scanning);
  const actionRef = useRef(action);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    // Initialize scanner when component mounts
    if (scannerRef.current === null) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          qrbox: {
            width: 300,
            height: 300,
          },
          fps: 10,
        },
        false
      );
      scannerRef.current = scanner;
      
      scanner.render(onScanSuccess, onScanError);
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  // We intentionally initialize the scanner once; `onScanSuccess` reads latest
  // state via refs (`actionRef`, `scanningRef`) so re-initialization is not needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!scanningRef.current) return;
    
    setScanning(false);
    try {
      const qrData = JSON.parse(decodedText);
      console.log('Scanned QR:', qrData);
      
      const token = localStorage.getItem('token');
      const endpoint = actionRef.current === 'checkin' ? '/checkin' : '/checkout';
      
      const response = await fetch(`${API_BASE}/reservations${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrData: decodedText })
      });
      
      const resultData = await response.json();
      
      if (resultData.success) {
        setResult(resultData);
        setTimeout(() => {
          setResult(null);
          setScanning(true);
        }, 5000);
      } else {
        setError(resultData.message);
        setTimeout(() => {
          setError('');
          setScanning(true);
        }, 3000);
      }
    } catch (err) {
      setError('Invalid QR code');
      setTimeout(() => {
        setError('');
        setScanning(true);
      }, 2000);
    }
  }, []);

  const onScanError = useCallback((err) => {
    console.warn('Scan error:', err);
  }, []);

  return (
    <div className="qr-scanner-page">
      <div className="scanner-header">
        <h1>QR Code Scanner</h1>
        <p>Scan QR codes for check-in and check-out</p>
      </div>

      <div className="action-selector">
        <button 
          className={`action-btn ${action === 'checkin' ? 'active' : ''}`}
          onClick={() => setAction('checkin')}
        >
          Check In
        </button>
        <button 
          className={`action-btn ${action === 'checkout' ? 'active' : ''}`}
          onClick={() => setAction('checkout')}
        >
          Check Out
        </button>
      </div>

      <div className="scanner-container">
        <div id="qr-reader" style={{ width: '100%' }}></div>
        
        {error && (
          <div className="error-message">
            <span>!</span>
            <p>{error}</p>
          </div>
        )}
        
        {result && (
          <div className="success-message">
            <span>✓</span>
            <h3>{action === 'checkin' ? 'Check-in Successful' : 'Check-out Successful'}</h3>
            {action === 'checkout' && result.data && (
              <div className="payment-details">
                <div className="detail-row">
                  <span>Booked Duration:</span>
                  <span>{result.data.bookedDuration} min</span>
                </div>
                <div className="detail-row">
                  <span>Actual Duration:</span>
                  <span>{result.data.actualDuration} min</span>
                </div>
                <div className="detail-row">
                  <span>Overtime:</span>
                  <span>{result.data.overtime} min</span>
                </div>
                <div className="detail-row total">
                  <span>Total Amount:</span>
                  <span>NPR {result.data.finalAmount}</span>
                </div>
                {result.data.overtimeCharge > 0 && (
                  <div className="detail-row overtime">
                    <span>Overtime Charge:</span>
                    <span>NPR {result.data.overtimeCharge}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={() => navigate('/admin')} className="back-btn">
        Back to Dashboard
      </button>
    </div>
  );
};

export default QRScannerPage;
