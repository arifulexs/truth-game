import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as users from '../db/users.js';
import { requireAuth, signToken } from './middleware.js';
import * as roomManager from '../game/roomManager.js';

const router = Router();

function activeRoomSummary(userId) {
  const room = roomManager.getActiveRoomForUser(userId);
  if (!room) return null;
  return { roomCode: room.roomCode, status: room.status };
}

router.post('/signup', async (req, res) => {
  const { displayName, email, password } = req.body || {};

  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Enter a display name.' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Enter a valid email.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Password must be at least 6 characters.' });
  }
  if (users.findByEmail(email)) {
    return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = users.createUser({ displayName, email, passwordHash });
  const token = signToken(user);
  res.status(201).json({ token, user: users.toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? users.findByEmail(email) : null;

  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' });
  }
  const matches = await bcrypt.compare(password || '', user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: users.toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = users.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });
  res.json({ user: users.toPublicUser(user), activeRoom: activeRoomSummary(user.id) });
});

router.patch('/me/display-name', requireAuth, (req, res) => {
  const { displayName } = req.body || {};
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Enter a display name.' });
  }
  const user = users.updateDisplayName(req.userId, displayName);
  res.json({ user: users.toPublicUser(user) });
});

export default router;
