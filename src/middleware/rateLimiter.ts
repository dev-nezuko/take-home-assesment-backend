import { Request, Response, NextFunction } from 'express';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  burstTokens: number;
  lastBurstRefill: number;
}

const MAX_REQUESTS_PER_MINUTE = 10;
const BURST_CAPACITY = 5;
const BURST_WINDOW_MS = 10000;
const REFILL_RATE = MAX_REQUESTS_PER_MINUTE / 60;

const buckets = new Map<string, TokenBucket>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > 300000) {
      buckets.delete(ip);
    }
  }
}, 60000);

function getBucket(ip: string): TokenBucket {
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = {
      tokens: MAX_REQUESTS_PER_MINUTE,
      lastRefill: Date.now(),
      burstTokens: BURST_CAPACITY,
      lastBurstRefill: Date.now(),
    };
    buckets.set(ip, bucket);
  }
  return bucket;
}

function refillTokens(bucket: TokenBucket): void {
  const now = Date.now();
  const timePassed = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = timePassed * REFILL_RATE;

  bucket.tokens = Math.min(
    MAX_REQUESTS_PER_MINUTE,
    bucket.tokens + tokensToAdd
  );
  bucket.lastRefill = now;

  const burstTimePassed = (now - bucket.lastBurstRefill) / 1000;
  if (burstTimePassed >= BURST_WINDOW_MS / 1000) {
    bucket.burstTokens = BURST_CAPACITY;
    bucket.lastBurstRefill = now;
  }
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.socket.remoteAddress as string) ||
    'unknown';

  const bucket = getBucket(ip);
  refillTokens(bucket);

  if (bucket.burstTokens > 0) {
    bucket.burstTokens--;
    next();
    return;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens--;
    next();
    return;
  }

  res.status(429).json({
    error: 'Rate limit exceeded',
    message:
      'Maximum of 10 requests per minute allowed, with a burst of 5 requests in 10 seconds. Please try again later.',
    retryAfter: Math.ceil((60 - bucket.tokens / REFILL_RATE) / REFILL_RATE),
  });
}
