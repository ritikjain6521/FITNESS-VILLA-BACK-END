import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import Enquiry from '../models/Enquiry.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import GymSettings from '../models/GymSettings.js';

const router = Router();

const enquiryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, message: { message: 'Too many enquiries, please try again later' } });

// Public enquiry form submission
router.post('/public', enquiryLimiter, validate(z.object({ body: z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(25).optional(),
  message: z.string().trim().min(5).max(1000),
  interest: z.enum(['membership','personal_training','free_trial','other']).optional(),
  consentGiven: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
}) })), async (req, res, next) => {
  try {
    const item = await Enquiry.create({ ...req.body, ip: req.ip });
    res.status(201).json({ message: 'Your enquiry has been received. We will be in touch shortly.' });
  } catch(e) { next(e); }
});

// Admin: list enquiries
router.get('/', requireAuth, allowRoles('admin','staff'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page)||1);
    const limit = Math.min(100, Number(req.query.limit)||20);
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Enquiry.find(filter).populate('assignedTo','name').sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit),
      Enquiry.countDocuments(filter)
    ]);
    res.json({ items, page, limit, total });
  } catch(e) { next(e); }
});

router.patch('/:id', requireAuth, allowRoles('admin','staff'), async (req, res, next) => {
  try {
    const data = z.object({ status:z.enum(['new','contacted','converted','closed']).optional(), assignedTo:z.string().length(24).optional(), notes:z.string().max(500).optional() }).parse(req.body);
    const item = await Enquiry.findByIdAndUpdate(req.params.id, data, { new:true });
    if (!item) return res.status(404).json({ message:'Enquiry not found' });
    res.json({ item });
  } catch(e) { next(e); }
});

router.delete('/:id', requireAuth, allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const item = await Enquiry.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Enquiry not found' });
    res.json({ message: 'Enquiry deleted successfully' });
  } catch (e) {
    next(e);
  }
});

// Public: gym info for landing page
router.get('/gym-info', async (_req, res, next) => {
  try {
    let settings = await GymSettings.findOne().select('gymName tagline address phone email website whatsapp businessHours instagramUrl mapEmbedUrl');
    if (!settings) settings = new GymSettings();
    res.json({ settings });
  } catch(e) { next(e); }
});

export default router;
