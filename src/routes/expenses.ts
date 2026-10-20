import { Router } from 'express';
import { z } from 'zod';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();
router.use(requireAuth);
router.use(allowRoles('admin', 'staff'));

// Categories
router.get('/categories', async (_req, res, next) => {
  try { const items = await ExpenseCategory.find({ active: true }).sort({ name: 1 }); res.json({ items }); } catch(e) { next(e); }
});
router.post('/categories', allowRoles('admin'), validate(z.object({ body: z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(300).optional() }) })), async (req, res, next) => {
  try { const item = await ExpenseCategory.create(req.body); res.status(201).json({ item }); } catch(e) { next(e); }
});

// Expenses
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page)||1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit)||20));
    const filter: any = { isVoid: false };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(String(req.query.from));
      if (req.query.to) filter.date.$lte = new Date(String(req.query.to));
    }
    const [items, total] = await Promise.all([
      Expense.find(filter).populate('category','name').populate('recordedBy','name').sort({ date:-1 }).skip((page-1)*limit).limit(limit),
      Expense.countDocuments(filter)
    ]);
    const agg = await Expense.aggregate([{ $match: filter }, { $group: { _id:null, total:{ $sum:'$amountPaise' } } }]);
    res.json({ items, page, limit, total, totalAmountPaise: agg[0]?.total ?? 0 });
  } catch(e) { next(e); }
});

const expenseSchema = z.object({ body: z.object({
  category: z.string().length(24),
  date: z.coerce.date().optional(),
  amountPaise: z.number().int().min(1).max(100000000),
  vendor: z.string().max(150).optional(),
  paymentMethod: z.enum(['cash','upi','bank_transfer','card','other']).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})});

router.post('/', validate(expenseSchema), async (req, res, next) => {
  try {
    const cat = await ExpenseCategory.findById(req.body.category);
    if (!cat) return res.status(400).json({ message: 'Invalid category' });
    const item = await Expense.create({ ...req.body, recordedBy: req.user!.id });
    await AuditLog.create({ actor: req.user!.id, actorEmail: req.user!.email, action: 'expense.create', targetModel: 'Expense', targetId: String(item._id), after: item.toObject() });
    res.status(201).json({ item });
  } catch(e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try { const item = await Expense.findById(req.params.id).populate('category','name').populate('recordedBy','name'); if(!item) return res.status(404).json({message:'Not found'}); res.json({item}); } catch(e){next(e);}
});

router.patch('/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const data = z.object({ amountPaise: z.number().int().min(1).optional(), vendor: z.string().max(150).optional(), notes: z.string().max(500).optional() }).parse(req.body);
    const before = await Expense.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: 'Not found' });
    const item = await Expense.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    await AuditLog.create({ actor: req.user!.id, actorEmail: req.user!.email, action: 'expense.edit', targetModel:'Expense', targetId: req.params.id, before, after: item?.toObject() });
    res.json({ item });
  } catch(e) { next(e); }
});

router.delete('/:id', allowRoles('admin'), async (req, res, next) => {
  try {
    const item = await Expense.findByIdAndUpdate(req.params.id, { isVoid: true }, { new: true });
    if (!item) return res.status(404).json({ message: 'Not found' });
    await AuditLog.create({ actor: req.user!.id, actorEmail: req.user!.email, action: 'expense.void', targetModel:'Expense', targetId: req.params.id });
    res.json({ item });
  } catch(e) { next(e); }
});

export default router;
