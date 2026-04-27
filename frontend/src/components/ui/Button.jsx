import React from 'react';

const Button = ({ variant = 'primary', children, style, ...props }) => {
  const base = {
    minHeight: 42,
    borderRadius: 10,
    border: '1px solid var(--surface-border)',
    padding: '0 14px',
    fontWeight: 700,
    cursor: 'pointer',
  };
  const variants = {
    primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--text)' },
    danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
};

export default Button;
