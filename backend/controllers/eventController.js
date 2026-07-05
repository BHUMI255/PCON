const prisma = require('../prismaClient');

const createEvent = async (req, res) => {
  try {
    const { title, description, category, address, latitude, longitude, dateTime, maxVolunteers } = req.body;

    if (!title || !description || !category || !address || !dateTime) {
      return res.status(400).json({ message: 'Title, description, category, address, and dateTime are required' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        category,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        dateTime: new Date(dateTime),
        maxVolunteers: maxVolunteers ? parseInt(maxVolunteers) : null,
        organizerId: req.user.id
      }
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getEvents = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;

    const events = await prisma.event.findMany({
      where: filters,
      include: {
        organizer: {
          select: { name: true, profilePic: true }
        },
        volunteers: {
          select: { userId: true }
        },
        _count: {
          select: { volunteers: true }
        }
      },
      orderBy: { dateTime: 'asc' }
    });

    return res.json(events);
  } catch (error) {
    console.error('Get Events Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};


const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { name: true, email: true, profilePic: true }
        },
        volunteers: {
          include: {
            user: { select: { name: true, profilePic: true } }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json(event);
  } catch (error) {
    console.error('Get Event By ID Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params; // Event ID
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        volunteers: true
      }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'UPCOMING') {
      return res.status(400).json({ message: 'Can only register for upcoming campaigns' });
    }

    // Check capacity limits
    if (event.maxVolunteers && event.volunteers.length >= event.maxVolunteers) {
      return res.status(400).json({ message: 'Volunteer registrations are full' });
    }

    // Check duplicate registrations
    const alreadyRegistered = event.volunteers.some(v => v.userId === userId);
    if (alreadyRegistered) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    await prisma.volunteerRegistration.create({
      data: { userId, eventId: id }
    });

    // Reward volunteer points
    await prisma.user.update({
      where: { id: userId },
      data: { participationScore: { increment: 15 } }
    });

    return res.json({ message: 'Successfully registered for event volunteering' });
  } catch (error) {
    console.error('Register Event Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const registration = await prisma.volunteerRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId: id }
      }
    });

    if (!registration) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }

    await prisma.volunteerRegistration.delete({
      where: {
        userId_eventId: { userId, eventId: id }
      }
    });

    // Deduct points
    await prisma.user.update({
      where: { id: userId },
      data: { participationScore: { decrement: 15 } }
    });

    return res.json({ message: 'Volunteer registration cancelled' });
  } catch (error) {
    console.error('Cancel Registration Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Auth check: Organizer or Admin
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to edit this event' });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Update Event Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getUserEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrations = await prisma.volunteerRegistration.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            organizer: { select: { name: true } },
            _count: { select: { volunteers: true } }
          }
        }
      },
      orderBy: { event: { dateTime: 'desc' } }
    });
    const events = registrations.map(r => ({
      ...r.event,
      reminderEnabled: r.reminderEnabled || false,
      reminderMinsBefore: r.reminderMinsBefore || 60
    }));
    return res.json(events);
  } catch (error) {
    console.error('Get User Events Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const toggleReminder = async (req, res) => {
  try {
    const { id } = req.params; // Event ID
    const userId = req.user.id;
    const { reminderMinsBefore } = req.body;

    const registration = await prisma.volunteerRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId: id }
      }
    });

    if (!registration) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }

    // Toggle reminder state
    const updated = await prisma.volunteerRegistration.update({
      where: { userId_eventId: { userId, eventId: id } },
      data: {
        reminderEnabled: !registration.reminderEnabled,
        reminderMinsBefore: reminderMinsBefore || registration.reminderMinsBefore || 60
      }
    });

    return res.json({
      reminderEnabled: updated.reminderEnabled,
      reminderMinsBefore: updated.reminderMinsBefore,
      message: updated.reminderEnabled ? 'Reminder set!' : 'Reminder removed'
    });
  } catch (error) {
    console.error('Toggle Reminder Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

const getUpcomingReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all registrations with reminders enabled
    const registrations = await prisma.volunteerRegistration.findMany({
      where: { userId, reminderEnabled: true }
    });

    if (registrations.length === 0) {
      return res.json([]);
    }

    // Fetch the associated events
    const eventIds = registrations.map(r => r.eventId);
    const events = await prisma.event.findMany({
      where: { status: 'UPCOMING' }
    });

    const now = Date.now();
    const reminders = [];

    for (const reg of registrations) {
      const event = events.find(e => e.id === reg.eventId);
      if (!event) continue;

      const eventTime = new Date(event.dateTime).getTime();
      const reminderTime = eventTime - (reg.reminderMinsBefore || 60) * 60 * 1000;

      // Show reminder if we're within the reminder window and event hasn't passed
      if (now >= reminderTime && now < eventTime) {
        const minsLeft = Math.round((eventTime - now) / 60000);
        reminders.push({
          eventId: event.id,
          title: event.title,
          category: event.category,
          address: event.address,
          dateTime: event.dateTime,
          minutesUntilEvent: minsLeft,
          reminderMinsBefore: reg.reminderMinsBefore || 60
        });
      }
    }

    return res.json(reminders);
  } catch (error) {
    console.error('Get Reminders Error:', error);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  registerForEvent,
  cancelRegistration,
  updateEventStatus,
  getUserEvents,
  toggleReminder,
  getUpcomingReminders
};

