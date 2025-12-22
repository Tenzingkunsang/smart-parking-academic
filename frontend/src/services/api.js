// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
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

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/me'),
};

// Parking APIs
export const parkingAPI = {
  getSpots: () => api.get('/parking/spots'),
  initializeSpots: () => api.post('/parking/init'),
  reserveSpot: (data) => api.post('/parking/reserve', data),
  getMyReservations: () => api.get('/parking/my-reservations'),
};

export default api;