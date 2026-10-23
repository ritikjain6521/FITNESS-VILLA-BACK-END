import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Member from '../models/Member.js';
import Enquiry from '../models/Enquiry.js';
import Announcement from '../models/Announcement.js';
import RenewalRequest from '../models/RenewalRequest.js';
import GymSettings from '../models/GymSettings.js';

const router = Router();
router.use(requireAuth);

// --- Member self-service dashboard (before admin-only guard) ---
router.get('/member-summary', async (req, res, next) => {
  try {
    const memberId = req.user!.id;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      user,
      memberDoc,
      activeMembership,
      allMemberships,
      totalAttendance,
      monthAttendance,
      recentAttendance,
      paidPayments,
      pendingPayments,
      announcements,
      renewalRequests,
      settings,
    ] = await Promise.all([
      User.findById(memberId).select('name email phone role active status statusReason createdAt assignedTrainer').populate('assignedTrainer', 'name email phone'),
      Member.findOne({ user: memberId }),
      Membership.findOne({ member: memberId, status: 'active' })
        .populate('plan', 'name pricePaise durationDays features description'),
      Membership.find({ member: memberId })
        .populate('plan', 'name pricePaise durationDays')
        .sort({ createdAt: -1 }),
      Attendance.countDocuments({ member: memberId }),
      Attendance.countDocuments({
        member: memberId,
        checkInAt: { $gte: monthStart },
      }),
      Attendance.find({ member: memberId })
        .sort({ checkInAt: -1 }).limit(10),
      Payment.find({ member: memberId, status: 'paid' })
        .populate({ path: 'membership', populate: { path: 'plan', select: 'name pricePaise' } })
        .sort({ paidAt: -1, createdAt: -1 }).limit(20),
      Payment.find({ member: memberId, status: 'pending' })
        .populate({ path: 'membership', populate: { path: 'plan', select: 'name pricePaise' } })
        .sort({ createdAt: -1 }),
      Announcement.find({
        isActive: true,
        $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }],
      }).sort({ priority: -1, createdAt: -1 }).limit(5),
      RenewalRequest.find({ member: memberId })
        .populate('requestedPlan', 'name pricePaise durationDays features')
        .sort({ createdAt: -1 }).limit(5),
      GymSettings.findOne().lean(),
    ]);

    const totalPaidPaise = paidPayments.reduce((s, p) => s + p.amountPaise, 0);

    // Calculate outstanding dues:
    // If active membership has an unpaid balance or if there are pending payment records
    let outstandingDuePaise = pendingPayments.reduce((s, p) => s + p.amountPaise, 0);
    if (activeMembership && activeMembership.plan) {
      const planPricePaise = (activeMembership.plan as any).pricePaise || 0;
      const paidForActive = paidPayments
        .filter((p: any) => p.membership && String(p.membership._id || p.membership) === String(activeMembership._id))
        .reduce((s, p) => s + p.amountPaise, 0);
      const membershipDue = Math.max(0, planPricePaise - paidForActive);
      // Avoid double counting if already captured in pendingPayments
      const pendingForActive = pendingPayments
        .filter((p: any) => p.membership && String(p.membership._id || p.membership) === String(activeMembership._id))
        .reduce((s, p) => s + p.amountPaise, 0);
      if (membershipDue > pendingForActive) {
        outstandingDuePaise += (membershipDue - pendingForActive);
      }
    }

    res.json({
      user,
      memberDoc,
      activeMembership,
      allMemberships,
      totalAttendance,
      monthAttendance,
      recentAttendance,
      payments: paidPayments,
      pendingPayments,
      totalPaidPaise,
      outstandingDuePaise,
      announcements,
      renewalRequests,
      gymInfo: {
        gymName: settings?.gymName || 'Fitness Villa',
        tagline: settings?.tagline || 'Luxury Fitness Club',
        phone: settings?.phone || settings?.whatsapp || '',
        email: settings?.email || '',
        address: settings?.address || '',
        currency: settings?.currency || 'INR',
      },
    });
  } catch (e) { next(e); }
});

// --- Admin/Staff only routes below ---
router.use(allowRoles('admin', 'staff'));

router.get('/kpis', async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 1);
    const soon = new Date(now); soon.setDate(soon.getDate()+7);

    const [
      totalMembers,
      activeMembers,
      activeMemberships,
      expiredMemberships,
      todayAttendance,
      todayPaymentsAgg,
      monthPaymentsAgg,
      upcomingExpiry,
      newThisMonth,
      pendingEnquiries,
    ] = await Promise.all([
      User.countDocuments({ role: 'member', active: true }),
      User.countDocuments({ role: 'member', active: true }),
      Membership.countDocuments({ status: 'active' }),
      Membership.countDocuments({ status: 'expired' }),
      Attendance.countDocuments({ checkInAt: { $gte: todayStart, $lt: todayEnd } }),
      Payment.aggregate([{ $match: { status:'paid', paidAt:{ $gte:todayStart,$lt:todayEnd } } }, { $group:{ _id:null, total:{ $sum:'$amountPaise' } } }]),
      Payment.aggregate([{ $match: { status:'paid', paidAt:{ $gte:monthStart,$lt:monthEnd } } }, { $group:{ _id:null, total:{ $sum:'$amountPaise' } } }]),
      Membership.countDocuments({ status:'active', endDate:{ $gte:now,$lte:soon } }),
      User.countDocuments({ role:'member', active:true, createdAt:{ $gte:monthStart,$lt:monthEnd } }),
      Enquiry.countDocuments({ status:'new' }),
    ]);

    res.json({
      totalMembers,
      activeMembers,
      activeMemberships,
      expiredMemberships,
      todayAttendance,
      todayCollectionsPaise: todayPaymentsAgg[0]?.total ?? 0,
      monthCollectionsPaise: monthPaymentsAgg[0]?.total ?? 0,
      upcomingExpiry,
      newThisMonth,
      pendingEnquiries,
    });
  } catch(e) { next(e); }
});

router.get('/revenue-chart', async (req, res, next) => {
  try {
    const months = 6;
    const now = new Date();
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [payments, expenses] = await Promise.all([
        Payment.aggregate([{ $match:{ status:'paid', paidAt:{ $gte:start,$lt:end } } }, { $group:{ _id:null,total:{$sum:'$amountPaise'} } }]),
        Expense.aggregate([{ $match:{ isVoid:false, date:{ $gte:start,$lt:end } } }, { $group:{ _id:null,total:{$sum:'$amountPaise'} } }]),
      ]);
      results.push({
        month: start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        revenue: (payments[0]?.total ?? 0) / 100,
        expenses: (expenses[0]?.total ?? 0) / 100,
      });
    }
    res.json({ items: results });
  } catch(e) { next(e); }
});

router.get('/recent-members', async (_req, res, next) => {
  try {
    const items = await User.find({ role:'member', active:true })
      .select('name email phone createdAt')
      .sort({ createdAt:-1 })
      .limit(8);
    res.json({ items });
  } catch(e) { next(e); }
});

router.get('/upcoming-expiry', async (_req, res, next) => {
  try {
    const soon = new Date(); soon.setDate(soon.getDate()+14);
    const items = await Membership.find({ status:'active', endDate:{ $gte:new Date(), $lte:soon } })
      .populate('member','name email phone')
      .populate('plan','name')
      .sort({ endDate:1 })
      .limit(20);
    res.json({ items });
  } catch(e) { next(e); }
});

export default router;
