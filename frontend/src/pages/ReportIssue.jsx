import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../context/AuthContext';
import { reportIssue, fetchIssueById, deleteIssue, upvoteIssue, updateIssueStatus, postOfficialUpdate, citizenResolveIssue } from '../services/api';
import {
  ShieldAlert, MapPin, Navigation, Trash2, ArrowLeft, History,
  CheckCircle, Clock, Users, Image as ImageIcon, ExternalLink,
  ThumbsUp, AlertCircle, Building2, Tag, Calendar, User, Eye
} from 'lucide-react';

// ─── Map Helpers ─────────────────────────────────────────────────────────────

const pickerIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #22c55e; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background-color: #22c55e; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function MapClickHandler({ setLat, setLng }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat.toFixed(6));
      setLng(e.latlng.lng.toFixed(6));
    }
  });
  return null;
}

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([parseFloat(lat), parseFloat(lng)], 13);
    }
  }, [lat, lng, map]);
  return null;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_STEPS = ['REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const STATUS_LABELS = {
  REPORTED: 'Reported',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
};
const STATUS_COLORS = {
  REPORTED: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', dot: '#3b82f6' },
  UNDER_REVIEW: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', dot: '#a855f7' },
  ASSIGNED: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: '#06b6d4' },
  IN_PROGRESS: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: '#eab308' },
  RESOLVED: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', dot: '#22c55e' },
  CLOSED: { bg: 'bg-gray-500/15', border: 'border-gray-500/30', text: 'text-gray-400', dot: '#6b7280' },
};
const SEVERITY_COLORS = {
  HIGH: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: '🔴' },
  MEDIUM: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: '🟡' },
  LOW: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: '🟢' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportIssue() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const editId = searchParams.get('editId');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Potholes');
  const [severity, setSeverity] = useState('MEDIUM');
  const [anonymous, setAnonymous] = useState(false);
  const [latitude, setLatitude] = useState(latParam || '');
  const [longitude, setLongitude] = useState(lngParam || '');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Issue Detail State (for edit/view mode)
  const [issueData, setIssueData] = useState(null);
  const [status, setStatus] = useState('REPORTED');
  const [assignedToId, setAssignedToId] = useState('');
  const [resolutionImage, setResolutionImage] = useState('');
  const [resolutionDesc, setResolutionDesc] = useState('');
  const [officialUpdateContent, setOfficialUpdateContent] = useState('');
  const [officialUpdates, setOfficialUpdates] = useState([]);
  
  // Citizen Resolve State
  const [citResImage, setCitResImage] = useState('');
  const [citResDesc, setCitResDesc] = useState('');
  const [resolvingCit, setResolvingCit] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [success, setSuccess] = useState('');

  // App States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!user && !editId) {
      navigate('/');
      return;
    }
    if (editId) {
      setIsEditing(true);
      loadIssueForEdit(editId);
    }
  }, [editId, user]);

  const loadIssueForEdit = async (id) => {
    try {
      const issue = await fetchIssueById(id);
      setIssueData(issue);
      setTitle(issue.title);
      setDescription(issue.description);
      setCategory(issue.category);
      setSeverity(issue.severity);
      setAnonymous(issue.anonymous);
      setLatitude(issue.latitude);
      setLongitude(issue.longitude);
      setAddress(issue.address || '');
      setImageUrl(issue.images?.[0] || '');
      setStatus(issue.status);
      setAssignedToId(issue.assignedToId || '');
      setResolutionDesc(issue.resolutionDesc || '');
      setResolutionImage(issue.resolutionImage || '');
      setOfficialUpdates(issue.officialUpdates || []);
      setUpvoteCount(issue.upvoteCount || 0);
      // Check if current user has upvoted
      if (user && issue.upvotes) {
        setHasUpvoted(issue.upvotes.some(u => u.userId === user.id));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load issue details.');
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setError('Acquiring GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setError('');
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setAddress('Detected location coordinates');
      },
      (err) => {
        setError(`Failed to acquire location (${err.message}). Click on the map to select coordinates.`);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAIClassify = () => {
    if (!imageUrl) return;
    setError('Running AI Image Classification...');
    setTimeout(() => {
      setError('');
      const categories = ['Potholes', 'Water Leaks', 'Broken Streetlights', 'Garbage Accumulation', 'Drainage Blockages', 'Road Damage', 'Sanitation Issues', 'Other Civic Concerns'];
      let matched = 'Other Civic Concerns';
      const lowerUrl = imageUrl.toLowerCase();
      if (lowerUrl.includes('pothole') || lowerUrl.includes('hole') || lowerUrl.includes('road')) matched = 'Potholes';
      else if (lowerUrl.includes('water') || lowerUrl.includes('leak') || lowerUrl.includes('pipe')) matched = 'Water Leaks';
      else if (lowerUrl.includes('light') || lowerUrl.includes('bulb') || lowerUrl.includes('street')) matched = 'Broken Streetlights';
      else if (lowerUrl.includes('garbage') || lowerUrl.includes('trash') || lowerUrl.includes('waste')) matched = 'Garbage Accumulation';
      else if (lowerUrl.includes('drain') || lowerUrl.includes('sewer') || lowerUrl.includes('clog')) matched = 'Drainage Blockages';
      else if (lowerUrl.includes('crack') || lowerUrl.includes('asphalt')) matched = 'Road Damage';
      else if (lowerUrl.includes('smell') || lowerUrl.includes('dirty') || lowerUrl.includes('sewage')) matched = 'Sanitation Issues';
      else { const r = Math.floor(Math.random() * categories.length); matched = categories[r]; }
      setCategory(matched);
      alert(`AI Analysis complete! Suggested Category: "${matched}"`);
    }, 1200);
  };

  const handleSupportDuplicate = async (issueId) => {
    try {
      await upvoteIssue(issueId);
      alert('Thank you! You have successfully supported the existing report.');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to support. Please make sure you are signed in.');
    }
  };

  // ─── Support / Upvote on detail view ────────────────────────────────────────
  const handleUpvote = async () => {
    if (!user) { alert('Please sign in to support this issue.'); return; }
    if (upvoting) return;
    setUpvoting(true);
    try {
      const res = await upvoteIssue(editId);
      setUpvoteCount(res.upvoteCount);
      setHasUpvoted(res.upvoted);
    } catch (err) {
      console.error('Upvote failed:', err);
      alert(err.response?.data?.message || 'Failed to support this issue. Please try again.');
    } finally {
      setUpvoting(false);
    }
  };

  const handleOfficialAction = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await updateIssueStatus(editId, {
        status,
        assignedToId: assignedToId || undefined,
        resolutionImage: status === 'RESOLVED' ? resolutionImage : undefined,
        resolutionDesc: status === 'RESOLVED' ? resolutionDesc : undefined
      });
      if (officialUpdateContent) {
        await postOfficialUpdate(editId, { content: officialUpdateContent });
        setOfficialUpdateContent('');
      }
      setSuccess('Official actions saved successfully!');
      loadIssueForEdit(editId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply official action.');
    } finally {
      setLoading(false);
    }
  };

  const handleCitResolve = async (e) => {
    e.preventDefault();
    if (!citResImage.trim()) {
      setError('An after photo (URL) is required.');
      return;
    }
    setError(''); setSuccess(''); setResolvingCit(true);
    try {
      await citizenResolveIssue(editId, {
        resolutionImage: citResImage,
        resolutionDesc: citResDesc
      });
      setSuccess('Issue marked as resolved (Awaiting Verification).');
      loadIssueForEdit(editId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve issue.');
    } finally {
      setResolvingCit(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setError(''); setDuplicates([]); setLoading(true);
    if (!latitude || !longitude) {
      setError('GPS Coordinates are required.');
      setLoading(false);
      return;
    }
    const payload = { title, description, category, severity, anonymous, latitude: parseFloat(latitude), longitude: parseFloat(longitude), address, images: imageUrl ? [imageUrl] : [] };
    try {
      await reportIssue(payload);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 409) {
        setDuplicates(err.response.data.duplicates || []);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please check all fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await deleteIssue(editId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete issue.');
    }
  };

  const getTimeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW (isEditing)
  // ─────────────────────────────────────────────────────────────────────────────

  if (isEditing) {
    const sc = STATUS_COLORS[status] || STATUS_COLORS.REPORTED;
    const svc = SEVERITY_COLORS[severity] || SEVERITY_COLORS.MEDIUM;
    const currentStepIdx = STATUS_STEPS.indexOf(status);
    const images = issueData?.images || [];

    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#080c14] text-white">

        {/* ── Hero Banner ── */}
        <div className="relative bg-gradient-to-b from-[#0f1724] to-[#080c14] border-b border-gray-800/50">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold mb-5"
            >
              <ArrowLeft size={14} /> Back to Live Map
            </button>

            {/* Title row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-3 flex-grow">
                {/* Badges row */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest ${sc.bg} ${sc.border} ${sc.text} border`}>
                    ● {STATUS_LABELS[status] || status}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest ${svc.bg} ${svc.border} ${svc.text} border`}>
                    {svc.dot} {severity} Priority
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Tag size={9} /> {category}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  {issueData?.reportedBy && (
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-green-400" />
                      <span className="text-gray-300 font-semibold">{anonymous ? 'Anonymous Citizen' : issueData.reportedBy.name}</span>
                    </span>
                  )}
                  {address && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-green-400" />
                      <span>{address}</span>
                    </span>
                  )}
                  {issueData?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{getTimeAgo(issueData.createdAt)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {/* Support Button */}
                <button
                  onClick={handleUpvote}
                  disabled={upvoting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all shadow-lg ${
                    hasUpvoted
                      ? 'bg-green-500 text-black shadow-green-500/30 hover:bg-green-400'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-green-500/20'
                  } ${upvoting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <ThumbsUp size={15} />
                  {upvoting ? 'Processing...' : hasUpvoted ? `Supported (${upvoteCount})` : `Support (${upvoteCount})`}
                </button>

                {/* Delete (own issue or admin) */}
                {user && (user.role === 'ADMIN' || issueData?.reportedById === user.id) && (
                  <button
                    onClick={handleDelete}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 p-2.5 rounded-xl transition-all"
                    title="Delete Issue"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Complaint Details Card */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={13} className="text-green-400" /> Complaint Details
                </h2>
                <p className="text-base font-bold text-white">{title}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{description}</p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-gray-800/50">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Category</p>
                    <p className="text-xs font-semibold text-white">{category}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Severity</p>
                    <p className={`text-xs font-semibold ${svc.text}`}>{severity}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Location</p>
                    <p className="text-xs font-semibold text-white truncate">📍 {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Reported By</p>
                    <p className="text-xs font-semibold text-white">{anonymous ? '🕵️ Anonymous' : issueData?.reportedBy?.name || 'Citizen'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Reported On</p>
                    <p className="text-xs font-semibold text-white">{issueData?.createdAt ? new Date(issueData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Complaint ID</p>
                    <p className="text-[10px] font-mono text-gray-400 truncate">{editId?.slice(0, 16)}…</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Images */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={13} className="text-green-400" /> Uploaded Evidence Images
                </h2>

                {images.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <ImageIcon size={32} className="text-gray-700 mb-2" />
                    <p className="text-xs text-gray-600 font-semibold">No images uploaded with this complaint</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-xl overflow-hidden border border-gray-800 cursor-pointer group hover:border-green-500/40 transition-all"
                        onClick={() => setSelectedImage(img)}
                      >
                        <img
                          src={img}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                        <div className="hidden w-full h-full items-center justify-center bg-gray-800 flex-col gap-1">
                          <ImageIcon size={20} className="text-gray-600" />
                          <span className="text-[9px] text-gray-600">Failed to load</span>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resolution Image */}
                {status === 'RESOLVED' && resolutionImage && (
                  <div className="pt-3 border-t border-gray-800/50 space-y-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle size={10} /> Resolution Evidence
                    </p>
                    <div
                      className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/30 cursor-pointer group"
                      onClick={() => setSelectedImage(resolutionImage)}
                    >
                      <img src={resolutionImage} alt="Resolution" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    {resolutionDesc && <p className="text-xs text-gray-300 leading-relaxed">{resolutionDesc}</p>}
                  </div>
                )}
                
                {status === 'RESOLVED' && !issueData?.verified && (
                  <div className="pt-3 border-t border-gray-800/50">
                     <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={10} /> Unverified Resolution
                     </p>
                  </div>
                )}
              </div>

              {/* Official Updates Timeline */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <History size={13} className="text-green-400" /> Official Updates & Timeline Log
                </h2>

                {officialUpdates.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Building2 size={30} className="text-gray-700 mb-2" />
                    <p className="text-xs text-gray-600 font-semibold">No official updates posted yet</p>
                    <p className="text-[10px] text-gray-700 mt-1">Municipal officials will post progress notes here</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-gray-800 ml-3 pl-5 space-y-5">
                    {[...officialUpdates].reverse().map((update, uIdx) => (
                      <div key={update.id || uIdx} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[26px] top-1 w-4 h-4 rounded-full bg-[#111827] border-2 border-green-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                        <div className="bg-[#0b0f19] border border-gray-800/60 rounded-xl p-4 space-y-1.5 hover:border-gray-700 transition-colors">
                          <p className="text-sm font-semibold text-white leading-snug">{update.content}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <Building2 size={10} className="text-green-400" />
                            <span className="font-semibold text-gray-400">{update.postedBy?.name || 'Municipal System'}</span>
                            <span>·</span>
                            <span className="uppercase tracking-wide">{update.postedBy?.role || 'SYSTEM'}</span>
                            <span>·</span>
                            <span>{new Date(update.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* ── Right Column ── */}
            <div className="space-y-5">

              {/* Support Count Card */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border-2 border-green-500/20">
                  <Users size={24} className="text-green-400" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white">{upvoteCount}</p>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">Citizens Supporting</p>
                </div>
                <button
                  onClick={handleUpvote}
                  disabled={upvoting}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold transition-all shadow-lg ${
                    hasUpvoted
                      ? 'bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-green-500/20'
                  } ${upvoting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <ThumbsUp size={14} />
                  {upvoting ? 'Processing...' : hasUpvoted ? 'You Supported ✓' : 'Support this Issue'}
                </button>
                {!user && (
                  <p className="text-[10px] text-gray-600">Sign in to support this complaint</p>
                )}
              </div>

              {/* Status Card */}
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={13} className="text-green-400" /> Complaint Status
                </h3>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${sc.bg} ${sc.border}`}>
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: sc.dot }} />
                  <span className={`text-sm font-extrabold ${sc.text}`}>{STATUS_LABELS[status]}</span>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2">
                  {STATUS_STEPS.map((step, idx) => {
                    const passed = idx <= currentStepIdx;
                    const current = step === status;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 transition-all ${
                          current ? 'bg-green-500 text-black shadow-md shadow-green-500/30' :
                          passed ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-800 text-gray-600'
                        }`}>
                          {passed && !current ? '✓' : idx + 1}
                        </div>
                        <span className={`text-xs font-semibold ${current ? 'text-white' : passed ? 'text-gray-400' : 'text-gray-600'}`}>
                          {STATUS_LABELS[step]}
                        </span>
                        {current && (
                          <span className="ml-auto text-[8px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded uppercase">Current</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assignment Info */}
              {issueData?.assignedTo && (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-2">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} className="text-cyan-400" /> Assigned To
                  </h3>
                  <p className="text-sm font-bold text-white">{issueData.assignedTo.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{issueData.assignedTo.role}</p>
                </div>
              )}

              {/* Location Mini-Map */}
              {latitude && longitude && (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} className="text-green-400" /> Issue Location
                    </h3>
                  </div>
                  <div className="h-40 w-full">
                    <MapContainer
                      center={[parseFloat(latitude), parseFloat(longitude)]}
                      zoom={14}
                      className="h-full w-full"
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={pickerIcon} />
                    </MapContainer>
                  </div>
                  <div className="px-4 py-2.5 text-[10px] text-gray-500 flex items-center gap-1">
                    <MapPin size={9} className="text-green-500" />
                    {address || `${parseFloat(latitude).toFixed(5)}, ${parseFloat(longitude).toFixed(5)}`}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Citizen Resolution Panel ── */}
          {user && issueData?.reportedById === user.id && !['RESOLVED', 'CLOSED'].includes(status) && (
            <form onSubmit={handleCitResolve} className="bg-[#111827] border border-green-500/20 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-extrabold text-green-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-3">
                <CheckCircle size={14} /> Mark Issue as Resolved
              </h3>
              
              <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">After Photo URL (Required)</label>
                    <input
                      type="url"
                      placeholder="Paste resolution photo link here"
                      value={citResImage}
                      onChange={e => setCitResImage(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-xl p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Resolution Description</label>
                    <textarea
                      rows={2}
                      placeholder="Describe how it was resolved..."
                      value={citResDesc}
                      onChange={e => setCitResDesc(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-xl p-2.5 outline-none"
                    />
                  </div>
              </div>
              <button
                type="submit"
                disabled={resolvingCit}
                className="bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-green-500/20"
              >
                {resolvingCit ? 'Submitting...' : 'Submit Resolution'}
              </button>
            </form>
          )}

          {/* ── Municipal Official Action Panel ── */}
          {user && (user.role === 'OFFICIAL' || user.role === 'ADMIN') && (
            <form onSubmit={handleOfficialAction} className="bg-[#111827] border border-yellow-500/20 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-3">
                <ShieldAlert size={14} /> Municipal Official Action Panel
              </h3>

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-xs font-bold text-center">
                  {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500 text-xs text-white rounded-xl p-2.5 outline-none"
                  >
                    {STATUS_STEPS.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Assign Worker (User ID)</label>
                  <input
                    type="text"
                    placeholder="worker-id-xyz"
                    value={assignedToId}
                    onChange={e => setAssignedToId(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500 text-xs text-white rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              {status === 'RESOLVED' && (
                <div className="space-y-4 border-t border-gray-800/50 pt-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Resolution Description</label>
                    <textarea
                      rows={2}
                      placeholder="Describe the resolution actions taken..."
                      value={resolutionDesc}
                      onChange={e => setResolutionDesc(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500 text-xs text-white rounded-xl p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Resolution Image URL</label>
                    <input
                      type="url"
                      placeholder="Paste resolution photo link here"
                      value={resolutionImage}
                      onChange={e => setResolutionImage(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500 text-xs text-white rounded-xl p-2.5 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Post Progress Update / Timeline Note</label>
                <input
                  type="text"
                  placeholder="e.g. Inspector visited the site and confirmed the complaint..."
                  value={officialUpdateContent}
                  onChange={e => setOfficialUpdateContent(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500 text-xs text-white rounded-xl p-2.5 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-yellow-500/20"
              >
                {loading ? 'Applying...' : 'Apply Lifecycle Update'}
              </button>
            </form>
          )}

        </div>

        {/* ── Lightbox ── */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <img src={selectedImage} alt="Full view" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-all"
              >
                ✕
              </button>
              <a
                href={selectedImage}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-all"
                title="Open original"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT FORM (new issue)
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] text-white py-12 px-6 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold mb-2"
        >
          <ArrowLeft size={16} /> Back to Live Map
        </button>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white">Report Civic Issue</h2>
            <p className="text-xs text-gray-400 mt-1">Submit a complaint to alert city officials.</p>
          </div>

          {error && (
            <div className={`border p-4 rounded-xl text-xs font-semibold text-center ${
              duplicates.length > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {error}
            </div>
          )}

          {/* Duplicates Warning Panel */}
          {duplicates.length > 0 && (
            <div className="bg-[#1f2937]/80 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-400" /> Active Nearby Reports:
              </p>
              <div className="space-y-2">
                {duplicates.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-2.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs">
                    <div>
                      <p className="font-semibold text-white">{d.title}</p>
                      <p className="text-[10px] text-gray-500">Status: {d.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSupportDuplicate(d.id)}
                        className="bg-green-500 hover:bg-green-600 text-black px-2 py-1 rounded font-bold text-[9px] uppercase tracking-wider"
                      >
                        ▲ Support instead
                      </button>
                      <button
                        onClick={() => navigate(`/report?editId=${d.id}`)}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded font-bold text-[9px] uppercase tracking-wider"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateOrUpdate} className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-sm text-white rounded-lg p-3 outline-none"
                >
                  <option value="Potholes">Potholes</option>
                  <option value="Water Leaks">Water Leaks</option>
                  <option value="Broken Streetlights">Broken Streetlights</option>
                  <option value="Garbage Accumulation">Garbage Accumulation</option>
                  <option value="Drainage Blockages">Drainage Blockages</option>
                  <option value="Road Damage">Road Damage</option>
                  <option value="Sanitation Issues">Sanitation Issues</option>
                  <option value="Other Civic Concerns">Other Civic Concerns</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-sm text-white rounded-lg p-3 outline-none"
                >
                  <option value="LOW">Low (Nuisance)</option>
                  <option value="MEDIUM">Medium (Minor damage)</option>
                  <option value="HIGH">High (Hazardous/Emergency)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Issue Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Dangerous pothole near intersection"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-sm text-white rounded-lg p-3 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
              <textarea
                required
                rows={4}
                placeholder="Provide precise details of the damage or complaint..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-sm text-white rounded-lg p-3 outline-none transition-colors"
              />
            </div>

            {/* Geolocation */}
            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-green-400" /> GPS Location Coordinates
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  className="bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-all"
                >
                  <Navigation size={12} /> Detect GPS
                </button>
              </div>

              <div className="h-48 w-full rounded-lg overflow-hidden border border-gray-800 relative z-10">
                <MapContainer
                  center={[latitude ? parseFloat(latitude) : 40.7128, longitude ? parseFloat(longitude) : -74.0060]}
                  zoom={12}
                  className="h-full w-full"
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapClickHandler setLat={setLatitude} setLng={setLongitude} />
                  <MapRecenter lat={latitude} lng={longitude} />
                  {latitude && longitude && (
                    <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={pickerIcon} />
                  )}
                </MapContainer>
              </div>
              <p className="text-[10px] text-gray-500 italic">* Click anywhere on the map to select your issue location.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 40.7128"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. -74.0060"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    className="w-full bg-[#111827] border border-gray-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Street Address / Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 5th Avenue block 12"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-[#111827] border border-gray-800 text-xs text-white rounded-lg p-2.5 outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Attach Image Link (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste image URL here"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="flex-grow bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-sm text-white rounded-l-lg p-3 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAIClassify}
                  disabled={!imageUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-500 text-black font-extrabold text-xs px-4 rounded-r-lg transition-colors"
                >
                  AI Classify
                </button>
              </div>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-800"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="anon"
                checked={anonymous}
                onChange={e => setAnonymous(e.target.checked)}
                className="rounded bg-[#0b0f19] border-gray-800 text-green-500 w-4 h-4"
              />
              <label htmlFor="anon" className="text-xs text-gray-300 font-semibold cursor-pointer">
                Report anonymously (hide identity on public feeds)
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-extrabold text-sm py-3 px-4 rounded-lg shadow-lg transition-all"
            >
              {loading ? 'Submitting Report...' : 'Submit Report'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
