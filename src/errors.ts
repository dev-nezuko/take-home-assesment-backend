export class UserNotFoundError extends Error {
  constructor(readonly userId: number) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class CapacityError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
    this.name = 'CapacityError';
  }
}
