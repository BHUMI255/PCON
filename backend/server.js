const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const eventRoutes = require('./routes/eventRoutes');
const adminRoutes = require('./routes/adminRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());

// Routes setup
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/events', eventRoutes);

// Admin panel — ADMIN role only
app.use('/api/admin', adminRoutes);

// Moderation queue — MODERATOR or ADMIN
// Separate from /api/admin so moderators can access without full admin privileges
app.use('/api/moderation', moderatorRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CivicConnect API',
    status: 'online',
    version: '1.0.0'
  });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Export for Vercel serverless functions
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[CivicConnect] Server successfully running on port ${PORT}`);
  });
}

module.exports = app;
