import { CacheEntry, CacheStats, User } from '../types/index.js';

interface CacheNode {
  key: string;
  value: CacheEntry<User>;
  prev: CacheNode | null;
  next: CacheNode | null;
}

export class LRUCache {
  private capacity: number;
  private cache: Map<string, CacheNode>;
  private head: CacheNode | null;
  private tail: CacheNode | null;
  private ttl: number;
  private hits: number;
  private misses: number;
  private responseTimes: number[];
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(capacity: number = 1000, ttl: number = 60000) {
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(ttl) || ttl <= 0) throw new Error("Cache capacity and TTL must be positive");
    this.capacity = capacity;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
    this.responseTimes = [];

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, 10000);
    this.cleanupInterval.unref();
  }

  private createNode(key: string, value: CacheEntry<User>): CacheNode {
    return {
      key,
      value,
      prev: null,
      next: null,
    };
  }

  private addToHead(node: CacheNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    } else {
      this.tail = node;
    }

    this.head = node;
  }

  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private isExpired(entry: CacheEntry<User>): boolean {
    return Date.now() - entry.timestamp >= entry.ttl;
  }

  get(key: string): User | null {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      return null;
    }

    if (this.isExpired(node.value)) {
      this.removeNode(node);
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.moveToHead(node);
    this.hits++;
    return node.value.value;
  }

  set(key: string, value: User, responseTime?: number): void {
    const existingNode = this.cache.get(key);
    if (existingNode) {
      existingNode.value = {
        value,
        timestamp: Date.now(),
        ttl: this.ttl,
      };
      this.moveToHead(existingNode);
      if (responseTime !== undefined) {
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 100) {
          this.responseTimes.shift();
        }
      }
      return;
    }

    if (this.cache.size >= this.capacity) {
      if (this.tail) {
        this.cache.delete(this.tail.key);
        this.removeNode(this.tail);
      }
    }

    const entry: CacheEntry<User> = {
      value,
      timestamp: Date.now(),
      ttl: this.ttl,
    };
    const newNode = this.createNode(key, entry);
    this.addToHead(newNode);
    this.cache.set(key, newNode);

    if (responseTime !== undefined) {
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }
    }
  }

  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
    this.responseTimes = [];
  }

  private cleanupStaleEntries(): void {
    const keysToDelete: string[] = [];

    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node.value)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) /
          this.responseTimes.length
        : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const cache = new LRUCache();
