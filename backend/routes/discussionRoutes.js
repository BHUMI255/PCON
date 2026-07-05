const express = require('express');
const {
  createDiscussion, getDiscussions, getDiscussionById,
  upvoteDiscussion, createComment, createReply,
  deleteDiscussion, hideDiscussion, hideComment, hideReply
} = require('../controllers/discussionController');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const { authorize, checkDiscussionOwnership } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * Discussion Routes — Role Permission Enforcement
 *
 *  VISITOR   → GET / GET /:id  (browse public discussions, read-only)
 *  CITIZEN   → POST /, upvote, comment, reply, DELETE own discussions
 *  OFFICIAL  → POST /, upvote, comment, reply — CANNOT delete others' discussions
 *  MODERATOR → all CITIZEN perms + hide/unhide (remove inappropriate content)
 *              + DELETE any discussion (moderation power)
 *  ADMIN     → all actions
 *
 *  Restricted actions:
 *  - OFFICIAL cannot delete or modify unrelated community discussions
 *  - VISITOR cannot post, comment, or interact (read-only)
 */

// ── Public: VISITOR can browse discussions (hidden posts filtered server-side) ─
// optionalProtect attaches req.user if token present, without blocking unauthenticated visitors
router.get('/', optionalProtect, getDiscussions);
router.get('/:id', getDiscussionById);

// ── Authenticated: Post, vote, comment (all roles except VISITOR) ─────────────
router.post('/', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), createDiscussion);
router.post('/:id/upvote', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), upvoteDiscussion);
router.post('/:id/comments', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), createComment);
router.post('/comments/:commentId/replies', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), createReply);

// ── Delete: CITIZEN=own only | MODERATOR/ADMIN=any | OFFICIAL=BLOCKED ────────
// Note: OFFICIAL is not in authorize list — blocked at route level
router.delete('/:id', protect, authorize('CITIZEN', 'MODERATOR', 'ADMIN'), checkDiscussionOwnership, deleteDiscussion);

// ── Moderation: Hide/unhide content — MODERATOR and ADMIN only ────────────────
// Per spec: moderators can remove inappropriate content and manage community interactions
router.patch('/:id/hide', protect, authorize('MODERATOR', 'ADMIN'), hideDiscussion);
router.patch('/comments/:id/hide', protect, authorize('MODERATOR', 'ADMIN'), hideComment);
router.patch('/replies/:id/hide', protect, authorize('MODERATOR', 'ADMIN'), hideReply);

module.exports = router;
