import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSpots.css';

const AdminSpots = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
      const response = await fetch('http://localhost:5001/api/parking/spots');
      const data = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/parking/spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          location: { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng), address: formData.address }
        })
      });
      const data = await response.json();
      if (data.success) {
        fetchSpots();
        setShowForm(false);
        setFormData({
          locationName: '', address: '', lat: '', lng: '', price: 50, totalSpaces: 10, vehicleType: 'car'
        });
        alert('Parking spot created successfully');
      }
    } catch (error) {
      console.error('Error creating spot:', error);
      alert('Failed to create parking spot');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this parking spot?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5001/api/parking/spots/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSpots();
      alert('Parking spot deleted');
    } catch (error) {
      console.error('Error deleting spot:', error);
      alert('Failed to delete parking spot');
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
          <h3>Add New Parking Spot</h3>
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
            <button type="submit" className="submit-btn">Create Spot</button>
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
