'use strict';
const { Announcement, User } = require('../../models');
const { notFound, forbidden } = require('../../utils/httpError');
const { logAction } = require('../../utils/audit');
const { notify } = require('../../utils/notify');

/**
 * Create announcement and notify all active users.
 */
async function createAnnouncement(data, actor) {
  if (actor.role !== 'admin' && actor.role !== 'hr') {
    throw forbidden('Employees cannot create announcements');
  }

  const announcement = await Announcement.create({
    title: data.title.trim(),
    body: data.body.trim(),
    authorId: actor._id,
    authorName: actor.name,
    authorRole: actor.role,
    pinned: !!data.pinned,
  });

  await logAction({
    actor,
    action: 'CREATE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: announcement._id,
    after: { title: announcement.title, pinned: announcement.pinned },
  });

  // Notify all active users asynchronously without blocking or failing
  try {
    const activeUsers = await User.find({ isActive: true }).select('_id');
    for (const u of activeUsers) {
      notify(
        u._id,
        'NEW_ANNOUNCEMENT',
        `New announcement: ${announcement.title}`,
        '/announcements'
      );
    }
  } catch (err) {
    console.error('[Notify announcement error]:', err.message);
  }

  return announcement;
}

/**
 * Update announcement: Admin can update any; HR only their own; Employee forbidden.
 */
async function updateAnnouncement(id, data, actor) {
  if (actor.role !== 'admin' && actor.role !== 'hr') {
    throw forbidden('Employees cannot update announcements');
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw notFound('Announcement not found');
  }

  // HR can only update own
  if (actor.role === 'hr' && announcement.authorId.toString() !== actor._id.toString()) {
    throw forbidden('You can only edit your own announcements');
  }

  const before = announcement.toObject();

  if (data.title !== undefined) announcement.title = data.title.trim();
  if (data.body !== undefined) announcement.body = data.body.trim();
  if (data.pinned !== undefined) announcement.pinned = !!data.pinned;

  await announcement.save();

  await logAction({
    actor,
    action: 'UPDATE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: announcement._id,
    before: { title: before.title, pinned: before.pinned },
    after: { title: announcement.title, pinned: announcement.pinned },
  });

  return announcement;
}

/**
 * Delete announcement: Admin can delete any; HR only their own; Employee forbidden.
 */
async function deleteAnnouncement(id, actor) {
  if (actor.role !== 'admin' && actor.role !== 'hr') {
    throw forbidden('Employees cannot delete announcements');
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw notFound('Announcement not found');
  }

  // HR can only delete own
  if (actor.role === 'hr' && announcement.authorId.toString() !== actor._id.toString()) {
    throw forbidden('You can only delete your own announcements');
  }

  await Announcement.findByIdAndDelete(announcement._id);

  await logAction({
    actor,
    action: 'DELETE_ANNOUNCEMENT',
    entity: 'Announcement',
    entityId: announcement._id,
    before: { title: announcement.title, pinned: announcement.pinned },
  });

  return { message: 'Announcement deleted successfully' };
}

/**
 * List announcements: Pinned first, then newest. Accessible by all roles.
 */
async function listAnnouncements(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [total, announcements] = await Promise.all([
    Announcement.countDocuments(),
    Announcement.find()
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    announcements,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
};
