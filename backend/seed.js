const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.whcowlnosaqxhkpyinkt:Bhumi%4078588@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
      },
    },
  });

async function main() {
  console.log('Seeding sample data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Officials
  const official = await prisma.user.upsert({
    where: { email: 'official@civicconnect.com' },
    update: {},
    create: {
      name: 'City Official John',
      email: 'official@civicconnect.com',
      password: passwordHash,
      role: 'OFFICIAL',
      locality: 'Downtown',
      profilePic: 'https://i.pravatar.cc/150?u=official'
    }
  });

  // 2. Create Users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { email: `citizen${i}@test.com` },
      update: {},
      create: {
        name: `Citizen ${i}`,
        email: `citizen${i}@test.com`,
        password: passwordHash,
        role: 'CITIZEN',
        locality: ['Downtown', 'Northside', 'West End'][i % 3],
        profilePic: `https://i.pravatar.cc/150?u=citizen${i}`
      }
    });
    users.push(user);
  }

  // 3. Create Sample Issues
  console.log('Creating issues...');
  const issuesData = [
    { title: 'Huge Pothole on Main St', desc: 'A massive pothole that damaged my tire.', cat: 'Potholes', sev: 'HIGH', lat: 40.7128, lng: -74.0060, status: 'REPORTED' },
    { title: 'Streetlight completely out', desc: 'Dark area, feels unsafe.', cat: 'Broken Streetlights', sev: 'MEDIUM', lat: 40.7138, lng: -74.0050, status: 'ASSIGNED' },
    { title: 'Garbage dump overflowing', desc: 'Has not been cleaned in weeks.', cat: 'Garbage Accumulation', sev: 'HIGH', lat: 40.7118, lng: -74.0070, status: 'IN_PROGRESS' },
    { title: 'Water pipe leaking', desc: 'Wasting a lot of water.', cat: 'Water Leaks', sev: 'HIGH', lat: 40.7148, lng: -74.0040, status: 'RESOLVED' },
    { title: 'Graffiti on park wall', desc: 'Needs to be painted over.', cat: 'Sanitation Issues', sev: 'LOW', lat: 40.7108, lng: -74.0080, status: 'CLOSED' },
    { title: 'Blocked drainage', desc: 'Causing minor flooding.', cat: 'Drainage Blockages', sev: 'MEDIUM', lat: 40.7158, lng: -74.0030, status: 'REPORTED' }
  ];

  for (let i = 0; i < issuesData.length; i++) {
    const data = issuesData[i];
    await prisma.issue.create({
      data: {
        title: data.title,
        description: data.desc,
        category: data.cat,
        severity: data.sev,
        latitude: data.lat + (Math.random() * 0.01 - 0.005),
        longitude: data.lng + (Math.random() * 0.01 - 0.005),
        address: `${data.cat} Area`,
        status: data.status,
        verified: data.status !== 'REPORTED',
        reportedBy: { connect: { id: users[i % users.length].id } },
        ...(data.status !== 'REPORTED' ? { assignedTo: { connect: { id: official.id } } } : {})
      }
    });
  }

  // 4. Create Events
  console.log('Creating events...');
  const eventCategories = ['CLEANLINESS', 'PLANTATION', 'MEETING', 'AWARENESS'];
  for (let i = 0; i < 4; i++) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + (i * 3) + 1); // Upcoming days
    await prisma.event.create({
      data: {
        title: `Community ${eventCategories[i]} Drive`,
        description: `Join us for a community effort focused on ${eventCategories[i].toLowerCase()}.`,
        category: eventCategories[i],
        dateTime: eventDate,
        address: `Central Park Area ${i + 1}`,
        latitude: 40.7128 + (Math.random() * 0.02 - 0.01),
        longitude: -74.0060 + (Math.random() * 0.02 - 0.01),
        organizer: { connect: { id: users[i % users.length].id } },
        status: 'UPCOMING'
      }
    });
  }

  // 5. Create Discussions
  console.log('Creating discussions...');
  await prisma.discussion.create({
    data: {
      title: 'How can we improve waste management?',
      content: 'I noticed that the garbage trucks are missing our street frequently. Any ideas?',
      category: 'Waste',
      locality: 'Downtown',
      author: { connect: { id: users[0].id } },
      comments: {
        create: [
          { content: 'We should petition for a schedule change.', authorId: users[1].id },
          { content: 'I agree, it is becoming a health hazard.', authorId: users[2].id }
        ]
      }
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
