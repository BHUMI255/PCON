const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  registerForEvent,
  cancelRegistration,
  updateEventStatus,
  getUserEvents,
  toggleReminder,
  getUpcomingReminders
} = require('../controllers/eventController');
const { protect } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * Event Routes — Role Permission Enforcement
 *
 *  VISITOR   → GET / GET /:id  (view public events — read-only)
 *  CITIZEN   → register, cancel, set reminders, view their registrations
 *  OFFICIAL  → all CITIZEN perms + create events, update event status
 *  MODERATOR → all CITIZEN perms (events are not in their scope for management)
 *  ADMIN     → all actions
 *
 *  Restricted actions:
 *  - VISITOR cannot register for events (must be authenticated)
 *  - CITIZEN/MODERATOR cannot create or manage events
 */

// ── Public: VISITOR can browse and view events (no auth required) ─────────
router.get('/', getEvents);

// ── Protected: My participation history (authenticated users only) ─────────
router.get('/my/registrations', protect, getUserEvents);

// ── Protected: Upcoming reminders (authenticated users only) ──────────────
router.get('/my/reminders', protect, getUpcomingReminders);

// ── Public: Get event by ID (must be after /my/* routes) ─────────────────
router.get('/:id', getEventById);

// ── Restricted: Only Officials and Admins can create/manage events ─────────
router.post('/', protect, authorize('OFFICIAL', 'ADMIN'), createEvent);
router.put('/:id/status', protect, authorize('OFFICIAL', 'ADMIN'), updateEventStatus);

// ── Authenticated: Citizens and all logged-in users can sign up ────────────
router.post('/:id/register', protect, registerForEvent);
router.post('/:id/cancel', protect, cancelRegistration);

// ── Protected: Toggle event reminder (any authenticated user) ─────────────
router.post('/:id/reminder', protect, toggleReminder);

module.exports = router;
