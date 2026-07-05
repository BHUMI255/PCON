import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps a route and redirects to '/' if
 * the authenticated user's role is not in the allowedRoles array.
 * Also redirects unauthenticated visitors if requireAuth is true (default).
 */
export default function ProtectedRoute({ children, allowedRoles = [], requireAuth = true }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-xs font-semibold">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#0b0f19] flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-sm text-gray-400">
            Your current role (<span className="text-red-400 font-bold">{user.role}</span>) does not have permission to view this page.
          </p>
          <p className="text-xs text-gray-600">Required: {allowedRoles.join(' or ')}</p>
          <a
            href="/dashboard"
            className="inline-block mt-4 bg-green-500 hover:bg-green-400 text-black font-extrabold text-sm px-6 py-2.5 rounded-xl transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
