import { Router } from 'express';
import { z } from 'zod';
import Plan from '../models/Plan.js';
import Membership from '../models/Membership.js';
import AuditLog from '../models/AuditLog.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(500).optional().default(''),
  pricePaise: z.number().int().min(0),
  durationDays: z.number().int().min(1).max(730),
  features: z.array(z.string().max(120)).max(20).optional().default([]),
  active: z.boolean().optional().default(true),
});

// GET: Public or admin list of plans
router.get('/', async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.query.all !== 'true') {
      filter.active = true;
    }
    const items = await Plan.find(filter).sort({ pricePaise: 1 });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// POST: Create new plan (admin only)
router.post(
  '/',
  requireAuth,
  allowRoles('admin'),
  validate(z.object({ body: planSchema })),
  async (req, res, next) => {
    try {
      const item = await Plan.create(req.body);

      await AuditLog.create({
        actor: req.user!.id,
        actorEmail: req.user!.email,
        action: 'plan.create',
        targetModel: 'Plan',
        targetId: item.id,
        after: item.toObject(),
      });

      res.status(201).json({ item });
    } catch (e) {
      next(e);
    }
  }
);

// PATCH: Edit plan (admin only)
router.patch('/:id', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const before = await Plan.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Plan not found' });

    const parsed = planSchema.partial().parse(req.body);
    const item = await Plan.findByIdAndUpdate(req.params.id, parsed, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'plan.update',
      targetModel: 'Plan',
      targetId: req.params.id,
      before,
      after: item?.toObject(),
    });

    res.json({ item });
  } catch (e) {
    next(e);
  }
});

// DELETE: Deactivate or permanently delete plan (admin only)
router.delete('/:id', requireAuth, allowRoles('admin'), async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Check if any memberships are linked
    const linkedMemberships = await Membership.countDocuments({ plan: req.params.id });

    if (req.query.hard === 'true' && linkedMemberships === 0) {
      await Plan.findByIdAndDelete(req.params.id);
      await AuditLog.create({
        actor: req.user!.id,
        actorEmail: req.user!.email,
        action: 'plan.hard_delete',
        targetModel: 'Plan',
        targetId: req.params.id,
        before: plan.toObject(),
      });
      return res.json({ message: 'Plan deleted permanently' });
    }

    // Soft delete / deactivate
    plan.active = false;
    await plan.save();

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'plan.deactivate',
      targetModel: 'Plan',
      targetId: req.params.id,
      before: plan.toObject(),
    });

    res.json({ message: 'Plan deactivated successfully', item: plan });
  } catch (e) {
    next(e);
  }
});

export default router;
