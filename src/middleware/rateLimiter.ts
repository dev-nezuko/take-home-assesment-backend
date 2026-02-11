import { Request, Response, NextFunction } from 'express';

export function createRateLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, { tokens: number; updated: number; burst: number; burstStart: number }>();
  let lastPrune = 0;
  return (req: Request, res: Response, next: NextFunction): void => {
    const time = now();
    if (time - lastPrune >= 60000 || buckets.size >= 10000) {
      for (const [ip, bucket] of buckets) if (time - bucket.updated >= 300000) buckets.delete(ip);
      lastPrune = time;
    }
    // Express decides trusted proxies; untrusted forwarding headers cannot select the bucket.
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(ip);
    if (!bucket && buckets.size >= 10000) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Rate limiter capacity reached', retryAfter: 60 });
      return;
    }
    if (!bucket) {
      bucket = { tokens: 10, updated: time, burst: 5, burstStart: time };
      buckets.set(ip, bucket);
    }
    bucket.tokens = Math.min(10, bucket.tokens + Math.max(0, time - bucket.updated) / 6000);
    bucket.updated = time;
    if (time - bucket.burstStart >= 10000) { bucket.burst = 5; bucket.burstStart = time; }
    if (bucket.tokens >= 1 && bucket.burst >= 1) {
      bucket.tokens--; bucket.burst--; next(); return;
    }
    const retryAfter = Math.max(1, Math.ceil(Math.max(bucket.tokens < 1 ? (1 - bucket.tokens) * 6000 : 0, bucket.burst < 1 ? 10000 - (time - bucket.burstStart) : 0) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
  };
}
export const rateLimiter = createRateLimiter();
