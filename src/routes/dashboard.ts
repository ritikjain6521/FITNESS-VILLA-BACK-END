import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Member from '../models/Member.js';
import Enquiry from '../models/Enquiry.js';

const router = Router();
router.use(requireAuth);
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
