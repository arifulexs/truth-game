import crypto from 'node:crypto';
import { db } from './client.js';

export async function saveSubscription(userId, subscription) {
  const { endpoint, keys } = subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Invalid push subscription.');
  }
  await db.execute({
    sql: `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [crypto.randomUUID(), userId, endpoint, keys.p256dh, keys.auth, Date.now()]
  });
}

export async function removeSubscriptionByEndpoint(endpoint) {
  await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [endpoint] });
}

export async function removeSubscriptionForUser(userId, endpoint) {
  await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', args: [userId, endpoint] });
}

export async function getSubscriptionsForUser(userId) {
  const { rows } = await db.execute({ sql: 'SELECT * FROM push_subscriptions WHERE user_id = ?', args: [userId] });
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth }
  }));
}
