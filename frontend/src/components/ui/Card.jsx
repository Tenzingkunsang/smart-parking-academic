import React from 'react';

const Card = ({ children, style, ...props }) => (
  <div
    style={{
      background: 'var(--surface)',
      border: '1px solid var(--surface-border)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-soft)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

export default Card;
