/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CivicConnect — Role-Based Access Control (RBAC) Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Role Permission Matrix
 *  ──────────────────────────────────────────────────────────────────────────
 *  VISITOR   : view public issues, browse discussions, explore community maps,
 *              view public events. No write access.
 *
 *  CITIZEN   : all VISITOR perms + report issues, upvote, post discussions/comments,
 *              register for events, delete OWN unprocessed reports.
 *
 *  OFFICIAL  : all CITIZEN perms + update issue status, assign field workers,
 *              upload resolution evidence, post official updates.
 *              CANNOT delete citizen reports or modify unrelated discussions.
 *
 *  MODERATOR : all CITIZEN perms + moderate discussions (hide/unhide),
 *              remove inappropriate content, verify reported issues,
 *              manage community interactions. Access to moderation queue.
 *              CANNOT change official complaint status or access admin controls.
 *
 *  ADMIN     : full access — manage users, roles, issue categories, departments,
 *              moderation, analytics, and system-wide settings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Role authorization middleware.
 * Pass the allowed roles as arguments: authorize('OFFICIAL', 'ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This action requires role: [${roles.join(' | ')}]. Your role: ${req.user.role}.`
      });
    }
    next();
  };
};

/**
 * Middleware to ensure a CITIZEN can only act on their own issue.
 * ADMIN can act on any. OFFICIAL and MODERATOR are blocked entirely from deletion.
 * Designed to be combined with authorize('CITIZEN', 'ADMIN').
 *
 * Per permission spec:
 *  - OFFICIAL  → CANNOT delete citizen reports
 *  - MODERATOR → cannot delete citizen reports (only moderate discussions)
 *  - CITIZEN   → can only delete their own, unprocessed issues
 *  - ADMIN     → can delete any issue
 */
const checkIssueOwnership = () => async (req, res, next) => {
  const prisma = require('../prismaClient');
  try {
    const { id } = req.params;
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // ADMIN bypasses all checks
    if (req.user.role === 'ADMIN') return next();

    // OFFICIAL is never allowed to delete citizen reports
    if (req.user.role === 'OFFICIAL') {
      return res.status(403).json({
        message: 'Forbidden: Municipal officials cannot delete citizen reports.'
      });
    }

    // MODERATOR cannot delete citizen reports (they moderate discussions, not complaints)
    if (req.user.role === 'MODERATOR') {
      return res.status(403).json({
        message: 'Forbidden: Moderators cannot delete civic complaint reports.'
      });
    }

    // CITIZEN can only delete their own
    if (issue.reportedById !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only manage your own reports.' });
    }

    // Citizens can only delete unprocessed issues (REPORTED or UNDER_REVIEW)
    if (!['REPORTED', 'UNDER_REVIEW'].includes(issue.status)) {
      return res.status(400).json({
        message: 'Cannot delete an issue that is already assigned or in progress.'
      });
    }

    next();
  } catch (err) {
    console.error('checkIssueOwnership error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Middleware to check discussion ownership for delete actions.
 * Permission matrix:
 *  - MODERATOR / ADMIN  → can delete any discussion (moderation power)
 *  - OFFICIAL           → CANNOT delete/modify unrelated discussions
 *  - CITIZEN            → can only delete their own discussions
 */
const checkDiscussionOwnership = async (req, res, next) => {
  const prisma = require('../prismaClient');
  try {
    const { id } = req.params;
    const discussion = await prisma.discussion.findUnique({ where: { id } });
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // MODERATOR and ADMIN can delete any discussion
    if (['MODERATOR', 'ADMIN'].includes(req.user.role)) return next();

    // OFFICIAL cannot delete or modify community discussions
    if (req.user.role === 'OFFICIAL') {
      return res.status(403).json({
        message: 'Forbidden: Municipal officials cannot delete community discussions.'
      });
    }

    // CITIZEN can only delete their own
    if (discussion.authorId !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden: You can only delete your own discussions.'
      });
    }

    next();
  } catch (err) {
    console.error('checkDiscussionOwnership error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Middleware to guard official-only issue status updates.
 * Per spec: MODERATOR cannot change official complaint status.
 * Only OFFICIAL and ADMIN are allowed.
 * (This is already enforced by authorize('OFFICIAL','ADMIN') in routes,
 *  but this middleware adds an explicit rejection message for clarity.)
 */
const blockModeratorFromStatusChange = (req, res, next) => {
  if (req.user && req.user.role === 'MODERATOR') {
    return res.status(403).json({
      message: 'Forbidden: Moderators cannot change official complaint status. This action is reserved for Municipal Officials.'
    });
  }
  next();
};

/**
 * Middleware to allow MODERATOR access to the moderation queue.
 * Both MODERATOR and ADMIN can view and act on the moderation queue.
 */
const allowModeratorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!['MODERATOR', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Moderation features require MODERATOR or ADMIN role.'
    });
  }
  next();
};

module.exports = {
  authorize,
  checkIssueOwnership,
  checkDiscussionOwnership,
  blockModeratorFromStatusChange,
  allowModeratorOrAdmin
};
