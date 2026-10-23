import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '../models/User.js';
const secret = () => {
  const value = process.env.JWT_ACCESS_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
  return value;
};
export function signAccessToken(user: { _id: unknown; role: Role; email: string }) {
  return jwt.sign({ role: user.role, email: user.email }, secret(), { subject: String(user._id), expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as jwt.SignOptions['expiresIn'] });
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (!payload.sub || !payload.role || !payload.email) return res.status(401).json({ message: 'Invalid token' });
    req.user = { id: String(payload.sub), role: payload.role as Role, email: String(payload.email) };
    next();
  } catch { return res.status(401).json({ message: 'Invalid or expired token' }); }
}
export const allowRoles = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) =>
  req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' });
