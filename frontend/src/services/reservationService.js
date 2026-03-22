import api from './api';

class ReservationService {
  // Create a new reservation
  async createReservation(parkingSpotId, duration) {
    const response = await api.post('/reservations', { 
      parkingSpotId, 
      duration 
    });
    return response.data;
  }

  // Get user's reservations
  async getMyReservations(status = null, page = 1, limit = 10) {
    const params = { page, limit };
    if (status) params.status = status;
    const response = await api.get('/reservations/my', { params });
    return response.data;
  }

  // Get active reservation
  async getActiveReservation() {
    const response = await api.get('/reservations/active');
    return response.data;
  }

  // Check in with QR code
  async checkIn(qrData) {
    const response = await api.post('/reservations/checkin', { qrData });
    return response.data;
  }

  // Check out
  async checkOut(reservationId) {
    const response = await api.post(`/reservations/${reservationId}/checkout`);
    return response.data;
  }

  // Cancel reservation
  async cancelReservation(reservationId) {
    const response = await api.put(`/reservations/${reservationId}/cancel`);
    return response.data;
  }
}

export default new ReservationService();
