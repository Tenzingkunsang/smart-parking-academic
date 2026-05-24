import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});


let refreshPromise = null;
let isRedirecting = false;

function redirectToLogin() {
  if (isRedirecting) return;
  isRedirecting = true;
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  // Defer to next tick so concurrent promise chains can settle first.
  setTimeout(() => { window.location.href = '/login'; }, 0);
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      // De-duplicate concurrent refreshes — every parallel 401 waits on the same promise.
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_URL}/auth/refresh`, { refreshToken })
          .finally(() => {
            // Clear *after* awaiters consume it so next batch starts fresh.
            setTimeout(() => { refreshPromise = null; }, 0);
          });
      }
      const refreshRes = await refreshPromise;
      const newToken = refreshRes.data?.token;
      const newRefresh = refreshRes.data?.refreshToken;
      if (!newToken) throw new Error('No refreshed token returned');
      localStorage.setItem('token', newToken);
      localStorage.setItem('authToken', newToken);
      if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
