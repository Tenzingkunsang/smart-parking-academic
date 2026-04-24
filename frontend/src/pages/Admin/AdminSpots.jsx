import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import parkingService from '../../services/parkingService';
import './AdminSpots.css';

const AdminSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    locationName: '',
    address: '',
    lat: '',
    lng: '',
    price: 50,
    totalSpaces: 10,
    vehicleType: 'car'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    try {
      const data = await parkingService.getAllSpots();
      if (data.success) {
        setSpots(data.data);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('Enter valid latitude and longitude');
        return;
      }
      const payload = {
        locationName: formData.locationName.trim(),
        address: formData.address.trim(),
        price: Number(formData.price) || 50,
        totalSpaces: Number(formData.totalSpaces) || 10,
        vehicleType: formData.vehicleType,
        location: { lat, lng }
      };

      const data = editingId
        ? await parkingService.updateSpot(editingId, payload)
        : await parkingService.createSpot(payload);
      if (data.success) {
        fetchSpots();
        setShowForm(false);
        setEditingId(null);
        setFormData({
          locationName: '', address: '', lat: '', lng: '', price: 50, totalSpaces: 10, vehicleType: 'car'
        });
        toast.success(editingId ? 'Parking spot updated successfully' : 'Parking spot created successfully');
      } else {
        toast.error(data.message || 'Failed to save parking spot');
      }
    } catch (error) {
      console.error('Error saving spot:', error);
      toast.error('Failed to save parking spot');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this parking spot?')) return;
    try {
      await parkingService.deleteSpot(id);
      fetchSpots();
      toast.success('Parking spot deleted');
    } catch (error) {
      console.error('Error deleting spot:', error);
      toast.error('Failed to delete parking spot');
    }
  };

  const handleEdit = (spot) => {
    setEditingId(spot._id);
    setShowForm(true);
    setFormData({
      locationName: spot.locationName || '',
      address: spot.address || '',
      lat: spot.location?.lat || '',
      lng: spot.location?.lng || '',
      price: spot.price || 50,
      totalSpaces: spot.totalSpaces || 10,
      vehicleType: spot.vehicleType || 'car'
    });
  };

  const handleStatusChange = async (id, status) => {
    try {
      const data = await parkingService.updateSpotStatus(id, status);
      if (data.success) {
        toast.success('Spot status updated');
        fetchSpots();
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="admin-loading">Loading parking spots...</div>;

  return (
    <div className="admin-spots">
      <div className="header">
        <h1>Manage Parking Spots</h1>
        <button onClick={() => setShowForm(!showForm)} className="add-btn">
          + Add New Spot
        </button>
        <button onClick={() => navigate('/admin')} className="back-btn">
          Back to Dashboard
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="spot-form">
          <h3>{editingId ? 'Update Parking Spot' : 'Add New Parking Spot'}</h3>
          <div className="form-grid">
            <input type="text" placeholder="Location Name" value={formData.locationName} onChange={(e) => setFormData({...formData, locationName: e.target.value})} required />
            <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
            <input type="number" step="any" placeholder="Latitude" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} required />
            <input type="number" step="any" placeholder="Longitude" value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})} required />
            <input type="number" placeholder="Price per hour (NPR)" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            <input type="number" placeholder="Total Spaces" value={formData.totalSpaces} onChange={(e) => setFormData({...formData, totalSpaces: e.target.value})} />
            <select value={formData.vehicleType} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
            <button type="submit" className="submit-btn">{editingId ? 'Update Spot' : 'Create Spot'}</button>
          </div>
        </form>
      )}

      <div className="spots-table">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Address</th>
              <th>Spaces</th>
              <th>Price</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {spots.map(spot => (
              <tr key={spot._id}>
                <td>{spot.locationName}</td>
                <td>{spot.address || spot.location?.address || '-'}</td>
                <td>{spot.availableSpaces}/{spot.totalSpaces}</td>
                <td>NPR {spot.price}</td>
                <td>{spot.vehicleType}</td>
                <td>
                  <select
                    value={spot.status || 'available'}
                    onChange={(e) => handleStatusChange(spot._id, e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => handleEdit(spot)} className="action-button btn-edit">Edit</button>
                  <button onClick={() => handleDelete(spot._id)} className="delete-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSpots;
