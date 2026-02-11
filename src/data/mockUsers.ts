import { User } from '../types/index.js';
import { CapacityError } from '../errors.js';

export const MAX_USERS = 10_000;

export const mockUsers: Record<number, User> = {
  1: { id: 1, name: 'John Doe', email: 'john@example.com' },
  2: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  3: { id: 3, name: 'Alice Johnson', email: 'alice@example.com' },
};

let userCount = Object.keys(mockUsers).length;
let nextId = Math.max(...Object.keys(mockUsers).map(Number)) + 1;

// Created users live only in process memory, so the store is capped to keep memory bounded.
export function addUser(name: string, email: string): User {
  if (userCount >= MAX_USERS) {
    throw new CapacityError('The in-memory user store is full', 60);
  }
  const user: User = { id: nextId++, name, email };
  mockUsers[user.id] = user;
  userCount++;
  return user;
}
