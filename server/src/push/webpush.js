import webpush from 'web-push';
import { isOnline } from '../game/presence.js';
import { getSubscriptionsForUser, removeSubscriptionByEndpoint } from '../db/pushSubscriptions.js';

let configured = false;

export function initPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.warn('[warn] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT not set — push notifications are disabled.');
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export function isPushConfigured() {
  return configured;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Sends a real push notification to a user's devices, but only if they're
 * not currently connected — if they are, the live socket event they already
 * got covers it, and a push on top would just be a redundant buzz.
 */
export async function maybeSendPush(userId, { title, body, tag, data }) {
  if (!configured) return;
  if (isOnline(userId)) return;

  const subscriptions = await getSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({ title, body, tag: tag || 'truth-game', data: data || {} });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        // 404/410 means the browser has invalidated this subscription (uninstalled,
        // permissions revoked, etc.) — clean it up so we stop trying.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await removeSubscriptionByEndpoint(sub.endpoint);
        } else {
          console.error('[push] send failed:', err.statusCode, err.message);
        }
      }
    })
  );
}
