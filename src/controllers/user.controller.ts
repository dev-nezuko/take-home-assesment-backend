import { NextFunction, Request, Response } from 'express';
import { getOrFetchUser } from '../dal/requestDeduplicator.dal.js';
import { mockUsers } from '../data/mockUsers.js';
import { cache } from '../dal/cache.dal.js';
import { UserNotFoundError } from '../errors.js';
import { User } from '../types/index.js';

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawId = String(req.params.id);
  const userId = Number(rawId);

  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(userId) || userId <= 0) {
    res.status(400).json({
      error: 'Invalid user ID',
      message: 'User ID must be a positive whole number',
    });
    return;
  }

  try {
    res.json(await getOrFetchUser(userId));
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      res.status(404).json({ error: 'User not found', message: error.message });
      return;
    }
    next(error);
  }
}

export function createUser(req: Request, res: Response): void {
  // Express leaves req.body undefined when no body parser matched the content type.
  const { name, email } = (req.body ?? {}) as Record<string, unknown>;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 120 ||
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    res.status(400).json({
      error: 'Validation error',
      message: 'Name and a valid email are required',
    });
    return;
  }

  const newId = Math.max(...Object.keys(mockUsers).map(Number), 0) + 1;
  const newUser: User = { id: newId, name: name.trim(), email };

  mockUsers[newId] = newUser;
  cache.set(`user:${newId}`, newUser);

  res.status(201).json(newUser);
}
