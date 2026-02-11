import { Request, Response } from 'express';
import { getOrFetchUser } from '../dal/requestDeduplicator.dal.js';
import { mockUsers } from '../data/mockUsers.js';
import { cache } from '../dal/cache.dal.js';
import { User } from '../types/index.js';

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid number',
      });
      return;
    }

    const user = await getOrFetchUser(userId);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} does not exist`,
      });
      return;
    }

    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'User not found',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching the user',
    });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Name and email are required',
      });
      return;
    }

    const maxId = Math.max(...Object.keys(mockUsers).map(Number), 0);
    const newId = maxId + 1;

    const newUser: User = {
      id: newId,
      name: String(name),
      email: String(email),
    };

    mockUsers[newId] = newUser;
    cache.set(`user:${newId}`, newUser);

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while creating the user',
    });
  }
}
