import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Issue endpoints
export const fetchIssues = async (params) => {
  const res = await api.get('/issues', { params });
  return res.data;
};

export const fetchPublicStats = async () => {
  const res = await api.get('/issues/stats');
  return res.data;
};

export const fetchAdvancedAnalytics = async () => {
  const res = await api.get('/issues/analytics/advanced');
  return res.data;
};

export const fetchIssueById = async (id) => {
  const res = await api.get(`/issues/${id}`);
  return res.data;
};

export const reportIssue = async (issueData) => {
  const res = await api.post('/issues', issueData);
  return res.data;
};

export const upvoteIssue = async (id) => {
  const res = await api.post(`/issues/${id}/upvote`);
  return res.data;
};

export const updateIssueStatus = async (id, statusData) => {
  const res = await api.put(`/issues/${id}/status`, statusData);
  return res.data;
};

export const citizenResolveIssue = async (id, resolutionData) => {
  const res = await api.put(`/issues/${id}/resolve`, resolutionData);
  return res.data;
};

export const postOfficialUpdate = async (id, updateData) => {
  const res = await api.post(`/issues/${id}/updates`, updateData);
  return res.data;
};

export const deleteIssue = async (id) => {
  const res = await api.delete(`/issues/${id}`);
  return res.data;
};

export const verifyIssue = async (id) => {
  const res = await api.patch(`/issues/${id}/verify`);
  return res.data;
};


// Discussion endpoints
export const fetchDiscussions = async (params) => {
  const res = await api.get('/discussions', { params });
  return res.data;
};

export const fetchDiscussionById = async (id) => {
  const res = await api.get(`/discussions/${id}`);
  return res.data;
};

export const createDiscussion = async (discussionData) => {
  const res = await api.post('/discussions', discussionData);
  return res.data;
};

export const upvoteDiscussion = async (id) => {
  const res = await api.post(`/discussions/${id}/upvote`);
  return res.data;
};

export const createComment = async (id, commentData) => {
  const res = await api.post(`/discussions/${id}/comments`, commentData);
  return res.data;
};

export const createReply = async (commentId, replyData) => {
  const res = await api.post(`/discussions/comments/${commentId}/replies`, replyData);
  return res.data;
};

// Event endpoints
export const fetchEvents = async (params) => {
  const res = await api.get('/events', { params });
  return res.data;
};

export const fetchUserEvents = async () => {
  const res = await api.get('/events/my/registrations');
  return res.data;
};

export const fetchEventById = async (id) => {
  const res = await api.get(`/events/${id}`);
  return res.data;
};

export const createEvent = async (eventData) => {
  const res = await api.post('/events', eventData);
  return res.data;
};

export const registerForEvent = async (id) => {
  const res = await api.post(`/events/${id}/register`);
  return res.data;
};

export const cancelEventRegistration = async (id) => {
  const res = await api.post(`/events/${id}/cancel`);
  return res.data;
};

export const updateEventStatus = async (id, statusData) => {
  const res = await api.put(`/events/${id}/status`, statusData);
  return res.data;
};

export const toggleEventReminder = async (id, reminderData) => {
  const res = await api.post(`/events/${id}/reminder`, reminderData);
  return res.data;
};

export const fetchUpcomingReminders = async () => {
  const res = await api.get('/events/my/reminders');
  return res.data;
};

// ── Moderation endpoints ────────────────────────────────────────────────────
export const hideDiscussion = async (id, hidden = true) => {
  const res = await api.patch(`/discussions/${id}/hide`, { hidden });
  return res.data;
};

export const hideComment = async (id, hidden = true) => {
  const res = await api.patch(`/discussions/comments/${id}/hide`, { hidden });
  return res.data;
};

// ── Admin endpoints ─────────────────────────────────────────────────────────
export const fetchAllUsers = async (params) => {
  const res = await api.get('/admin/users', { params });
  return res.data;
};

export const updateUserRole = async (id, role) => {
  const res = await api.put(`/admin/users/${id}/role`, { role });
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data;
};

export const fetchPlatformStats = async () => {
  const res = await api.get('/admin/stats');
  return res.data;
};

export const fetchModerationQueue = async () => {
  const res = await api.get('/admin/moderation');
  return res.data;
};

// ── Moderator moderation queue (/api/moderation — accessible by MODERATOR + ADMIN)
export const fetchModerationQueueMod = async () => {
  const res = await api.get('/moderation');
  return res.data;
};

export default api;

