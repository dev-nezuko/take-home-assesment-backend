import { app } from './app.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid PORT');
// Loopback by default; the container image sets HOST=0.0.0.0 so the published port is reachable.
const host = process.env.HOST || '127.0.0.1';

const server = app.listen(port, host, () =>
  console.log(`User cache demo: http://${host}:${port}`)
);

// As PID 1 in a container Node gets no default SIGTERM handling, so `docker stop` would wait 10 s.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
}
