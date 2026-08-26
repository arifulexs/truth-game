import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import * as users from '../db/users.js';
import * as social from '../db/social.js';
import { emitToUser } from '../game/presence.js';

const router = Router();

router.get('/users/search', requireAuth, (req, res) => {
  const q = req.query.q || '';
  if (q.trim().length < 2) return res.json({ results: [] });

  const matches = users.searchByDisplayName(q, req.userId, 10);
  const results = matches.map((u) => ({
    ...users.toPeerSummary(u),
    status: social.relationshipStatus(req.userId, u.id)
  }));
  res.json({ results });
});

router.get('/friends', requireAuth, (req, res) => {
  const friendIds = social.listFriendIds(req.userId);
  const friends = friendIds.map((id) => users.toPeerSummary(users.findById(id))).filter(Boolean);

  const incoming = social.listIncomingRequests(req.userId).map((r) => ({
    id: r.id,
    from: users.toPeerSummary(users.findById(r.fromUserId)),
    createdAt: r.createdAt
  }));
  const outgoing = social.listOutgoingRequests(req.userId).map((r) => ({
    id: r.id,
    to: users.toPeerSummary(users.findById(r.toUserId)),
    createdAt: r.createdAt
  }));

  res.json({ friends, incoming, outgoing });
});

router.post('/friends/requests', requireAuth, (req, res) => {
  const { toUserId } = req.body || {};
  const target = toUserId ? users.findById(toUserId) : null;
  if (!target) return res.status(404).json({ error: 'NOT_FOUND', message: "That person couldn't be found." });
  if (target.id === req.userId) {
    return res.status(400).json({ error: 'SELF', message: "You can't add yourself." });
  }

  const result = social.sendRequest(req.userId, target.id);
  const requester = users.findById(req.userId);

  if (result.status === 'friends') {
    emitToUser(target.id, 'friend-request-accepted', { by: users.toPeerSummary(requester) });
  } else {
    emitToUser(target.id, 'friend-request-received', {
      request: { id: result.request.id, from: users.toPeerSummary(requester), createdAt: result.request.createdAt }
    });
  }

  res.status(201).json({ status: result.status });
});

router.post('/friends/requests/:id/accept', requireAuth, (req, res) => {
  const request = social.respondToRequest(req.params.id, req.userId, true);
  if (!request) return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
  emitToUser(request.fromUserId, 'friend-request-accepted', { by: users.toPeerSummary(users.findById(req.userId)) });
  res.json({ status: 'accepted' });
});

router.post('/friends/requests/:id/decline', requireAuth, (req, res) => {
  const request = social.respondToRequest(req.params.id, req.userId, false);
  if (!request) return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
  res.json({ status: 'declined' });
});

export default router;
