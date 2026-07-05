import React, { useState } from 'react';
import { Shield, Eye, Edit3, Trash2, CheckCircle, XCircle, Lock, Users, MessageSquare, MapPin, Calendar, BarChart3, Settings } from 'lucide-react';

/**
 * RolePermissionsPanel — Visual permission matrix for all 4 roles
 * Displayed in the Admin Panel under a "Permissions" tab.
 * Shows a comprehensive, color-coded grid of what each role can/cannot do.
 */

const ROLES_CONFIG = [
  {
    role: 'VISITOR',
    label: 'Visitor',
    icon: '👤',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    glow: '',
    desc: 'Unauthenticated users browsing the platform',
  },
  {
    role: 'CITIZEN',
    label: 'Citizen',
    icon: '🙋',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/5',
    desc: 'Registered community members who report and engage',
  },
  {
    role: 'OFFICIAL',
    label: 'Municipal Official',
    icon: '🏛️',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    glow: 'shadow-yellow-500/5',
    desc: 'Government officers who handle and resolve civic issues',
  },
  {
    role: 'MODERATOR',
    label: 'Moderator',
    icon: '🛡️',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/5',
    desc: 'Community moderators who maintain forum quality',
  },
  {
    role: 'ADMIN',
    label: 'Administrator',
    icon: '👑',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/5',
    desc: 'System administrators with full platform control',
  },
];

const PERMISSION_GROUPS = [
  {
    group: 'Public Access',
    icon: Eye,
    iconColor: 'text-gray-400',
    permissions: [
      { label: 'View public issues & map',    VISITOR: true,  CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Browse discussions',           VISITOR: true,  CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'View public events',           VISITOR: true,  CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
    ]
  },
  {
    group: 'Issues',
    icon: MapPin,
    iconColor: 'text-yellow-400',
    permissions: [
      { label: 'Report civic issues',                    VISITOR: false, CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Upvote issues',                          VISITOR: false, CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Update issue status',                    VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: false, ADMIN: true  },
      { label: 'Assign field workers',                   VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: false, ADMIN: true  },
      { label: 'Upload resolution evidence',             VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: false, ADMIN: true  },
      { label: 'Post official updates',                  VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: false, ADMIN: true  },
      { label: 'Verify reported issues',                 VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Delete own reports (unprocessed)',       VISITOR: false, CITIZEN: true,  OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'Delete any citizen report',              VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
    ]
  },
  {
    group: 'Discussions & Community',
    icon: MessageSquare,
    iconColor: 'text-purple-400',
    permissions: [
      { label: 'Post discussions & comments',             VISITOR: false, CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Delete own discussions',                  VISITOR: false, CITIZEN: true,  OFFICIAL: false, MODERATOR: true,  ADMIN: true  },
      { label: 'Delete any discussion',                   VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: true,  ADMIN: true  },
      { label: 'Modify unrelated discussions',            VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'Hide/unhide content (moderation)',        VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: true,  ADMIN: true  },
      { label: 'Remove inappropriate content',            VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: true,  ADMIN: true  },
      { label: 'Access moderation queue',                 VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: true,  ADMIN: true  },
    ]
  },
  {
    group: 'Events',
    icon: Calendar,
    iconColor: 'text-cyan-400',
    permissions: [
      { label: 'Register for community events',          VISITOR: false, CITIZEN: true,  OFFICIAL: true,  MODERATOR: true,  ADMIN: true  },
      { label: 'Create & manage events',                 VISITOR: false, CITIZEN: false, OFFICIAL: true,  MODERATOR: false, ADMIN: true  },
    ]
  },
  {
    group: 'Administration',
    icon: Settings,
    iconColor: 'text-red-400',
    permissions: [
      { label: 'Manage users & roles',                   VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'Manage issue categories & departments',  VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'View platform analytics',                VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'System-wide settings',                   VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
      { label: 'Full administrative controls',           VISITOR: false, CITIZEN: false, OFFICIAL: false, MODERATOR: false, ADMIN: true  },
    ]
  }
];

function PermissionCell({ allowed }) {
  return (
    <td className="px-3 py-2.5 text-center">
      {allowed ? (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 border border-green-500/30">
          <CheckCircle size={13} className="text-green-400" />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800/50 border border-gray-800">
          <XCircle size={13} className="text-gray-700" />
        </span>
      )}
    </td>
  );
}

export default function RolePermissionsPanel() {
  const [activeGroup, setActiveGroup] = useState(null);

  const groups = activeGroup
    ? PERMISSION_GROUPS.filter(g => g.group === activeGroup)
    : PERMISSION_GROUPS;

  return (
    <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Shield size={12} className="text-green-400" /> Role Permissions Matrix
          </h2>
          <p className="text-[11px] text-gray-600 mt-1">
            Overview of what each role is permitted to do across CivicConnect.
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ROLES_CONFIG.map(r => (
          <div key={r.role} className={`border rounded-xl p-4 space-y-2 ${r.bg} ${r.border} hover:shadow-lg ${r.glow} transition-all`}>
            <div className="text-2xl">{r.icon}</div>
            <p className={`text-xs font-extrabold uppercase tracking-wider ${r.color}`}>{r.label}</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Group Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup(null)}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
            !activeGroup
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white'
          }`}
        >
          All Categories
        </button>
        {PERMISSION_GROUPS.map(g => {
          const Icon = g.icon;
          return (
            <button
              key={g.group}
              onClick={() => setActiveGroup(activeGroup === g.group ? null : g.group)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                activeGroup === g.group
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white'
              }`}
            >
              <Icon size={10} className={g.iconColor} /> {g.group}
            </button>
          );
        })}
      </div>

      {/* Permission Tables */}
      {groups.map(group => {
        const GroupIcon = group.icon;
        return (
          <div key={group.group} className="glass-card rounded-2xl overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/5">
              <GroupIcon size={13} className={group.iconColor} />
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                {group.group}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-[9px] font-extrabold text-gray-600 uppercase tracking-widest w-64">
                      Permission
                    </th>
                    {ROLES_CONFIG.map(r => (
                      <th key={r.role} className="px-3 py-3 text-center">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${r.color}`}>
                          {r.icon} {r.role === 'OFFICIAL' ? 'OFFICIAL' : r.role}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {group.permissions.map((perm, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-2.5 text-[11px] text-gray-300 font-medium">
                        {perm.label}
                      </td>
                      {ROLES_CONFIG.map(r => (
                        <PermissionCell key={r.role} allowed={perm[r.role]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] text-gray-500 font-semibold">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30">
            <CheckCircle size={11} className="text-green-400" />
          </span>
          Permitted
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800/50 border border-gray-800">
            <XCircle size={11} className="text-gray-700" />
          </span>
          Not Permitted
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-gray-600">
          <Lock size={10} />
          Permissions are enforced at both API and UI levels
        </div>
      </div>
    </div>
  );
}
