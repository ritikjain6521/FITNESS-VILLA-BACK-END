import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import Plan from '../models/Plan.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import GymSettings from '../models/GymSettings.js';
import NotificationLog from '../models/NotificationLog.js';
import { buildNewMemberWelcomeEmailHtml, sendEmailDirect } from '../services/notificationService.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    phone: z.string().max(25).optional(),
    password: z.string().min(6).max(128),
    role: z.enum(['member', 'trainer', 'staff']).default('member'),
    status: z.enum(['active', 'suspended', 'blocked']).default('active'),
    planId: z.string().optional(),
    startDate: z.coerce.date().optional(),
    sendWelcomeEmail: z.boolean().optional().default(true),
  }),
});

// 1. List members (admin, staff, trainer)
router.get('/', allowRoles('admin', 'staff', 'trainer'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter: any = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }

    if (req.user!.role === 'trainer') filter.assignedTrainer = req.user!.id;
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: new RegExp(escaped, 'i') },
        { email: new RegExp(escaped, 'i') },
        { phone: new RegExp(escaped, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name email phone role active status statusReason createdAt assignedTrainer')
        .populate('assignedTrainer', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total });
  } catch (e) {
    next(e);
  }
});

// 2. Create member / user account
router.post('/', allowRoles('admin', 'staff'), validate(createSchema), async (req, res, next) => {
  try {
    const { name, email, phone, password, role, status, planId, startDate, sendWelcomeEmail } = req.body;
    if (role === 'staff' && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create staff accounts' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'इस ईमेल के साथ सदस्य पहले से पंजीकृत है (Email already registered)' });
    }

    const isActive = status ? status === 'active' : true;
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      role,
      status: status || 'active',
      active: isActive,
      passwordHash: await bcrypt.hash(password, 12),
    });

    if (role === 'member') {
      await Member.create({ user: user.id }).catch(() => {});
    }

    let planDoc: any = null;
    let membershipDoc: any = null;
    let expiryDateStr = '—';

    if (planId) {
      planDoc = await Plan.findOne({ _id: planId, active: true });
      if (planDoc) {
        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + (planDoc.durationDays || 30));
        membershipDoc = await Membership.create({
          member: user.id,
          plan: planDoc.id,
          startDate: start,
          endDate: end,
          status: 'active',
          createdBy: req.user!.id,
        });
        expiryDateStr = end.toLocaleDateString('hi-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'member.create',
      targetModel: 'User',
      targetId: user.id,
      after: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        plan: planDoc?.name,
      },
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (sendWelcomeEmail !== false && user.email) {
      try {
        const settings = await GymSettings.findOne();
        const gymName = settings?.gymName || 'Fitness Villa';
        const gymPhone = settings?.phone || '+91 98765 43210';
        const portalUrl = 'https://fitness-villa-front-end.vercel.app/login';

        const planName = planDoc ? planDoc.name : 'मानक सदस्यता (Standard Access)';
        const statusText = user.status === 'active' ? 'सक्रिय (Active)' : user.status;

        const emailHtml = buildNewMemberWelcomeEmailHtml({
          gymName,
          gymPhone,
          portalUrl,
          memberName: user.name,
          email: user.email,
          password, // Member plain password as requested
          planName,
          expiryDate: expiryDateStr,
          status: statusText,
        });

        const emailSubject = `🎉 ${gymName} में आपका स्वागत है - सदस्यता एवं लॉगिन विवरण`;

        await sendEmailDirect({
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
        });

        emailSent = true;

        await NotificationLog.create({
          member: user.id,
          templateKey: 'member_welcome',
          channel: 'email',
          recipient: user.email,
          body: `सदस्य स्वागत ईमेल सफलतापूर्वक भेजा गया (योजना: ${planName}, समाप्ति: ${expiryDateStr}, पासवर्ड भेजा गया)`,
          status: 'sent',
          sentAt: new Date(),
          triggeredBy: req.user!.id,
        }).catch(() => {});
      } catch (err: any) {
        console.error('Welcome email delivery error:', err);
        emailError = err?.message || 'Email delivery failed';
        await NotificationLog.create({
          member: user.id,
          templateKey: 'member_welcome',
          channel: 'email',
          recipient: user.email,
          body: `स्वागत ईमेल भेजने में त्रुटि: ${emailError}`,
          status: 'failed',
          errorDetails: emailError,
          triggeredBy: req.user!.id,
        }).catch(() => {});
      }
    }

    res.status(201).json({
      item: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      membership: membershipDoc,
      emailSent,
      emailError,
      message: emailSent
        ? `सदस्य सफलतापूर्वक जोड़ दिया गया और ${user.email} पर लॉगिन पासवर्ड व सदस्यता विवरण भेज दिया गया!`
        : 'सदस्य सफलतापूर्वक जोड़ दिया गया',
    });
  } catch (e) {
    next(e);
  }
});

// 3. Member Self Profile - Full details
router.get('/me/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('name email phone role active status statusReason createdAt assignedTrainer')
      .populate('assignedTrainer', 'name email phone');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let memberDetails = null;
    if (user.role === 'member') {
      memberDetails = await Member.findOne({ user: user.id });
    }

    res.json({ item: user, memberDetails });
  } catch (e) {
    next(e);
  }
});

// 4. Member Self Profile - Update own contact details & password
router.patch('/me/profile', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      phone: z.string().max(25).optional(),
      address: z.string().max(300).optional(),
      bloodGroup: z.string().max(5).optional(),
      dateOfBirth: z.coerce.date().optional(),
      emergencyContact: z.object({
        name: z.string().max(100).optional(),
        phone: z.string().max(25).optional(),
        relation: z.string().max(50).optional(),
      }).optional(),
      notificationPrefs: z.object({
        sms: z.boolean().optional(),
        email: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
      }).optional(),
      currentPassword: z.string().min(8).optional(),
      newPassword: z.string().min(8).max(128).optional(),
    });

    const parsed = updateSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle password update if provided
    if (parsed.newPassword) {
      if (!parsed.currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    }

    if (parsed.phone !== undefined) user.phone = parsed.phone;
    await user.save();

    // Update or upsert Member details
    let memberDoc = await Member.findOne({ user: userId });
    if (!memberDoc) {
      memberDoc = new Member({
        user: userId,
        memberId: `FV-${String(Date.now()).slice(-6)}`,
      });
    }

    if (parsed.address !== undefined) memberDoc.address = parsed.address;
    if (parsed.bloodGroup !== undefined) memberDoc.bloodGroup = parsed.bloodGroup;
    if (parsed.dateOfBirth !== undefined) memberDoc.dateOfBirth = parsed.dateOfBirth;
    if (parsed.emergencyContact) {
      memberDoc.emergencyContact = {
        name: parsed.emergencyContact.name ?? memberDoc.emergencyContact?.name ?? '',
        phone: parsed.emergencyContact.phone ?? memberDoc.emergencyContact?.phone ?? '',
        relation: parsed.emergencyContact.relation ?? memberDoc.emergencyContact?.relation ?? '',
      };
    }
    if (parsed.notificationPrefs) {
      memberDoc.notificationPrefs = {
        sms: parsed.notificationPrefs.sms ?? memberDoc.notificationPrefs?.sms ?? true,
        email: parsed.notificationPrefs.email ?? memberDoc.notificationPrefs?.email ?? true,
        whatsapp: parsed.notificationPrefs.whatsapp ?? memberDoc.notificationPrefs?.whatsapp ?? false,
      };
    }

    await memberDoc.save();

    await AuditLog.create({
      actor: userId,
      actorEmail: req.user!.email,
      action: 'member.profile_self_update',
      targetModel: 'User',
      targetId: userId,
    });

    res.json({
      message: 'Profile updated successfully',
      item: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      memberDetails: memberDoc,
    });
  } catch (e) {
    next(e);
  }
});

// 5. Admin: Change member account status (Activate / Suspend / Block)
router.patch('/:id/status', allowRoles('admin'), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['active', 'suspended', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or blocked.' });
    }

    const before = await User.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Member not found' });

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        status,
        statusReason: reason || '',
        active: status === 'active',
      },
      { new: true }
    ).select('name email phone role active status statusReason');

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: `member.status.${status}`,
      targetModel: 'User',
      targetId: req.params.id,
      before,
      after: updated?.toObject(),
      reason: reason || '',
    });

    res.json({ item: updated });
  } catch (e) {
    next(e);
  }
});

// 6. View member by id (Members can only view their own)
router.get('/:id', allowRoles('admin', 'staff', 'trainer', 'member'), async (req, res, next) => {
  try {
    const targetId = req.params.id === 'me' ? req.user!.id : req.params.id;
    if (req.user!.role === 'member' && targetId !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const item = await User.findById(targetId)
      .select('name email phone role active status statusReason createdAt assignedTrainer')
      .populate('assignedTrainer', 'name email phone');
    if (!item) return res.status(404).json({ message: 'Member not found' });

    if (req.user!.role === 'trainer' && String(item.assignedTrainer) !== req.user!.id) {
      return res.status(403).json({ message: 'Not assigned to this trainer' });
    }

    const memberDetails = await Member.findOne({ user: item.id });
    res.json({ item, memberDetails });
  } catch (e) {
    next(e);
  }
});

// 7. Admin / Staff update member details
router.patch('/:id', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(100).optional(),
      phone: z.string().max(25).optional(),
      active: z.boolean().optional(),
      status: z.enum(['active', 'suspended', 'blocked']).optional(),
      statusReason: z.string().max(500).optional(),
      password: z.string().min(8).max(128).optional(),
    });

    const parsed = schema.parse(req.body);
    const updateData: any = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.status !== undefined) {
      updateData.status = parsed.status;
      updateData.active = parsed.status === 'active';
    } else if (parsed.active !== undefined) {
      updateData.active = parsed.active;
      updateData.status = parsed.active ? 'active' : 'suspended';
    }
    if (parsed.statusReason !== undefined) updateData.statusReason = parsed.statusReason;
    if (parsed.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    const before = await User.findById(req.params.id).lean();
    const item = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('name email phone role active status statusReason');

    if (!item) return res.status(404).json({ message: 'Member not found' });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'member.update',
      targetModel: 'User',
      targetId: req.params.id,
      before,
      after: item.toObject(),
    });

    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// 8. Admin permanent delete member and associated records
router.delete('/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const before = await User.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Member not found' });

    // Permanently delete user and member profile
    await User.findByIdAndDelete(req.params.id);
    await Member.findOneAndDelete({ user: req.params.id });

    // Cascade delete all associated records (memberships, attendance, payments, notifications)
    await Promise.all([
      Membership.deleteMany({ member: req.params.id }),
      Attendance.deleteMany({ member: req.params.id }),
      Payment.deleteMany({ member: req.params.id }),
      NotificationLog.deleteMany({ $or: [{ recipient: req.params.id }, { email: before.email }] }),
    ]);

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'member.delete_permanent',
      targetModel: 'User',
      targetId: req.params.id,
      before,
    });

    res.status(200).json({ message: 'सदस्य और उसका सारा रिकॉर्ड सफलतापूर्वक स्थायी रूप से हटा दिया गया (Member permanently deleted)' });
  } catch (e) {
    next(e);
  }
});

// 9. Admin send direct email to member
router.post('/:id/send-email', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'सदस्य नहीं मिला (Member not found)' });
    if (!user.email) return res.status(400).json({ message: 'इस सदस्य का कोई ईमेल पंजीकृत नहीं है (No registered email for this member)' });

    const { type = 'welcome', subject, message, password, planName, expiryDate } = req.body;

    const settings = await GymSettings.findOne();
    const gymName = settings?.gymName || 'Fitness Villa';
    const gymPhone = settings?.phone || '+91 98765 43210';
    const portalUrl = 'https://fitness-villa-front-end.vercel.app/login';

    // If new password is provided, update member password
    if (password && password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(password.trim(), 12);
      await user.save();
    }

    let emailHtml = '';
    let emailSubject = '';

    if (type === 'custom') {
      emailSubject = subject || `महत्वपूर्ण सूचना - ${gymName}`;
      emailHtml = `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#070908;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#101512;border:1px solid #233125;border-radius:12px;padding:26px;box-shadow:0 12px 30px rgba(0,0,0,0.6);">
    <div style="border-bottom:1px solid #1f2a21;padding-bottom:14px;margin-bottom:18px;">
      <h2 style="color:#b5f23d;margin:0 0 4px;font-size:22px;">${gymName}</h2>
      <span style="font-size:12px;color:#9ca3af;">आधिकारिक सदस्य सूचना</span>
    </div>
    <p style="font-size:15px;color:#d1d5db;margin-bottom:16px;">
      नमस्ते <strong style="color:#b5f23d;">${user.name}</strong> जी 🙏,
    </p>
    <div style="font-size:14px;line-height:1.7;color:#e5e7eb;white-space:pre-wrap;background:#090d0a;border:1px solid #1f2a21;padding:18px;border-radius:8px;margin-bottom:20px;">${message || ''}</div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:#b5f23d;color:#090c0a;font-weight:800;font-size:13px;padding:11px 24px;border-radius:6px;text-decoration:none;letter-spacing:0.5px;">
        सदस्य पोर्टल में लॉगिन करें (Member Portal) →
      </a>
    </div>
    <div style="border-top:1px solid #1f2a21;padding-top:14px;margin-top:20px;font-size:12px;color:#6b7280;display:flex;justify-content:space-between;">
      <span>📞 सहायता सूत्र: ${gymPhone}</span>
      <span>टीम ${gymName}</span>
    </div>
  </div>
</body>
</html>
      `.trim();
    } else {
      // Welcome / Membership & credentials email
      let finalPlanName = planName;
      let finalExpiryDate = expiryDate;

      if (!finalPlanName || !finalExpiryDate) {
        const latestMembership: any = await Membership.findOne({ member: user._id })
          .populate('plan')
          .sort({ endDate: -1 });

        if (latestMembership) {
          if (!finalPlanName) finalPlanName = latestMembership.plan?.name;
          if (!finalExpiryDate && latestMembership.endDate) {
            finalExpiryDate = new Date(latestMembership.endDate).toLocaleDateString('hi-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
          }
        }
      }

      finalPlanName = finalPlanName || 'मानक सदस्यता (Standard Access)';
      finalExpiryDate = finalExpiryDate || '—';
      const statusText = user.status === 'active' ? 'सक्रिय (Active)' : user.status;

      emailSubject = subject || `🎉 ${gymName} - सदस्यता विवरण एवं सदस्य पोर्टल लॉगिन जानकारी`;

      emailHtml = buildNewMemberWelcomeEmailHtml({
        gymName,
        gymPhone,
        portalUrl,
        memberName: user.name,
        email: user.email,
        password: password ? password.trim() : undefined,
        planName: finalPlanName,
        expiryDate: finalExpiryDate,
        status: statusText,
      });
    }

    const sendRes = await sendEmailDirect({
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
      text: message,
    });

    await NotificationLog.create({
      member: user.id,
      templateKey: type === 'welcome' ? 'member_welcome_manual' : 'custom_manual',
      channel: 'email',
      recipient: user.email,
      body: emailSubject,
      status: 'sent',
      sentAt: new Date(),
      triggeredBy: req.user!.id,
    });

    res.json({
      success: true,
      message: sendRes.isLive
        ? `ईमेल सफलतापूर्वक ${user.email} पर भेज दिया गया!`
        : `ईमेल तैयार हो गया (नोट: लाइव डिलीवरी के लिए Settings > Email (SMTP) जांचें)।`,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
