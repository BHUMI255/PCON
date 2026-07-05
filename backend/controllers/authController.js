const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const register = async (req, res) => {
  try {
    const { name, email, password, locality } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, email, password) are required' });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        locality: locality || '',
        role: 'CITIZEN'
      }
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: '30d' });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locality: user.locality,
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: '30d' });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locality: user.locality,
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        badges: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch supported issues (upvotes)
    const upvotes = await prisma.issueUpvote.findMany({
      where: { userId: req.user.id }
    });

    return res.json({
      ...user,
      issuesSupported: upvotes.length
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, profilePic, locality } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        profilePic: profilePic !== undefined ? profilePic : undefined,
        locality: locality !== undefined ? locality : undefined,
      }
    });

    const upvotes = await prisma.issueUpvote.findMany({
      where: { userId: req.user.id }
    });

    return res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      locality: updatedUser.locality,
      profilePic: updatedUser.profilePic,
      issuesReported: updatedUser.issuesReported,
      issuesResolved: updatedUser.issuesResolved,
      participationScore: updatedUser.participationScore,
      badges: updatedUser.badges,
      issuesSupported: upvotes.length,
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, profilePic } = req.body;

    if (!email || !googleId || !name) {
      return res.status(400).json({ message: 'Incomplete Google login payload' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          profilePic: profilePic || '',
          role: 'CITIZEN'
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId, profilePic }
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', { expiresIn: '30d' });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      locality: user.locality,
      token
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { register, login, getProfile, googleAuth, updateProfile };
