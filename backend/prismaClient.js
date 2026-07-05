const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

let prisma;
const useMock = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('mock_pwd') || process.env.USE_MOCK_DB === 'true';

if (!useMock) {
  prisma = new PrismaClient();
} else {
  console.log('[CivicConnect] Database connection set to MOCK. Running in-memory database simulation mode.');
  
  // In-Memory Database store
  const inMemoryStore = {
    users: [],
    issues: [],
    issueUpvotes: [],
    officialUpdates: [],
    discussions: [],
    discussionUpvotes: [],
    comments: [],
    replies: [],
    events: [],
    volunteerRegistrations: []
  };

  // Seed default admin and citizen accounts
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('password123', salt);

  inMemoryStore.users.push({
    id: 'citizen-id-1',
    name: 'John Citizen',
    email: 'citizen@civic.com',
    password: hashedPassword,
    role: 'CITIZEN',
    locality: 'Greenwood Valley',
    issuesReported: 1,
    issuesResolved: 0,
    participationScore: 10,
    badges: ['First Responder']
  });

  inMemoryStore.users.push({
    id: 'official-id-1',
    name: 'Mayor Adams',
    email: 'official@civic.com',
    password: hashedPassword,
    role: 'OFFICIAL',
    locality: 'Greenwood Valley',
    issuesReported: 0,
    issuesResolved: 0,
    participationScore: 100,
    badges: ['City Leader']
  });

  // Seed default issues
  inMemoryStore.issues.push({
    id: 'issue-id-1',
    title: 'Huge Pothole on 5th Avenue',
    description: 'A deep pothole is blocking the main lane near the bakery. Drivers are swerving into oncoming traffic.',
    category: 'Roads',
    images: ['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=400'],
    latitude: 40.7128,
    longitude: -74.0060,
    address: '5th Ave & 23rd St, Greenwood Valley',
    severity: 'HIGH',
    status: 'REPORTED',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: null,
    upvoteCount: 5,
    verified: true,
    aiFraudScore: 0.98,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-2',
    title: 'Overflowing Garbage Bins at Market Square',
    description: 'The garbage bins near the vegetable market have not been collected for 3 days. Foul smell and stray animals are a problem.',
    category: 'Garbage Accumulation',
    images: [],
    latitude: 40.7145,
    longitude: -74.0030,
    address: 'Market Square, Greenwood Valley',
    severity: 'HIGH',
    status: 'UNDER_REVIEW',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: null,
    upvoteCount: 12,
    verified: true,
    aiFraudScore: 0.95,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-3',
    title: 'Broken Streetlight on Elm Street',
    description: 'The streetlight near house #42 has been out for a week. The area is completely dark after 7 PM, creating safety concerns.',
    category: 'Broken Streetlights',
    images: [],
    latitude: 40.7110,
    longitude: -74.0085,
    address: '42 Elm Street, Riverside District',
    severity: 'MEDIUM',
    status: 'ASSIGNED',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: 'official-id-1',
    upvoteCount: 8,
    verified: true,
    aiFraudScore: 0.92,
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-4',
    title: 'Water Pipe Leak at Central Park',
    description: 'A major water pipeline is leaking near the park entrance causing waterlogging and wasting water. Needs urgent repair.',
    category: 'Water Leaks',
    images: [],
    latitude: 40.7155,
    longitude: -74.0100,
    address: 'Central Park Main Gate, Greenwood Valley',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    anonymous: true,
    reportedById: 'citizen-id-1',
    assignedToId: 'official-id-1',
    upvoteCount: 22,
    verified: true,
    aiFraudScore: 0.99,
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-5',
    title: 'Blocked Storm Drain on River Road',
    description: 'The storm drain near the bridge is completely clogged with debris causing flooding during rain.',
    category: 'Drainage Blockages',
    images: [],
    latitude: 40.7095,
    longitude: -74.0045,
    address: 'River Road Bridge, Riverside District',
    severity: 'MEDIUM',
    status: 'REPORTED',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: null,
    upvoteCount: 6,
    verified: false,
    aiFraudScore: 0.88,
    createdAt: new Date(Date.now() - 43200000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-6',
    title: 'Road Surface Damaged After Construction',
    description: 'The road surface was badly damaged during pipeline construction work last month. No restoration has been done yet.',
    category: 'Road Damage',
    images: [],
    latitude: 40.7170,
    longitude: -74.0025,
    address: 'Oak Avenue, Hillside Colony',
    severity: 'LOW',
    status: 'RESOLVED',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: 'official-id-1',
    upvoteCount: 3,
    verified: true,
    aiFraudScore: 0.91,
    resolutionImage: '',
    resolutionDesc: 'Road resurfacing completed by municipal team.',
    resolvedAt: new Date(Date.now() - 86400000),
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-7',
    title: 'Open Sewage Near School Zone',
    description: 'Raw sewage is flowing openly near the primary school entrance. Children are at health risk. Extremely urgent.',
    category: 'Sanitation Issues',
    images: [],
    latitude: 40.7135,
    longitude: -74.0070,
    address: 'School Lane, Greenwood Valley',
    severity: 'HIGH',
    status: 'REPORTED',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: null,
    upvoteCount: 35,
    verified: true,
    aiFraudScore: 0.97,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date()
  });

  inMemoryStore.issues.push({
    id: 'issue-id-8',
    title: 'Pothole Cluster Near Bus Stop',
    description: 'Multiple potholes have formed near the bus stop making it dangerous for two-wheelers and pedestrians.',
    category: 'Potholes',
    images: [],
    latitude: 40.7102,
    longitude: -74.0015,
    address: 'Bus Stop #14, Hilltop Area',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    anonymous: false,
    reportedById: 'citizen-id-1',
    assignedToId: null,
    upvoteCount: 9,
    verified: true,
    aiFraudScore: 0.93,
    createdAt: new Date(Date.now() - 345600000),
    updatedAt: new Date()
  });

  // Seed default discussions
  inMemoryStore.discussions.push({
    id: 'disc-id-1',
    title: 'Welcome to Greenwood Valley Forum!',
    content: "Let's use this forum to coordinate local neighborhood initiatives, safety watch protocols, and cleanup actions.",
    images: [],
    category: 'General',
    locality: 'Greenwood Valley',
    hidden: false,
    authorId: 'official-id-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { comments: 0, upvotes: 2 }
  });

  inMemoryStore.events.push({
    id: 'event-id-1',
    title: 'Greenwood Valley Clean-Up Campaign',
    description: 'NGO cleanup campaign. Meet at the East gate. Bring trash bags and garden gloves.',
    category: 'cleanliness',
    organizerId: 'official-id-1',
    address: 'East Gate Park, Greenwood Valley',
    dateTime: new Date(Date.now() + 86400000 * 2),
    maxVolunteers: 25,
    status: 'UPCOMING',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Seed official updates for issues
  inMemoryStore.officialUpdates.push({
    id: 'update-id-1',
    content: 'Complaint received and logged in our system. Assigned to Road Maintenance Division for inspection.',
    issueId: 'issue-id-1',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 82800000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-2',
    content: 'Field inspection completed. Confirmed deep pothole. Repair crew scheduled for Thursday morning. Temporary barricades placed.',
    issueId: 'issue-id-1',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 43200000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-3',
    content: 'Garbage collection complaint escalated to Sanitation Department. Emergency pickup scheduled within 24 hours.',
    issueId: 'issue-id-2',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 72000000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-4',
    content: 'Streetlight fault identified — faulty ballast unit. Replacement parts ordered. Expected repair: 3–4 business days.',
    issueId: 'issue-id-3',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 140000000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-5',
    content: 'Pipeline repair team deployed. Excavation work underway. Water supply to the area may be intermittent today.',
    issueId: 'issue-id-4',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 172800000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-6',
    content: 'Leak successfully sealed. Site restored. Water supply normalized. Monitoring for 48 hours before closing issue.',
    issueId: 'issue-id-4',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 86400000)
  });

  inMemoryStore.officialUpdates.push({
    id: 'update-id-7',
    content: 'Open sewage issue near school is CRITICAL. Emergency sanitation crew dispatched. Parents advised to use alternate route.',
    issueId: 'issue-id-7',
    postedById: 'official-id-1',
    createdAt: new Date(Date.now() - 3600000)
  });

  const makeMockModel = (storeName) => {
    return {
      findMany: async (args = {}) => {
        let list = [...inMemoryStore[storeName]];
        
        // Handle filter mapping
        if (args.where) {
          list = list.filter(item => {
            for (const key in args.where) {
              const val = args.where[key];
              if (val === undefined) continue;
              
              if (val && typeof val === 'object') {
                if ('notIn' in val) {
                  if (val.notIn.includes(item[key])) return false;
                }
                if ('equals' in val) {
                  if (typeof val.equals === 'string' && typeof item[key] === 'string') {
                    if (item[key].toLowerCase() !== val.equals.toLowerCase()) return false;
                  } else if (item[key] !== val.equals) {
                    return false;
                  }
                }
              } else {
                if (item[key] !== val) return false;
              }
            }
            return true;
          });
        }

        // Handle includes mapping (mock count and relations)
        return list.map(item => {
          const mapped = { ...item };
          if (storeName === 'issues') {
            mapped.reportedBy = inMemoryStore.users.find(u => u.id === item.reportedById) || null;
            mapped.assignedTo = inMemoryStore.users.find(u => u.id === item.assignedToId) || null;
            mapped.upvotes = inMemoryStore.issueUpvotes.filter(up => up.issueId === item.id);
            mapped.officialUpdates = inMemoryStore.officialUpdates
              .filter(up => up.issueId === item.id)
              .map(up => ({
                ...up,
                postedBy: inMemoryStore.users.find(u => u.id === up.postedById) || null
              }));
          }
          if (storeName === 'discussions') {
            mapped.author = inMemoryStore.users.find(u => u.id === item.authorId) || null;
            mapped.comments = inMemoryStore.comments.filter(c => c.discussionId === item.id).map(c => ({
              ...c,
              author: inMemoryStore.users.find(u => u.id === c.authorId) || null,
              replies: inMemoryStore.replies.filter(r => r.commentId === c.id).map(r => ({
                ...r,
                author: inMemoryStore.users.find(u => u.id === r.authorId) || null
              }))
            }));
            mapped.upvotes = inMemoryStore.discussionUpvotes.filter(up => up.discussionId === item.id);
          }
          if (storeName === 'events') {
            mapped.organizer = inMemoryStore.users.find(u => u.id === item.organizerId) || null;
            mapped.volunteers = inMemoryStore.volunteerRegistrations.filter(v => v.eventId === item.id);
          }
          if (storeName === 'volunteerRegistrations') {
            mapped.event = inMemoryStore.events.find(e => e.id === item.eventId) || null;
            if (mapped.event) {
              mapped.event.organizer = inMemoryStore.users.find(u => u.id === mapped.event.organizerId) || null;
              mapped.event.volunteers = inMemoryStore.volunteerRegistrations.filter(v => v.eventId === mapped.event.id);
              mapped.event._count = { volunteers: mapped.event.volunteers.length };
            }
          }
          return mapped;
        });
      },
      findUnique: async (args = {}) => {
        const list = inMemoryStore[storeName];
        const match = list.find(item => {
          if (args.where.id !== undefined && item.id === args.where.id) return true;
          if (args.where.email !== undefined && item.email === args.where.email) return true;
          
          // Compound check
          if (args.where.userId_issueId) {
            const { userId, issueId } = args.where.userId_issueId;
            if (item.userId === userId && item.issueId === issueId) return true;
          }
          if (args.where.userId_discussionId) {
            const { userId, discussionId } = args.where.userId_discussionId;
            if (item.userId === userId && item.discussionId === discussionId) return true;
          }
          if (args.where.userId_eventId) {
            const { userId, eventId } = args.where.userId_eventId;
            if (item.userId === userId && item.eventId === eventId) return true;
          }
          return false;
        });

        if (!match) return null;

        const mapped = { ...match };
        if (storeName === 'issues') {
          mapped.reportedBy = inMemoryStore.users.find(u => u.id === match.reportedById) || null;
          mapped.assignedTo = inMemoryStore.users.find(u => u.id === match.assignedToId) || null;
          mapped.upvotes = inMemoryStore.issueUpvotes.filter(up => up.issueId === match.id);
          mapped.officialUpdates = inMemoryStore.officialUpdates
            .filter(up => up.issueId === match.id)
            .map(up => ({
              ...up,
              postedBy: inMemoryStore.users.find(u => u.id === up.postedById) || null
            }));
        }
        if (storeName === 'discussions') {
          mapped.author = inMemoryStore.users.find(u => u.id === match.authorId) || null;
          mapped.comments = inMemoryStore.comments.filter(c => c.discussionId === match.id).map(c => ({
            ...c,
            author: inMemoryStore.users.find(u => u.id === c.authorId) || null,
            replies: inMemoryStore.replies.filter(r => r.commentId === c.id).map(r => ({
              ...r,
              author: inMemoryStore.users.find(u => u.id === r.authorId) || null
            }))
          }));
          mapped.upvotes = inMemoryStore.discussionUpvotes.filter(up => up.discussionId === match.id);
        }
        if (storeName === 'events') {
          mapped.organizer = inMemoryStore.users.find(u => u.id === match.organizerId) || null;
          mapped.volunteers = inMemoryStore.volunteerRegistrations.filter(v => v.eventId === match.id);
        }
        return mapped;
      },
      create: async (args = {}) => {
        const crypto = require('crypto');
        const newId = crypto.randomUUID();
        const newItem = {
          id: newId,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data
        };
        inMemoryStore[storeName].push(newItem);
        return newItem;
      },
      update: async (args = {}) => {
        const list = inMemoryStore[storeName];
        let index = -1;
        
        if (args.where.id) {
          index = list.findIndex(item => item.id === args.where.id);
        } else if (args.where.userId_eventId) {
          const { userId, eventId } = args.where.userId_eventId;
          index = list.findIndex(item => item.userId === userId && item.eventId === eventId);
        } else if (args.where.userId_issueId) {
          const { userId, issueId } = args.where.userId_issueId;
          index = list.findIndex(item => item.userId === userId && item.issueId === issueId);
        }
        
        if (index === -1) throw new Error('Mock Item not found');
        
        const item = list[index];
        const updated = { ...item };
        for (const key in args.data) {
          const val = args.data[key];
          if (val && typeof val === 'object' && 'increment' in val) {
            updated[key] = (updated[key] || 0) + val.increment;
          } else if (val && typeof val === 'object' && 'decrement' in val) {
            updated[key] = (updated[key] || 0) - val.decrement;
          } else {
            updated[key] = val;
          }
        }
        list[index] = updated;
        return updated;
      },
      delete: async (args = {}) => {
        const list = inMemoryStore[storeName];
        let index = -1;
        
        if (args.where.userId_issueId) {
          const { userId, issueId } = args.where.userId_issueId;
          index = list.findIndex(item => item.userId === userId && item.issueId === issueId);
        } else if (args.where.userId_discussionId) {
          const { userId, discussionId } = args.where.userId_discussionId;
          index = list.findIndex(item => item.userId === userId && item.discussionId === discussionId);
        } else if (args.where.userId_eventId) {
          const { userId, eventId } = args.where.userId_eventId;
          index = list.findIndex(item => item.userId === userId && item.eventId === eventId);
        } else {
          index = list.findIndex(item => item.id === args.where.id);
        }

        if (index === -1) throw new Error('Mock Item not found to delete');
        const removed = list.splice(index, 1)[0];
        return removed;
      }
    };
  };

  prisma = {
    user: makeMockModel('users'),
    issue: makeMockModel('issues'),
    issueUpvote: makeMockModel('issueUpvotes'),
    officialUpdate: makeMockModel('officialUpdates'),
    discussion: makeMockModel('discussions'),
    discussionUpvote: makeMockModel('discussionUpvotes'),
    comment: makeMockModel('comments'),
    reply: makeMockModel('replies'),
    event: makeMockModel('events'),
    volunteerRegistration: makeMockModel('volunteerRegistrations')
  };
}

module.exports = prisma;
