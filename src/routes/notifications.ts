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
  buildHindiEmailTemplate,
  testSmtpConnection,
} from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin', 'staff'));

// 1. Get all memberships expiring soon (<= 14 days) or already expired (within 30 days) in 100% Hindi
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

        let hindiMessage = '';
        let hindiSubject = '';
        let badgeText = '';
        let badgeColor = '#ffd166';
        let statusText = '';
        let daysLeftText = '';

        if (diffDays < 0) {
          const daysAgo = Math.abs(diffDays);
          hindiMessage = `नमस्ते ${m.member.name} जी! 🛑\n${gymName} में आपकी ${m.plan.name} सदस्यता समाप्त हो चुकी है (${daysAgo} दिन पूर्व, दिनांक: ${dateStr})।\nअपनी फिटनेस ट्रेनिंग बिना रुकावट जारी रखने के लिए कृपया आज ही जिम काउंटर पर संपर्क करके अपनी सदस्यता का नवीनीकरण (Renew) करवाएं। 💪🔥\nजिम हेल्पलाइन: ${gymPhone}\nधन्यवाद! - ${gymName}`;
          hindiSubject = `अति आवश्यक: ${m.member.name} जी, ${gymName} में आपकी जिम सदस्यता समाप्त हो चुकी है (Renew Now)`;
          badgeText = `🛑 सदस्यता समाप्त (${daysAgo} दिन पूर्व)`;
          badgeColor = '#ef4444';
          statusText = 'सदस्यता समाप्त (Overdue)';
          daysLeftText = `${daysAgo} दिन पहले समाप्त`;
        } else if (diffDays === 0) {
          hindiMessage = `नमस्ते ${m.member.name} जी! ⚠️\n${gymName} में आपकी ${m.plan.name} सदस्यता आज (${dateStr}) समाप्त हो रही है।\nअबाध जिम प्रवेश और वर्कआउट जारी रखने के लिए कृपया आज ही अपनी सदस्यता का नवीनीकरण (Renew) करवाएं। 🏋️‍♂️\nजिम हेल्पलाइन: ${gymPhone}\nधन्यवाद! - ${gymName}`;
          hindiSubject = `महत्वपूर्ण सूचना: ${m.member.name} जी, ${gymName} में आपकी जिम सदस्यता आज समाप्त हो रही है`;
          badgeText = '⚠️ आज समाप्त (Expires Today)';
          badgeColor = '#f97316';
          statusText = 'आज समाप्त हो रही है';
          daysLeftText = 'अंतिम दिन';
        } else {
          hindiMessage = `नमस्ते ${m.member.name} जी! 💪\n${gymName} में आपकी ${m.plan.name} सदस्यता समाप्त होने में केवल ${diffDays} दिन शेष हैं (समाप्ति तिथि: ${dateStr})।\nअपनी फिटनेस यात्रा को बिना रुकावट जारी रखने के लिए कृपया समय पर सदस्यता का नवीनीकरण (Renew) करवाएं। 🔥\nजिम हेल्पलाइन: ${gymPhone}\nधन्यवाद! - ${gymName}`;
          hindiSubject = `स्मरण पत्र: ${m.member.name} जी, ${gymName} में आपकी जिम सदस्यता ${diffDays} दिन में समाप्त होने वाली है`;
          badgeText = `⏳ ${diffDays} दिन शेष`;
          badgeColor = diffDays <= 3 ? '#f97316' : '#b5f23d';
          statusText = 'सक्रिय (समाप्ति निकट)';
          daysLeftText = `${diffDays} दिन शेष`;
        }

        const hindiEmailHtml = buildHindiEmailTemplate({
          gymName,
          gymPhone,
          title: hindiSubject,
          subtitle: 'सदस्यता नवीनीकरण सूचना (Membership Renewal Notice)',
          badgeText,
          badgeColor,
          memberName: m.member.name,
          planName: m.plan.name,
          expiryDate: dateStr,
          daysLeftText,
          statusText,
          callToActionText: diffDays <= 0
            ? 'आपकी सदस्यता समाप्त हो चुकी है। कृपया तुरंत जिम रिसेप्शन पर पधारें या संपर्क कर सदस्यता का नवीनीकरण कराएं।'
            : 'अबाध जिम प्रवेश व वर्कआउट जारी रखने के लिए समाप्ति से पूर्व रिसेप्शन पर संपर्क कर नवीनीकरण कराएं।',
        });

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
          whatsappUrl: formatWhatsAppUrl(m.member.phone || '', hindiMessage),
          defaultMessage: hindiMessage,
          emailSubject: hindiSubject,
          emailHtml: hindiEmailHtml,
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

// 3. Send single notification (Email & WhatsApp link) in Hindi
router.post('/send-single', async (req, res, next) => {
  try {
    const { memberId, channel, customMessage, subject, html } = req.body;
    const settings = await GymSettings.findOne();

    if (channel === 'email') {
      const { to } = req.body;
      if (!to) return res.status(400).json({ message: 'प्राप्तकर्ता का ईमेल आवश्यक है (Recipient email required)' });

      const emailHtmlContent = html || `<div style="font-family:Arial,sans-serif;background:#0d120f;color:#fff;padding:24px;border-radius:10px;border:1px solid #b5f23d;max-width:540px;"><h2 style="color:#b5f23d;margin-top:0;">${settings?.gymName || 'Fitness Villa'}</h2><p style="font-size:15px;line-height:1.6;">${(customMessage || '').replace(/\n/g, '<br/>')}</p></div>`;

      const result = await sendEmailDirect({
        to,
        subject: subject || `महत्वपूर्ण सूचना - ${settings?.gymName || 'Fitness Villa'}`,
        html: emailHtmlContent,
        text: customMessage,
      });

      await NotificationLog.create({
        member: memberId,
        templateKey: 'custom_hindi',
        channel: 'email',
        recipient: to,
        body: customMessage || subject,
        status: 'sent',
        sentAt: new Date(),
        triggeredBy: req.user?.id,
      });

      return res.json({
        message: result.isLive
          ? `ईमेल सफलतापूर्वक ${to} पर भेज दिया गया है!`
          : `ईमेल तैयार हो गया (नोट: लाइव इनबॉक्स डिलीवरी के लिए कृपया Settings > Email (SMTP) में पासवर्ड सेट करें)।`,
        isLive: result.isLive,
      });
    }

    if (channel === 'whatsapp') {
      const { phone } = req.body;
      const url = formatWhatsAppUrl(phone || '', customMessage);
      await NotificationLog.create({
        member: memberId,
        templateKey: 'custom_hindi',
        channel: 'whatsapp',
        recipient: phone || '',
        body: customMessage,
        status: 'sent',
        sentAt: new Date(),
        triggeredBy: req.user?.id,
      });
      return res.json({ whatsappUrl: url, message: 'व्हाट्सएप संदेश तैयार है' });
    }

    res.status(400).json({ message: 'अमान्य चैनल (Invalid channel)' });
  } catch (e) {
    next(e);
  }
});

// 4. Test SMTP Email Delivery
router.post('/test-email', allowRoles('admin'), async (req, res, next) => {
  try {
    const { to, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, resendApiKey } = req.body;
    if (!to) {
      return res.status(400).json({ message: 'परीक्षण ईमेल पता आवश्यक है (Target email required)' });
    }
    const result = await testSmtpConnection(to, { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, resendApiKey });
    res.json({
      message: `सत्यापन ईमेल सफलतापूर्वक ${to} पर भेज दिया गया है! कृपया इनबॉक्स चेक करें।`,
      result,
    });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'ईमेल भेजने में त्रुटि हुई' });
  }
});

// 5. Notification templates in Hindi
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
      whatsappBody: z.string().max(2000).optional(),
      emailSubject: z.string().max(200).optional(),
      emailBody: z.string().max(5000).optional(),
      active: z.boolean().optional(),
    }).parse(req.body);

    const item = await NotificationTemplate.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!item) return res.status(404).json({ message: 'Template not found' });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// 6. Notification logs
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
