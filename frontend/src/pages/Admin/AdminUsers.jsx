import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkAdminAccess = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userType !== 'admin') {
      navigate('/');
      alert('Admin access required');
    }
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, [checkAdminAccess, fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Failed to update role');
      }
    } catch (err) {
      alert('Error updating role');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  if (loading) return <div className="admin-loading">Loading users...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-users">
      <div className="header">
        <h1>Manage Users</h1>
        <button onClick={() => navigate('/admin')} className="back-btn">Back to Dashboard</button>
      </div>
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Role</th>
              <th>Bookings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone || '-'}</td>
                <td>{user.vehicleNumber || '-'}</td>
                <td>
                  <span className={`role-badge ${user.userType}`}>{user.userType}</span>
                </td>
                <td>{user.totalBookings || 0}</td>
                <td className="actions">
                  {user.userType === 'user' ? (
                    <button onClick={() => handleRoleChange(user._id, 'admin')} className="promote-btn">Promote</button>
                  ) : (
                    <button onClick={() => handleRoleChange(user._id, 'user')} className="demote-btn">Demote</button>
                  )}
                  <button onClick={() => handleDelete(user._id)} className="delete-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
