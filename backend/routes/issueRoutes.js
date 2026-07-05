const express = require('express');
const {
  createIssue, getIssues, getIssueById, getPublicStats, getAdvancedAnalytics,
  upvoteIssue, updateIssueStatus, citizenResolveIssue, postOfficialUpdate,
  verifyIssue, deleteIssue
} = require('../controllers/issueController');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const { authorize, checkIssueOwnership } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * Issue Routes — Role Permission Enforcement
 *
 *  VISITOR   → GET / GET /map / GET /:id  (read-only, no auth required)
 *  CITIZEN   → POST / (report), POST /:id/upvote, DELETE /:id (own only)
 *  OFFICIAL  → PUT /:id/status, POST /:id/updates, PATCH /:id/verify
 *  MODERATOR → PATCH /:id/verify only
 *  ADMIN     → all actions including DELETE any issue
 *
 *  Restricted actions:
 *  - OFFICIAL cannot DELETE citizen reports
 *  - MODERATOR cannot change issue status (complaint workflow)
 */

// ── Public: VISITOR can browse all issues and the community map ──────────────
router.get('/', getIssues);
router.get('/map', getIssues);
router.get('/stats', getPublicStats);
router.get('/analytics/advanced', getAdvancedAnalytics);
router.get('/:id', getIssueById);

// ── Authenticated: Report and support issues (CITIZEN, OFFICIAL, MOD, ADMIN) ─
router.post('/', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), createIssue);
router.post('/:id/upvote', protect, authorize('CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'), upvoteIssue);
router.put('/:id/resolve', protect, citizenResolveIssue);

// ── Delete: CITIZEN (own + unprocessed only) | ADMIN (any)
//    OFFICIAL and MODERATOR are explicitly blocked by checkIssueOwnership ──────
router.delete('/:id', protect, authorize('CITIZEN', 'ADMIN'), checkIssueOwnership(), deleteIssue);

// ── Verify: OFFICIAL, MODERATOR, ADMIN can mark an issue as verified ─────────
router.patch('/:id/verify', protect, authorize('OFFICIAL', 'MODERATOR', 'ADMIN'), verifyIssue);

// ── Official Actions: ONLY Municipal Officials and Admins ─────────────────────
//    MODERATOR cannot update complaint status (per permission spec)
router.put('/:id/status', protect, authorize('OFFICIAL', 'ADMIN'), updateIssueStatus);
router.post('/:id/updates', protect, authorize('OFFICIAL', 'ADMIN'), postOfficialUpdate);

module.exports = router;
