const prisma = require('../prismaClient');

// Haversine formula to compute distance between two lat/lng coordinates in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// AI Classification Mock
const getSuggestedCategory = async (images) => {
  if (!images || images.length === 0) return null;
  const mockCategories = [
    'Potholes', 'Water Leaks', 'Broken Streetlights', 'Garbage Accumulation',
    'Drainage Blockages', 'Road Damage', 'Sanitation Issues', 'Other Civic Concerns'
  ];
  return mockCategories[Math.floor(Math.random() * mockCategories.length)];
};

// ─── Create Issue (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ──────────────────────

const createIssue = async (req, res) => {
  try {
    const { title, description, category, images, latitude, longitude, address, severity, anonymous } = req.body;

    if (!title || !description || !category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Title, description, category, latitude, and longitude are required' });
    }

    const latVal = parseFloat(latitude);
    const lngVal = parseFloat(longitude);

    let aiSuggestedCategory = null;
    if (images && images.length > 0) {
      aiSuggestedCategory = await getSuggestedCategory(images);
    }

    // Duplicate detection
    const activeIssues = await prisma.issue.findMany({
      where: { category, status: { notIn: ['RESOLVED', 'CLOSED'] } }
    });

    const DUPLICATE_RADIUS_METERS = 50;
    const potentialDuplicates = activeIssues.filter(issue => {
      return getDistance(latVal, lngVal, issue.latitude, issue.longitude) <= DUPLICATE_RADIUS_METERS;
    });

    if (potentialDuplicates.length > 0) {
      return res.status(409).json({
        message: `Duplicate detection alert: There are existing reported issues within ${DUPLICATE_RADIUS_METERS} meters in this category.`,
        duplicates: potentialDuplicates.map(d => ({
          id: d.id, title: d.title, status: d.status,
          latitude: d.latitude, longitude: d.longitude
        }))
      });
    }

    const issue = await prisma.issue.create({
      data: {
        title, description, category,
        images: images || [],
        latitude: latVal, longitude: lngVal,
        address: address || '',
        severity: severity || 'MEDIUM',
        anonymous: anonymous || false,
        reportedById: req.user.id
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { issuesReported: { increment: 1 }, participationScore: { increment: 10 } }
    });

    return res.status(201).json({ ...issue, aiSuggestedCategory });
  } catch (error) {
    console.error('Create Issue Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get All Issues (Public) ──────────────────────────────────────────────────

const getIssues = async (req, res) => {
  try {
    const { category, severity, status, lat, lng, radius, address } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;

    let issues = await prisma.issue.findMany({
      where: filters,
      include: {
        reportedBy: { select: { name: true, profilePic: true, locality: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lat && lng && radius) {
      const latVal = parseFloat(lat);
      const lngVal = parseFloat(lng);
      const radVal = parseFloat(radius);
      issues = issues.filter(issue => getDistance(latVal, lngVal, issue.latitude, issue.longitude) <= radVal);
    }

    if (address) {
      const searchTerm = address.toLowerCase();
      issues = issues.filter(issue => {
        const issueAddress = (issue.address || '').toLowerCase();
        const reporterLocality = (issue.reportedBy?.locality || '').toLowerCase();
        return issueAddress.includes(searchTerm) || reporterLocality.includes(searchTerm);
      });
    }

    const processedIssues = issues.map(issue => {
      if (issue.anonymous) {
        return { ...issue, reportedBy: { name: 'Anonymous Citizen', profilePic: '', locality: '' } };
      }
      return issue;
    });

    return res.json(processedIssues);
  } catch (error) {
    console.error('Get Issues Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get Issue By ID (Public) ─────────────────────────────────────────────────

const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { name: true, profilePic: true, locality: true } },
        assignedTo: { select: { name: true, role: true } },
        officialUpdates: {
          include: { postedBy: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' }
        },
        upvotes: { select: { userId: true } }
      }
    });

    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (issue.anonymous) {
      issue.reportedBy = { name: 'Anonymous Citizen', profilePic: '', locality: '' };
    }

    return res.json(issue);
  } catch (error) {
    console.error('Get Issue By ID Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Upvote Issue (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ──────────────────────

const upvoteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingUpvote = await prisma.issueUpvote.findUnique({
      where: { userId_issueId: { userId, issueId: id } }
    });

    if (existingUpvote) {
      await prisma.issueUpvote.delete({ where: { userId_issueId: { userId, issueId: id } } });
      const updated = await prisma.issue.update({
        where: { id }, data: { upvoteCount: { decrement: 1 } }
      });
      return res.json({ upvoted: false, upvoteCount: updated.upvoteCount });
    } else {
      await prisma.issueUpvote.create({ data: { userId, issueId: id } });
      const updated = await prisma.issue.update({
        where: { id }, data: { upvoteCount: { increment: 1 } }
      });
      await prisma.user.update({
        where: { id: userId }, data: { participationScore: { increment: 2 } }
      });
      return res.json({ upvoted: true, upvoteCount: updated.upvoteCount });
    }
  } catch (error) {
    console.error('Upvote Issue Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Update Issue Status (OFFICIAL, ADMIN only) ───────────────────────────────

const updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedToId, resolutionImage, resolutionDesc } = req.body;

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const prevStatus = issue.status;
    const updateData = {};
    if (status) updateData.status = status;
    if (assignedToId) updateData.assignedToId = assignedToId;

    if (status === 'RESOLVED') {
      updateData.resolutionImage = resolutionImage || '';
      updateData.resolutionDesc = resolutionDesc || 'Issue resolved by municipal officials.';
      updateData.resolvedAt = new Date();

      await prisma.user.update({
        where: { id: issue.reportedById },
        data: { issuesResolved: { increment: 1 }, participationScore: { increment: 20 } }
      });
    }

    const updatedIssue = await prisma.issue.update({ where: { id }, data: updateData });

    if (status && status !== prevStatus) {
      await prisma.officialUpdate.create({
        data: {
          content: `Status changed from "${prevStatus}" → "${status}".`,
          issueId: id,
          postedById: req.user.id
        }
      });
    }

    return res.json(updatedIssue);
  } catch (error) {
    console.error('Update Issue Status Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get Public Stats for Landing Page ───────────────────────────────────────
const getPublicStats = async (req, res) => {
  try {
    const allIssues = await prisma.issue.findMany();
    const resolvedIssues = await prisma.issue.findMany({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } });
    const allUsers = await prisma.user.findMany();

    const issues = allIssues.length;
    const resolved = resolvedIssues.length;
    const volunteers = allUsers.length;

    return res.json({ issues, resolved, volunteers });
  } catch (error) {
    console.error('getPublicStats Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Advanced Analytics Dashboard ─────────────────────────────────────────────
const getAdvancedAnalytics = async (req, res) => {
  try {
    // 1. City Health Index
    const pendingList = await prisma.issue.findMany({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } });
    const pendingIssues = pendingList.length;
    
    const resolvedIssues = await prisma.issue.findMany({
      where: { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true, upvoteCount: true, assignedTo: { select: { id: true, name: true } }, reportedBy: { select: { locality: true } } }
    });
    
    let totalTimeDiff = 0;
    resolvedIssues.forEach(issue => {
      totalTimeDiff += (issue.resolvedAt.getTime() - issue.createdAt.getTime());
    });
    const avgResolutionTimeHours = resolvedIssues.length > 0 ? (totalTimeDiff / resolvedIssues.length) / (1000 * 60 * 60) : 0;
    
    const allIssuesList = await prisma.issue.findMany();
    let citizenSatisfactionScore = 0;
    allIssuesList.forEach(i => citizenSatisfactionScore += (i.upvoteCount || 0));
    
    const volunteersList = await prisma.volunteerRegistration.findMany();
    const discussionList = await prisma.discussion.findMany();
    const communityParticipation = volunteersList.length + discussionList.length;
    
    // 2. Department Performance (Grouped by Assigned Official)
    const allAssignedIssues = await prisma.issue.findMany({
      where: { assignedToId: { not: null } },
      select: { 
        status: true, 
        createdAt: true, 
        resolvedAt: true, 
        upvoteCount: true, 
        assignedTo: { select: { name: true } } 
      }
    });

    const deptMap = {};
    allAssignedIssues.forEach(issue => {
      const officialName = issue.assignedTo.name;
      if (!deptMap[officialName]) {
        deptMap[officialName] = { name: officialName, totalAssigned: 0, resolved: 0, pending: 0, totalResolveTime: 0, upvotes: 0 };
      }
      deptMap[officialName].totalAssigned++;
      deptMap[officialName].upvotes += issue.upvoteCount;
      if (['RESOLVED', 'CLOSED'].includes(issue.status)) {
        deptMap[officialName].resolved++;
        if (issue.resolvedAt) {
          deptMap[officialName].totalResolveTime += (issue.resolvedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60);
        }
      } else {
        deptMap[officialName].pending++;
      }
    });
    
    const departmentPerformance = Object.values(deptMap).map(d => ({
      name: d.name,
      resolutionRate: Math.round((d.resolved / d.totalAssigned) * 100),
      avgCompletionTimeHours: d.resolved > 0 ? Math.round(d.totalResolveTime / d.resolved) : 0,
      citizenRatings: d.upvotes,
      backlog: d.pending
    }));

    // 3. Ward Ranking (Grouped by Reporter Locality)
    const allIssues = await prisma.issue.findMany({
      select: { 
        status: true, 
        createdAt: true, 
        resolvedAt: true, 
        upvoteCount: true,
        reportedBy: { select: { locality: true } }
      }
    });

    const wardMap = {};
    allIssues.forEach(issue => {
      const ward = issue.reportedBy?.locality || 'Unknown Area';
      if (!wardMap[ward]) {
        wardMap[ward] = { name: ward, total: 0, resolved: 0, totalResolveTime: 0, activeCitizensActivity: 0 };
      }
      wardMap[ward].total++;
      wardMap[ward].activeCitizensActivity += (1 + issue.upvoteCount); // 1 for report, + upvotes
      if (['RESOLVED', 'CLOSED'].includes(issue.status)) {
        wardMap[ward].resolved++;
        if (issue.resolvedAt) {
          wardMap[ward].totalResolveTime += (issue.resolvedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60);
        }
      }
    });
    
    const wardRanking = Object.values(wardMap).map(w => ({
      name: w.name,
      avgResponseTimeHours: w.resolved > 0 ? Math.round(w.totalResolveTime / w.resolved) : 0,
      activityScore: w.activeCitizensActivity,
      cleanestRate: Math.round((w.resolved / w.total) * 100),
    })).sort((a, b) => b.cleanestRate - a.cleanestRate);

    return res.json({
      cityHealth: {
        pendingComplaints: pendingIssues,
        avgResolutionSpeedHours: Math.round(avgResolutionTimeHours),
        citizenSatisfaction: citizenSatisfactionScore,
        communityParticipation
      },
      departmentPerformance,
      wardRanking
    });
  } catch (error) {
    console.error('getAdvancedAnalytics Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Citizen Resolve Issue (CITIZEN only, Own issues) ────────────────────────
const citizenResolveIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionImage, resolutionDesc } = req.body;

    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (issue.reportedById !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You can only resolve your own reported issues.' });
    }

    if (issue.status === 'RESOLVED' || issue.status === 'CLOSED') {
      return res.status(400).json({ message: 'Issue is already resolved or closed.' });
    }

    if (!resolutionImage) {
      return res.status(400).json({ message: 'An after photo (resolution image) is required to resolve this issue.' });
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolutionImage,
        resolutionDesc: resolutionDesc || 'Issue resolved by the reporting citizen (Awaiting Verification).',
        resolvedAt: new Date(),
        verified: false,
      }
    });

    await prisma.officialUpdate.create({
      data: {
        content: `Citizen marked this issue as RESOLVED. Uploaded an after photo (Awaiting Verification).`,
        issueId: id,
        postedById: req.user.id
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { issuesResolved: { increment: 1 }, participationScore: { increment: 20 } }
    });

    return res.json(updatedIssue);
  } catch (error) {
    console.error('Citizen Resolve Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Post Official Update (OFFICIAL, ADMIN only) ──────────────────────────────

const postOfficialUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Update content is required' });

    const update = await prisma.officialUpdate.create({
      data: { content, issueId: id, postedById: req.user.id },
      include: { postedBy: { select: { name: true, role: true } } }
    });

    return res.status(201).json(update);
  } catch (error) {
    console.error('Post Official Update Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Verify Issue (OFFICIAL, MODERATOR, ADMIN) ────────────────────────────────

const verifyIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const updated = await prisma.issue.update({
      where: { id },
      data: { verified: true }
    });

    // Post an official update log entry
    await prisma.officialUpdate.create({
      data: {
        content: `Issue verified by ${req.user.name} (${req.user.role}).`,
        issueId: id,
        postedById: req.user.id
      }
    });

    return res.json({ message: 'Issue verified successfully.', issue: updated });
  } catch (error) {
    console.error('Verify Issue Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Delete Issue (CITIZEN=own+unprocessed, ADMIN=any; OFFICIAL=blocked) ─────

const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await prisma.issue.findUnique({ where: { id } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    // Ownership + role checks are handled by checkIssueOwnership middleware.
    // This handler only runs if middleware passed.
    await prisma.issue.delete({ where: { id } });
    return res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete Issue Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createIssue, getIssues, getIssueById, getPublicStats, getAdvancedAnalytics,
  upvoteIssue, updateIssueStatus, citizenResolveIssue, postOfficialUpdate,
  verifyIssue, deleteIssue
};
