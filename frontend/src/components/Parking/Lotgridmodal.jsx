import React, { useMemo } from 'react';
import { X, Car } from 'lucide-react';
import './LotGridModal.css';
/**
 * LotGridModal
 *
 * Shows a visual grid of parking spaces inside a lot.
 * Since individual sub-spaces aren't separate DB records,
 * we generate a visual grid from totalSpaces / availableSpaces.
 *
 * Props:
 *   spot    – ParkingSpot object
 *   onClose – fn()
 *   onBook  – fn(spot)
 */
const LotGridModal = ({ spot, onClose, onBook }) => {
  const total = spot.totalSpaces || 10;
  const available = spot.availableSpaces ?? 0;
  const reserved = spot.reservedSpaces ?? 0;
  const occupied = total - available - reserved;

  // Build array of space objects
  const spaces = useMemo(() => {
    return Array.from({ length: total }, (_, i) => {
      const num = i + 1;
      // Assign row letter (A, B, C...)
      const row = String.fromCharCode(65 + Math.floor(i / 4));
      const col = (i % 4) + 1;
      const label = `${row}-${col}`;

      let status;
      if (i < occupied) status = 'occupied';
      else if (i < occupied + reserved) status = 'reserved';
      else status = 'available';

      return { num, label, status };
    });
  }, [total, available, reserved, occupied]);

  const availCount = spaces.filter((s) => s.status === 'available').length;

  // Split into rows of 4 (2 columns with aisle in between, like real lots)
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < spaces.length; i += 4) {
      result.push(spaces.slice(i, i + 4));
    }
    return result;
  }, [spaces]);

  return (
    <div className="lot-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Parking lot layout">
      <div className="lot-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="lot-modal-header">
          <div>
            <h2 className="lot-modal-title">{spot.locationName}</h2>
            <p className="lot-modal-sub">{spot.address}</p>
          </div>
          <button className="lot-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div className="lot-stats-row">
          <div className="lot-stat">
            <div className="lot-stat-dot available" />
            <span className="lot-stat-num">{availCount}</span>
            <span className="lot-stat-label">Free</span>
          </div>
          <div className="lot-stat">
            <div className="lot-stat-dot reserved" />
            <span className="lot-stat-num">{reserved}</span>
            <span className="lot-stat-label">Reserved</span>
          </div>
          <div className="lot-stat">
            <div className="lot-stat-dot occupied" />
            <span className="lot-stat-num">{occupied > 0 ? occupied : 0}</span>
            <span className="lot-stat-label">Occupied</span>
          </div>
          <div className="lot-stat total">
            <span className="lot-stat-num">{total}</span>
            <span className="lot-stat-label">Total</span>
          </div>
        </div>

        {/* Visual grid */}
        <div className="lot-grid-wrap">
          {/* Entry label */}
          <div className="lot-entry-label">▼ Entry</div>

          <div className="lot-grid">
            {rows.map((row, rIdx) => (
              <div key={rIdx} className="lot-row">
                {/* Left column (2 spaces) */}
                <div className="lot-col">
                  {row.slice(0, 2).map((space) => (
                    <div
                      key={space.label}
                      className={`lot-space ${space.status}`}
                      title={`Space ${space.label} — ${space.status}`}
                    >
                      {space.status === 'available' ? (
                        <span className="lot-space-label">{space.label}</span>
                      ) : (
                        <Car size={16} className="lot-car-icon" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Aisle */}
                <div className="lot-aisle">
                  {rIdx === 0 && <span className="lot-aisle-arrow">↕</span>}
                </div>

                {/* Right column (2 spaces) */}
                <div className="lot-col">
                  {row.slice(2, 4).map((space) => (
                    <div
                      key={space.label}
                      className={`lot-space ${space.status}`}
                      title={`Space ${space.label} — ${space.status}`}
                    >
                      {space.status === 'available' ? (
                        <span className="lot-space-label">{space.label}</span>
                      ) : (
                        <Car size={16} className="lot-car-icon" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Exit label */}
          <div className="lot-exit-label">▲ Exit</div>
        </div>

        {/* Legend */}
        <div className="lot-legend">
          <span><i className="legend-dot available" /> Free</span>
          <span><i className="legend-dot reserved" /> Reserved</span>
          <span><i className="legend-dot occupied" /> Occupied</span>
        </div>

        {/* Action */}
        <div className="lot-modal-footer">
          {availCount > 0 ? (
            <button
              className="lot-book-btn"
              onClick={() => onBook(spot)}
            >
              Reserve a Space — NPR {spot.price}/hr
            </button>
          ) : (
            <div className="lot-full-notice">
              This lot is currently full. Check back soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LotGridModal;