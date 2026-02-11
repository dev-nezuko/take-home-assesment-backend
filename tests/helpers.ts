import type { Express } from 'express';
import type { AddressInfo } from 'node:net';

export async function withServer(app: Express, run: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export const allowAll = (_req: unknown, _res: unknown, next: () => void) => next();
