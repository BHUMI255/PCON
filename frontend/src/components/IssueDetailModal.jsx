import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchIssueById, upvoteIssue, postOfficialUpdate, updateIssueStatus, verifyIssue, citizenResolveIssue } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import {
  X, MapPin, Clock, ThumbsUp, AlertTriangle, CheckCircle2,
  Shield, User, Users, Image as ImageIcon, MessageSquare,
  ChevronRight, Loader2, Send, ShieldCheck, Building2, Lock
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────
const STATUS_CONFIG = {
  REPORTED:     { color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400',   label: 'Reported' },
  UNDER_REVIEW: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400', label: 'Under Review' },
  ASSIGNED:     { color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',   dot: 'bg-cyan-400',   label: 'Assigned' },
  IN_PROGRESS:  { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', label: 'In Progress' },
  RESOLVED:     { color: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400',  label: 'Resolved' },
  CLOSED:       { color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',   dot: 'bg-gray-400',   label: 'Closed' },
};

const STATUS_ORDER = ['REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

const SEVERITY_CONFIG = {
  HIGH:   { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    label: 'High' },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Medium' },
  LOW:    { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  label: 'Low' },
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Status progress bar ────────────────────────────────────
function StatusTimeline({ status }) {
  const currentIdx = STATUS_ORDER.indexOf(status);
  const isClosed = status === 'CLOSED';

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        {STATUS_ORDER.map((s, i) => {
          const isActive   = i <= currentIdx;
          const isCurrent  = s === status;
          const cfg        = STATUS_CONFIG[s];
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1 z-10">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? `${cfg.dot} border-transparent shadow-lg`
                    : 'bg-gray-800 border-gray-700'
                }`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-white/80" />}
                </div>
                <span className={`text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {cfg.label}
                </span>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div className={`flex-grow h-0.5 mx-0.5 ${i < currentIdx ? 'bg-green-500/60' : 'bg-gray-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isClosed && (
        <p className="text-[10px] text-gray-500 text-center mt-1 flex items-center justify-center gap-1">
          <Lock size={10} /> This issue has been closed
        </p>
      )}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────
export default function IssueDetailModal({ issueId, onClose, onUpvoteChange }) {
  const { user } = useContext(AuthContext);
  const permissions = usePermissions();

  const [issue, setIssue]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'updates' | 'images'
  const [lightbox, setLightbox]   = useState(null);

  // Official update form
  const [updateText, setUpdateText]         = useState('');
  const [postingUpdate, setPostingUpdate]   = useState(false);

  // Status change
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus]           = useState('');

  // Citizen resolve
  const [citResImage, setCitResImage] = useState('');
  const [citResDesc, setCitResDesc] = useState('');
  const [resolvingCit, setResolvingCit] = useState(false);

  // Verify issue
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!issueId) return;
    loadIssue();
  }, [issueId]);

  const loadIssue = async () => {
    setLoading(true);
    try {
      const data = await fetchIssueById(issueId);
      setIssue(data);
      setNewStatus(data.status);
    } catch (err) {
      console.error('Failed to load issue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) { alert('Please sign in to support this issue.'); return; }
    try {
      const res = await upvoteIssue(issueId);
      setIssue(prev => ({ ...prev, upvoteCount: res.upvoteCount }));
      onUpvoteChange?.(issueId, res.upvoteCount);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not register your support. Please try again.');
    }
  };

  const handlePostUpdate = async () => {
    if (!updateText.trim()) return;
    setPostingUpdate(true);
    try {
      await postOfficialUpdate(issueId, { content: updateText.trim() });
      setUpdateText('');
      await loadIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post update.');
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === issue.status) return;
    setChangingStatus(true);
    try {
      await updateIssueStatus(issueId, { status: newStatus });
      await loadIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleCitResolve = async () => {
    if (!citResImage.trim()) return;
    setResolvingCit(true);
    try {
      await citizenResolveIssue(issueId, { resolutionImage: citResImage, resolutionDesc: citResDesc });
      await loadIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve issue.');
    } finally {
      setResolvingCit(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await verifyIssue(issueId);
      await loadIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify issue.');
    } finally {
      setVerifying(false);
    }
  };

  if (!issueId) return null;

  const sev  = issue ? SEVERITY_CONFIG[issue.severity] : null;
  const stat = issue ? STATUS_CONFIG[issue.status]     : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000]"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[2001] glass-modal rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ animation: 'scaleIn 0.25s ease-out' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-800 flex-shrink-0">
          {loading ? (
            <div className="h-6 bg-gray-800 rounded w-64 animate-pulse" />
          ) : (
            <div className="flex-grow min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 uppercase tracking-wider">
                  {issue?.category}
                </span>
                {sev && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${sev.bg} ${sev.color}`}>
                    ● {sev.label} Severity
                  </span>
                )}
                {stat && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase ${stat.color}`}>
                    {stat.label}
                  </span>
                )}
                {issue?.verified ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-0.5">
                    <ShieldCheck size={9} /> Verified ✓
                  </span>
                ) : (issue?.status === 'RESOLVED' || issue?.status === 'CLOSED') ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-0.5">
                    <AlertTriangle size={9} /> Unverified Resolution
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg font-black text-white leading-snug">{issue?.title}</h2>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-green-400 animate-spin" />
              <p className="text-gray-500 text-xs font-semibold">Loading issue details...</p>
            </div>
          </div>
        ) : !issue ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">Issue not found.</div>
        ) : (
          <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

            {/* ── Left Panel ── */}
            <div className="lg:w-[420px] flex-shrink-0 border-r border-gray-800 overflow-y-auto">

              {/* Status Timeline */}
              <div className="p-5 border-b border-gray-800 space-y-3">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Progress</p>
                <StatusTimeline status={issue.status} />
              </div>

              {/* Support button */}
              <div className="p-5 border-b border-gray-800">
                <button
                  onClick={handleUpvote}
                  disabled={!user}
                  className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                    user
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-lg shadow-green-500/20'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <ThumbsUp size={16} />
                  {user ? `Support This Issue` : 'Sign In to Support'}
                  <span className="bg-black/20 px-2 py-0.5 rounded-lg text-xs font-bold">
                    {issue.upvoteCount}
                  </span>
                </button>
                {!user && (
                  <p className="text-[10px] text-gray-600 text-center mt-2">
                    {issue.upvoteCount} community member{issue.upvoteCount !== 1 ? 's' : ''} support this
                  </p>
                )}
              </div>

              {/* Meta info */}
              <div className="p-5 space-y-3 border-b border-gray-800">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Details</p>

                {issue.address && (
                  <div className="flex items-start gap-2.5 text-xs text-gray-300">
                    <MapPin size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{issue.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-xs text-gray-400">
                  <Clock size={13} className="text-gray-500 flex-shrink-0" />
                  <span>Reported {formatDate(issue.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-400">
                  <User size={13} className="text-gray-500 flex-shrink-0" />
                  <span>
                    {issue.anonymous
                      ? 'Anonymous Citizen'
                      : issue.reportedBy?.name || 'Unknown'}
                    {issue.reportedBy?.locality && !issue.anonymous && (
                      <span className="text-gray-600"> · {issue.reportedBy.locality}</span>
                    )}
                  </span>
                </div>
                {issue.assignedTo && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-400">
                    <Building2 size={13} className="text-cyan-500 flex-shrink-0" />
                    <span>Assigned to <span className="text-cyan-400 font-semibold">{issue.assignedTo.name}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-xs text-gray-400">
                  <Users size={13} className="text-gray-500 flex-shrink-0" />
                  <span><span className="text-white font-bold">{issue.upvoteCount}</span> community supporters</span>
                </div>
              </div>

              {/* Official: status change */}
              {permissions.canUpdateIssueStatus && (
                <div className="p-5 space-y-3 border-b border-gray-800">
                  <p className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest flex items-center gap-1">
                    <Building2 size={9} /> Official: Change Status
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="flex-grow bg-[#0b0f19] border border-gray-800 focus:border-yellow-500/50 text-xs text-white rounded-lg px-3 py-2 outline-none"
                    >
                      {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleStatusChange}
                      disabled={changingStatus || newStatus === issue.status}
                      className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                    >
                      {changingStatus ? <Loader2 size={13} className="animate-spin" /> : 'Update'}
                    </button>
                  </div>
                </div>
              )}

              {/* Citizen: Resolve their own issue */}
              {user && issue?.reportedById === user.id && !['RESOLVED', 'CLOSED'].includes(issue.status) && (
                <div className="p-5 space-y-3 border-b border-gray-800">
                  <p className="text-[9px] font-bold text-green-500/70 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={9} /> Mark as Resolved
                  </p>
                  <input
                    type="text"
                    placeholder="After Photo URL (Required)"
                    value={citResImage}
                    onChange={e => setCitResImage(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500/50 text-xs text-white rounded-lg px-3 py-2 outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Resolution Description (Optional)"
                    value={citResDesc}
                    onChange={e => setCitResDesc(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500/50 text-xs text-white rounded-lg px-3 py-2 outline-none resize-none"
                  />
                  <button
                    onClick={handleCitResolve}
                    disabled={resolvingCit || !citResImage.trim()}
                    className="w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                  >
                    {resolvingCit ? <Loader2 size={13} className="animate-spin mx-auto" /> : 'Submit Resolution'}
                  </button>
                </div>
              )}

              {/* Moderator/Official/Admin: verify issue */}
              {permissions.canVerifyIssue && issue?.status === 'RESOLVED' && (
                <div className="p-5 border-b border-gray-800">
                  {issue.verified ? (
                    <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                      <ShieldCheck size={14} />
                      <span>Issue Verified</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleVerify}
                      disabled={verifying}
                      className="w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-400 transition-all disabled:opacity-50"
                    >
                      <ShieldCheck size={13} />
                      {verifying ? 'Verifying...' : 'Verify This Issue'}
                    </button>
                  )}
                </div>
              )}

              {/* Visitor: read-only notice */}
              {!user && (
                <div className="p-5 border-b border-gray-800">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Lock size={13} className="text-gray-400" />
                    <p className="text-[11px] text-gray-400 font-semibold">
                      <span className="text-white hover:underline cursor-pointer">Sign in</span> to support, report, or interact with this issue.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Panel ── */}
            <div className="flex-grow flex flex-col overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-gray-800 px-5 gap-1 flex-shrink-0">
                {[
                  { key: 'details', label: 'Complaint', icon: <MessageSquare size={12} /> },
                  { key: 'images',  label: `Photos (${[...(issue.images || []), ...(issue.resolutionImage ? [issue.resolutionImage] : [])].length})`, icon: <ImageIcon size={12} /> },
                  { key: 'updates', label: `Updates (${(issue.officialUpdates || []).length})`, icon: <Shield size={12} /> },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-3 border-b-2 transition-all ${
                      activeTab === tab.key
                        ? 'border-green-500 text-green-400'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-grow overflow-y-auto p-5 space-y-5">

                {/* ── DETAILS TAB ── */}
                {activeTab === 'details' && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description</p>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
                    </div>

                    {/* Resolution info */}
                    {(issue.status === 'RESOLVED' || issue.status === 'CLOSED') && issue.resolutionDesc && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
                        <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 size={10} /> Resolution Summary
                        </p>
                        <p className="text-xs text-gray-300">{issue.resolutionDesc}</p>
                        {issue.resolvedAt && (
                          <p className="text-[10px] text-gray-500">Resolved on {formatDate(issue.resolvedAt)}</p>
                        )}
                      </div>
                    )}

                    {/* Map embed */}
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Location</p>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${issue.latitude}&mlon=${issue.longitude}#map=17/${issue.latitude}/${issue.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 transition-colors font-semibold"
                      >
                        <MapPin size={13} />
                        {issue.latitude?.toFixed(5)}, {issue.longitude?.toFixed(5)}
                        <ChevronRight size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* ── IMAGES TAB ── */}
                {activeTab === 'images' && (
                  <div className="space-y-4">
                    {/* Reported images */}
                    {issue.images?.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Reported Photos</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {issue.images.map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setLightbox(img)}
                              className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-gray-800 hover:border-green-500/40 transition-all group"
                            >
                              <img
                                src={img}
                                alt={`Issue photo ${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.target.src = 'https://placehold.co/300x300/111827/4b5563?text=No+Image'; }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution image */}
                    {issue.resolutionImage && (
                      <div>
                        <p className="text-[9px] font-bold text-green-500/70 uppercase tracking-widest mb-3 flex items-center gap-1">
                          <CheckCircle2 size={9} /> Resolution Photo
                        </p>
                        <div
                          onClick={() => setLightbox(issue.resolutionImage)}
                          className="w-48 aspect-square rounded-xl overflow-hidden cursor-pointer border border-green-500/30 hover:border-green-500/60 transition-all group"
                        >
                          <img
                            src={issue.resolutionImage}
                            alt="Resolution"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { e.target.src = 'https://placehold.co/300x300/111827/4b5563?text=No+Image'; }}
                          />
                        </div>
                      </div>
                    )}

                    {/* No images */}
                    {!issue.images?.length && !issue.resolutionImage && (
                      <div className="text-center py-16 space-y-3">
                        <ImageIcon size={40} className="mx-auto text-gray-700" />
                        <p className="text-gray-500 font-bold text-sm">No photos uploaded</p>
                        <p className="text-xs text-gray-600">The reporter did not attach any images to this issue.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── UPDATES TAB ── */}
                {activeTab === 'updates' && (
                  <div className="space-y-4">
                    {/* Post update (officials) */}
                    {permissions.canPostOfficialUpdates && (
                      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-[9px] font-bold text-yellow-400/80 uppercase tracking-widest flex items-center gap-1">
                          <Building2 size={9} /> Post Official Update
                        </p>
                        <textarea
                          rows={3}
                          value={updateText}
                          onChange={e => setUpdateText(e.target.value)}
                          placeholder="Write an official status update for the community..."
                          className="w-full bg-[#0b0f19] border border-gray-800 focus:border-yellow-500/50 text-xs text-white rounded-lg p-3 outline-none resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handlePostUpdate}
                            disabled={postingUpdate || !updateText.trim()}
                            className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40"
                          >
                            {postingUpdate ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Post Update
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Updates list */}
                    {issue.officialUpdates?.length > 0 ? (
                      <div className="space-y-3">
                        {[...issue.officialUpdates].reverse().map(update => (
                          <div key={update.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Building2 size={13} className="text-blue-400" />
                            </div>
                            <div className="flex-grow bg-[#1a2235] border border-gray-800/60 rounded-xl p-3.5 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-blue-400">
                                  {update.postedBy?.name || 'Official'}
                                  {update.postedBy?.role && (
                                    <span className="ml-1.5 text-[9px] text-gray-500 font-normal uppercase tracking-wider">
                                      {update.postedBy.role}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-gray-600">{timeAgo(update.createdAt)}</span>
                              </div>
                              <p className="text-xs text-gray-300 leading-relaxed">{update.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 space-y-3">
                        <Shield size={40} className="mx-auto text-gray-700" />
                        <p className="text-gray-500 font-bold text-sm">No official updates yet</p>
                        <p className="text-xs text-gray-600">Municipal officials will post progress updates here.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-white transition-all"
            onClick={() => setLightbox(null)}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}
