import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254),
    phone: z.string().max(25).optional(),
    password: z.string().min(10).max(128),
    role: z.enum(['member', 'trainer', 'staff']).default('member'),
    status: z.enum(['active', 'suspended', 'blocked']).default('active'),
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
    const { name, email, phone, password, role, status } = req.body;
    if (role === 'staff' && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create staff accounts' });
    }

    const isActive = status ? status === 'active' : true;
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      status: status || 'active',
      active: isActive,
      passwordHash: await bcrypt.hash(password, 12),
    });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'member.create',
      targetModel: 'User',
      targetId: user.id,
      after: { name: user.name, email: user.email, role: user.role, status: user.status },
    });

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

// 8. Admin delete / deactivate member
router.delete('/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const before = await User.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Member not found' });

    if (req.query.permanent === 'true') {
      await User.findByIdAndDelete(req.params.id);
      await Member.findOneAndDelete({ user: req.params.id });
      await AuditLog.create({
        actor: req.user!.id,
        actorEmail: req.user!.email,
        action: 'member.delete_permanent',
        targetModel: 'User',
        targetId: req.params.id,
        before,
      });
      return res.status(200).json({ message: 'Member permanently deleted' });
    }

    const item = await User.findByIdAndUpdate(
      req.params.id,
      { active: false, status: 'blocked', statusReason: 'Deactivated by admin' },
      { new: true }
    ).select('id');

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'member.block',
      targetModel: 'User',
      targetId: req.params.id,
      before,
      after: item?.toObject(),
    });

    res.status(200).json({ message: 'Member deactivated' });
  } catch (e) {
    next(e);
  }
});

export default router;
