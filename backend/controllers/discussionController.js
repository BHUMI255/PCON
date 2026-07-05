const prisma = require('../prismaClient');

// ─── Create Discussion (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ─────────────────

const createDiscussion = async (req, res) => {
  try {
    const { title, content, images, category, locality } = req.body;
    if (!title || !content || !category || !locality) {
      return res.status(400).json({ message: 'Title, content, category, and locality are required' });
    }

    const discussion = await prisma.discussion.create({
      data: { title, content, images: images || [], category, locality, authorId: req.user.id }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { participationScore: { increment: 5 } }
    });

    return res.status(201).json(discussion);
  } catch (error) {
    console.error('Create Discussion Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get All Discussions (Public — hidden filtered out for non-mods) ──────────

const getDiscussions = async (req, res) => {
  try {
    const { category, locality } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (locality) filters.locality = { equals: locality, mode: 'insensitive' };

    // Non-moderators/admins only see visible discussions
    const isMod = req.user && ['MODERATOR', 'ADMIN'].includes(req.user.role);
    if (!isMod) filters.hidden = false;

    const discussions = await prisma.discussion.findMany({
      where: filters,
      include: {
        author: { select: { name: true, profilePic: true } },
        _count: { select: { comments: true, upvotes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(discussions);
  } catch (error) {
    console.error('Get Discussions Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get Discussion By ID (Public) ───────────────────────────────────────────

const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, profilePic: true } },
        upvotes: { select: { userId: true } },
        comments: {
          where: { hidden: false },  // hide moderated comments for public
          include: {
            author: { select: { name: true, profilePic: true } },
            replies: {
              where: { hidden: false },
              include: { author: { select: { name: true, profilePic: true } } },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });
    return res.json(discussion);
  } catch (error) {
    console.error('Get Discussion ID Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Upvote Discussion (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ─────────────────

const upvoteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingUpvote = await prisma.discussionUpvote.findUnique({
      where: { userId_discussionId: { userId, discussionId: id } }
    });

    if (existingUpvote) {
      await prisma.discussionUpvote.delete({
        where: { userId_discussionId: { userId, discussionId: id } }
      });
      return res.json({ upvoted: false });
    } else {
      await prisma.discussionUpvote.create({ data: { userId, discussionId: id } });
      return res.json({ upvoted: true });
    }
  } catch (error) {
    console.error('Upvote Discussion Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Create Comment (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ────────────────────

const createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, images } = req.body;
    if (!content) return res.status(400).json({ message: 'Comment content is required' });

    const comment = await prisma.comment.create({
      data: { content, images: images || [], discussionId: id, authorId: req.user.id },
      include: { author: { select: { name: true, profilePic: true } } }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { participationScore: { increment: 2 } }
    });

    return res.status(201).json(comment);
  } catch (error) {
    console.error('Create Comment Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Create Reply (CITIZEN, OFFICIAL, MODERATOR, ADMIN) ──────────────────────

const createReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Reply content is required' });

    const commentExists = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!commentExists) return res.status(404).json({ message: 'Comment not found' });

    const reply = await prisma.reply.create({
      data: { content, commentId, authorId: req.user.id },
      include: { author: { select: { name: true, profilePic: true } } }
    });

    return res.status(201).json(reply);
  } catch (error) {
    console.error('Create Reply Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Delete Discussion (CITIZEN=own | MODERATOR/ADMIN=any | OFFICIAL=blocked) ─

const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    // Ownership + role check is handled by checkDiscussionOwnership middleware
    await prisma.discussion.delete({ where: { id } });
    return res.json({ message: 'Discussion deleted' });
  } catch (error) {
    console.error('Delete Discussion Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Hide Discussion (MODERATOR, ADMIN only) ──────────────────────────────────

const hideDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden = true } = req.body;

    const discussion = await prisma.discussion.findUnique({ where: { id } });
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    const updated = await prisma.discussion.update({ where: { id }, data: { hidden: Boolean(hidden) } });
    return res.json({
      message: hidden ? 'Discussion hidden from public.' : 'Discussion restored to public.',
      discussion: updated
    });
  } catch (error) {
    console.error('Hide Discussion Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Hide Comment (MODERATOR, ADMIN only) ─────────────────────────────────────

const hideComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden = true } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const updated = await prisma.comment.update({ where: { id }, data: { hidden: Boolean(hidden) } });
    return res.json({
      message: hidden ? 'Comment hidden.' : 'Comment restored.',
      comment: updated
    });
  } catch (error) {
    console.error('Hide Comment Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Hide Reply (MODERATOR, ADMIN only) ──────────────────────────────────────

const hideReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden = true } = req.body;

    const reply = await prisma.reply.findUnique({ where: { id } });
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    const updated = await prisma.reply.update({ where: { id }, data: { hidden: Boolean(hidden) } });
    return res.json({ message: hidden ? 'Reply hidden.' : 'Reply restored.', reply: updated });
  } catch (error) {
    console.error('Hide Reply Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createDiscussion, getDiscussions, getDiscussionById,
  upvoteDiscussion, createComment, createReply,
  deleteDiscussion, hideDiscussion, hideComment, hideReply
};
