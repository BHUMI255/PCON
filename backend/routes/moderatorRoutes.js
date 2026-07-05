const express = require('express');
const { getModerationQueue } = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { allowModeratorOrAdmin } = require('../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * Moderation Queue — accessible by MODERATOR and ADMIN
 * 
 * Per permission spec:
 *  MODERATOR → moderate discussions, remove inappropriate content,
 *               verify reported issues, manage community interactions
 *  ADMIN     → full moderation access + user management
 */
router.get('/', protect, allowModeratorOrAdmin, getModerationQueue);

module.exports = router;
