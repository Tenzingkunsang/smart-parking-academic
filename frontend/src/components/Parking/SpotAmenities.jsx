import React from 'react';
import { Zap, Accessibility, Home, Clock, Video } from 'lucide-react';

const FEATURE_CONFIG = {
  ev_charging: { label: 'EV charging', Icon: Zap },
  handicap: { label: 'Disabled access', Icon: Accessibility },
  covered: { label: 'Covered', Icon: Home },
  '24_hours': { label: '24/7', Icon: Clock },
  cctv: { label: 'CCTV', Icon: Video },
};

/**
 * Consistent amenity icons across listings (recognition / repetition).
 */
const SpotAmenities = ({ features, className = '' }) => {
  const list = Array.isArray(features) ? features : [];
  if (!list.length) return null;

  return (
    <div className={`spot-amenities-row ${className}`.trim()} role="list" aria-label="Parking amenities">
      {list.map((f) => {
        const cfg = FEATURE_CONFIG[f];
        if (!cfg) return null;
        const { Icon, label } = cfg;
        return (
          <span key={f} className="spot-amenity-chip" role="listitem" title={label}>
            <Icon className="spot-amenity-icon" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </div>
  );
};

export default SpotAmenities;
