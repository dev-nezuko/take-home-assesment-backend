import { User } from '../types/index.js';
import { processingQueue } from './queue.dal.js';
import { cache } from './cache.dal.js';

const pendingRequests = new Map<number, Promise<User>>();

export async function getOrFetchUser(userId: number): Promise<User> {
  const cached = cache.get(`user:${userId}`);
  if (cached) {
    return cached;
  }

  const pending = pendingRequests.get(userId);
  if (pending) {
    return pending;
  }

  const requestPromise = (async () => {
    try {
      const startTime = Date.now();
      const user = await processingQueue.enqueue(userId);
      const responseTime = Date.now() - startTime;

      cache.set(`user:${userId}`, user, responseTime);

      return user;
    } finally {
      pendingRequests.delete(userId);
    }
  })();

  pendingRequests.set(userId, requestPromise);

  return requestPromise;
}
