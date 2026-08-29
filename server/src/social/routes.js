import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import * as users from '../db/users.js';
import * as social from '../db/social.js';
import { emitToUser, isOnline } from '../game/presence.js';
import { maybeSendPush } from '../push/webpush.js';
import { getBadgesForUserSync } from '../game/badgeCache.js';

const router = Router();

router.get('/users/search', requireAuth, async (req, res) => {
  const q = req.query.q || '';
  if (q.trim().length < 2) return res.json({ results: [] });

  const matches = await users.searchByDisplayName(q, req.userId, 10);
  const results = await Promise.all(
    matches.map(async (u) => ({
      ...users.toPeerSummary(u),
      badges: getBadgesForUserSync(u.id),
      status: await social.relationshipStatus(req.userId, u.id)
    }))
  );
  res.json({ results });
});

router.get('/friends', requireAuth, async (req, res) => {
  const friendIds = await social.listFriendIds(req.userId);
  const friendUsers = await Promise.all(friendIds.map((id) => users.findById(id)));
  const friends = friendUsers
    .filter(Boolean)
    .map((u) => ({ ...users.toPeerSummary(u), badges: getBadgesForUserSync(u.id), online: isOnline(u.id) }));

  const incomingRequests = await social.listIncomingRequests(req.userId);
  const incoming = await Promise.all(
    incomingRequests.map(async (r) => ({
      id: r.id,
      from: users.toPeerSummary(await users.findById(r.fromUserId)),
      createdAt: r.createdAt
    }))
  );
  const outgoingRequests = await social.listOutgoingRequests(req.userId);
  const outgoing = await Promise.all(
    outgoingRequests.map(async (r) => ({
      id: r.id,
      to: users.toPeerSummary(await users.findById(r.toUserId)),
      createdAt: r.createdAt
    }))
  );

  res.json({ friends, incoming, outgoing });
});

router.post('/friends/requests', requireAuth, async (req, res) => {
  const { toUserId } = req.body || {};
  const target = toUserId ? await users.findById(toUserId) : null;
  if (!target) return res.status(404).json({ error: 'NOT_FOUND', message: "That person couldn't be found." });
  if (target.id === req.userId) {
    return res.status(400).json({ error: 'SELF', message: "You can't add yourself." });
  }

  const result = await social.sendRequest(req.userId, target.id);
  const requester = await users.findById(req.userId);

  if (result.status === 'friends') {
    emitToUser(target.id, 'friend-request-accepted', { by: users.toPeerSummary(requester) });
  } else {
    const payload = { request: { id: result.request.id, from: users.toPeerSummary(requester), createdAt: result.request.createdAt } };
    emitToUser(target.id, 'friend-request-received', payload);
    await maybeSendPush(target.id, {
      title: 'New friend request',
      body: `${requester.displayName} wants to add you as a friend.`,
      tag: 'friend-request'
    });
  }

  res.status(201).json({ status: result.status });
});

router.post('/friends/requests/:id/accept', requireAuth, async (req, res) => {
  const request = await social.respondToRequest(req.params.id, req.userId, true);
  if (!request) return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
  const accepter = await users.findById(req.userId);
  emitToUser(request.fromUserId, 'friend-request-accepted', { by: users.toPeerSummary(accepter) });
  await maybeSendPush(request.fromUserId, {
    title: 'Friend request accepted',
    body: `${accepter.displayName} accepted your friend request.`,
    tag: 'friend-accepted'
  });
  res.json({ status: 'accepted' });
});

router.post('/friends/requests/:id/decline', requireAuth, async (req, res) => {
  const request = await social.respondToRequest(req.params.id, req.userId, false);
  if (!request) return res.status(404).json({ error: 'NOT_FOUND', message: 'Request not found.' });
  res.json({ status: 'declined' });
});

router.delete('/friends/:userId', requireAuth, async (req, res) => {
  const removed = await social.removeFriend(req.userId, req.params.userId);
  if (!removed) return res.status(404).json({ error: 'NOT_FOUND', message: "You're not friends with that person." });
  emitToUser(req.params.userId, 'friend-removed', { by: req.userId });
  res.json({ ok: true });
});

export default router;
