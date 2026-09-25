// Must be the first import: loads & validates server/.env from an absolute
// path (see src/config/loadEnv.js) before any other import runs.
import './src/config/loadEnv.js';
import http from 'node:http';
import { Server } from 'socket.io';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { config } from './src/config/index.js';
import registerSocketHandlers from './src/sockets/index.js';

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true },
  });

  registerSocketHandlers(io);
  app.set('io', io);

  httpServer.listen(config.port, () => {
    console.log(`API + Socket.IO listening on http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    io.close(() => httpServer.close(() => process.exit(0)));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
