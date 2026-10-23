import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import Announcement from '../models/Announcement.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import type { Role } from '../models/User.js';

const router = Router();

const announcementSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    content: z.string().trim().min(2).max(2000),
    type: z.enum(['announcement', 'offer', 'event', 'alert']).default('announcement'),
    priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
    badge: z.string().max(40).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    validUntil: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Helper: optional auth check
function getOptionalUser(req: any) {
  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!token && typeof req.query.token === 'string') token = req.query.token;
  if (!token) return null;
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret) as any;
    return { id: String(payload.sub), role: payload.role as Role, email: String(payload.email) };
  } catch {
    return null;
  }
}

// GET: All active announcements for members / public, or all for admin/staff
router.get('/', async (req, res, next) => {
  try {
    const user = getOptionalUser(req);
    const filter: any = {};
    const now = new Date();

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

    if (!isAdminOrStaff) {
      filter.isActive = true;
      filter.$or = [
        { validUntil: { $exists: false } },
        { validUntil: null },
        { validUntil: { $gte: now } },
      ];
    } else {
      if (req.query.type) filter.type = req.query.type;
      if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
    }

    const items = await Announcement.find(filter)
      .populate('createdBy', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .limit(100);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// POST: Create announcement (admin / staff)
router.post('/', requireAuth, allowRoles('admin', 'staff'), validate(announcementSchema), async (req, res, next) => {
  try {
    const item = await Announcement.create({
      ...req.body,
      createdBy: req.user!.id,
    });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'announcement.create',
      targetModel: 'Announcement',
      targetId: item.id,
      after: item.toObject(),
    });

    res.status(201).json({ item });
  } catch (e) {
    next(e);
  }
});

// PATCH: Update announcement (admin / staff)
router.patch('/:id', requireAuth, allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const before = await Announcement.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Announcement not found' });

    const item = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'announcement.update',
      targetModel: 'Announcement',
      targetId: req.params.id,
      before,
      after: item?.toObject(),
    });

    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// DELETE: Delete announcement (admin / staff)
router.delete('/:id', requireAuth, allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const item = await Announcement.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Announcement not found' });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'announcement.delete',
      targetModel: 'Announcement',
      targetId: req.params.id,
      before: item.toObject(),
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
