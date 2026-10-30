import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketIO } from './sockets/seatSocket.js';
import { startHoldExpirationCron, stopHoldExpirationCron } from './jobs/expireHolds.js';

const server = http.createServer(app);

// Initialize Socket.io
export const io = initSocketIO(server, env.CLIENT_URL);

async function startServer() {
  await connectDB();
  startHoldExpirationCron();

  server.listen(env.PORT, () => {
    console.log(`\x1b[32m[SERVER RUNNING]\x1b[0m Listening on port \x1b[36m${env.PORT}\x1b[0m`);
    console.log(`\x1b[34m[HEALTH CHECK]\x1b[0m Available at http://localhost:${env.PORT}/api/health`);
  });
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n\x1b[33m[SHUTDOWN]\x1b[0m Gracefully shutting down IMovies server...');
  stopHoldExpirationCron();
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.once('SIGUSR2', async () => {
  stopHoldExpirationCron();
  server.close(async () => {
    await disconnectDB();
    process.kill(process.pid, 'SIGUSR2');
  });
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server };
