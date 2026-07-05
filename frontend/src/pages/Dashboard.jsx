import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { fetchIssues, upvoteIssue, updateIssueStatus, verifyIssue } from '../services/api';
import IssueDetailModal from '../components/IssueDetailModal';
import {
  Filter, Plus, Search, MapPin, X, ChevronDown, ChevronUp,
  AlertTriangle, Clock, CheckCircle2, Eye, Shield, Layers,
  BarChart3, TrendingUp, Flame, RotateCcw, UserCheck, RefreshCcw,
  Building2, CheckCheck
} from 'lucide-react';

// ─── Custom Map Pin ────────────────────────────────────────
const getCustomPin = (severity, status) => {
  let pinColor = '#22c55e';
  if (status === 'RESOLVED' || status === 'CLOSED') {
    pinColor = '#10b981';
  } else if (severity === 'HIGH') {
    pinColor = '#ef4444';
  } else if (severity === 'MEDIUM') {
    pinColor = '#f59e0b';
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: ${pinColor}; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10]
  });
};

// ─── Map Center Updater ────────────────────────────────────
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom]);
  return null;
}

// ─── Constants ─────────────────────────────────────────────
const CATEGORIES = [
  { value: '', label: 'All', icon: '🌐' },
  { value: 'Potholes', label: 'Potholes', icon: '🕳️' },
  { value: 'Water Leaks', label: 'Water Leaks', icon: '💧' },
  { value: 'Broken Streetlights', label: 'Streetlights', icon: '💡' },
  { value: 'Garbage Accumulation', label: 'Garbage', icon: '🗑️' },
  { value: 'Drainage Blockages', label: 'Drainage', icon: '🌊' },
  { value: 'Road Damage', label: 'Roads', icon: '🛣️' },
  { value: 'Sanitation Issues', label: 'Sanitation', icon: '🚿' },
  { value: 'Other Civic Concerns', label: 'Other', icon: '📋' },
];

const STATUSES = [
  { value: '', label: 'All', color: 'bg-gray-700 text-gray-300' },
  { value: 'REPORTED', label: 'Reported', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const SEVERITIES = [
  { value: '', label: 'All', dot: 'bg-gray-500' },
  { value: 'LOW', label: 'Low', dot: 'bg-green-500' },
  { value: 'MEDIUM', label: 'Medium', dot: 'bg-yellow-500' },
  { value: 'HIGH', label: 'High', dot: 'bg-red-500' },
];

const STATUS_COLOR_MAP = {
  REPORTED: 'text-blue-400',
  UNDER_REVIEW: 'text-purple-400',
  ASSIGNED: 'text-cyan-400',
  IN_PROGRESS: 'text-yellow-400',
  RESOLVED: 'text-green-400',
  CLOSED: 'text-gray-400',
};

const SEVERITY_COLOR_MAP = {
  HIGH: 'text-red-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-green-400',
};

// ─── Main Component ────────────────────────────────────────
export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const permissions = usePermissions();
  const navigate = useNavigate();

  // Official status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [verifyingIssue, setVerifyingIssue] = useState(false);
  const [showOfficialPanel, setShowOfficialPanel] = useState(false);

  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailIssueId, setDetailIssueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flyToCenter, setFlyToCenter] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [mapCenter] = useState([40.7128, -74.0060]);

  const activeFilterCount = [categoryFilter, statusFilter, severityFilter, localitySearch].filter(Boolean).length;

  useEffect(() => {
    loadIssues();
  }, [categoryFilter, statusFilter, severityFilter, localitySearch]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await fetchIssues({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        address: localitySearch || undefined
      });
      setIssues(data);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Stats computed from current issues ──────────────────
  const stats = useMemo(() => {
    const total = issues.length;
    const high = issues.filter(i => i.severity === 'HIGH').length;
    const resolved = issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
    const active = issues.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status)).length;
    return { total, high, resolved, active };
  }, [issues]);

  const handleUpdateStatus = async (issueId, newStatus) => {
    if (!permissions.canUpdateIssueStatus) return;
    setUpdatingStatus(true);
    try {
      await updateIssueStatus(issueId, { status: newStatus });
      await loadIssues();
      if (selectedIssue?.id === issueId) {
        setSelectedIssue(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyIssue = async (issueId) => {
    if (!permissions.canVerifyIssue) return;
    setVerifyingIssue(true);
    try {
      await verifyIssue(issueId);
      await loadIssues();
      setSelectedIssue(prev => prev ? { ...prev, verified: true } : null);
    } catch (err) {
      console.error('Failed to verify issue:', err);
      alert(err.response?.data?.message || 'Failed to verify issue.');
    } finally {
      setVerifyingIssue(false);
    }
  };

  const handleUpvote = async (issueId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      alert('You must be signed in to support complaints.');
      return;
    }
    try {
      const res = await upvoteIssue(issueId);
      setIssues(prev => prev.map(issue => {
        if (issue.id === issueId) {
          return { ...issue, upvoteCount: res.upvoteCount };
        }
        return issue;
      }));
      // Also update the selected issue card if open
      setSelectedIssue(prev => prev && prev.id === issueId ? { ...prev, upvoteCount: res.upvoteCount } : prev);
    } catch (err) {
      console.error('Failed to upvote:', err);
      alert(err.response?.data?.message || 'Failed to support. Please try again.');
    }
  };

  function MapEvents() {
    useMapEvents({
      dblclick(e) {
        if (!user) {
          alert('Please sign in to report a civic issue.');
          return;
        }
        navigate(`/report?lat=${e.latlng.lat}&lng=${e.latlng.lng}`);
      }
    });
    return null;
  }

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    setFlyToCenter([issue.latitude, issue.longitude]);
  };

  const clearAllFilters = () => {
    setCategoryFilter('');
    setStatusFilter('');
    setSeverityFilter('');
    setLocalitySearch('');
  };

  const getTimeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] flex flex-col lg:flex-row relative">

      {/* ═══ SIDEBAR ═══ */}
      <div className="w-full lg:w-[420px] bg-slate-950/40 border-r border-white/10 backdrop-blur-md flex flex-col overflow-y-auto max-h-[calc(100vh-73px)]">

        {/* ─── Header ─── */}
        <div className="sticky top-0 z-20 bg-slate-950/20 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/20">
                <Layers size={14} className="text-black" />
              </div>
              Issue Tracker
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all border ${
                  showFilters
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Filter size={11} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 bg-green-500 text-black text-[9px] font-black rounded-full flex items-center justify-center ml-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {/* VISITOR: no report button. Only authenticated users can report. */}
              {permissions.canReportIssue && (
                <button
                  onClick={() => navigate('/report')}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-md shadow-green-500/20 transition-all"
                >
                  <Plus size={12} /> Report
                </button>
              )}
            </div>
          </div>

          {/* ─── Live Stats Bar ─── */}
          <div className="grid grid-cols-4 gap-0 border-t border-gray-800/50">
            {[
              { label: 'Total', value: stats.total, icon: <BarChart3 size={11} />, color: 'text-white' },
              { label: 'Active', value: stats.active, icon: <TrendingUp size={11} />, color: 'text-blue-400' },
              { label: 'Critical', value: stats.high, icon: <Flame size={11} />, color: 'text-red-400' },
              { label: 'Resolved', value: stats.resolved, icon: <CheckCircle2 size={11} />, color: 'text-green-400' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center py-2.5 border-r border-gray-800/40 last:border-r-0">
                <span className={`text-base font-black ${s.color}`}>{s.value}</span>
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-0.5 mt-0.5">
                  {s.icon} {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Smart Filters Panel ─── */}
        {showFilters && (
          <div className="p-4 space-y-4 border-b border-gray-800 bg-[#0f1520]/60" style={{ animation: 'slideDown 0.2s ease-out' }}>

            {/* Locality Search */}
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <MapPin size={9} /> Search by Locality / Address
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g. Greenwood Valley, Riverside..."
                  value={localitySearch}
                  onChange={e => setLocalitySearch(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-xl pl-9 pr-8 py-2.5 outline-none transition-colors"
                />
                {localitySearch && (
                  <button onClick={() => setLocalitySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Chips */}
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(categoryFilter === cat.value ? '' : cat.value)}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                      categoryFilter === cat.value
                        ? 'bg-green-500/15 border-green-500/40 text-green-400 shadow-sm shadow-green-500/10'
                        : 'bg-[#1a2235] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs">{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Pills */}
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                      statusFilter === s.value
                        ? `${s.color} border shadow-sm`
                        : 'bg-[#1a2235] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Severity</label>
              <div className="flex gap-1.5">
                {SEVERITIES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSeverityFilter(severityFilter === s.value ? '' : s.value)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      severityFilter === s.value
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-[#1a2235] border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={10} /> Clear all filters ({activeFilterCount})
              </button>
            )}
          </div>
        )}

        {/* ─── Issue Feed ─── */}
        <div className="flex-grow p-4 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {loading ? 'Loading...' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} found`}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-[#1a2235] border border-gray-800 rounded-xl p-4 animate-pulse space-y-2.5">
                  <div className="flex gap-2">
                    <div className="h-3 bg-gray-800 rounded w-20" />
                    <div className="h-3 bg-gray-800 rounded w-12 ml-auto" />
                  </div>
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-16">
              <Search size={40} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500 font-bold text-sm">No issues match your filters</p>
              <p className="text-xs text-gray-600 mt-1">Try adjusting your search criteria</p>
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="mt-3 text-green-400 text-xs font-bold hover:text-green-300">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            issues.map(issue => (
              <div
                key={issue.id}
                onClick={() => handleSelectIssue(issue)}
                className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedIssue?.id === issue.id
                    ? 'bg-green-500/5 border-green-500/40 shadow-lg shadow-green-500/5 ring-1 ring-green-500/20'
                    : 'bg-[#1a2235]/60 border-gray-800/60 hover:border-gray-700 hover:bg-[#1a2235]'
                }`}
              >
                {/* Top row: category + severity + time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-800/80 text-gray-300 uppercase tracking-wider">
                      {issue.category}
                    </span>
                    <span className={`text-[9px] font-extrabold tracking-widest uppercase ${SEVERITY_COLOR_MAP[issue.severity] || 'text-gray-400'}`}>
                      ● {issue.severity}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-600 font-medium flex items-center gap-0.5">
                    <Clock size={9} /> {getTimeAgo(issue.createdAt)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-green-300 transition-colors">
                  {issue.title}
                </h3>

                {/* Description */}
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{issue.description}</p>

                {/* Address */}
                {issue.address && (
                  <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 truncate">
                    <MapPin size={9} className="text-green-500 flex-shrink-0" /> {issue.address}
                  </p>
                )}

                {/* Footer: status + upvote */}
                <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-800/30">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${STATUS_COLOR_MAP[issue.status] || 'text-gray-400'}`}>
                    {issue.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={(e) => handleUpvote(issue.id, e)}
                    className="flex items-center gap-1 bg-green-500/8 hover:bg-green-500/15 text-green-400 text-[10px] px-2 py-1 rounded-full border border-green-500/15 transition-all font-bold"
                  >
                    ▲ {issue.upvoteCount}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ MAP ═══ */}
      <div className="flex-grow min-h-[400px] lg:min-h-0 relative z-10">
        <MapContainer
          center={issues.length > 0 ? [issues[0].latitude, issues[0].longitude] : mapCenter}
          zoom={13}
          className="h-full w-full"
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapEvents />
          {flyToCenter && <MapCenterUpdater center={flyToCenter} zoom={15} />}

          {issues.map(issue => (
            <Marker
              key={issue.id}
              position={[issue.latitude, issue.longitude]}
              icon={getCustomPin(issue.severity, issue.status)}
              eventHandlers={{
                click: () => handleSelectIssue(issue)
              }}
            >
              <Popup>
                <div className="p-2.5 text-black max-w-[220px]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">{issue.category}</span>
                    <span className={`text-[9px] font-bold uppercase ${
                      issue.severity === 'HIGH' ? 'text-red-600' : issue.severity === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'
                    }`}>● {issue.severity}</span>
                  </div>
                  <h4 className="font-extrabold text-sm leading-snug mb-1">{issue.title}</h4>
                  <p className="text-[11px] text-gray-600 line-clamp-2 mb-2">{issue.description}</p>
                  {issue.address && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-2">📍 {issue.address}</p>
                  )}
                  <div className="flex justify-between items-center text-[9px] font-bold pt-1.5 border-t border-gray-200">
                    <span className="text-emerald-600 uppercase">{issue.status.replace('_', ' ')}</span>
                    <span className="text-gray-500">▲ {issue.upvoteCount} supporters</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ─── Map Overlay: Issue Count ─── */}
        <div className="absolute top-4 right-4 z-[1000] glass-card rounded-xl px-3 py-2 flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-gray-300 font-bold">{issues.length} issues on map</span>
        </div>

        {/* ─── Map Legend ─── */}
        <div className="absolute bottom-24 right-4 z-[1000] glass-card rounded-xl p-3 space-y-1.5">
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Severity</p>
          {[
            { color: 'bg-red-500', label: 'High' },
            { color: 'bg-yellow-500', label: 'Medium' },
            { color: 'bg-green-500', label: 'Low / Resolved' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-[10px] text-gray-400 font-medium">{l.label}</span>
            </div>
          ))}
        </div>

        {/* ─── Selected Issue Detail Card ─── */}
        {selectedIssue && (
          <div className="absolute bottom-6 left-6 right-6 lg:left-10 lg:right-10 glass-card rounded-2xl p-5 shadow-2xl z-[1000]" style={{ animation: 'slideUp 0.25s ease-out' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div className="space-y-2 flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
                    {selectedIssue.category}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${SEVERITY_COLOR_MAP[selectedIssue.severity]}`}>
                    ● {selectedIssue.severity}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${STATUS_COLOR_MAP[selectedIssue.status]}`}>
                    {selectedIssue.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {getTimeAgo(selectedIssue.createdAt)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-snug">{selectedIssue.title}</h3>
                <p className="text-xs text-gray-400 max-w-2xl line-clamp-2">{selectedIssue.description}</p>
                {selectedIssue.address && (
                  <p className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                    <MapPin size={10} className="text-green-500" /> {selectedIssue.address}
                  </p>
                )}
                {selectedIssue.reportedBy && (
                  <p className="text-[10px] text-gray-600">
                    Reported by <span className="text-gray-400 font-semibold">{selectedIssue.reportedBy.name}</span>
                    {selectedIssue.reportedBy.locality && (
                      <span> · {selectedIssue.reportedBy.locality}</span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 self-end md:self-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* Support — authenticated users only */}
                  {permissions.canUpvoteIssues && (
                    <button
                      onClick={(e) => handleUpvote(selectedIssue.id, e)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black text-[11px] font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-green-500/20 transition-all"
                    >
                      ▲ Support ({selectedIssue.upvoteCount})
                    </button>
                  )}
                  <button
                    onClick={() => setDetailIssueId(selectedIssue.id)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all border border-gray-700 flex items-center gap-1.5"
                  >
                    <Eye size={13} /> Details
                  </button>
                  <button
                    onClick={() => { setSelectedIssue(null); setFlyToCenter(null); }}
                    className="text-gray-500 hover:text-white text-xs font-bold px-2 py-2 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ── OFFICIAL: Status update panel ──────────────────────── */}
                {permissions.canUpdateIssueStatus && (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setShowOfficialPanel(v => !v)}
                      className="text-[10px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                    >
                      <Building2 size={11} /> Official Actions {showOfficialPanel ? '▲' : '▼'}
                    </button>
                    {showOfficialPanel && (
                      <div className="flex flex-wrap gap-1.5">
                        {['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                          <button
                            key={s}
                            disabled={updatingStatus || selectedIssue.status === s}
                            onClick={() => handleUpdateStatus(selectedIssue.id, s)}
                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all disabled:opacity-40 ${
                              selectedIssue.status === s
                                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── MODERATOR/OFFICIAL/ADMIN: Verify issue ─────────────── */}
                {permissions.canVerifyIssue && !selectedIssue.verified && (
                  <button
                    onClick={() => handleVerifyIssue(selectedIssue.id)}
                    disabled={verifyingIssue}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <UserCheck size={11} /> {verifyingIssue ? 'Verifying...' : 'Verify Issue'}
                  </button>
                )}
                {selectedIssue.verified && (
                  <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                    <CheckCheck size={11} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Issue Detail Modal ─── */}
      {detailIssueId && (
        <IssueDetailModal
          issueId={detailIssueId}
          onClose={() => setDetailIssueId(null)}
          onUpvoteChange={(id, count) => {
            setIssues(prev => prev.map(i => i.id === id ? { ...i, upvoteCount: count } : i));
            setSelectedIssue(prev => prev?.id === id ? { ...prev, upvoteCount: count } : prev);
          }}
        />
      )}

      {/* ─── Animations ─── */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
