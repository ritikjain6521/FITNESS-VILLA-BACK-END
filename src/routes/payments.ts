import { Router } from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import GymSettings from '../models/GymSettings.js';
import AuditLog from '../models/AuditLog.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generatePaymentReceiptWhatsApp, formatWhatsAppUrl } from '../services/notificationService.js';

const router = Router();
router.use(requireAuth);

function generateReceiptNo(prefix = 'FV'): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${date}-${rand}`;
}

// 1. List payments
router.get('/', allowRoles('admin', 'staff', 'member'), async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.user!.role === 'member') {
      filter.member = req.user!.id;
    } else if (req.query.member) {
      filter.member = req.query.member;
    }
    const items = await Payment.find(filter)
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
router.get('/dues', allowRoles('admin', 'staff', 'member'), async (req, res, next) => {
  try {
    const settings = await GymSettings.findOne().lean();
    const gymName = settings?.gymName || 'Fitness Villa';
    const gymPhone = settings?.phone || settings?.whatsapp || '';

    const membershipFilter: any = { status: { $in: ['active', 'pending'] } };
    if (req.user!.role === 'member') {
      membershipFilter.member = req.user!.id;
    }

    const memberships = await Membership.find(membershipFilter)
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

      await AuditLog.create({
        actor: req.user!.id,
        actorEmail: req.user!.email,
        action: 'payment.record_manual',
        targetModel: 'Payment',
        targetId: item.id,
        after: {
          member: member.id,
          amountPaise: item.amountPaise,
          method: item.method,
          receiptNumber: item.receiptNumber,
        },
      });

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

    // If client requested HTML or opened directly in browser tab with token:
    const wantsHtml = req.query.format === 'html' || req.headers.accept?.includes('text/html');
    if (wantsHtml) {
      const amountPaise = payment.amountPaise || 0;
      const amountInRupees = (amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const taxRate = settings?.defaultTaxRate || 18;
      const basePaise = Math.round(amountPaise / (1 + taxRate / 100));
      const taxPaise = amountPaise - basePaise;
      const baseRupees = (basePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const taxRupees = (taxPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const paidDate = payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const gymName = settings?.gymName || 'Fitness Villa';
      const gymPhone = settings?.phone || '+91 98765 43210';
      const gymAddress = settings?.address || 'Plot 42, Elite Sports Hub, New Delhi';
      const gstin = settings?.gstin || '07AAAAA0000A1Z5';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${payment.receiptNumber || 'Receipt'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c100e; color: #e5eae3; padding: 40px 20px; }
    .receipt-container { max-width: 650px; margin: 0 auto; background: #141a17; border: 1px solid #28332c; border-radius: 12px; padding: 36px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b5f23d; padding-bottom: 24px; margin-bottom: 28px; }
    .gym-brand h1 { font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; }
    .gym-brand h1 span { color: #b5f23d; }
    .gym-meta { font-size: 12px; color: #8e968c; line-height: 1.6; margin-top: 6px; }
    .receipt-badge { text-align: right; }
    .status-stamp { display: inline-block; padding: 4px 12px; background: rgba(181,242,61,0.15); border: 1px solid #b5f23d; color: #b5f23d; font-weight: 800; font-size: 13px; border-radius: 4px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .receipt-num { font-size: 13px; font-family: monospace; color: #cfd6cc; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; font-size: 13px; }
    .info-block h4 { font-size: 11px; text-transform: uppercase; color: #8e968c; letter-spacing: 1px; margin-bottom: 6px; }
    .info-block p { font-size: 14px; font-weight: 600; color: #ffffff; }
    .info-block small { color: #9aa298; display: block; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background: #0c100e; color: #8e968c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #28332c; }
    td { padding: 14px 12px; border-bottom: 1px solid #1f2722; color: #e5eae3; }
    .text-right { text-align: right; }
    .summary-box { margin-left: auto; width: 280px; margin-bottom: 28px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #8e968c; }
    .summary-row.total { border-top: 1px solid #28332c; padding-top: 10px; margin-top: 6px; font-size: 18px; font-weight: 800; color: #ffffff; }
    .summary-row.total span:last-child { color: #b5f23d; }
    .footer { border-top: 1px dashed #28332c; padding-top: 20px; text-align: center; font-size: 12px; color: #8e968c; line-height: 1.6; }
    .actions { display: flex; justify-content: center; gap: 14px; margin-top: 24px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer; text-decoration: none; border: none; }
    .btn-green { background: #b5f23d; color: #000; }
    .btn-outline { background: transparent; border: 1px solid #3d4a40; color: #ffffff; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .actions { display: none !important; }
      .gym-brand h1 { color: #000; }
      .gym-brand h1 span { color: #2e7d32; }
      .status-stamp { background: #e8f5e9; border-color: #2e7d32; color: #2e7d32; }
      th { background: #f5f5f5; color: #333; }
      td { border-bottom: 1px solid #ddd; color: #111; }
      .info-block p, .summary-row.total { color: #000; }
      .summary-row.total span:last-child { color: #2e7d32; }
      .receipt-num, .info-block small, .summary-row, .footer { color: #555; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="gym-brand">
        <h1>${gymName.split(' ')[0]} <span>${gymName.split(' ').slice(1).join(' ') || 'GYM'}</span></h1>
        <div class="gym-meta">
          ${gymAddress}<br>
          Phone: ${gymPhone}
        </div>
      </div>
      <div class="receipt-badge">
        <div class="status-stamp">${payment.status}</div>
        <div class="receipt-num">${payment.receiptNumber || 'FV-RECEIPT'}</div>
        <div style="font-size: 11px; color: #8e968c; margin-top: 4px;">Date: ${paidDate}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h4>Billed To (Member)</h4>
        <p>${payment.member?.name || 'Valued Member'}</p>
        <small>${payment.member?.email || ''} ${payment.member?.phone ? `• ${payment.member.phone}` : ''}</small>
      </div>
      <div class="info-block">
        <h4>Payment Method</h4>
        <p style="text-transform: capitalize;">${payment.method || 'Online'} Payment</p>
        <small>Ref: ${payment.providerPaymentId || payment.providerOrderId || 'Verified'}</small>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Duration</th>
          <th class="text-right">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${payment.membership?.plan?.name || 'Gym Membership Pass'}</strong>
            <div style="font-size: 11px; color: #8e968c; margin-top: 2px;">Full access to Fitness Villa training zones and wellness facilities</div>
          </td>
          <td>${payment.membership?.plan?.durationDays ? `${payment.membership.plan.durationDays} Days` : 'Annual / Standard'}</td>
          <td class="text-right">₹${amountInRupees}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>₹${amountInRupees}</span>
      </div>
      <div class="summary-row total">
        <span>Total Paid:</span>
        <span>₹${amountInRupees}</span>
      </div>
    </div>

    <div class="footer">
      Thank you for being a proud member of ${gymName}.<br>
      This is a system-generated electronic receipt. No physical signature required.
    </div>

    <div class="actions">
      <button class="btn btn-green" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn btn-outline" onclick="window.close()">Close Window</button>
    </div>
  </div>
</body>
</html>`;
      return res.send(html);
    }

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
        member: z.string().length(24).optional(),
        amountPaise: z.number().int().min(100).max(100000000),
        membership: z.string().length(24).optional(),
        notes: z.string().max(300).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        return res.status(503).json({ message: 'Online payments are not configured' });
      if (req.user!.role === 'member' && req.body.member && req.user!.id !== req.body.member)
        return res.status(403).json({ message: 'Cannot create an order for another member' });

      let targetMemberId = req.body.member || (req.user!.role === 'member' ? req.user!.id : undefined);
      let member = null;
      if (targetMemberId) {
        member = await User.findById(targetMemberId);
      }
      if (!member) {
        member = await User.findById(req.user!.id);
      }
      if (!member) return res.status(404).json({ message: 'Member or user not found' });

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
        notes: req.body.notes || 'Online Razorpay checkout',
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

      await AuditLog.create({
        actor: req.user!.id,
        actorEmail: req.user!.email,
        action: 'payment.razorpay_verified',
        targetModel: 'Payment',
        targetId: payment.id,
        after: {
          member: payment.member?._id || payment.member,
          amountPaise: payment.amountPaise,
          providerOrderId: razorpay_order_id,
          providerPaymentId: razorpay_payment_id,
          receiptNumber: payment.receiptNumber,
        },
      });

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
