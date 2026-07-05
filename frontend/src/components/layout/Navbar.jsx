import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { MapPin, MessageSquare, Calendar, ShieldAlert, LogOut, User as UserIcon, Crown, Shield, Activity } from 'lucide-react';

// Role badge config — color, icon, label for each role
const ROLE_BADGE = {
  CITIZEN:   { color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   icon: '🙋', label: 'Citizen'   },
  OFFICIAL:  { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: '🏛️', label: 'Official'  },
  MODERATOR: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: '🛡️', label: 'Moderator' },
  ADMIN:     { color: 'text-red-400    bg-red-500/10    border-red-500/20',    icon: '👑', label: 'Admin'     },
};

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const permissions = usePermissions();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-navbar text-white py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        <MapPin size={28} className="text-blue-500" />
        <span className="text-2xl font-bold tracking-wider text-white" style={{ fontFamily: 'Teko, sans-serif' }}>
          CivicConnect
        </span>
      </Link>

      {/* Always-visible nav links for VISITOR */}
      <div className="flex items-center gap-4">
        {!user && (
          <div className="hidden md:flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors text-xs font-medium">
              <MapPin size={15} /> Map
            </Link>
            <Link to="/analytics" className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors text-xs font-medium">
              <Activity size={15} /> Analytics
            </Link>
            <Link to="/discussions" className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors text-xs font-medium">
              <MessageSquare size={15} /> Discussions
            </Link>
            <Link to="/events" className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors text-xs font-medium">
              <Calendar size={15} /> Events
            </Link>
          </div>
        )}
      </div>

      {user ? (
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors text-sm font-medium">
            <MapPin size={18} />
            <span className="hidden md:inline">Live Map</span>
          </Link>
          <Link to="/analytics" className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors text-sm font-medium">
            <Activity size={18} />
            <span className="hidden md:inline">Analytics</span>
          </Link>
          <Link to="/discussions" className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors text-sm font-medium">
            <MessageSquare size={18} />
            <span className="hidden md:inline">Discussions</span>
          </Link>
          <Link to="/events" className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors text-sm font-medium">
            <Calendar size={18} />
            <span className="hidden md:inline">Volunteering</span>
          </Link>

          {/* Admin panel link — ADMIN only */}
          {permissions.canAccessAdminPanel && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors text-sm font-bold"
              title="Administration Panel"
            >
              <Crown size={16} />
              <span className="hidden md:inline text-xs uppercase tracking-wide">Admin</span>
            </Link>
          )}

          {/* Moderation panel link — MODERATOR only (not admin, they use /admin) */}
          {permissions.isModerator && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors text-sm font-bold"
              title="Moderation Panel"
            >
              <Shield size={16} />
              <span className="hidden md:inline text-xs uppercase tracking-wide">Moderate</span>
            </Link>
          )}

          <div className="h-6 w-px bg-gray-800" />

          <Link to="/profile" className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:border-green-500/50 transition-colors">
            {user.profilePic ? (
              <img src={user.profilePic} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              {/* Color-coded role badge */}
              {ROLE_BADGE[user.role] && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase tracking-widest leading-none mt-0.5 ${ROLE_BADGE[user.role].color}`}>
                  <span>{ROLE_BADGE[user.role].icon}</span>
                  {ROLE_BADGE[user.role].label}
                </span>
              )}
            </div>
          </Link>

          <button 
            onClick={handleLogout} 
            className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-all"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In / Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
