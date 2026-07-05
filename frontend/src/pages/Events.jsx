import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { fetchEvents, createEvent, registerForEvent, cancelEventRegistration, fetchUserEvents, toggleEventReminder } from '../services/api';
import { Calendar, UserCheck, Plus, Clock, Users, MapPin, Award, Filter, X, CheckCircle, Leaf, Recycle, Megaphone, TreePine, Trash2, ChevronDown, History, Bell, BellOff, BellRing, LogIn, Eye } from 'lucide-react';

const EVENT_CATEGORIES = [
  { value: '', label: 'All Events', icon: '🌐' },
  { value: 'CLEANLINESS', label: 'Cleanliness Drive', icon: '🧹', color: 'from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30' },
  { value: 'PLANTATION', label: 'Tree Plantation', icon: '🌳', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'MEETING', label: 'Public Meeting', icon: '🤝', color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30' },
  { value: 'RECYCLING', label: 'Recycling Initiative', icon: '♻️', color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'AWARENESS', label: 'Awareness Program', icon: '📢', color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'OTHER', label: 'Other Activity', icon: '⭐', color: 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30' },
];

const EVENT_STATUSES = ['', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const STATUS_STYLES = {
  UPCOMING: 'bg-green-500/10 text-green-400 border-green-500/20',
  ONGOING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse',
  COMPLETED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const getCategoryInfo = (value) => EVENT_CATEGORIES.find(c => c.value === value) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];

function TimeUntil({ dateTime }) {
  const diff = Math.floor((new Date(dateTime) - Date.now()) / 1000);
  if (diff < 0) return <span className="text-gray-500">Past</span>;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return <span className="text-green-400 font-bold">In {days}d {hours}h</span>;
  if (hours > 0) return <span className="text-yellow-400 font-bold">In {hours}h</span>;
  return <span className="text-red-400 font-bold">Starting soon!</span>;
}

function EventCard({ event, user, onRegister, onCancel, onToggleReminder, permissions }) {
  const isJoined = event.volunteers?.some(v => v.userId === user?.id);
  const limitReached = event.maxVolunteers && (event._count?.volunteers || 0) >= event.maxVolunteers;
  const catInfo = getCategoryInfo(event.category);
  const isPast = event.status === 'COMPLETED' || event.status === 'CANCELLED';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-[#111827] border rounded-2xl overflow-hidden shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5 ${isJoined ? 'border-green-500/30' : 'border-gray-800 hover:border-gray-700'}`}>
      {/* Category color bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${catInfo?.color?.split(' ')[0]?.replace('from-', 'from-').replace('/20', '/60') || 'from-gray-700'} to-transparent`} />
      
      <div className="p-6 space-y-4">
        {/* Header badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${catInfo?.color || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {catInfo?.icon} {catInfo?.label}
            </span>
            {isJoined && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                ✓ Registered
              </span>
            )}
          </div>
          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border uppercase flex-shrink-0 ${STATUS_STYLES[event.status] || ''}`}>
            {event.status}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-extrabold text-white leading-snug">{event.title}</h3>
          <p className={`text-xs text-gray-400 leading-relaxed mt-2 ${!expanded ? 'line-clamp-2' : ''}`}>{event.description}</p>
          {event.description.length > 100 && (
            <button onClick={() => setExpanded(v => !v)} className="text-[10px] text-green-400 font-bold mt-1">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Details grid */}
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-green-500 flex-shrink-0" />
            <span>{event.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-green-500 flex-shrink-0" />
            <span>{new Date(event.dateTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {!isPast && <span className="ml-auto text-[10px]"><TimeUntil dateTime={event.dateTime} /></span>}
          </div>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-green-500 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-grow">
              <span>{event._count?.volunteers || 0} volunteers</span>
              {event.maxVolunteers && (
                <>
                  <div className="flex-grow bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((event._count?.volunteers || 0) / event.maxVolunteers) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">/ {event.maxVolunteers}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-600">
            <span>Organized by <span className="text-gray-400 font-semibold">{event.organizer?.name}</span></span>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 space-y-2">
          {isJoined ? (
            <>
              <button
                onClick={() => onCancel(event.id)}
                className="w-full border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <UserCheck size={14} /> Cancel Registration
              </button>
              {event.status === 'UPCOMING' && (
                <button
                  onClick={() => onToggleReminder(event.id)}
                  className={`w-full text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border ${
                    event.reminderEnabled
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {event.reminderEnabled ? <BellRing size={13} /> : <BellOff size={13} />}
                  {event.reminderEnabled ? '🔔 Reminder Set' : 'Set Reminder'}
                </button>
              )}
            </>
          ) : !permissions?.canRegisterForEvents ? (
            // VISITOR: show sign-in prompt instead of register button
            <button
              onClick={() => window.location.href = '/'}
              className="w-full text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 bg-[#1a2235] border border-gray-700 hover:border-green-500/40 text-gray-400 hover:text-green-400 transition-all"
            >
              <LogIn size={14} /> Sign In to Register
            </button>
          ) : (
            <button
              onClick={() => onRegister(event.id)}
              disabled={limitReached || event.status !== 'UPCOMING'}
              className={`w-full text-xs font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all ${
                limitReached
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : event.status !== 'UPCOMING'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-green-500/20 hover:shadow-green-500/30'
              }`}
            >
              {limitReached ? '⚑ Slots Full' : event.status !== 'UPCOMING' ? 'Event Closed' : (
                <>
                  <UserCheck size={14} /> Join & Volunteer <span className="ml-1 text-[10px] opacity-75">(+15 XP)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  const { user } = useContext(AuthContext);
  const permissions = usePermissions();

  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'my'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('UPCOMING');

  // Create form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('CLEANLINESS');
  const [address, setAddress] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [maxVolunteers, setMaxVolunteers] = useState('20');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    if (user && activeTab === 'my') loadMyEvents();
  }, [user, activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await fetchEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyEvents = async () => {
    try {
      const data = await fetchUserEvents();
      setMyEvents(data);
    } catch (err) {
      console.error('Failed to load my events:', err);
    }
  };

  const handleRegister = async (eventId) => {
    if (!user) return alert('Please sign in to register for events');
    try {
      await registerForEvent(eventId);
      loadEvents();
      if (activeTab === 'my') loadMyEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleCancelRegistration = async (eventId) => {
    try {
      await cancelEventRegistration(eventId);
      loadEvents();
      if (activeTab === 'my') loadMyEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReminder = async (eventId) => {
    if (!user) return alert('Please sign in to set reminders');
    try {
      await toggleEventReminder(eventId, { reminderMinsBefore: 60 });
      loadEvents();
      if (activeTab === 'my') loadMyEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle reminder');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createEvent({ title, description, category, address, dateTime, maxVolunteers: parseInt(maxVolunteers) });
      setTitle(''); setDescription(''); setAddress(''); setDateTime('');
      setShowCreateForm(false);
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] text-white">

      {/* HERO HEADER */}
      <div className="bg-gradient-to-r from-[#111827] to-[#0f1a2e] border-b border-gray-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Calendar size={18} className="text-black" />
              </div>
              Community Events
            </h1>
            <p className="text-xs text-gray-400 mt-1 ml-12">Cleanliness drives · Tree plantations · Public meetings · Awareness programs</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Visitor info badge */}
            {!user && (
              <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-xl">
                <Eye size={13} className="text-blue-400" />
                <span className="text-[10px] text-blue-400 font-semibold">Viewing as Guest</span>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-3 bg-[#1f2937]/60 px-4 py-2.5 rounded-xl border border-gray-800">
                <Award className="text-yellow-400 w-6 h-6" />
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-none">Your XP</p>
                  <p className="text-base font-black text-white">{user.participationScore || 0} pts</p>
                </div>
              </div>
            )}
            {/* Only Officials and Admins can create events */}
            {permissions.canCreateEvents && (
              <button
                onClick={() => setShowCreateForm(v => !v)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-green-500/20 transition-all"
              >
                <Plus size={14} /> Create Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-[#0d1420] border-b border-gray-800/60 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-1 py-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'browse' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Calendar size={12} /> Browse Events
          </button>
          {user && (
            <button
              onClick={() => setActiveTab('my')}
              className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'my' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <History size={12} /> My Participation
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="bg-[#111827] border border-gray-700 rounded-2xl p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h3 className="text-base font-black text-white uppercase tracking-wider">Publish New Event</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Event Name *</label>
                  <input required type="text" placeholder="e.g. Green Park Cleanup Drive"
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category *</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none">
                    {EVENT_CATEGORIES.filter(c => c.value).map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description *</label>
                <textarea required rows={3} placeholder="What is this event about? What should volunteers bring?"
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Location / Address *</label>
                  <input required type="text" placeholder="e.g. Central Park East Gate"
                    value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Max Volunteers</label>
                  <input type="number" placeholder="20" value={maxVolunteers} onChange={e => setMaxVolunteers(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Date & Time *</label>
                <input required type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 text-xs text-white rounded-lg p-3 outline-none" />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold px-4 py-2.5">Cancel</button>
                <button type="submit" disabled={creating}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-black text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-lg disabled:opacity-70">
                  {creating ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* BROWSE TAB */}
        {activeTab === 'browse' && (
          <>
            {/* Category cards quick filter */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {EVENT_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    categoryFilter === cat.value
                      ? 'bg-green-500/10 border-green-500/40 text-green-400'
                      : 'bg-[#111827]/40 border-gray-800 hover:border-gray-600 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide leading-tight">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Status filter row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <Filter size={11} /> Status:
              </span>
              {EVENT_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    statusFilter === s
                      ? 'bg-green-500 text-black border-green-500'
                      : 'bg-[#111827] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>

            {/* Event cards */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-6 animate-pulse space-y-3">
                    <div className="h-3 bg-gray-800 rounded w-1/3" />
                    <div className="h-5 bg-gray-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-800 rounded w-full" />
                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                    <div className="h-10 bg-gray-800 rounded-xl mt-4" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 font-bold">No events found for this filter</p>
                <p className="text-xs text-gray-600 mt-1">Try changing the category or status filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    user={user}
                    permissions={permissions}
                    onRegister={handleRegister}
                    onCancel={handleCancelRegistration}
                    onToggleReminder={handleToggleReminder}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* MY PARTICIPATION TAB */}
        {activeTab === 'my' && user && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                <History size={18} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">My Event History</h2>
                <p className="text-xs text-gray-400">All events you've registered for</p>
              </div>
              <span className="ml-auto bg-green-500/10 text-green-400 text-xs font-bold px-3 py-1 rounded-lg border border-green-500/20">
                {myEvents.length} Events
              </span>
            </div>

            {myEvents.length === 0 ? (
              <div className="text-center py-20 bg-[#111827] border border-gray-800 rounded-2xl">
                <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 font-bold">No events registered yet</p>
                <p className="text-xs text-gray-600 mt-1">Browse events and join a community campaign!</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 bg-green-500 text-black text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvents.map(event => {
                  const catInfo = getCategoryInfo(event.category);
                  const isPast = event.status === 'COMPLETED' || event.status === 'CANCELLED';
                  return (
                    <div key={event.id} className={`bg-[#111827] border rounded-xl p-5 flex items-center gap-5 transition-all ${isPast ? 'border-gray-800/50 opacity-70' : 'border-green-500/20'}`}>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catInfo?.color?.split(' ')[0] || 'from-gray-700'} to-transparent flex items-center justify-center text-2xl flex-shrink-0`}>
                        {catInfo?.icon}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-bold text-white truncate">{event.title}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                          <Calendar size={11} /> {new Date(event.dateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          <MapPin size={11} /> {event.address}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase ${STATUS_STYLES[event.status] || ''}`}>
                          {event.status}
                        </span>
                        {event.status === 'COMPLETED' && (
                          <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                            <CheckCircle size={10} /> +15 XP earned
                          </span>
                        )}
                        {event.status === 'UPCOMING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleReminder(event.id)}
                              className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                event.reminderEnabled
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-gray-500 hover:text-gray-400'
                              }`}
                              title={event.reminderEnabled ? 'Reminder is ON — click to turn off' : 'Set a reminder'}
                            >
                              {event.reminderEnabled ? <BellRing size={12} /> : <Bell size={12} />}
                              {event.reminderEnabled ? 'On' : 'Off'}
                            </button>
                            <button onClick={() => handleCancelRegistration(event.id)}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
