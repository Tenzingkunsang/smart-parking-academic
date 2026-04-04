import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Clock, History, ArrowRight, Bell } from 'lucide-react';
import reservationService from '../../services/reservationService';
import '../../styles/Dashboard.css';

const formatSessionRemain = (ms) => {
  if (ms == null || Number.isNaN(ms)) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLeftMs, setSessionLeftMs] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (authToken && userData) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await reservationService.getActiveReservation();
      if (res.success && res.data) {
        setActiveSession(res.data);
      } else {
        setActiveSession(null);
      }
    } catch {
      setActiveSession(null);
    }
  }, []);

  const loadRecentHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await reservationService.getMyReservations(null, 1, 6);
      if (res.success && Array.isArray(res.data)) {
        setRecentHistory(res.data);
      } else {
        setRecentHistory([]);
      }
    } catch {
      setRecentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    loadSession();
    loadRecentHistory();
    const id = setInterval(loadSession, 30000);
    return () => clearInterval(id);
  }, [isLoggedIn, loadSession, loadRecentHistory]);

  useEffect(() => {
    if (!activeSession?.sessionEndsAt) {
      setSessionLeftMs(null);
      return undefined;
    }
    const tick = () => {
      const end = new Date(activeSession.sessionEndsAt).getTime();
      setSessionLeftMs(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  if (!isLoggedIn) {
    return (
      <div className="landing-container">
        <div className="hero-section">
          <div className="hero-content">
            <h1>SmartPark</h1>
            <p>Enterprise-grade parking: find, pay, and manage sessions in one place.</p>
            <div className="hero-buttons">
              <button type="button" className="btn-primary saas-cta" onClick={() => navigate('/register')}>
                Get started
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard dashboard-saas">
      {/* Live session / empty state */}
      <section className="dashboard-status-strip" aria-label="Parking session status">
        {activeSession && sessionLeftMs != null ? (
          <div className="session-active-banner" role="status" aria-live="polite">
            <div className="session-active-inner">
              <div className="session-active-icon-wrap" aria-hidden>
                <Clock size={28} strokeWidth={2} />
              </div>
              <div>
                <div className="session-active-title">Live session</div>
                <div className="session-active-spot">
                  {activeSession.reservation?.parkingSpot?.locationName || 'Parking'}
                  {activeSession.reservation?.parkingSpot?.spotNumber != null && (
                    <span> · Spot #{activeSession.reservation.parkingSpot.spotNumber}</span>
                  )}
                </div>
                <div className="session-active-timer" aria-label="Time remaining">
                  {sessionLeftMs <= 0
                    ? 'Time ended — complete checkout'
                    : `Time left: ${formatSessionRemain(sessionLeftMs)}`}
                </div>
              </div>
              <div className="session-active-actions">
                <button
                  type="button"
                  className="session-extend-btn"
                  onClick={() => navigate('/reservations')}
                >
                  Extend
                </button>
                <button
                  type="button"
                  className="session-end-btn"
                  onClick={() => navigate('/reservations')}
                >
                  End session
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-session-card" role="status">
            <div className="no-session-illustration" aria-hidden>
              <Car size={40} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="no-session-title">No active session</h2>
              <p className="no-session-copy">
                You are not checked in at a zone. Reserve a spot and scan your ticket when you arrive to
                start a live timer here.
              </p>
            </div>
            <button
              type="button"
              className="no-session-cta"
              onClick={() => navigate('/parking')}
            >
              Find parking
            </button>
          </div>
        )}
      </section>

      {/* Hero */}
      <section className="dashboard-hero-saas">
        <div className="dashboard-hero-text">
          <p className="dashboard-hero-kicker">Welcome back</p>
          <h1 className="dashboard-hero-title">{firstName}</h1>
          <p className="dashboard-hero-sub">
            Reserve capacity, pay securely, and track your session — built for drivers on the move.
          </p>
        </div>
        <button
          type="button"
          className="dashboard-hero-cta"
          onClick={() => navigate('/parking')}
        >
          <span>Find parking now</span>
          <ArrowRight size={20} aria-hidden />
        </button>
      </section>

      {/* Quick actions */}
      <div className="saas-quick-actions">
        <button type="button" className="saas-quick-card" onClick={() => navigate('/reservations')}>
          <History size={22} />
          <span>Reservations</span>
        </button>
        <button type="button" className="saas-quick-card" onClick={() => navigate('/notifications')}>
          <Bell size={22} aria-hidden />
          <span>Alerts</span>
        </button>
      </div>

      {/* Recent history */}
      <section className="saas-recent-section" aria-labelledby="recent-heading">
        <div className="saas-section-head">
          <h2 id="recent-heading" className="saas-section-title">
            <History size={20} aria-hidden />
            Recent history
          </h2>
          <button type="button" className="saas-link-all" onClick={() => navigate('/reservations')}>
            View all
          </button>
        </div>

        {historyLoading ? (
          <p className="saas-muted">Loading activity…</p>
        ) : recentHistory.length === 0 ? (
          <div className="saas-empty-history">
            <History size={36} strokeWidth={1.25} aria-hidden />
            <p>No bookings yet. Your completed and upcoming sessions will appear here.</p>
            <button type="button" className="saas-empty-btn" onClick={() => navigate('/parking')}>
              Browse parking
            </button>
          </div>
        ) : (
          <ul className="saas-history-list">
            {recentHistory.map((r) => (
              <li key={r._id} className="saas-history-item">
                <div>
                  <div className="saas-history-title">
                    {r.parkingSpot?.locationName || 'Parking'}
                  </div>
                  <div className="saas-history-meta">
                    {new Date(r.reservationTime || r.createdAt).toLocaleString()} · {r.status}
                  </div>
                </div>
                <div className="saas-history-amt">NPR {r.totalAmount ?? '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
