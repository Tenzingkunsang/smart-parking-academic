import api from './api';

class ParkingService {
  // Get all parking spots
  async getAllSpots() {
    const response = await api.get('/parking/spots');
    return response.data;
  }

  // Get available spots
  async getAvailableSpots(vehicleType = null) {
    const params = vehicleType ? { vehicleType } : {};
    const response = await api.get('/parking/available', { params });
    return response.data;
  }

  // Get spot by ID
  async getSpotById(id) {
    const response = await api.get(`/parking/spots/${id}`);
    return response.data;
  }

  // Create parking spot (admin only)
  async createSpot(spotData) {
    const response = await api.post('/parking/spots', spotData);
    return response.data;
  }

  // Update parking spot (admin only)
  async updateSpot(id, spotData) {
    const response = await api.put(`/parking/spots/${id}`, spotData);
    return response.data;
  }

  // Delete parking spot (admin only)
  async deleteSpot(id) {
    const response = await api.delete(`/parking/spots/${id}`);
    return response.data;
  }

  // Update spot status (admin only)
  async updateSpotStatus(id, status) {
    const response = await api.put(`/parking/spots/${id}/status`, { status });
    return response.data;
  }

  // Get nearby spots
  async getNearbySpots(lat, lng, radius = 1) {
    const response = await api.get(`/parking/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  }

  // Smart recommendations based on demand/occupancy patterns
  async getRecommendations() {
    const response = await api.get('/parking/recommendations');
    return response.data;
  }
}

const parkingService = new ParkingService();
export default parkingService;
