import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as users from '../db/users.js';
import * as social from '../db/social.js';
import { requireAuth, signToken } from './middleware.js';
import * as roomManager from '../game/roomManager.js';
import { getBadgesForUserSync } from '../game/badgeCache.js';

const router = Router();

function activeRoomSummary(userId) {
  const room = roomManager.getActiveRoomForUser(userId);
  if (!room) return null;
  return { roomCode: room.roomCode, status: room.status };
}

function pendingInviteSummary(userId) {
  const invite = roomManager.getInviteForUser(userId);
  if (!invite) return null;
  return { roomCode: invite.roomCode, fromName: invite.fromName };
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
  if (await users.findByEmail(email)) {
    return res.status(409).json({ error: 'EMAIL_TAKEN', message: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const isAdmin = adminEmail.length > 0 && email.trim().toLowerCase() === adminEmail;

  const user = await users.createUser({ displayName, email, passwordHash, isAdmin });
  const token = signToken(user);
  res.status(201).json({ token, user: users.toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? await users.findByEmail(email) : null;

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

router.get('/me', requireAuth, async (req, res) => {
  const user = await users.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in again.' });
  res.json({
    user: { ...users.toPublicUser(user), badges: getBadgesForUserSync(user.id) },
    activeRoom: activeRoomSummary(user.id),
    pendingInvite: pendingInviteSummary(user.id),
    pendingRequestCount: (await social.listIncomingRequests(user.id)).length
  });
});

router.patch('/me/display-name', requireAuth, async (req, res) => {
  const { displayName } = req.body || {};
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Enter a display name.' });
  }
  const user = await users.updateDisplayName(req.userId, displayName);
  res.json({ user: users.toPublicUser(user) });
});

export default router;
