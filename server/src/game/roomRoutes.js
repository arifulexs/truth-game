import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import * as users from '../db/users.js';
import * as roomManager from '../game/roomManager.js';
import { listCategories } from './questionBank.js';

const router = Router();

router.get('/questions/categories', (_req, res) => {
  res.json({ categories: listCategories() });
});

router.post('/rooms', requireAuth, (req, res) => {
  const { categories } = req.body || {};
  const user = users.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });

  try {
    const room = roomManager.createRoom({
      hostId: user.id,
      hostName: user.displayName,
      categories: Array.isArray(categories) ? categories : []
    });
    res.status(201).json({
      roomCode: room.roomCode,
      status: room.status,
      selectedCategories: room.selectedCategories
    });
  } catch (err) {
    const status = err.code === 'ALREADY_IN_ROOM' ? 409 : 400;
    res.status(status).json({ error: err.code || 'ROOM_ERROR', message: err.message });
  }
});

router.post('/rooms/:code/join', requireAuth, (req, res) => {
  const user = users.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });

  try {
    const room = roomManager.joinRoom(req.params.code, user.id, user.displayName);
    res.json({ roomCode: room.roomCode, status: room.status });
  } catch (err) {
    const statusByCode = {
      NOT_FOUND: 404,
      EXPIRED: 410,
      FINISHED: 410,
      OWN_ROOM: 400,
      FULL: 409
    };
    res.status(statusByCode[err.code] || 400).json({ error: err.code || 'ROOM_ERROR', message: err.message });
  }
});

export default router;
