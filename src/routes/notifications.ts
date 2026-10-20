import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import Membership from '../models/Membership.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import NotificationLog from '../models/NotificationLog.js';
import GymSettings from '../models/GymSettings.js';
import {
  ensureDefaultTemplates,
  runAutomatedExpiryScan,
  formatWhatsAppUrl,
  sendEmailDirect,
} from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin', 'staff'));

// 1. Get all memberships expiring soon (<= 7 days) or already expired
router.get('/expiring', async (_req, res, next) => {
  try {
    await ensureDefaultTemplates();
    const settings = await GymSettings.findOne();
    const gymName = settings?.gymName || 'Fitness Villa';
    const gymPhone = settings?.phone || settings?.whatsapp || '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const memberships = await Membership.find({
      status: { $in: ['active', 'expired'] },
    })
      .populate('member', 'name email phone')
      .populate('plan', 'name pricePaise durationDays')
      .sort({ endDate: 1 });

    const expiringMembers = memberships
      .map((m: any) => {
        if (!m.member || !m.plan) return null;
        const end = new Date(m.endDate);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Filter: only show if expiring within 14 days or expired within last 30 days
        if (diffDays > 14 || diffDays < -30) return null;

        const dateStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const defaultText = `Hi ${m.member.name}! 💪\nYour ${m.plan.name} membership at ${gymName} ${diffDays < 0 ? `expired on ${dateStr}` : diffDays === 0 ? `expires today (${dateStr})` : `expires in ${diffDays} days (${dateStr})`}.\nPlease renew to keep your workout streak uninterrupted! 🔥\nContact: ${gymPhone}`;

        return {
          membershipId: m._id,
          memberId: m.member._id,
          name: m.member.name,
          phone: m.member.phone || '',
          email: m.member.email || '',
          planName: m.plan.name,
          planPricePaise: m.plan.pricePaise,
          startDate: m.startDate,
          endDate: m.endDate,
          daysRemaining: diffDays,
          status: m.status,
          whatsappUrl: formatWhatsAppUrl(m.member.phone || '', defaultText),
          defaultMessage: defaultText,
        };
      })
      .filter(Boolean);

    res.json({ items: expiringMembers, total: expiringMembers.length });
  } catch (e) {
    next(e);
  }
});

// 2. Trigger automated expiry scan (sends emails & queues WhatsApp notifications)
router.post('/run-cron-now', allowRoles('admin'), async (req, res, next) => {
  try {
    const results = await runAutomatedExpiryScan(req.user?.id);
    res.json({
      message: 'Automated expiry scan completed successfully',
      results,
    });
  } catch (e) {
    next(e);
  }
});

// 3. Send single notification (Email & WhatsApp link)
router.post('/send-single', async (req, res, next) => {
  try {
    const { memberId, channel, customMessage, subject } = req.body;
    const settings = await GymSettings.findOne();

    if (channel === 'email') {
      const { to } = req.body;
      if (!to) return res.status(400).json({ message: 'Recipient email required' });
      await sendEmailDirect({
        to,
        subject: subject || `Important message from ${settings?.gymName || 'Fitness Villa'}`,
        html: `<p>${(customMessage || '').replace(/\n/g, '<br/>')}</p>`,
      });
      await NotificationLog.create({
        member: memberId,
        templateKey: 'custom',
        channel: 'email',
        recipient: to,
        body: customMessage,
        status: 'sent',
        sentAt: new Date(),
        triggeredBy: req.user?.id,
      });
      return res.json({ message: 'Email sent successfully' });
    }

    if (channel === 'whatsapp') {
      const { phone } = req.body;
      const url = formatWhatsAppUrl(phone || '', customMessage);
      await NotificationLog.create({
        member: memberId,
        templateKey: 'custom',
        channel: 'whatsapp',
        recipient: phone || '',
        body: customMessage,
        status: 'sent',
        sentAt: new Date(),
        triggeredBy: req.user?.id,
      });
      return res.json({ whatsappUrl: url, message: 'WhatsApp message ready' });
    }

    res.status(400).json({ message: 'Invalid channel' });
  } catch (e) {
    next(e);
  }
});

// 4. Notification templates
router.get('/templates', async (_req, res, next) => {
  try {
    await ensureDefaultTemplates();
    const items = await NotificationTemplate.find().sort({ key: 1 });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.patch('/templates/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const data = z.object({
      whatsappBody: z.string().max(1500).optional(),
      emailSubject: z.string().max(200).optional(),
      emailBody: z.string().max(3000).optional(),
      active: z.boolean().optional(),
    }).parse(req.body);

    const item = await NotificationTemplate.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!item) return res.status(404).json({ message: 'Template not found' });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// 5. Notification logs
router.get('/logs', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const [items, total] = await Promise.all([
      NotificationLog.find()
        .populate('member', 'name email phone')
        .populate('triggeredBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NotificationLog.countDocuments(),
    ]);
    res.json({ items, page, limit, total });
  } catch (e) {
    next(e);
  }
});

export default router;
