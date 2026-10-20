import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
export const validate = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) return res.status(400).json({ message: 'Validation failed', errors: result.error.flatten() });
  req.body = result.data.body ?? req.body;
  next();
};
