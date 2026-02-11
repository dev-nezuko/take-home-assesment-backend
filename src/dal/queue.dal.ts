import { QueueItem, User } from '../types/index.js';
import { mockUsers } from '../data/mockUsers.js';

const DB_DELAY_MS = 200;

class ProcessingQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        await new Promise((resolve) => setTimeout(resolve, DB_DELAY_MS));

        const user = mockUsers[item.userId];
        if (user) {
          item.resolve(user);
        } else {
          item.reject(new Error(`User with ID ${item.userId} not found`));
        }
      } catch (error) {
        item.reject(
          error instanceof Error ? error : new Error('Unknown error occurred')
        );
      }
    }

    this.processing = false;
  }

  async enqueue(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        userId,
        resolve,
        reject,
      });

      this.processQueue().catch((error) => {
        console.error('Queue processing error:', error);
      });
    });
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const processingQueue = new ProcessingQueue();
