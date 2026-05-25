import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Plus, Edit3, Trash2, Loader2, X, Save,
  CheckCircle2, XCircle, Car, Zap, Umbrella, Clock,
  Accessibility, Activity,
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import toast from 'react-hot-toast';

// ─── Constants ─────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all';

const VEHICLE_OPTIONS = [
  { value: 'all',        label: 'All Types', icon: Car },
  { value: 'car',        label: 'Car',       icon: Car },
  { value: 'motorcycle', label: 'Moto',      icon: Activity },
  { value: 'ev',         label: 'EV',        icon: Zap },
];

const FEATURE_OPTIONS = [
  { value: 'ev_charging', label: 'EV Charging',  icon: Zap         },
  { value: 'covered',     label: 'Covered',       icon: Umbrella    },
  { value: 'handicap',    label: 'Accessible',    icon: Accessibility },
  { value: '24_hours',    label: '24 Hours',      icon: Clock       },
];

const EMPTY_FORM = {
  locationName: '', address: '', lat: '', lng: '',
  price: 50, totalSpaces: 10, spotNumber: '',
  vehicleTypes: ['all'], features: [],
};

// ─── Spot Card ──────────────────────────────────────────────────────────────────

const SpotCard = ({ spot, onEdit, onDelete, deleting }) => {
  const available  = spot.availableSpaces  ?? spot.totalSpaces ?? 0;
  const total      = spot.totalSpaces      ?? 0;
  const reserved   = spot.reservedSpaces   ?? 0;
  const occupied   = spot.occupiedSpaces   ?? 0;
  const usedPct    = total > 0 ? Math.round(((reserved + occupied) / total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/25 transition-all overflow-hidden group">
      {/* Top accent */}
      <div className={`h-1 w-full ${spot.isActive ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-white/10'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-bold text-white truncate">{spot.locationName}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{spot.address}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
            spot.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${spot.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {spot.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-center">
            <p className="text-lg font-black text-white">{available}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600 mt-0.5">Free</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-center">
            <p className="text-lg font-black text-white">{total}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600 mt-0.5">Total</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-center">
            <p className="text-lg font-black text-violet-400">NPR {spot.price}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600 mt-0.5">per hr</p>
          </div>
        </div>

        {/* Occupancy bar */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600">Occupancy</span>
            <span className="text-[10px] font-bold text-white">{usedPct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden flex">
            {reserved > 0 && (
              <div
                className="h-full bg-blue-400/70 transition-all"
                style={{ width: `${total > 0 ? (reserved / total) * 100 : 0}%` }}
              />
            )}
            {occupied > 0 && (
              <div
                className="h-full bg-violet-400 transition-all"
                style={{ width: `${total > 0 ? (occupied / total) * 100 : 0}%` }}
              />
            )}
          </div>
          {(reserved > 0 || occupied > 0) && (
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-600">
              {reserved > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/70 inline-block" />{reserved} reserved</span>}
              {occupied > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />{occupied} occupied</span>}
            </div>
          )}
        </div>

        {/* Features */}
        {spot.features?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {spot.features.map((f) => {
              const opt = FEATURE_OPTIONS.find((x) => x.value === f);
              return (
                <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-white/[0.04] border border-white/[0.06] text-slate-500">
                  {opt?.label || f.replace(/_/g, ' ')}
                </span>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(spot)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-bold hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            onClick={() => onDelete(spot._id)}
            disabled={deleting === spot._id}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400/80 text-xs font-bold hover:bg-red-500/15 hover:text-red-400 transition-all disabled:opacity-40"
          >
            {deleting === spot._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Toggle Button ──────────────────────────────────────────────────────────────

const ToggleBtn = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
      active
        ? 'bg-violet-500/20 border-violet-500/35 text-violet-400'
        : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/15'
    }`}
  >
    {children}
  </button>
);

// ─── Main Page ──────────────────────────────────────────────────────────────────

const BusinessSpots = () => {
  const [spots, setSpots]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const token   = () => localStorage.getItem('token');
  const headers = (extra = {}) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...extra });

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/business/spots`, { headers: headers() });
      const d = await r.json();
      if (d.success) setSpots(d.data || []);
    } catch { toast.error('Failed to load spots'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit   = (spot) => {
    setEditing(spot);
    setForm({
      locationName:  spot.locationName || '',
      address:       spot.address || '',
      lat:           spot.location?.lat ?? '',
      lng:           spot.location?.lng ?? '',
      price:         spot.price || 50,
      totalSpaces:   spot.totalSpaces || 10,
      spotNumber:    spot.spotNumber ?? '',
      vehicleTypes:  spot.vehicleTypes || ['all'],
      features:      spot.features || [],
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url    = editing ? `${API_BASE}/business/spots/${editing._id}` : `${API_BASE}/business/spots`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) {
        toast.success(editing ? 'Spot updated.' : 'Spot created.');
        setShowModal(false);
        fetchSpots();
      } else {
        toast.error(d.message || 'Failed');
      }
    } catch { toast.error('Network error'); }
    finally   { setSaving(false); }
  };

  const handleDelete = async (spotId) => {
    if (!window.confirm('Delete this spot? This cannot be undone.')) return;
    setDeleting(spotId);
    try {
      const r = await fetch(`${API_BASE}/business/spots/${spotId}`, { method: 'DELETE', headers: headers() });
      const d = await r.json();
      if (d.success) { toast.success('Spot deleted.'); fetchSpots(); }
      else toast.error(d.message || 'Failed to delete');
    } catch { toast.error('Network error'); }
    finally   { setDeleting(null); }
  };

  const toggle = (field, value) => {
    setForm((p) => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const field = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <>
      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c0c0e] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-extrabold text-white">{editing ? 'Edit Parking Spot' : 'Add New Parking Spot'}</h2>
                <p className="text-[10px] text-slate-600 mt-0.5">{editing ? 'Update spot details below.' : 'Fill in the details to list your spot.'}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5 flex-1">

              {/* Location */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Location</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Location Name *</label>
                  <input required value={form.locationName} onChange={field('locationName')} placeholder="e.g. Central Parking Block A" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Address *</label>
                  <input required value={form.address} onChange={field('address')} placeholder="Full street address" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Latitude *</label>
                    <input required type="number" step="any" value={form.lat} onChange={field('lat')} placeholder="27.7172" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Longitude *</label>
                    <input required type="number" step="any" value={form.lng} onChange={field('lng')} placeholder="85.3240" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Capacity & Pricing */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Capacity & Pricing</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Price (NPR/hr) *</label>
                    <input required type="number" min={1} value={form.price} onChange={field('price')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Total Spaces *</label>
                    <input required type="number" min={1} value={form.totalSpaces} onChange={field('totalSpaces')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Spot Number</label>
                    <input type="number" value={form.spotNumber} onChange={field('spotNumber')} placeholder="Optional" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Vehicle Types */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Vehicle Types</p>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <ToggleBtn key={value} active={form.vehicleTypes.includes(value)} onClick={() => toggle('vehicleTypes', value)}>
                      <Icon size={11} /> {label}
                    </ToggleBtn>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {FEATURE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <ToggleBtn key={value} active={form.features.includes(value)} onClick={() => toggle('features', value)}>
                      <Icon size={11} /> {label}
                    </ToggleBtn>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-violet-500/20 border border-violet-500/35 text-violet-400 text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Spot'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Content ── */}
      <div className="space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">My Parking Spots</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loading ? '…' : `${spots.length} spot${spots.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 text-sm font-bold hover:bg-violet-500/25 transition-all"
          >
            <Plus size={15} /> Add Spot
          </button>
        </div>

        {/* Summary bar */}
        {!loading && spots.length > 0 && (() => {
          const total    = spots.reduce((s, x) => s + (x.totalSpaces    ?? 0), 0);
          const avail    = spots.reduce((s, x) => s + (x.availableSpaces ?? 0), 0);
          const occupied = total - avail;
          return (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Capacity', value: total,    color: 'text-white'      },
                { label: 'Available',      value: avail,    color: 'text-emerald-400'},
                { label: 'Occupied',       value: occupied, color: 'text-violet-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 text-center">
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-violet-400" size={32} />
            <p className="text-slate-600 text-sm">Loading your spots…</p>
          </div>
        ) : spots.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] p-16 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/8 border border-violet-500/15 flex items-center justify-center mx-auto">
              <MapPin size={28} className="text-violet-400/50" />
            </div>
            <div>
              <p className="text-white font-bold">No spots yet</p>
              <p className="text-slate-600 text-sm mt-1">Add your first parking spot to start accepting bookings.</p>
            </div>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 font-bold text-sm hover:bg-violet-500/25 transition-all">
              <Plus size={14} /> Add Your First Spot
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {spots.map((spot) => (
              <SpotCard key={spot._id} spot={spot} onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BusinessSpots;
