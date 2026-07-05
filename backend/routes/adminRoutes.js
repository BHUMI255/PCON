const express = require('express');
const { getAllUsers, updateUserRole, deleteUser, getPlatformStats, getModerationQueue } = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * Admin Routes — ADMIN role only
 *
 * Per permission spec:
 *  ADMIN → manage users, roles, issue categories, departments,
 *           moderation, analytics, system-wide settings
 *
 * Note: Moderation queue is also accessible by MODERATOR via /api/moderation
 *       (see moderatorRoutes.js). Admin can also access it here.
 */
router.use(protect, authorize('ADMIN'));

// ── User management ────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// ── Analytics (Admin-only) ─────────────────────────────────────────────────
router.get('/stats', getPlatformStats);

// ── Moderation queue (Admin access via /api/admin/moderation) ─────────────
// MODERATOR access is via /api/moderation (separate route in server.js)
router.get('/moderation', getModerationQueue);

module.exports = router;
