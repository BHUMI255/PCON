import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  usePermissions — Central Role-Based Permission Hook
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  This hook derives permission booleans from the current user's role.
 *  Use this throughout the app instead of scattered `user?.role === 'X'` checks.
 *
 *  Role Hierarchy:
 *    VISITOR   (unauthenticated / no role)
 *    CITIZEN   (authenticated, base role)
 *    OFFICIAL  (municipal officials)
 *    MODERATOR (community moderators)
 *    ADMIN     (system administrators)
 *
 *  Usage:
 *    const { isAdmin, canUpdateIssueStatus, canModerateDiscussions } = usePermissions();
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function usePermissions() {
  const { user } = useContext(AuthContext);

  const role = user?.role || null;

  // ── Role identity ───────────────────────────────────────────────────────────
  const isVisitor   = !user;
  const isCitizen   = role === 'CITIZEN';
  const isOfficial  = role === 'OFFICIAL';
  const isModerator = role === 'MODERATOR';
  const isAdmin     = role === 'ADMIN';
  const isLoggedIn  = !!user;

  // ── Issue permissions ───────────────────────────────────────────────────────

  /** VISITOR: can view public issues and map without logging in */
  const canViewIssues = true;

  /** CITIZEN, OFFICIAL, MODERATOR, ADMIN: can report a new civic issue */
  const canReportIssue = isLoggedIn;

  /** Any authenticated user can upvote issues */
  const canUpvoteIssues = isLoggedIn;

  /**
   * OFFICIAL, ADMIN only: update issue status, assign field workers,
   * upload resolution evidence, post official updates
   */
  const canUpdateIssueStatus = isOfficial || isAdmin;
  const canAssignFieldWorkers = isOfficial || isAdmin;
  const canUploadResolutionEvidence = isOfficial || isAdmin;
  const canPostOfficialUpdates = isOfficial || isAdmin;

  /**
   * OFFICIAL, MODERATOR, ADMIN: verify that a reported issue is legitimate
   */
  const canVerifyIssue = isOfficial || isModerator || isAdmin;

  /**
   * CITIZEN: can delete their OWN unprocessed reports only
   * ADMIN: can delete any report
   * OFFICIAL, MODERATOR: cannot delete citizen reports
   */
  const canDeleteOwnIssue = isCitizen;
  const canDeleteAnyIssue = isAdmin;
  const canDeleteIssue = canDeleteOwnIssue || canDeleteAnyIssue;

  // ── Discussion permissions ──────────────────────────────────────────────────

  /** VISITOR: can browse public discussions */
  const canViewDiscussions = true;

  /** CITIZEN, OFFICIAL, MODERATOR, ADMIN: can post discussions and comment */
  const canPostDiscussions = isLoggedIn;
  const canCommentOnDiscussions = isLoggedIn;

  /** CITIZEN: delete own discussions. MODERATOR/ADMIN: delete any. OFFICIAL: blocked. */
  const canDeleteOwnDiscussion = isCitizen;
  const canDeleteAnyDiscussion = isModerator || isAdmin;
  const canDeleteDiscussion = canDeleteOwnDiscussion || canDeleteAnyDiscussion;

  /**
   * MODERATOR, ADMIN: hide/unhide discussions and comments (remove inappropriate content)
   * This is the core moderation power.
   */
  const canModerateDiscussions = isModerator || isAdmin;
  const canHideContent = isModerator || isAdmin;
  const canRemoveInappropriateContent = isModerator || isAdmin;

  // ── Event permissions ───────────────────────────────────────────────────────

  /** VISITOR: can view public events */
  const canViewEvents = true;

  /** OFFICIAL, ADMIN: create and manage events */
  const canCreateEvents = isOfficial || isAdmin;
  const canManageEvents = isOfficial || isAdmin;

  /** Any authenticated user can register for events */
  const canRegisterForEvents = isLoggedIn;

  // ── Community map ───────────────────────────────────────────────────────────

  /** VISITOR: can explore the community map */
  const canViewCommunityMap = true;

  // ── Admin panel ─────────────────────────────────────────────────────────────

  /**
   * ADMIN only: manage users, roles, issue categories, departments,
   * analytics, system-wide settings
   */
  const canAccessAdminPanel   = isAdmin;
  const canManageUsers        = isAdmin;
  const canManageRoles        = isAdmin;
  const canManageCategories   = isAdmin;
  const canManageDepartments  = isAdmin;
  const canViewAnalytics      = isAdmin;
  const canAccessSystemSettings = isAdmin;

  /**
   * MODERATOR, ADMIN: access the moderation queue
   */
  const canAccessModerationQueue = isModerator || isAdmin;

  // ── Helper for inline conditional rendering ────────────────────────────────

  /**
   * Returns true if the current user has at least one of the given roles.
   * Useful for complex conditional renders.
   *
   * Usage: hasRole('OFFICIAL', 'ADMIN')
   */
  const hasRole = (...roles) => roles.includes(role);

  return {
    // Identity
    role,
    isVisitor,
    isCitizen,
    isOfficial,
    isModerator,
    isAdmin,
    isLoggedIn,
    hasRole,

    // Issues
    canViewIssues,
    canReportIssue,
    canUpvoteIssues,
    canUpdateIssueStatus,
    canAssignFieldWorkers,
    canUploadResolutionEvidence,
    canPostOfficialUpdates,
    canVerifyIssue,
    canDeleteOwnIssue,
    canDeleteAnyIssue,
    canDeleteIssue,

    // Discussions
    canViewDiscussions,
    canPostDiscussions,
    canCommentOnDiscussions,
    canDeleteOwnDiscussion,
    canDeleteAnyDiscussion,
    canDeleteDiscussion,
    canModerateDiscussions,
    canHideContent,
    canRemoveInappropriateContent,

    // Events
    canViewEvents,
    canCreateEvents,
    canManageEvents,
    canRegisterForEvents,

    // Map
    canViewCommunityMap,

    // Admin
    canAccessAdminPanel,
    canManageUsers,
    canManageRoles,
    canManageCategories,
    canManageDepartments,
    canViewAnalytics,
    canAccessSystemSettings,
    canAccessModerationQueue,
  };
}
