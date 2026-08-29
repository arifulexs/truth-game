import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { getVapidPublicKey, isPushConfigured } from './webpush.js';
import { saveSubscription, removeSubscriptionForUser } from '../db/pushSubscriptions.js';

const router = Router();

router.get('/push/vapid-public-key', (_req, res) => {
  res.json({ enabled: isPushConfigured(), publicKey: getVapidPublicKey() });
});

router.post('/push/subscribe', requireAuth, async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: 'PUSH_NOT_CONFIGURED', message: 'Push notifications are not set up on this server.' });
  }
  try {
    await saveSubscription(req.userId, req.body?.subscription);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'INVALID_SUBSCRIPTION', message: err.message });
  }
});

router.post('/push/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Missing endpoint.' });
  await removeSubscriptionForUser(req.userId, endpoint);
  res.json({ ok: true });
});

export default router;
