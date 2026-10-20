import { Router } from 'express';
import { z } from 'zod';
import GymSettings from '../models/GymSettings.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin'));

router.get('/', async (_req, res, next) => {
  try {
    let settings = await GymSettings.findOne();
    if (!settings) settings = await GymSettings.create({});
    res.json({ settings });
  } catch(e) { next(e); }
});

const settingsSchema = z.object({
  gymName: z.string().max(100).optional(),
  tagline: z.string().max(200).optional(),
  address: z.string().max(400).optional(),
  phone: z.string().max(25).optional(),
  email: z.string().email().max(254).optional(),
  website: z.string().max(200).optional(),
  whatsapp: z.string().max(25).optional(),
  timezone: z.string().max(50).optional(),
  businessHours: z.string().max(300).optional(),
  gstEnabled: z.boolean().optional(),
  gstin: z.string().max(20).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  receiptPrefix: z.string().max(10).optional(),
  memberIdPrefix: z.string().max(10).optional(),
  reminderDaysBefore: z.array(z.number()).optional(),
  overdueReminderDays: z.array(z.number()).optional(),
  quietHoursStart: z.string().max(5).optional(),
  quietHoursEnd: z.string().max(5).optional(),
  instagramUrl: z.string().max(200).optional(),
  mapEmbedUrl: z.string().max(500).optional(),
  smsProvider: z.enum(['none','twilio','msg91','custom']).optional(),
  smsSenderId: z.string().max(20).optional(),
});

router.patch('/', async (req, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);
    const before = await GymSettings.findOne().lean();
    let settings = await GymSettings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true, runValidators: true });
    await AuditLog.create({ actor: req.user!.id, actorEmail: req.user!.email, action: 'settings.update', targetModel:'GymSettings', before, after: settings?.toObject() });
    res.json({ settings });
  } catch(e) { next(e); }
});

// Audit log viewer
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page)||1);
    const limit = Math.min(200, Number(req.query.limit)||50);
    const filter: any = {};
    if (req.query.action) filter.action = new RegExp(String(req.query.action),'i');
    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate('actor','name email').sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit),
      AuditLog.countDocuments(filter)
    ]);
    res.json({ items, page, limit, total });
  } catch(e) { next(e); }
});

export default router;
