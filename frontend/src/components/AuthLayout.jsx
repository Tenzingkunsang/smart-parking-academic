import React from 'react';

/**
 * Split auth shell: left visual (desktop), right glass card.
 * Matches App.css tokens (--primary-indigo, slate surfaces).
 */
export default function AuthLayout({ title, subtitle, wide, children }) {
  return (
    <div className={`auth-split-page${wide ? ' auth-split-page--wide' : ''}`.trim()}>
      <aside className="auth-split-aside" aria-hidden="true">
        <div className="auth-split-aside-inner">
          <p className="auth-split-kicker">SmartPark</p>
          <blockquote className="auth-split-quote">
            Smarter cities start with smarter parking—find, book, and navigate with confidence.
          </blockquote>
          <p className="auth-split-meta">Real-time availability · Secure payments · QR check-in</p>
        </div>
      </aside>
      <div className="auth-split-panel">
        <div className={`auth-card${wide ? ' auth-card--wide' : ''}`.trim()}>
          <h2>{title}</h2>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
