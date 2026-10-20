import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth, signAccessToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router = Router();
router.post('/login', validate(z.object({ body: z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128) }) })), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase(), active: true }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: signAccessToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});
router.get('/me', requireAuth, async (req, res, next) => {
  try { const user = await User.findById(req.user!.id).select('name email phone role active'); if (!user) return res.status(404).json({ message: 'User not found' }); res.json({ user }); }
  catch (e) { next(e); }
});
export default router;
