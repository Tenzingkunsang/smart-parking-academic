import React, { useEffect, useState } from 'react';

const KEY = 'hasSeenWave2Onboarding';

const OnboardingHint = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem(KEY) === '1';
    if (!hasSeen) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Welcome tour hint"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1800,
        maxWidth: 320,
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 12,
        padding: 14,
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 6 }}>Welcome to SmartPark</strong>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
        Use the map filters to find available spots faster. You can also switch light/dark mode from the top-right menu.
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(KEY, '1');
          setShow(false);
        }}
        style={{
          marginTop: 10,
          minHeight: 40,
          border: 0,
          borderRadius: 10,
          padding: '0 12px',
          background: 'var(--primary)',
          color: '#fff',
          fontWeight: 600,
        }}
      >
        Got it
      </button>
    </div>
  );
};

export default OnboardingHint;
