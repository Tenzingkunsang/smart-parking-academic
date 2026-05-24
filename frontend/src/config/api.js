export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

let isRedirecting = false;

/** Clear auth state and redirect to login. */
export function handleAuthExpiry() {
  if (isRedirecting) return;
  isRedirecting = true;
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

/**
 * Decode a JWT payload without verifying its signature.
 * Handles base64url encoding (JWT uses `-` and `_` instead of `+` and `/`,
 * and omits `=` padding). Standard `atob()` rejects these without conversion.
 */
function decodeJwtPayload(token) {
  const base64url = token.split('.')[1];
  if (!base64url) throw new Error('malformed token');
  // base64url → base64: replace URL-safe chars and restore padding
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return JSON.parse(atob(padded));
}

/**
 * Client-side token validity check — decodes JWT expiry without a network call.
 * Returns false if the token is missing, malformed, or expired.
 */
export function isTokenValid() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = decodeJwtPayload(token);
    if (!payload.exp) return true; // no expiry claim = treat as valid
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

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
      handleAuthExpiry();
      throw new Error('Session expired. Please log in again.');
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
