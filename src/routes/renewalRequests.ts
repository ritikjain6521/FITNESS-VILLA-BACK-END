import { Router } from 'express';
import { z } from 'zod';
import RenewalRequest from '../models/RenewalRequest.js';
import Membership from '../models/Membership.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  body: z.object({
    requestedPlan: z.string().length(24),
    requestType: z.enum(['renewal', 'upgrade']).default('renewal'),
    currentMembership: z.string().length(24).optional(),
    preferredStartDate: z.coerce.date().optional(),
    notes: z.string().max(500).optional(),
  }),
});

// GET: List requests (Members see only their own; Admin/Staff see all)
router.get('/', async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.user!.role === 'member') {
      filter.member = req.user!.id;
    } else {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.member) filter.member = req.query.member;
    }

    const items = await RenewalRequest.find(filter)
      .populate('member', 'name email phone')
      .populate('requestedPlan', 'name pricePaise durationDays features')
      .populate({
        path: 'currentMembership',
        populate: { path: 'plan', select: 'name pricePaise durationDays' },
      })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// POST: Member submits a renewal/upgrade request
router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const memberId = req.user!.role === 'member' ? req.user!.id : req.body.member || req.user!.id;
    const plan = await Plan.findOne({ _id: req.body.requestedPlan, active: true });
    if (!plan) return res.status(404).json({ message: 'Requested plan not found or inactive' });

    let currentMembershipId = req.body.currentMembership;
    if (!currentMembershipId) {
      const activeMembership = await Membership.findOne({ member: memberId, status: 'active' }).sort({ endDate: -1 });
      if (activeMembership) currentMembershipId = activeMembership.id;
    }

    const item = await RenewalRequest.create({
      member: memberId,
      currentMembership: currentMembershipId,
      requestedPlan: plan.id,
      requestType: req.body.requestType,
      notes: req.body.notes || '',
      preferredStartDate: req.body.preferredStartDate || new Date(),
      status: 'pending',
    });

    const populated = await RenewalRequest.findById(item.id)
      .populate('member', 'name email phone')
      .populate('requestedPlan', 'name pricePaise durationDays');

    res.status(201).json({ item: populated });
  } catch (e) {
    next(e);
  }
});

// PATCH /:id/status: Admin/Staff approves or rejects request
router.patch('/:id/status', allowRoles('admin', 'staff'), async (req, res, next) => {
  try {
    const { status, adminNotes, activateMembership } = req.body;
    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await RenewalRequest.findById(req.params.id)
      .populate('requestedPlan')
      .populate('member');

    if (!request) return res.status(404).json({ message: 'Renewal request not found' });

    const before = request.toObject();
    request.status = status;
    request.adminNotes = adminNotes || request.adminNotes;
    request.reviewedBy = req.user!.id as any;
    request.reviewedAt = new Date();
    await request.save();

    let createdMembership = null;
    if (status === 'approved' && activateMembership) {
      const plan: any = request.requestedPlan;
      const start = request.preferredStartDate || new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + (plan.durationDays || 30));

      createdMembership = await Membership.create({
        member: (request.member as any)._id,
        plan: plan._id,
        startDate: start,
        endDate: end,
        status: 'active',
        createdBy: req.user!.id,
      });
    }

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: `renewal_request.${status}`,
      targetModel: 'RenewalRequest',
      targetId: request.id,
      before,
      after: request.toObject(),
      reason: adminNotes || '',
    });

    res.json({ item: request, createdMembership });
  } catch (e) {
    next(e);
  }
});

export default router;
