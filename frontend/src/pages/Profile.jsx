import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, MapPin, Shield, Award, FileText, CheckCircle, ThumbsUp, Settings, Camera, Save, X, Sparkles, Calendar, History } from 'lucide-react';
import axios from 'axios';
import { fetchUserEvents } from '../services/api';

export default function Profile() {
  const { user, updateProfile } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [locality, setLocality] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    issuesReported: 0,
    issuesResolved: 0,
    issuesSupported: 0,
    participationScore: 0,
    badges: []
  });
  const [myEvents, setMyEvents] = useState([]);


  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocality(user.locality || '');
      setProfilePic(user.profilePic || '');
      
      // Fetch full stats from the backend /api/auth/profile
      axios.get(`${import.meta.env.VITE_API_URL}/auth/profile`)
        .then(res => {
          setStats({
            issuesReported: res.data.issuesReported || 0,
            issuesResolved: res.data.issuesResolved || 0,
            issuesSupported: res.data.issuesSupported || 0,
            participationScore: res.data.participationScore || 0,
            badges: res.data.badges || []
          });
        })
        .catch(err => {
          console.error('Error fetching profile stats:', err);
        });

      // Fetch participation history
      fetchUserEvents()
        .then(data => setMyEvents(data || []))
        .catch(err => console.error('Error fetching events:', err));
    }
  }, [user]);


  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updated = await updateProfile({ name, locality, profilePic });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setStats(prev => ({
        ...prev,
        issuesSupported: updated.issuesSupported !== undefined ? updated.issuesSupported : prev.issuesSupported
      }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] flex items-center justify-center text-white">
        <p className="text-gray-400">Please sign in to view your profile.</p>
      </div>
    );
  }

  // Predefined badge styling configuration
  const badgeColors = {
    "First Responder": "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    "Eco-Warrior": "from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30",
    "Pothole Patrol": "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    "City Leader": "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
    "Community Hero": "from-red-500/20 to-rose-500/20 text-rose-400 border-rose-500/30"
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] text-white py-12 px-6 flex justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full space-y-8 z-10">
        
        {/* Profile Card Header */}
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Avatar and Editing camera option */}
          <div className="relative group">
            {profilePic ? (
              <img 
                src={profilePic} 
                alt={name} 
                className="w-32 h-32 rounded-full object-cover border-4 border-green-500/20 shadow-xl"
              />
            ) : (
              <div className="bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 text-emerald-400 w-32 h-32 rounded-full flex items-center justify-center text-4xl font-extrabold shadow-xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-1 right-1 bg-green-500 hover:bg-green-600 text-black p-2.5 rounded-full transition-transform hover:scale-110 shadow-lg"
              title="Edit Profile"
            >
              <Camera size={16} />
            </button>
          </div>

          {/* Details */}
          <div className="flex-grow space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h2 className="text-3xl font-black tracking-tight text-white">{name}</h2>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20 self-center md:self-auto">
                {user.role}
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm">
              <MapPin size={16} className="text-green-500" />
              <span>{locality || 'No locality specified'}</span>
            </div>

            <p className="text-xs text-gray-500 font-medium">Joined CivicConnect Community</p>
          </div>

          <div className="flex items-center gap-4 bg-[#1f2937]/50 px-6 py-4 rounded-2xl border border-gray-800 w-full md:w-auto justify-center">
            <Award className="text-yellow-400 w-10 h-10 animate-bounce-slow" />
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Participation XP</p>
              <p className="text-2xl font-black text-white mt-1.5">{stats.participationScore} Points</p>
            </div>
          </div>
        </div>

        {/* Success & Error alerts */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm font-semibold text-center">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form Drawer Edit Mode */}
        {isEditing && (
          <form onSubmit={handleUpdate} className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings size={18} className="text-green-400" /> Account Settings
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Jane Doe" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 outline-none rounded-xl px-4 py-3 text-sm text-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Locality / Neighborhood</label>
                <input 
                  type="text" 
                  placeholder="Greenwood Valley" 
                  value={locality} 
                  onChange={e => setLocality(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 outline-none rounded-xl px-4 py-3 text-sm text-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Profile Picture URL</label>
              <input 
                type="url" 
                placeholder="https://images.unsplash.com/photo-..." 
                value={profilePic} 
                onChange={e => setProfilePic(e.target.value)}
                className="w-full bg-[#0b0f19] border border-gray-800 focus:border-green-500 outline-none rounded-xl px-4 py-3 text-sm text-white transition-colors"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-black font-extrabold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Dashboard Grid Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-blue-500/10 text-blue-400 p-3.5 rounded-xl border border-blue-500/20">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Issues Reported</p>
              <p className="text-2xl font-black text-white mt-1">{stats.issuesReported}</p>
            </div>
          </div>

          <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-emerald-500/10 text-emerald-400 p-3.5 rounded-xl border border-emerald-500/20">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Issues Resolved</p>
              <p className="text-2xl font-black text-white mt-1">{stats.issuesResolved}</p>
            </div>
          </div>

          <div className="bg-[#111827]/60 border border-gray-800/80 rounded-2xl p-6 flex items-center gap-4">
            <div className="bg-purple-500/10 text-purple-400 p-3.5 rounded-xl border border-purple-500/20">
              <ThumbsUp size={24} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Issues Supported</p>
              <p className="text-2xl font-black text-white mt-1">{stats.issuesSupported}</p>
            </div>
          </div>
        </div>

        {/* Earned Badges Panel */}
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-4">
            <Sparkles size={18} className="text-yellow-400" /> Earned Badges & Achievements
          </h3>

          {stats.badges.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Award size={36} className="mx-auto text-gray-700 mb-3" />
              <p>No badges earned yet. Report issues or volunteer for community events to unlock badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {stats.badges.map((badge, idx) => {
                const colors = badgeColors[badge] || "from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/30";
                return (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-br ${colors} border p-4 rounded-2xl flex items-center gap-3 hover:scale-[1.02] transition-transform`}
                  >
                    <Award size={24} />
                    <div className="text-left">
                      <p className="font-extrabold text-xs uppercase tracking-wider">{badge}</p>
                      <p className="text-[9px] opacity-75 mt-0.5">Verified active contributor badge</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Participation History */}
        <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-4">
            <History size={18} className="text-green-400" /> Event Participation History
            <span className="ml-auto text-xs font-normal text-gray-500 bg-gray-800 px-2.5 py-1 rounded-lg">
              {myEvents.length} Events
            </span>
          </h3>

          {myEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Calendar size={36} className="mx-auto text-gray-700 mb-3" />
              <p>No events joined yet. Visit the Events page to find and join community campaigns!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myEvents.map(event => (
                <div key={event.id} className="flex items-center gap-4 bg-[#0b0f19] border border-gray-800 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-green-400" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold text-white truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(event.dateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{event.address}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase ${
                      event.status === 'COMPLETED' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      event.status === 'UPCOMING' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      event.status === 'ONGOING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {event.status}
                    </span>
                    {event.status === 'COMPLETED' && (
                      <span className="text-[9px] text-green-400 font-bold flex items-center gap-0.5">
                        <CheckCircle size={10} /> +15 XP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

