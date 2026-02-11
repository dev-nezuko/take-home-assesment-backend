export class UserNotFoundError extends Error {
  constructor(readonly userId: number) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}
