import { QueueItem, User } from '../types/index.js';
import { mockUsers } from '../data/mockUsers.js';
import { CapacityError, UserNotFoundError } from '../errors.js';

export class ProcessingQueue {
  private queue: QueueItem[] = [];
  private processing = false;

  constructor(
    private readonly maxLength = 100,
    private readonly delayMs = 200
  ) {}

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));

      const user = mockUsers[item.userId];
      if (user) {
        item.resolve(user);
      } else {
        item.reject(new UserNotFoundError(item.userId));
      }
    }

    this.processing = false;
  }

  enqueue(userId: number): Promise<User> {
    // Each waiting lookup holds a promise and a slot in a serial queue; refuse rather than grow forever.
    if (this.queue.length >= this.maxLength) {
      const waitSeconds = Math.ceil((this.queue.length * this.delayMs) / 1000);
      return Promise.reject(new CapacityError('Lookup queue is full', waitSeconds));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ userId, resolve, reject });
      void this.processQueue();
    });
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const processingQueue = new ProcessingQueue();
