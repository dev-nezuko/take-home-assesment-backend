import { app } from './app.js';
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
app.listen(port, '127.0.0.1', () => console.log(`User cache demo: http://127.0.0.1:${port}`));
