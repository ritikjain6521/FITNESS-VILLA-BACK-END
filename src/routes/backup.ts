import { Router } from 'express';
import multer from 'multer';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import Enquiry from '../models/Enquiry.js';
import GymSettings from '../models/GymSettings.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import Workout from '../models/Workout.js';
import AuditLog from '../models/AuditLog.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin'));

// 1. Full Database Backup Export (JSON)
router.get('/export', async (_req, res, next) => {
  try {
    const [
      users,
      members,
      plans,
      memberships,
      attendances,
      payments,
      expenses,
      expenseCategories,
      products,
      sales,
      stockMovements,
      suppliers,
      enquiries,
      settings,
      templates,
      workouts,
    ] = await Promise.all([
      User.find().lean(),
      Member.find().lean(),
      Plan.find().lean(),
      Membership.find().lean(),
      Attendance.find().lean(),
      Payment.find().lean(),
      Expense.find().lean(),
      ExpenseCategory.find().lean(),
      Product.find().lean(),
      Sale.find().lean(),
      StockMovement.find().lean(),
      Supplier.find().lean(),
      Enquiry.find().lean(),
      GymSettings.find().lean(),
      NotificationTemplate.find().lean(),
      Workout.find().lean(),
    ]);

    const backupData = {
      meta: {
        platform: 'Fitness Villa Platform',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        counts: {
          users: users.length,
          members: members.length,
          plans: plans.length,
          memberships: memberships.length,
          payments: payments.length,
          expenses: expenses.length,
          products: products.length,
          sales: sales.length,
        },
      },
      collections: {
        users,
        members,
        plans,
        memberships,
        attendances,
        payments,
        expenses,
        expenseCategories,
        products,
        sales,
        stockMovements,
        suppliers,
        enquiries,
        settings,
        templates,
        workouts,
      },
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `fitnessvilla-backup-${dateStr}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (e) {
    next(e);
  }
});

// 2. Full Database Restore
router.post('/restore', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file uploaded' });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ message: 'Invalid JSON backup file' });
    }

    if (!parsed.collections || !parsed.meta) {
      return res.status(400).json({ message: 'Incompatible backup file format' });
    }

    const { collections } = parsed;
    const mode = req.body.mode || 'merge'; // 'merge' or 'replace'

    const restoreSummary: Record<string, number> = {};

    const modelMap: Record<string, any> = {
      plans: Plan,
      expenseCategories: ExpenseCategory,
      suppliers: Supplier,
      templates: NotificationTemplate,
      users: User,
      members: Member,
      memberships: Membership,
      products: Product,
      sales: Sale,
      stockMovements: StockMovement,
      expenses: Expense,
      payments: Payment,
      attendances: Attendance,
      enquiries: Enquiry,
      workouts: Workout,
    };

    for (const [key, model] of Object.entries(modelMap)) {
      const items = collections[key];
      if (!Array.isArray(items) || items.length === 0) continue;

      if (mode === 'replace') {
        // Except for currently logged in admin user
        if (key === 'users') {
          await model.deleteMany({ _id: { $ne: req.user!.id } });
        } else {
          await model.deleteMany({});
        }
      }

      let insertedCount = 0;
      for (const item of items) {
        try {
          if (mode === 'replace') {
            await model.create(item);
            insertedCount++;
          } else {
            // Merge / upsert by _id
            await model.findByIdAndUpdate(item._id, item, { upsert: true });
            insertedCount++;
          }
        } catch {
          // ignore duplicate key or validation error on individual rows
        }
      }
      restoreSummary[key] = insertedCount;
    }

    // Restore settings
    if (collections.settings && collections.settings.length > 0) {
      const s = collections.settings[0];
      await GymSettings.findOneAndUpdate({}, { $set: s }, { upsert: true });
      restoreSummary.settings = 1;
    }

    await AuditLog.create({
      actor: req.user!.id,
      actorEmail: req.user!.email,
      action: 'database.restore',
      targetModel: 'Database',
      after: restoreSummary,
    });

    res.json({
      message: 'Database backup restored successfully',
      summary: restoreSummary,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
