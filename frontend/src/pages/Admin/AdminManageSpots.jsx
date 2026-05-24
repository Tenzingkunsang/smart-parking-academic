import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Car,
  Bike,
  MapPin,
  DollarSign,
  Save,
  AlertTriangle,
} from 'lucide-react';
import parkingService from '../../services/parkingService';

const AdminManageSpots = () => {
  const navigate = useNavigate();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSpot, setEditingSpot] = useState(null);
  const [formData, setFormData] = useState({
    locationName: '',
    address: '',
    lat: '',
    lng: '',
    price: 50,
    totalSpaces: 10,
    vehicleType: 'car',
    status: 'available',
  });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const floors = [1, 2, 3];

  const fetchSpots = async () => {
    setLoading(true);
    try {
      const data = await parkingService.getAllSpots();
      if (data.success) setSpots(data.data || []);
    } catch (err) {
      console.error('Failed to load spots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const getSpotFloor = (spot) => {
    if (spot.floor) return spot.floor;
    const num = parseInt(spot.spotNumber);
    if (isNaN(num) || num < 100) return 1;
    return Math.floor(num / 100);
  };

  const filteredSpots = spots.filter((spot) => getSpotFloor(spot) === activeFloor);

  const openAddModal = () => {
    setEditingSpot(null);
    setFormData({
      locationName: '',
      address: '',
      lat: '',
      lng: '',
      price: 50,
      totalSpaces: 10,
      vehicleType: 'car',
      status: 'available',
    });
    setShowModal(true);
  };

  const openEditModal = (spot) => {
    setEditingSpot(spot);
    setFormData({
      locationName: spot.locationName || '',
      address: spot.address || spot.location?.address || '',
      lat: spot.location?.lat || '',
      lng: spot.location?.lng || '',
      price: spot.price || 50,
      totalSpaces: spot.totalSpaces || 10,
      vehicleType: spot.vehicleType || 'car',
      status: spot.status || 'available',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        locationName: formData.locationName.trim(),
        address: formData.address.trim(),
        price: Number(formData.price),
        totalSpaces: Number(formData.totalSpaces),
        vehicleType: formData.vehicleType,
        location: {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
        },
        ...(editingSpot && { status: formData.status }),
      };

      let result;
      if (editingSpot) {
        result = await parkingService.updateSpot(editingSpot._id, payload);
      } else {
        result = await parkingService.createSpot(payload);
      }

      if (result.success) {
        toast.success(editingSpot ? 'Spot updated successfully!' : 'New spot created!');
        setShowModal(false);
        setEditingSpot(null);
        fetchSpots();
      } else {
        toast.error(result.message || 'Operation failed.');
      }
    } catch (err) {
      toast.error('Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (spot, newStatus) => {
    try {
      const result = await parkingService.updateSpotStatus(spot._id, newStatus);
      if (result.success) {
        toast.success(`Spot status changed to ${newStatus}`);
        fetchSpots();
      }
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const handleDelete = async (spotId) => {
    setDeleting(true);
    try {
      const result = await parkingService.deleteSpot(spotId);
      if (result.success) {
        toast.success('Spot deleted successfully.');
        setDeleteConfirm(null);
        fetchSpots();
      } else {
        toast.error(result.message || 'Delete failed.');
      }
    } catch {
      toast.error('Failed to delete spot.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/25',
          dot: 'bg-emerald-500',
        };
      case 'occupied':
        return {
          bg: 'bg-red-500/15',
          text: 'text-red-400',
          border: 'border-red-500/25',
          dot: 'bg-red-500',
        };
      case 'reserved':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/25',
          dot: 'bg-blue-500',
        };
      case 'maintenance':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/25',
          dot: 'bg-amber-500',
        };
      default:
        return {
          bg: 'bg-slate-500/15',
          text: 'text-slate-400',
          border: 'border-slate-500/25',
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Parking Spots</h1>
            <p className="text-slate-400 text-sm font-medium">
              {spots.length} total spot{spots.length !== 1 ? 's' : ''} across all floors
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98]"
        >
          <Plus size={18} />
          Add New Spot
        </button>
      </div>

      {/* Floor tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl w-fit">
        {floors.map((floor) => {
          const count = spots.filter((s) => getSpotFloor(s) === floor).length;
          return (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeFloor === floor
                  ? 'bg-white text-black shadow-lg'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              Floor {floor}
              <span className="ml-1.5 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Spots Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-cyan-400" size={40} />
          <span className="text-sm font-semibold text-slate-500">Loading spots...</span>
        </div>
      ) : filteredSpots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-20 text-center space-y-4">
          <MapPin size={40} className="mx-auto text-slate-700" />
          <p className="text-sm font-semibold text-slate-600">No spots on Floor {activeFloor}</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
          >
            <Plus size={14} /> Add Spot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredSpots.map((spot) => {
            const color = getStatusColor(spot.status);
            return (
              <div
                key={spot._id}
                className={`group relative rounded-2xl bg-white/[0.03] border ${color.border} p-5 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer`}
                onClick={() => openEditModal(spot)}
              >
                {/* Status dot */}
                <div className="absolute top-4 right-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot} shadow-[0_0_8px_currentColor]`} />
                </div>

                {/* Spot number */}
                <div className="mb-4">
                  <span className="text-2xl font-extrabold text-white tracking-tight">
                    #{spot.spotNumber || '—'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    {spot.vehicleType === 'motorcycle' ? <Bike size={12} /> : <Car size={12} />}
                    <span className="capitalize">{spot.vehicleType || 'car'}</span>
                  </div>
                  <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${color.bg} ${color.text}`}>
                    {spot.status}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white font-bold">
                    <DollarSign size={11} className="text-slate-500" />
                    Rs. {spot.price || 0}/hr
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(spot);
                    }}
                    className="flex-1 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold gap-1"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(spot._id);
                    }}
                    className="w-9 h-9 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Edit / Add Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingSpot ? `Edit Spot #${editingSpot.spotNumber}` : 'Add New Spot'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    placeholder="e.g. Main Street Lot"
                    required
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    placeholder="e.g. 123 Main St"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none appearance-none"
                  >
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Price (Rs/hr)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Spaces
                  </label>
                  <input
                    type="number"
                    value={formData.totalSpaces}
                    onChange={(e) => setFormData({ ...formData, totalSpaces: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-all"
                    min="1"
                    required
                  />
                </div>

                {editingSpot && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none appearance-none"
                    >
                      <option value="available">Available</option>
                      <option value="occupied">Occupied</option>
                      <option value="reserved">Reserved</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {editingSpot ? 'Save Changes' : 'Create Spot'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0a0a0a] border border-red-500/20 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-lg font-bold text-white">Delete This Spot?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This action cannot be undone. All data associated with this spot will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageSpots;
