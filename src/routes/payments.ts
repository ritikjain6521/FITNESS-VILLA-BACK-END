import { Router } from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import GymSettings from '../models/GymSettings.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generatePaymentReceiptWhatsApp, formatWhatsAppUrl } from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);

function generateReceiptNo(prefix = 'IP'): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${rand}`;
}

// 1. List payments
router.get('/', allowRoles('admin', 'staff'), async (_req, res, next) => {
  try {
    const items = await Payment.find()
      .populate('member', 'name email phone')
      .populate({
        path: 'membership',
        populate: { path: 'plan', select: 'name pricePaise durationDays' },
      })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// 2. Outstanding dues & balance tracking
router.get('/dues', allowRoles('admin', 'staff'), async (_req, res, next) => {
  try {
    const settings = await GymSettings.findOne().lean();
    const gymName = settings?.gymName || 'Fitness Villa';
    const gymPhone = settings?.phone || settings?.whatsapp || '';

    const memberships = await Membership.find({ status: { $in: ['active', 'pending'] } })
      .populate('member', 'name email phone')
      .populate('plan', 'name pricePaise durationDays')
      .sort({ createdAt: -1 });

    const dues = [];
    for (const m of memberships) {
      const member: any = m.member;
      const plan: any = m.plan;
      if (!member || !plan) continue;

      const payments = await Payment.find({ membership: m._id, status: 'paid' });
      const paidPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);
      const planPricePaise = plan.pricePaise;
      const duePaise = planPricePaise - paidPaise;

      if (duePaise > 0) {
        const dueRupees = (duePaise / 100).toLocaleString('en-IN');
        const reminderText = `Hi ${member.name}! 💳\nGreetings from *${gymName}*.\nThis is a friendly reminder that you have a pending membership balance of *₹${dueRupees}* for your ${plan.name} plan.\nPlease clear your dues at the reception or pay online at your earliest convenience.\nContact: ${gymPhone}`;

        dues.push({
          membershipId: m._id,
          memberId: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone || '',
          planName: plan.name,
          planPricePaise,
          paidPaise,
          duePaise,
          startDate: m.startDate,
          endDate: m.endDate,
          whatsappUrl: formatWhatsAppUrl(member.phone || '', reminderText),
          reminderText,
        });
      }
    }

    const totalDuePaise = dues.reduce((s, d) => s + d.duePaise, 0);
    res.json({ items: dues, total: dues.length, totalDuePaise });
  } catch (e) {
    next(e);
  }
});

// 3. Record manual payment receipt
router.post(
  '/manual',
  allowRoles('admin', 'staff'),
  validate(
    z.object({
      body: z.object({
        member: z.string().length(24),
        membership: z.string().length(24).optional(),
        amountPaise: z.number().int().min(1).max(100000000),
        method: z.enum(['cash', 'upi', 'card', 'bank_transfer']),
        notes: z.string().max(300).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const member = await User.findOne({ _id: req.body.member, role: 'member' });
      if (!member) return res.status(404).json({ message: 'Member not found' });

      let membershipDoc: any = null;
      if (req.body.membership) {
        membershipDoc = await Membership.findOne({ _id: req.body.membership, member: member.id }).populate('plan');
        if (!membershipDoc) return res.status(400).json({ message: 'Membership does not belong to this member' });
      }

      const settings = await GymSettings.findOne().lean();
      const receiptNumber = generateReceiptNo(settings?.receiptPrefix || 'IP');

      const item = await Payment.create({
        ...req.body,
        receiptNumber,
        status: 'paid',
        recordedBy: req.user!.id,
        paidAt: new Date(),
      });

      const populatedPayment = await Payment.findById(item._id)
        .populate('member', 'name email phone')
        .populate({ path: 'membership', populate: { path: 'plan' } });

      const whatsapp = generatePaymentReceiptWhatsApp(populatedPayment, member, settings);

      res.status(201).json({
        item: populatedPayment,
        whatsappReceiptUrl: whatsapp.url,
        whatsappReceiptText: whatsapp.text,
      });
    } catch (e) {
      next(e);
    }
  }
);

// 4. View single payment receipt
router.get('/:id/receipt', allowRoles('admin', 'staff', 'member'), async (req, res, next) => {
  try {
    const payment: any = await Payment.findById(req.params.id)
      .populate('member', 'name email phone address')
      .populate({
        path: 'membership',
        populate: { path: 'plan', select: 'name pricePaise durationDays' },
      })
      .populate('recordedBy', 'name');

    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    if (req.user!.role === 'member' && String(payment.member._id) !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const settings = await GymSettings.findOne().lean();
    const whatsapp = generatePaymentReceiptWhatsApp(payment, payment.member, settings);

    res.json({
      payment,
      settings,
      whatsappReceiptUrl: whatsapp.url,
      whatsappReceiptText: whatsapp.text,
    });
  } catch (e) {
    next(e);
  }
});

// 5. Razorpay payment order
router.post(
  '/razorpay/order',
  allowRoles('admin', 'staff', 'member'),
  validate(
    z.object({
      body: z.object({
        member: z.string().length(24),
        amountPaise: z.number().int().min(100).max(100000000),
        membership: z.string().length(24).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        return res.status(503).json({ message: 'Online payments are not configured' });
      if (req.user!.role === 'member' && req.user!.id !== req.body.member)
        return res.status(403).json({ message: 'Cannot create an order for another member' });
      const member = await User.findOne({ _id: req.body.member, role: 'member' });
      if (!member) return res.status(404).json({ message: 'Member not found' });

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: req.body.amountPaise,
        currency: 'INR',
        receipt: `gym_${Date.now()}`,
      });

      const settings = await GymSettings.findOne().lean();
      const receiptNumber = generateReceiptNo(settings?.receiptPrefix || 'IP');

      const payment = await Payment.create({
        member: member.id,
        membership: req.body.membership,
        amountPaise: req.body.amountPaise,
        receiptNumber,
        method: 'razorpay',
        status: 'pending',
        providerOrderId: order.id,
      });

      res.status(201).json({
        order: { id: order.id, amount: order.amount, currency: order.currency },
        paymentId: payment.id,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (e) {
      next(e);
    }
  }
);

// 6. Razorpay verify
router.post(
  '/razorpay/verify',
  allowRoles('admin', 'staff', 'member'),
  validate(
    z.object({
      body: z.object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      if (!process.env.RAZORPAY_KEY_SECRET)
        return res.status(503).json({ message: 'Online payments are not configured' });
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const payment: any = await Payment.findOne({ providerOrderId: razorpay_order_id }).populate('member');
      if (!payment) return res.status(404).json({ message: 'Payment order not found' });
      if (req.user!.role === 'member' && String(payment.member._id) !== req.user!.id)
        return res.status(403).json({ message: 'Forbidden' });

      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const a = Buffer.from(expected);
      const b = Buffer.from(razorpay_signature);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
        return res.status(400).json({ message: 'Payment signature verification failed' });

      if (payment.status === 'paid' && payment.providerPaymentId === razorpay_payment_id)
        return res.json({ message: 'Payment already verified', payment });
      if (payment.status !== 'pending') return res.status(409).json({ message: 'Payment is not pending' });

      payment.status = 'paid';
      payment.providerPaymentId = razorpay_payment_id;
      payment.paidAt = new Date();
      await payment.save();

      const settings = await GymSettings.findOne().lean();
      const whatsapp = generatePaymentReceiptWhatsApp(payment, payment.member, settings);

      res.json({
        message: 'Payment verified',
        payment,
        whatsappReceiptUrl: whatsapp.url,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
