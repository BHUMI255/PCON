const prisma = require('../prismaClient');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES_HIERARCHY = { CITIZEN: 1, OFFICIAL: 2, MODERATOR: 3, ADMIN: 4 };

// ─── Get All Users (Admin) ────────────────────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          locality: true,
          profilePic: true,
          issuesReported: true,
          issuesResolved: true,
          participationScore: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    return res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('getAllUsers Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Update User Role (Admin) ─────────────────────────────────────────────────

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['CITIZEN', 'OFFICIAL', 'MODERATOR', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent admin from demoting themselves
    if (id === req.user.id && role !== 'ADMIN') {
      return res.status(400).json({ message: 'Administrators cannot change their own role.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    return res.json({ message: `Role updated to ${role} successfully.`, user: updated });
  } catch (error) {
    console.error('updateUserRole Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Delete User (Admin) ──────────────────────────────────────────────────────

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'Administrators cannot delete their own account.' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('deleteUser Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Platform Analytics (Admin) ───────────────────────────────────────────────

const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalIssues,
      resolvedIssues,
      totalDiscussions,
      totalEvents,
      issuesByCategory,
      issuesByStatus,
      usersByRole,
      recentIssues
    ] = await Promise.all([
      prisma.user.count(),
      prisma.issue.count(),
      prisma.issue.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.discussion.count({ where: { hidden: false } }),
      prisma.event.count(),
      prisma.issue.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.issue.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.issue.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true, category: true, createdAt: true }
      })
    ]);

    const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    return res.json({
      overview: { totalUsers, totalIssues, resolvedIssues, resolutionRate, totalDiscussions, totalEvents },
      issuesByCategory: issuesByCategory.map(i => ({ category: i.category, count: i._count.id })),
      issuesByStatus: issuesByStatus.map(i => ({ status: i.status, count: i._count.id })),
      usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count.id })),
      recentIssues
    });
  } catch (error) {
    console.error('getPlatformStats Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Moderation Queue (Admin/Mod) ─────────────────────────────────────────────

const getModerationQueue = async (req, res) => {
  try {
    const [hiddenDiscussions, hiddenComments, unverifiedIssues] = await Promise.all([
      prisma.discussion.findMany({
        where: { hidden: true },
        include: { author: { select: { name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      }),
      prisma.comment.findMany({
        where: { hidden: true },
        include: {
          author: { select: { name: true } },
          discussion: { select: { title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.issue.findMany({
        where: { verified: false, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        include: { reportedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    return res.json({ hiddenDiscussions, hiddenComments, unverifiedIssues });
  } catch (error) {
    console.error('getModerationQueue Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getAllUsers, updateUserRole, deleteUser, getPlatformStats, getModerationQueue };
