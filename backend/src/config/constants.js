module.exports = {
  RESERVATION_GRACE_PERIOD: 15,
  RESERVATION_DURATION_LIMIT: 240,
  DEFAULT_HOURLY_RATE: 50,
  JWT_EXPIRY: '30d',
  SPOT_STATUS: {
    AVAILABLE: 'available',
    RESERVED: 'reserved',
    OCCUPIED: 'occupied',
    MAINTENANCE: 'maintenance'
  },
  RESERVATION_STATUS: {
    RESERVED: 'reserved',
    CHECKED_IN: 'checked-in',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    NO_SHOW: 'no-show'
  },
  USER_ROLES: {
    USER: 'user',
    ADMIN: 'admin'
  }
};
EOF