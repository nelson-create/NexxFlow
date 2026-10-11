import { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

/**
 * Small in-memory fixed-window limiter. Good enough for a single server
 * instance; swap for a shared store if the API is scaled horizontally.
 */
export const rateLimit = ({ windowMs, max, key }: { windowMs: number; max: number; key: (req: Request) => string }) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const id = key(req);
    const bucket = buckets.get(id);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      }
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    next();
  };
};
