import React from 'react';

const Skeleton = ({ height = 14, width = '100%', radius = 8, style }) => (
  <div
    aria-hidden
    style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(148,163,184,0.15), rgba(148,163,184,0.28), rgba(148,163,184,0.15))',
      backgroundSize: '200% 100%',
      animation: 'sp-skeleton 1.2s ease-in-out infinite',
      ...style,
    }}
  />
);

export default Skeleton;
