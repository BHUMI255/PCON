import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import RolePermissionsPanel from '../components/RolePermissionsPanel';
import {
  fetchAllUsers, updateUserRole, deleteUser,
  fetchPlatformStats, fetchModerationQueue, fetchModerationQueueMod,
  hideDiscussion, verifyIssue
} from '../services/api';
import {
  Users, BarChart3, Shield, Settings, Search, ChevronDown,
  Trash2, RefreshCcw, CheckCircle, EyeOff, Eye, AlertTriangle,
  TrendingUp, Activity, Building2, MessageSquare, MapPin,
  Crown, ArrowLeft, UserCheck, XCircle, Lock
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = ['CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'];

const ROLE_STYLES = {
  CITIZEN:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   icon: '👤' },
  OFFICIAL:  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: '🏛️' },
  MODERATOR: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: '🛡️' },
  ADMIN:     { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    icon: '👑' },
};

const STATUS_COLORS = {
  REPORTED:     'text-blue-400',
  UNDER_REVIEW: 'text-purple-400',
  ASSIGNED:     'text-cyan-400',
  IN_PROGRESS:  'text-yellow-400',
  RESOLVED:     'text-green-400',
  CLOSED:       'text-gray-400',
};

const TABS_ADMIN = [
  { id: 'analytics',   label: 'Analytics',         icon: BarChart3 },
  { id: 'users',       label: 'Users & Roles',      icon: Users },
  { id: 'moderation',  label: 'Moderation',         icon: Shield },
  { id: 'permissions', label: 'Permissions Matrix', icon: Lock },
  { id: 'settings',    label: 'Settings',           icon: Settings },
];

// Moderators only have access to the Moderation tab
const TABS_MODERATOR = [
  { id: 'moderation',  label: 'Moderation Queue',   icon: Shield },
  { id: 'permissions', label: 'Permissions Matrix', icon: Lock },
];

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'text-white', glow }) {
  return (
    <div className={`bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-3 hover:border-gray-700 transition-all ${glow || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-gray-800/60 flex items-center justify-center">
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 font-semibold">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user } = useContext(AuthContext);
  const permissions = usePermissions();
  const navigate = useNavigate();

  // Determine available tabs and default tab based on role
  const TABS = permissions.isAdmin ? TABS_ADMIN : TABS_MODERATOR;
  const [activeTab, setActiveTab] = useState(permissions.isAdmin ? 'analytics' : 'moderation');

  // Analytics state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleUpdating, setRoleUpdating] = useState({});
  const [userDeleting, setUserDeleting] = useState({});

  // Moderation state
  const [modQueue, setModQueue] = useState(null);
  const [modLoading, setModLoading] = useState(false);

  // Messages
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load Data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, usersPage, roleFilter, userSearch]);

  useEffect(() => {
    if (activeTab === 'moderation') loadModerationQueue();
  }, [activeTab]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await fetchPlatformStats();
      setStats(data);
    } catch (err) {
      showToast('Failed to load analytics.', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await fetchAllUsers({
        page: usersPage,
        limit: 15,
        role: roleFilter || undefined,
        search: userSearch || undefined
      });
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (err) {
      showToast('Failed to load users.', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadModerationQueue = async () => {
    setModLoading(true);
    try {
      // MODERATOR uses /api/moderation; ADMIN uses /api/admin/moderation
      const data = permissions.isAdmin
        ? await fetchModerationQueue()
        : await fetchModerationQueueMod();
      setModQueue(data);
    } catch (err) {
      showToast('Failed to load moderation queue.', 'error');
    } finally {
      setModLoading(false);
    }
  };

  // ── User Actions ───────────────────────────────────────────────────────────

  const handleRoleChange = async (userId, newRole) => {
    // Guard: prevent admin from changing their own role
    if (userId === user.id) {
      showToast('You cannot change your own role.', 'error');
      return;
    }
    // Confirm before demoting another admin
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'ADMIN' && newRole !== 'ADMIN') {
      const confirmed = window.confirm(
        `⚠️ You are about to demote "${targetUser.name}" from ADMIN to ${newRole}.\n\nThis will immediately revoke their administrative access. Are you sure?`
      );
      if (!confirmed) return;
    }
    setRoleUpdating(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast(`Role updated to ${newRole} successfully.`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role.', 'error');
    } finally {
      setRoleUpdating(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently delete user "${userName}"? This cannot be undone.`)) return;
    setUserDeleting(prev => ({ ...prev, [userId]: true }));
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setUsersTotal(t => t - 1);
      showToast(`User "${userName}" deleted.`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user.', 'error');
    } finally {
      setUserDeleting(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ── Moderation Actions ─────────────────────────────────────────────────────

  const handleHideDiscussion = async (id) => {
    try {
      await hideDiscussion(id, true);
      setModQueue(prev => ({
        ...prev,
        hiddenDiscussions: prev.hiddenDiscussions.filter(d => d.id !== id)
      }));
      showToast('Discussion hidden from public.');
    } catch (err) {
      showToast('Failed to hide discussion.', 'error');
    }
  };

  const handleVerifyIssue = async (id) => {
    try {
      await verifyIssue(id);
      setModQueue(prev => ({
        ...prev,
        unverifiedIssues: prev.unverifiedIssues.filter(i => i.id !== id)
      }));
      showToast('Issue verified successfully.');
    } catch (err) {
      showToast('Failed to verify issue.', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#080c14] text-white">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-xl border text-xs font-bold shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/30 text-red-300'
            : 'bg-green-500/20 border-green-500/30 text-green-300'
        }`}>
          {toast.type === 'error' ? <XCircle size={14} /> : <CheckCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-[#0f1724] to-[#080c14] border-b border-gray-800/50 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold mb-4"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              {permissions.isAdmin ? <Crown size={22} className="text-white" /> : <Shield size={22} className="text-white" />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">
                {permissions.isAdmin ? 'Administration Panel' : 'Moderation Panel'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {permissions.isAdmin
                  ? 'Manage users, roles, moderation & platform analytics'
                  : 'Manage community content, verify issues & maintain forum quality'}
              </p>
            </div>
            <div className="ml-auto">
              {permissions.isAdmin ? (
                <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-widest">
                  👑 ADMIN — {user?.name}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-widest">
                  🛡️ MODERATOR — {user?.name}
                </span>
              )}
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex gap-1 mt-6 border-b border-gray-800">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'text-white border-green-500 bg-green-500/5'
                      : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/30'
                  }`}
                >
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ══ ANALYTICS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-8" style={{ animation: 'fadeIn 0.3s ease' }}>
            {statsLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Overview Stats */}
                <div>
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={12} /> Platform Overview
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Total Users" value={stats.overview.totalUsers} icon={Users} color="text-blue-400" />
                    <StatCard label="Total Issues" value={stats.overview.totalIssues} icon={MapPin} color="text-yellow-400" />
                    <StatCard label="Resolved" value={stats.overview.resolvedIssues} icon={CheckCircle} color="text-green-400" />
                    <StatCard label="Resolution Rate" value={`${stats.overview.resolutionRate}%`} icon={TrendingUp} color="text-emerald-400" glow="hover:shadow-emerald-500/5 hover:shadow-lg" />
                    <StatCard label="Discussions" value={stats.overview.totalDiscussions} icon={MessageSquare} color="text-purple-400" />
                    <StatCard label="Events" value={stats.overview.totalEvents} icon={Building2} color="text-cyan-400" />
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Issues by Category */}
                  <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 size={12} className="text-green-400" /> Issues by Category
                    </h3>
                    <div className="space-y-2.5">
                      {stats.issuesByCategory.map(({ category, count }) => {
                        const maxCount = Math.max(...stats.issuesByCategory.map(i => i.count));
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-300 font-semibold">{category}</span>
                              <span className="text-gray-500 font-bold">{count}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Users by Role */}
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={12} className="text-green-400" /> Users by Role
                    </h3>
                    <div className="space-y-3">
                      {stats.usersByRole.map(({ role, count }) => {
                        const rs = ROLE_STYLES[role] || ROLE_STYLES.CITIZEN;
                        return (
                          <div key={role} className={`flex items-center justify-between p-3 rounded-xl border ${rs.bg} ${rs.border}`}>
                            <span className={`text-xs font-extrabold ${rs.text} flex items-center gap-1.5`}>
                              <span>{rs.icon}</span> {role}
                            </span>
                            <span className={`text-lg font-black ${rs.text}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Issue Status Breakdown */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} className="text-green-400" /> Issue Status Breakdown
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {stats.issuesByStatus.map(({ status, count }) => (
                      <div key={status} className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3 text-center space-y-1">
                        <p className={`text-xl font-black ${STATUS_COLORS[status] || 'text-gray-400'}`}>{count}</p>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{status.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Issues */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} className="text-green-400" /> Most Recent Issues
                  </h3>
                  <div className="divide-y divide-gray-800/50">
                    {stats.recentIssues.map(issue => (
                      <div key={issue.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-sm font-semibold text-white">{issue.title}</p>
                          <p className="text-[10px] text-gray-500">{issue.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold uppercase ${STATUS_COLORS[issue.status] || 'text-gray-400'}`}>{issue.status.replace('_', ' ')}</span>
                          <span className="text-[9px] text-gray-600">{new Date(issue.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={loadStats}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-green-400 transition-colors font-bold"
                >
                  <RefreshCcw size={12} /> Refresh Analytics
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-sm text-center py-16">Failed to load analytics.</p>
            )}
          </div>
        )}

        {/* ══ USERS & ROLES TAB ══════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-5" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} /> Manage Users ({usersTotal})
              </h2>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                    className="bg-[#111827] border border-gray-800 focus:border-green-500 text-xs text-white rounded-xl pl-8 pr-3 py-2 outline-none w-52"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value); setUsersPage(1); }}
                  className="bg-[#111827] border border-gray-800 text-xs text-white rounded-xl px-3 py-2 outline-none"
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#0b0f19]">
                      <th className="text-left p-4 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">User</th>
                      <th className="text-left p-4 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Role</th>
                      <th className="text-left p-4 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Stats</th>
                      <th className="text-left p-4 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Joined</th>
                      <th className="text-right p-4 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {usersLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          {[...Array(5)].map((_, j) => (
                            <td key={j} className="p-4">
                              <div className="h-3 bg-gray-800 rounded animate-pulse w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : users.map(u => {
                      const rs = ROLE_STYLES[u.role] || ROLE_STYLES.CITIZEN;
                      const isSelf = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-black font-black text-xs flex-shrink-0">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white flex items-center gap-1">
                                  {u.name}
                                  {isSelf && <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded uppercase">You</span>}
                                </p>
                                <p className="text-gray-500">{u.email}</p>
                                {u.locality && <p className="text-gray-600 text-[10px]">📍 {u.locality}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg border ${rs.bg} ${rs.border} ${rs.text}`}>
                                {rs.icon} {u.role}
                              </span>
                              {!isSelf && (
                                <div className="relative">
                                  <select
                                    value={u.role}
                                    disabled={roleUpdating[u.id]}
                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                    className="bg-gray-800 border border-gray-700 text-[10px] text-gray-300 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-gray-600 transition-colors disabled:opacity-50"
                                  >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                  {roleUpdating[u.id] && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-green-500 border-t-transparent rounded-full animate-spin" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5 text-gray-500">
                              <p>📊 Score: <span className="text-white font-bold">{u.participationScore}</span></p>
                              <p>📋 Issues: <span className="text-white font-bold">{u.issuesReported}</span> reported</p>
                              <p>✅ Resolved: <span className="text-green-400 font-bold">{u.issuesResolved}</span></p>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-4 text-right">
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={userDeleting[u.id]}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-40"
                                title="Delete user"
                              >
                                {userDeleting[u.id]
                                  ? <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 size={14} />
                                }
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {usersTotal > 15 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Page {usersPage} of {Math.ceil(usersTotal / 15)}</span>
                <div className="flex gap-2">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => setUsersPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors font-bold"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={usersPage >= Math.ceil(usersTotal / 15)}
                    onClick={() => setUsersPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 disabled:opacity-40 hover:bg-gray-700 transition-colors font-bold"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MODERATION TAB ════════════════════════════════════════════════ */}
        {activeTab === 'moderation' && (
          <div className="space-y-8" style={{ animation: 'fadeIn 0.3s ease' }}>
            {modLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : modQueue ? (
              <>
                {/* Unverified Issues */}
                <div className="space-y-4">
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={12} className="text-yellow-400" />
                    Unverified Issues ({modQueue.unverifiedIssues?.length || 0})
                  </h2>
                  {modQueue.unverifiedIssues?.length === 0 ? (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
                      <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-semibold">All issues are verified!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modQueue.unverifiedIssues.map(issue => (
                        <div key={issue.id} className="bg-[#111827] border border-yellow-500/10 rounded-2xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-grow min-w-0">
                              <p className="text-sm font-bold text-white leading-snug truncate">{issue.title}</p>
                              <p className="text-[10px] text-gray-500">{issue.category} · by {issue.reportedBy?.name}</p>
                              <span className={`text-[9px] font-bold ${STATUS_COLORS[issue.status] || 'text-gray-400'} uppercase`}>{issue.status.replace('_', ' ')}</span>
                            </div>
                            <button
                              onClick={() => handleVerifyIssue(issue.id)}
                              className="flex-shrink-0 flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                            >
                              <UserCheck size={11} /> Verify
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hidden Discussions */}
                <div className="space-y-4">
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <EyeOff size={12} className="text-purple-400" />
                    Hidden Discussions ({modQueue.hiddenDiscussions?.length || 0})
                  </h2>
                  {modQueue.hiddenDiscussions?.length === 0 ? (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
                      <MessageSquare size={28} className="text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-semibold">No hidden discussions</p>
                    </div>
                  ) : (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-gray-800/50">
                        {modQueue.hiddenDiscussions.map(d => (
                          <div key={d.id} className="flex items-center justify-between p-4 gap-3">
                            <div className="flex-grow min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{d.title}</p>
                              <p className="text-[10px] text-gray-500">By {d.author?.name} · {d.author?.email}</p>
                            </div>
                            <button
                              onClick={() => handleHideDiscussion(d.id)}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <Eye size={11} /> Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden Comments */}
                <div className="space-y-4">
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <EyeOff size={12} className="text-red-400" />
                    Hidden Comments ({modQueue.hiddenComments?.length || 0})
                  </h2>
                  {modQueue.hiddenComments?.length === 0 ? (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
                      <MessageSquare size={28} className="text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-semibold">No hidden comments</p>
                    </div>
                  ) : (
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-gray-800/50">
                        {modQueue.hiddenComments.map(c => (
                          <div key={c.id} className="flex items-start justify-between p-4 gap-3">
                            <div className="flex-grow min-w-0">
                              <p className="text-xs text-gray-300 line-clamp-2">{c.content}</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                By {c.author?.name} · in "{c.discussion?.title}"
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={loadModerationQueue}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-purple-400 transition-colors font-bold"
                >
                  <RefreshCcw size={12} /> Refresh Queue
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* ══ PERMISSIONS MATRIX TAB ══════════════════════════════════════ */}
        {activeTab === 'permissions' && (
          <RolePermissionsPanel />
        )}

        {/* ══ SETTINGS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'settings' && permissions.isAdmin && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Settings size={12} /> System Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { title: 'Issue Categories', desc: 'Manage civic issue categories used by citizens when reporting.', icon: MapPin, color: 'text-yellow-400', badge: '8 categories' },
                { title: 'Departments', desc: 'Configure municipal departments and assign them to issue categories.', icon: Building2, color: 'text-cyan-400', badge: '4 departments' },
                { title: 'Duplicate Detection Radius', desc: 'Set the geographic radius (meters) for detecting duplicate issue reports.', icon: Activity, color: 'text-green-400', badge: '50m default' },
                { title: 'Participation Scoring', desc: 'Configure points awarded for reporting, supporting and resolving issues.', icon: TrendingUp, color: 'text-purple-400', badge: 'Active' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className={s.color} />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{s.title}</p>
                          <span className="text-[9px] font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{s.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                        <button className="mt-3 text-[10px] font-bold text-green-400 hover:text-green-300 transition-colors">
                          Configure →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
              <p className="text-xs text-yellow-400 font-bold flex items-center gap-2">
                <AlertTriangle size={13} /> Settings configuration panel is available for extension with a system config store.
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Category and department management can be wired to the database when needed.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
