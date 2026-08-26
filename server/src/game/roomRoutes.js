import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import * as users from '../db/users.js';
import * as social from '../db/social.js';
import * as roomManager from '../game/roomManager.js';
import { emitToUser } from './presence.js';
import { listCategories } from './questionBank.js';

const router = Router();

router.get('/questions/categories', (_req, res) => {
  res.json({ categories: listCategories() });
});

router.post('/rooms', requireAuth, (req, res) => {
  const { categories, questionCount } = req.body || {};
  const user = users.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });

  try {
    const room = roomManager.createRoom({
      hostId: user.id,
      hostName: user.displayName,
      categories: Array.isArray(categories) ? categories : [],
      questionCount: Number(questionCount)
    });
    res.status(201).json({
      roomCode: room.roomCode,
      status: room.status,
      selectedCategories: room.selectedCategories,
      totalQuestions: room.questionSequence.length
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

router.post('/rooms/:code/invite', requireAuth, (req, res) => {
  const { toUserId } = req.body || {};
  const user = users.findById(req.userId);
  const target = toUserId ? users.findById(toUserId) : null;
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });
  if (!target) return res.status(404).json({ error: 'NOT_FOUND', message: "That person couldn't be found." });
  if (!social.areFriends(user.id, target.id)) {
    return res.status(403).json({ error: 'NOT_FRIENDS', message: 'You can only directly invite a friend.' });
  }

  const room = roomManager.getRoomByCode(req.params.code);
  if (!room) return res.status(404).json({ error: 'NOT_FOUND', message: 'Room not found.' });

  try {
    const invite = roomManager.createInvite(room, user.id, user.displayName, target.id);
    emitToUser(target.id, 'game-invite', { roomCode: invite.roomCode, fromName: invite.fromName });
    res.status(201).json({ ok: true });
  } catch (err) {
    const statusByCode = { INVALID_STATE: 409, FORBIDDEN: 403, OWN_ROOM: 400 };
    res.status(statusByCode[err.code] || 400).json({ error: err.code || 'ROOM_ERROR', message: err.message });
  }
});

export default router;
