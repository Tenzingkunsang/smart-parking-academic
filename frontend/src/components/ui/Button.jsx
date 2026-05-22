import React from 'react';

const Button = ({ variant = 'primary', children, className = '', ...props }) => {
  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20',
    secondary: 'bg-white/10 border border-white/20 hover:bg-white/20 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20',
    ghost: 'bg-transparent text-slate-400 hover:text-white',
  };

  return (
    <button
      className={`px-6 py-3 rounded-xl font-bold font-display text-sm uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
