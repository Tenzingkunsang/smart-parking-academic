import { useState, useEffect, useCallback } from 'react';
import parkingService from '../services/parkingService';

export const useParking = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    vehicleType: '',
    status: '',
    search: ''
  });

  const fetchSpots = useCallback(async () => {
    try {
      setLoading(true);
      // Use getAllSpots method
      const response = await parkingService.getAllSpots();
      let filteredSpots = response.data || [];
      
      // Apply search filter
      if (filters.search) {
        filteredSpots = filteredSpots.filter(spot =>
          spot.locationName?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      // Apply vehicle type filter
      if (filters.vehicleType) {
        filteredSpots = filteredSpots.filter(spot => spot.vehicleType === filters.vehicleType);
      }
      
      // Apply status filter
      if (filters.status) {
        filteredSpots = filteredSpots.filter(spot => spot.status === filters.status);
      }
      
      setSpots(filteredSpots);
      setError(null);
    } catch (err) {
      console.error('Error fetching spots:', err);
      setError(err.response?.data?.message || 'Failed to fetch parking spots');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const updateFilter = (key, value) => {
    if (key === 'reset') {
      setFilters({ vehicleType: '', status: '', search: '' });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const refreshSpots = () => {
    fetchSpots();
  };

  return {
    spots,
    loading,
    error,
    filters,
    updateFilter,
    refreshSpots,
    getSpotById: async (id) => {
      try {
        const response = await parkingService.getSpotById(id);
        return response.data;
      } catch (err) {
        console.error('Error fetching spot:', err);
        return null;
      }
    }
  };
};
