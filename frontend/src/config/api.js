export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/** JWT from localStorage (login sets both `token` and `authToken`). */
export function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken') || '';
}

/** Socket.io origin (no `/api` path) — derived from API_BASE unless overridden. */
export function getSocketOrigin() {
  if (process.env.REACT_APP_SOCKET_URL) return process.env.REACT_APP_SOCKET_URL;
  try {
    const u = new URL(API_BASE);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:5001';
  }
}
