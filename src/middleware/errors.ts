import type { Request, Response, NextFunction } from 'express';
export function notFound(_req: Request, res: Response) { res.status(404).json({ message: 'Route not found' }); }
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.code === 11000) return res.status(409).json({ message: 'A record with this value already exists' });
  if (err?.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier' });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
