import { NextFunction, Request, Response } from 'express';
import { getOrFetchUser } from '../dal/requestDeduplicator.dal.js';
import { addUser } from '../data/mockUsers.js';
import { cache } from '../dal/cache.dal.js';
import { CapacityError, UserNotFoundError } from '../errors.js';

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
    if (error instanceof CapacityError) {
      sendUnavailable(res, error);
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

  let newUser;
  try {
    newUser = addUser(name.trim(), email);
  } catch (error) {
    if (error instanceof CapacityError) {
      sendUnavailable(res, error);
      return;
    }
    throw error;
  }
  cache.set(`user:${newUser.id}`, newUser);

  res.status(201).json(newUser);
}

function sendUnavailable(res: Response, error: CapacityError): void {
  res.setHeader('Retry-After', String(error.retryAfterSeconds));
  res.status(503).json({ error: 'Service busy', message: error.message, retryAfter: error.retryAfterSeconds });
}
