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

/**
 * Standard fetch wrapper with timeout and Authorization header.
 * Fixes compilation errors in Admin pages.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      // Handle session expiry if needed
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
