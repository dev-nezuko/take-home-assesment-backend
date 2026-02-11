import { Request, Response, NextFunction } from 'express';

const TOKEN_CAPACITY = 10;
const TOKEN_REFILL_MS = 6000;
const BURST_CAPACITY = 5;
const BURST_WINDOW_MS = 10000;
const MAX_TRACKED_CLIENTS = 10000;
// Advertised as RateLimit-Policy: 10 per 60 s sustained, 5 per 10 s burst.
const POLICY = `${TOKEN_CAPACITY};w=${(TOKEN_CAPACITY * TOKEN_REFILL_MS) / 1000}, ${BURST_CAPACITY};w=${BURST_WINDOW_MS / 1000}`;
// After this long without requests a bucket is full again and its burst window has lapsed,
// so it is indistinguishable from a new one and can be dropped.
const IDLE_RESET_MS = Math.max(TOKEN_CAPACITY * TOKEN_REFILL_MS, BURST_WINDOW_MS);

interface Bucket {
  tokens: number;
  updated: number;
  burst: number;
  burstStart: number;
}

export function createRateLimiter(now: () => number = Date.now) {
  // Map iteration follows insertion order; re-inserting on every request keeps it ordered
  // by last use, so pruning only walks the idle prefix.
  const buckets = new Map<string, Bucket>();

  function pruneIdle(time: number): void {
    for (const [key, bucket] of buckets) {
      if (time - bucket.updated < IDLE_RESET_MS) break;
      buckets.delete(key);
    }
  }

  const limiter = (req: Request, res: Response, next: NextFunction): void => {
    const time = now();
    pruneIdle(time);

    // req.ip honours the app's `trust proxy` setting, so X-Forwarded-For only counts behind a configured proxy.
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (bucket) {
      buckets.delete(key);
    } else if (buckets.size >= MAX_TRACKED_CLIENTS) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Rate limiter capacity reached', retryAfter: 60 });
      return;
    } else {
      bucket = { tokens: TOKEN_CAPACITY, updated: time, burst: BURST_CAPACITY, burstStart: time };
    }
    buckets.set(key, bucket);

    bucket.tokens = Math.min(
      TOKEN_CAPACITY,
      bucket.tokens + Math.max(0, time - bucket.updated) / TOKEN_REFILL_MS
    );
    bucket.updated = time;
    if (time - bucket.burstStart >= BURST_WINDOW_MS) {
      bucket.burst = BURST_CAPACITY;
      bucket.burstStart = time;
    }

    res.setHeader('RateLimit-Policy', POLICY);
    res.setHeader('RateLimit-Limit', String(BURST_CAPACITY));
    if (bucket.tokens >= 1 && bucket.burst >= 1) {
      bucket.tokens--;
      bucket.burst--;
      res.setHeader('RateLimit-Remaining', String(Math.floor(Math.min(bucket.tokens, bucket.burst))));
      next();
      return;
    }

    res.setHeader('RateLimit-Remaining', '0');

    const tokenWait = bucket.tokens < 1 ? (1 - bucket.tokens) * TOKEN_REFILL_MS : 0;
    const burstWait = bucket.burst < 1 ? BURST_WINDOW_MS - (time - bucket.burstStart) : 0;
    // Round to whole milliseconds first so float drift (4000.0000001 ms) doesn't add a second.
    const retryAfter = Math.max(1, Math.ceil(Math.round(Math.max(tokenWait, burstWait)) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
  };

  return Object.assign(limiter, { trackedClients: () => buckets.size });
}

export const rateLimiter = createRateLimiter();
