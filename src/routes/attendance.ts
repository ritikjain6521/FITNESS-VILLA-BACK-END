import { Router } from 'express';
import { z } from 'zod';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import AuditLog from '../models/AuditLog.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

// ─── 1. Member: Check current live check-in status ───
router.get('/status/me', allowRoles('member'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Active session (open check-in)
    const activeSession = await Attendance.findOne({
      member: userId,
      checkOutAt: { $exists: false },
    }).sort({ checkInAt: -1 });

    // Today's total sessions
    const todaySessions = await Attendance.find({
      member: userId,
      checkInAt: { $gte: todayStart, $lt: todayEnd },
    }).sort({ checkInAt: -1 });

    // Membership validity check
    const membership = await Membership.findOne({
      member: userId,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).populate('plan', 'name');

    // User status
    const user = await User.findById(userId).select('status active name email');

    const canCheckIn =
      !activeSession &&
      Boolean(membership) &&
      user?.status === 'active' &&
      user?.active !== false;

    res.json({
      isCheckedIn: Boolean(activeSession),
      activeSession,
      todaySessions,
      canCheckIn,
      accountStatus: user?.status || 'active',
      membership: membership
        ? {
            active: true,
            planName: (membership.plan as any)?.name || 'Standard Pass',
            endDate: membership.endDate,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

// ─── 2. Member: Self Check-In with Live Selfie Photo (Pending Admin Approval) ───
const selfCheckInSchema = z.object({
  body: z.object({
    photo: z.string().min(50, 'Live photo verification is required'),
    location: z.string().max(100).optional(),
  }),
});

router.post(
  '/self-checkin',
  allowRoles('member'),
  validate(selfCheckInSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const now = new Date();

      // Check account status
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User account not found' });
      if (user.status === 'suspended' || user.status === 'blocked' || user.active === false) {
        return res.status(403).json({
          message: `Your account is currently ${user.status || 'inactive'}. Please contact gym reception.`,
        });
      }

      // Check active membership
      const activeMembership = await Membership.findOne({
        member: userId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).populate('plan', 'name');

      if (!activeMembership) {
        return res.status(403).json({
          message: 'No active membership pass found. Please renew your membership to check in.',
        });
      }

      // Check for already open check-in
      const existing = await Attendance.findOne({
        member: userId,
        checkOutAt: { $exists: false },
      });
      if (existing) {
        const timeStr = new Date(existing.checkInAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return res.status(409).json({
          message: `You are already checked in at ${timeStr}. Please check out before checking in again.`,
          activeSession: existing,
        });
      }

      // Live photo verification
      const { photo, location } = req.body;
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({
          message: 'Invalid photo format. A live camera snapshot is required.',
        });
      }

      // Default to pending for self_photo checkin so admin can approve
      const item = await Attendance.create({
        member: userId,
        recordedBy: userId,
        checkInAt: now,
        photoUrl: photo,
        verificationMethod: 'self_photo',
        status: 'pending',
        location: location || 'Fitness Villa Main Gym Floor',
        deviceInfo: req.headers['user-agent'] || '',
      });

      // Audit log
      await AuditLog.create({
        actor: userId,
        actorEmail: req.user!.email,
        action: 'member.self_attendance_checkin',
        targetModel: 'Attendance',
        targetId: item.id,
        reason: 'Member self check-in with live photo submitted (pending approval)',
      });

      res.status(201).json({
        message: 'Check-in recorded! Your live photo has been sent to gym front desk for approval.',
        item,
      });
    } catch (e) {
      next(e);
    }
  }
);

// ─── 3. Member: Self Check-Out ───
router.post('/self-checkout', allowRoles('member'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const openSession = await Attendance.findOne({
      member: userId,
      checkOutAt: { $exists: false },
    });

    if (!openSession) {
      return res.status(404).json({
        message: 'No active check-in found to check out from.',
      });
    }

    openSession.checkOutAt = now;
    await openSession.save();

    const diffMs = now.getTime() - new Date(openSession.checkInAt).getTime();
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

    // Audit log
    await AuditLog.create({
      actor: userId,
      actorEmail: req.user!.email,
      action: 'member.self_attendance_checkout',
      targetModel: 'Attendance',
      targetId: openSession.id,
      reason: `Completed workout session (${durationMinutes} min)`,
    });

    res.json({
      message: `Check-out successful! Great session of ${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes} minutes`}.`,
      item: openSession,
      durationMinutes,
    });
  } catch (e) {
    next(e);
  }
});

// ─── 4. Admin / Staff: Get Pending Check-In Approvals ───
router.get('/pending', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const items = await Attendance.find({ status: 'pending' })
      .populate('member', 'name email phone')
      .populate('recordedBy', 'name role')
      .sort({ checkInAt: -1 });

    res.json({ items, count: items.length });
  } catch (e) {
    next(e);
  }
});

// ─── 5. Admin / Staff: Approve Check-In ───
router.patch('/:id/approve', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const item = await Attendance.findById(req.params.id)
      .populate('member', 'name email phone');

    if (!item) return res.status(404).json({ message: 'Attendance record not found' });

    item.status = 'approved';
    item.approvedBy = req.user!.id as any;
    item.approvedAt = new Date();
    await item.save();

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'attendance.approved',
      targetModel: 'Attendance',
      targetId: item.id,
      reason: 'Admin approved member check-in verification',
    });

    res.json({ message: 'Check-in approved successfully', item });
  } catch (e) {
    next(e);
  }
});

// ─── 6. Admin / Staff: Reject Check-In ───
router.patch('/:id/reject', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const item = await Attendance.findById(req.params.id)
      .populate('member', 'name email phone');

    if (!item) return res.status(404).json({ message: 'Attendance record not found' });

    item.status = 'rejected';
    item.rejectionReason = req.body.reason || 'Check-in rejected by gym reception';
    item.checkOutAt = new Date(); // Close open session
    await item.save();

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'attendance.rejected',
      targetModel: 'Attendance',
      targetId: item.id,
      reason: req.body.reason || 'Admin rejected check-in',
    });

    res.json({ message: 'Check-in rejected', item });
  } catch (e) {
    next(e);
  }
});

// ─── 7. List Attendance (Admin, Staff, Trainer, Member) ───
router.get('/', allowRoles('admin', 'staff', 'trainer', 'member'), async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.user!.role === 'member') {
      filter.member = req.user!.id;
    } else if (req.query.member) {
      filter.member = req.query.member;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.date) {
      const d = new Date(String(req.query.date));
      if (!Number.isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        filter.checkInAt = { $gte: start, $lt: end };
      }
    } else if (req.query.month) {
      // Format: YYYY-MM
      const [yearStr, monthStr] = String(req.query.month).split('-');
      const year = Number(yearStr);
      const month = Number(monthStr) - 1;
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 1);
        filter.checkInAt = { $gte: start, $lt: end };
      }
    } else if (req.query.from || req.query.to) {
      filter.checkInAt = {};
      if (req.query.from) filter.checkInAt.$gte = new Date(String(req.query.from));
      if (req.query.to) filter.checkInAt.$lte = new Date(String(req.query.to));
    }

    const items = await Attendance.find(filter)
      .populate('member', 'name email phone')
      .populate('recordedBy', 'name role')
      .populate('approvedBy', 'name email')
      .sort({ checkInAt: -1 })
      .limit(500);

    // Compute metrics
    let totalMinutes = 0;
    let completedCount = 0;
    for (const item of items) {
      if (item.checkOutAt && item.checkInAt) {
        const diffMs = new Date(item.checkOutAt).getTime() - new Date(item.checkInAt).getTime();
        if (diffMs > 0) {
          totalMinutes += Math.round(diffMs / 60000);
          completedCount++;
        }
      }
    }

    const avgMinutes = completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0;

    res.json({
      items,
      stats: {
        totalVisits: items.length,
        totalMinutes,
        avgMinutes,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ─── 8. Admin / Staff: Record Manual Check-In (auto-approved) ───
router.post(
  '/',
  allowRoles('admin', 'staff'),
  validate(z.object({ body: z.object({ member: z.string().length(24) }) })),
  async (req, res, next) => {
    try {
      const member = await User.findOne({ _id: req.body.member, role: 'member', active: true });
      if (!member) return res.status(404).json({ message: 'Active member not found' });

      const active = await Membership.findOne({
        member: member.id,
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });
      if (!active) return res.status(409).json({ message: 'Member has no active membership' });

      const existing = await Attendance.findOne({ member: member.id, checkOutAt: { $exists: false } });
      if (existing) return res.status(409).json({ message: 'Member is already checked in' });

      const item = await Attendance.create({
        member: member.id,
        recordedBy: req.user!.id,
        verificationMethod: 'manual',
        status: 'approved',
        approvedBy: req.user!.id,
        approvedAt: new Date(),
      });

      res.status(201).json({ item });
    } catch (e) {
      next(e);
    }
  }
);

// ─── 9. Admin / Staff: Record Manual Check-Out ───
router.patch('/:id/checkout', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const item = await Attendance.findOneAndUpdate(
      { _id: req.params.id, checkOutAt: { $exists: false } },
      { checkOutAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Open attendance record not found' });
    res.json({ item });
  } catch (e) {
    next(e);
  }
});

export default router;
