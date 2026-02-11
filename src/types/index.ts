export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  averageResponseTime: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstCapacity: number;
  burstWindowMs: number;
}

export interface QueueItem {
  userId: number;
  resolve: (value: User) => void;
  reject: (error: Error) => void;
}
