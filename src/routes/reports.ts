import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';
import Expense from '../models/Expense.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Plan from '../models/Plan.js';
import GymSettings from '../models/GymSettings.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin', 'staff'));

function parseDateRange(from?: string, to?: string) {
  const filter: any = {};
  if (from) filter.$gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    filter.$lte = d;
  }
  return Object.keys(filter).length ? filter : null;
}

// ─── JSON Reports ──────────────────────────────────────────

// Members report
router.get('/members', async (req, res, next) => {
  try {
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    const filter: any = { role: 'member', active: true };
    if (dr) filter.createdAt = dr;
    const items = await User.find(filter)
      .select('name email phone role createdAt')
      .sort({ createdAt: -1 })
      .limit(2000);
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
});

// Memberships report
router.get('/memberships', async (req, res, next) => {
  try {
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    if (dr) filter.startDate = dr;
    const items = await Membership.find(filter)
      .populate('member', 'name email phone')
      .populate('plan', 'name pricePaise durationDays')
      .sort({ startDate: -1 })
      .limit(2000);
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
});

// Payments report
router.get('/payments', async (req, res, next) => {
  try {
    const filter: any = { status: 'paid' };
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    if (dr) filter.paidAt = dr;
    const [items, agg] = await Promise.all([
      Payment.find(filter)
        .populate('member', 'name email phone')
        .sort({ paidAt: -1 })
        .limit(2000),
      Payment.aggregate([
        { $match: filter },
        { $group: { _id: '$method', total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ items, total: items.length, byMethod: agg });
  } catch (e) {
    next(e);
  }
});

// Attendance report
router.get('/attendance', async (req, res, next) => {
  try {
    const filter: any = {};
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    if (dr) filter.checkInAt = dr;
    if (req.query.member) filter.member = req.query.member;
    const items = await Attendance.find(filter)
      .populate('member', 'name email')
      .sort({ checkInAt: -1 })
      .limit(2000);
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
});

// Expenses report
router.get('/expenses', async (req, res, next) => {
  try {
    const filter: any = { isVoid: false };
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    if (dr) filter.date = dr;
    const [items, agg] = await Promise.all([
      Expense.find(filter)
        .populate('category', 'name')
        .sort({ date: -1 })
        .limit(2000),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: '$category', total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ items, total: items.length, byCategory: agg });
  } catch (e) {
    next(e);
  }
});

// Dues & Receivables report
router.get('/dues', async (_req, res, next) => {
  try {
    // Find active memberships and compare plan cost vs payments
    const memberships = await Membership.find({ status: { $in: ['active', 'pending'] } })
      .populate('member', 'name email phone')
      .populate('plan', 'name pricePaise durationDays')
      .sort({ createdAt: -1 });

    const duesList = [];
    for (const m of memberships) {
      const member: any = m.member;
      const plan: any = m.plan;
      if (!member || !plan) continue;

      // Sum all paid payments for this membership
      const payments = await Payment.find({ membership: m._id, status: 'paid' });
      const totalPaidPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);
      const planPricePaise = plan.pricePaise;
      const duePaise = planPricePaise - totalPaidPaise;

      if (duePaise > 0) {
        duesList.push({
          membershipId: m._id,
          memberId: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone || '',
          planName: plan.name,
          planPricePaise,
          paidPaise: totalPaidPaise,
          duePaise,
          startDate: m.startDate,
          endDate: m.endDate,
        });
      }
    }

    const totalDuePaise = duesList.reduce((s, d) => s + d.duePaise, 0);
    res.json({ items: duesList, total: duesList.length, totalDuePaise });
  } catch (e) {
    next(e);
  }
});

// Business summary
router.get('/summary', allowRoles('admin'), async (req, res, next) => {
  try {
    const dr = parseDateRange(req.query.from as string, req.query.to as string);
    const payFilter: any = { status: 'paid' };
    if (dr) payFilter.paidAt = dr;
    const expFilter: any = { isVoid: false };
    if (dr) expFilter.date = dr;
    const saleFilter: any = { isVoid: false };
    if (dr) saleFilter.createdAt = dr;

    const [revenue, storeSales, expenses, newMembers, activeMemberships] = await Promise.all([
      Payment.aggregate([{ $match: payFilter }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]),
      Sale.aggregate([{ $match: saleFilter }, { $group: { _id: null, total: { $sum: '$totalPaise' } } }]),
      Expense.aggregate([{ $match: expFilter }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }]),
      User.countDocuments({ role: 'member', active: true, ...(dr ? { createdAt: dr } : {}) }),
      Membership.countDocuments({ status: 'active' }),
    ]);

    const memRevenuePaise = revenue[0]?.total ?? 0;
    const storeRevenuePaise = storeSales[0]?.total ?? 0;
    const totalRevenuePaise = memRevenuePaise + storeRevenuePaise;
    const totalExpensesPaise = expenses[0]?.total ?? 0;
    const netProfitPaise = totalRevenuePaise - totalExpensesPaise;

    res.json({
      revenuePaise: totalRevenuePaise,
      membershipRevenuePaise: memRevenuePaise,
      storeSalesPaise: storeRevenuePaise,
      expensesPaise: totalExpensesPaise,
      profitPaise: netProfitPaise,
      newMembers,
      activeMemberships,
    });
  } catch (e) {
    next(e);
  }
});

// ─── Export to Excel (.xlsx) / CSV ────────────────────────

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';
    const dr = parseDateRange(req.query.from as string, req.query.to as string);

    let rows: Record<string, any>[] = [];
    let sheetName = 'Report';

    if (type === 'members') {
      sheetName = 'Members';
      const filter: any = { role: 'member', active: true };
      if (dr) filter.createdAt = dr;
      const users = await User.find(filter).sort({ createdAt: -1 });
      rows = users.map((u, i) => ({
        'S.No': i + 1,
        'Full Name': u.name,
        'Email Address': u.email,
        'Phone Number': u.phone || '',
        'Role': u.role,
        'Status': u.active ? 'Active' : 'Inactive',
        'Joined Date': u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
      }));
    } else if (type === 'memberships') {
      sheetName = 'Memberships';
      const filter: any = {};
      if (req.query.status) filter.status = req.query.status;
      if (dr) filter.startDate = dr;
      const list = await Membership.find(filter)
        .populate('member', 'name email phone')
        .populate('plan', 'name pricePaise durationDays')
        .sort({ startDate: -1 });
      rows = list.map((m: any, i) => ({
        'S.No': i + 1,
        'Member Name': m.member?.name || 'Unknown',
        'Phone': m.member?.phone || '',
        'Email': m.member?.email || '',
        'Plan': m.plan?.name || '',
        'Plan Price (₹)': m.plan?.pricePaise ? m.plan.pricePaise / 100 : 0,
        'Duration (Days)': m.plan?.durationDays || 0,
        'Start Date': m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : '',
        'End Date': m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : '',
        'Status': m.status,
      }));
    } else if (type === 'payments') {
      sheetName = 'Payments';
      const filter: any = { status: 'paid' };
      if (dr) filter.paidAt = dr;
      const list = await Payment.find(filter)
        .populate('member', 'name email phone')
        .populate('membership')
        .sort({ paidAt: -1 });
      rows = list.map((p: any, i) => ({
        'S.No': i + 1,
        'Receipt No': p.receiptNumber || `RCP-${p._id.toString().slice(-6).toUpperCase()}`,
        'Member Name': p.member?.name || 'Walk-in',
        'Phone': p.member?.phone || '',
        'Amount (₹)': p.amountPaise / 100,
        'Method': (p.method || '').toUpperCase(),
        'Date': p.paidAt ? new Date(p.paidAt).toISOString().split('T')[0] : '',
        'Notes': p.notes || '',
        'Status': p.status,
      }));
    } else if (type === 'expenses') {
      sheetName = 'Expenses';
      const filter: any = { isVoid: false };
      if (dr) filter.date = dr;
      const list = await Expense.find(filter).populate('category', 'name').sort({ date: -1 });
      rows = list.map((e: any, i) => ({
        'S.No': i + 1,
        'Date': e.date ? new Date(e.date).toISOString().split('T')[0] : '',
        'Category': e.category?.name || 'General',
        'Amount (₹)': e.amountPaise / 100,
        'Vendor / Payee': e.vendor || '',
        'Payment Method': (e.paymentMethod || '').toUpperCase(),
        'Notes': e.notes || '',
      }));
    } else if (type === 'inventory') {
      sheetName = 'Inventory_Stock';
      const products = await Product.find({ active: true }).sort({ name: 1 });
      rows = products.map((p, i) => ({
        'S.No': i + 1,
        'SKU': p.sku,
        'Product Name': p.name,
        'Category': p.category,
        'Stock Qty': p.currentQty,
        'Reorder Level': p.reorderThreshold,
        'Cost Price (₹)': p.purchasePricePaise / 100,
        'Selling Price (₹)': p.sellingPricePaise / 100,
        'Stock Valuation Cost (₹)': (p.currentQty * p.purchasePricePaise) / 100,
        'Stock Valuation Selling (₹)': (p.currentQty * p.sellingPricePaise) / 100,
        'Status': p.currentQty <= p.reorderThreshold ? 'LOW STOCK' : 'IN STOCK',
      }));
    } else if (type === 'dues') {
      sheetName = 'Outstanding_Dues';
      const memberships = await Membership.find({ status: { $in: ['active', 'pending'] } })
        .populate('member', 'name email phone')
        .populate('plan', 'name pricePaise');
      let idx = 1;
      for (const m of memberships) {
        const member: any = m.member;
        const plan: any = m.plan;
        if (!member || !plan) continue;
        const payments = await Payment.find({ membership: m._id, status: 'paid' });
        const paidPaise = payments.reduce((s, p) => s + p.amountPaise, 0);
        const duePaise = plan.pricePaise - paidPaise;
        if (duePaise > 0) {
          rows.push({
            'S.No': idx++,
            'Member Name': member.name,
            'Phone': member.phone || '',
            'Email': member.email || '',
            'Plan': plan.name,
            'Plan Fee (₹)': plan.pricePaise / 100,
            'Amount Paid (₹)': paidPaise / 100,
            'Balance Due (₹)': duePaise / 100,
            'Expires On': m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : '',
          });
        }
      }
    } else if (type === 'sales') {
      sheetName = 'POS_Sales';
      const filter: any = { isVoid: false };
      if (dr) filter.createdAt = dr;
      const sales = await Sale.find(filter).populate('member', 'name phone').sort({ createdAt: -1 });
      rows = sales.map((s: any, i) => ({
        'S.No': i + 1,
        'Invoice No': s.saleNumber,
        'Customer': s.member?.name || 'Walk-in',
        'Customer Phone': s.member?.phone || '',
        'Total Items': s.items?.length || 0,
        'Subtotal (₹)': s.subtotalPaise / 100,
        'Discount (₹)': s.discountPaise / 100,
        'Net Total (₹)': s.totalPaise / 100,
        'Payment Method': (s.paymentMethod || '').toUpperCase(),
        'Date': s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
      }));
    } else {
      return res.status(400).json({ message: 'Invalid report export type' });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: 'No data found' }]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type}_report_${timestamp}.${format}`;

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvOutput);
    } else {
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(xlsxBuffer);
    }
  } catch (e) {
    next(e);
  }
});

// ─── Download Sample Import Templates ─────────────────────

router.get('/template/:type', (req, res) => {
  const { type } = req.params;
  const wb = XLSX.utils.book_new();

  if (type === 'members') {
    const sample = [
      {
        'Full Name': 'John Doe',
        'Email Address': 'john.doe@example.com',
        'Phone Number': '9876543210',
        'Gender': 'male',
        'Address': '123 MG Road, Mumbai',
        'Initial Password': 'MemberPassword123!',
      },
      {
        'Full Name': 'Priya Sharma',
        'Email Address': 'priya.sharma@example.com',
        'Phone Number': '9123456789',
        'Gender': 'female',
        'Address': '45 Park Street, Delhi',
        'Initial Password': 'MemberPassword123!',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    XLSX.utils.book_append_sheet(wb, ws, 'Members_Template');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="members_import_template.xlsx"');
    return res.send(buf);
  } else if (type === 'products') {
    const sample = [
      {
        'SKU': 'SUP-WHEY-01',
        'Product Name': 'Gold Standard Whey Protein 2kg',
        'Category': 'Supplements',
        'Current Stock Qty': 25,
        'Cost Price (₹)': 4200,
        'Selling Price (₹)': 5500,
        'Reorder Threshold': 5,
      },
      {
        'SKU': 'ACC-SHAKE-01',
        'Product Name': 'Stainless Steel Shaker 700ml',
        'Category': 'Accessories',
        'Current Stock Qty': 40,
        'Cost Price (₹)': 250,
        'Selling Price (₹)': 499,
        'Reorder Threshold': 10,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    XLSX.utils.book_append_sheet(wb, ws, 'Products_Template');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_import_template.xlsx"');
    return res.send(buf);
  } else {
    return res.status(400).json({ message: 'Invalid template type' });
  }
});

// ─── Data Import (Bulk Upload Members or Products) ────────

router.post('/import/members', allowRoles('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'File is empty or contains no rows' });
    }

    let inserted = 0;
    const errors: string[] = [];
    const settings = await GymSettings.findOne();
    const prefix = settings?.memberIdPrefix || 'MBR';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row['Full Name'] || row['Name'] || '').trim();
      const email = String(row['Email Address'] || row['Email'] || '').trim().toLowerCase();
      const phone = String(row['Phone Number'] || row['Phone'] || '').trim();
      const gender = String(row['Gender'] || '').trim().toLowerCase();
      const address = String(row['Address'] || '').trim();
      const rawPass = String(row['Initial Password'] || row['Password'] || 'GymMember123!');

      if (!name || !email) {
        errors.push(`Row ${i + 2}: Name and Email are required.`);
        continue;
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        errors.push(`Row ${i + 2}: Email ${email} already exists.`);
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(rawPass, 10);
        const user = await User.create({
          name,
          email,
          phone,
          role: 'member',
          passwordHash,
          active: true,
        });

        const memberId = `${prefix}-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
        await Member.create({
          user: user._id,
          memberId,
          gender: ['male', 'female', 'other'].includes(gender) ? gender : '',
          address,
        });

        inserted++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    res.json({
      message: `Import complete. ${inserted} members successfully imported.`,
      inserted,
      totalRows: rows.length,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/import/products', allowRoles('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'File is empty or contains no rows' });
    }

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sku = String(row['SKU'] || '').trim();
      const name = String(row['Product Name'] || row['Name'] || '').trim();
      const category = String(row['Category'] || 'Supplements').trim();
      const qty = parseInt(row['Current Stock Qty'] || row['Stock'] || '0', 10);
      const costPrice = Math.round(Number(row['Cost Price (₹)'] || row['Cost'] || 0) * 100);
      const sellPrice = Math.round(Number(row['Selling Price (₹)'] || row['Price'] || 0) * 100);
      const reorder = parseInt(row['Reorder Threshold'] || '5', 10);

      if (!sku || !name || sellPrice <= 0) {
        errors.push(`Row ${i + 2}: SKU, Name, and Selling Price are required.`);
        continue;
      }

      try {
        const existing = await Product.findOne({ sku });
        if (existing) {
          existing.name = name;
          existing.category = category;
          existing.currentQty = isNaN(qty) ? existing.currentQty : qty;
          existing.purchasePricePaise = isNaN(costPrice) ? existing.purchasePricePaise : costPrice;
          existing.sellingPricePaise = sellPrice;
          existing.reorderThreshold = isNaN(reorder) ? existing.reorderThreshold : reorder;
          await existing.save();
          updated++;
        } else {
          await Product.create({
            sku,
            name,
            category,
            currentQty: isNaN(qty) ? 0 : qty,
            purchasePricePaise: isNaN(costPrice) ? 0 : costPrice,
            sellingPricePaise: sellPrice,
            reorderThreshold: isNaN(reorder) ? 5 : reorder,
            active: true,
          });
          inserted++;
        }
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    res.json({
      message: `Product import complete. ${inserted} created, ${updated} updated.`,
      inserted,
      updated,
      totalRows: rows.length,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
