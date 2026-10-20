import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router = Router();
router.use(requireAuth);
const createSchema = z.object({ body: z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), phone: z.string().max(25).optional(), password: z.string().min(10).max(128), role: z.enum(['member','trainer','staff']).default('member') }) });
router.get('/', allowRoles('admin','staff','trainer'), async (req, res, next) => {
 try {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter: any = { active: true };
  if (req.user!.role === 'trainer') filter.assignedTrainer = req.user!.id;
  if (req.query.search) filter.$or = [{ name: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
  const [items,total] = await Promise.all([User.find(filter).select('name email phone role active createdAt assignedTrainer').sort({createdAt:-1}).skip((page-1)*limit).limit(limit), User.countDocuments(filter)]);
  res.json({ items, page, limit, total });
 } catch(e) { next(e); }
});
router.post('/', allowRoles('admin','staff'), validate(createSchema), async (req, res, next) => {
 try {
  const { name,email,phone,password,role } = req.body;
  if (role === 'staff' && req.user!.role !== 'admin') return res.status(403).json({ message: 'Only admins can create staff accounts' });
  const user = await User.create({ name,email:email.toLowerCase(),phone,role,passwordHash:await bcrypt.hash(password,12) });
  res.status(201).json({ item: { _id:user.id,id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role } });
 } catch(e) { next(e); }
});
router.get('/:id', allowRoles('admin','staff','trainer'), async (req,res,next) => {
 try { const item = await User.findById(req.params.id).select('name email phone role active createdAt assignedTrainer'); if(!item) return res.status(404).json({message:'Member not found'}); if(req.user!.role==='trainer' && String(item.assignedTrainer)!==req.user!.id) return res.status(403).json({message:'Not assigned to this trainer'}); res.json({item}); } catch(e){next(e);}
});
router.patch('/:id', allowRoles('admin','staff'), async (req,res,next) => {
 try { const data = z.object({name:z.string().trim().min(2).max(100).optional(),phone:z.string().max(25).optional(),active:z.boolean().optional()}).parse(req.body); const item = await User.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true}).select('name email phone role active'); if(!item) return res.status(404).json({message:'Member not found'}); res.json({item}); } catch(e){next(e);}
});
router.delete('/:id', allowRoles('admin'), async (req,res,next) => {
 try { const item = await User.findByIdAndUpdate(req.params.id,{active:false},{new:true}).select('id'); if(!item) return res.status(404).json({message:'Member not found'}); res.status(204).end(); } catch(e){next(e);}
});
export default router;
