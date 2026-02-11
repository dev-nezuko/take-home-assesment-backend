import { User } from '../types/index.js';
import { processingQueue } from './queue.dal.js';
import { cache } from './cache.dal.js';

const pendingRequests = new Map<number, Promise<User>>();

export interface UserLookup {
  user: User;
  cacheHit: boolean;
}

export async function getOrFetchUser(userId: number): Promise<UserLookup> {
  const cached = cache.get(`user:${userId}`);
  if (cached) {
    return { user: cached, cacheHit: true };
  }

  const pending = pendingRequests.get(userId);
  if (pending) {
    return { user: await pending, cacheHit: false };
  }

  const requestPromise = (async () => {
    try {
      const generation = cache.generation;
      const startTime = Date.now();
      const user = await processingQueue.enqueue(userId);

      if (cache.generation === generation) {
        cache.set(`user:${userId}`, user, Date.now() - startTime);
      }

      return user;
    } finally {
      pendingRequests.delete(userId);
    }
  })();

  pendingRequests.set(userId, requestPromise);

  return { user: await requestPromise, cacheHit: false };
}
