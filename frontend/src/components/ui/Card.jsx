import React from 'react';

const Card = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl hover:border-white/[0.12] transition-all duration-300 shadow-2xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
