import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import authRoutes from './auth/routes.js';
import roomRoutes from './game/roomRoutes.js';
import { verifyToken } from './auth/middleware.js';
import * as users from './db/users.js';
import * as roomManager from './game/roomManager.js';
import { registerSocketHandlers } from './game/socketHandlers.js';

if (!process.env.JWT_SECRET) {
  // Fine for local dev so the app "just works" out of the box; the README
  // calls out that this must be set explicitly before deploying anywhere.
  process.env.JWT_SECRET = 'dev-only-insecure-secret-change-me';
  console.warn('[warn] JWT_SECRET not set — using an insecure development default. Set it in .env before deploying.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', roomRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// In production, this same server also serves the built client — one
// deployable service instead of two.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true }
});

// Every socket connection must present a valid JWT — this is the same
// auth used for REST calls, just passed via the handshake instead of a header.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('UNAUTHENTICATED'));
  try {
    const payload = verifyToken(token);
    const user = users.findById(payload.sub);
    if (!user) return next(new Error('UNAUTHENTICATED'));
    socket.data.userId = user.id;
    socket.data.displayName = user.displayName;
    next();
  } catch {
    next(new Error('UNAUTHENTICATED'));
  }
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// Periodic cleanup of abandoned/expired rooms — nothing about a game or
// its chat is meant to outlive the session.
const SWEEP_INTERVAL_MS = 60 * 1000;
setInterval(() => {
  const removed = roomManager.sweepExpiredRooms();
  for (const room of removed) {
    io.to(`room:${room.roomId}`).emit('session-ended', { reason: 'expired' });
    io.socketsLeave(`room:${room.roomId}`);
  }
}, SWEEP_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`Truth game server listening on http://localhost:${PORT}`);
});
