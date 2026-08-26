import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'social.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ requests: [] }, null, 2));
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { requests: [] };
  }
}

function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function findBetween(requests, userA, userB) {
  return requests.find(
    (r) => (r.fromUserId === userA && r.toUserId === userB) || (r.fromUserId === userB && r.toUserId === userA)
  );
}

/** 'friends' | 'pending_outgoing' | 'pending_incoming' | 'none' — from viewerId's perspective. */
export function relationshipStatus(viewerId, otherId) {
  const { requests } = readAll();
  const existing = findBetween(requests, viewerId, otherId);
  if (!existing) return 'none';
  if (existing.status === 'accepted') return 'friends';
  if (existing.status === 'declined') return 'none';
  return existing.fromUserId === viewerId ? 'pending_outgoing' : 'pending_incoming';
}

export function areFriends(userA, userB) {
  return relationshipStatus(userA, userB) === 'friends';
}

/**
 * Sends a friend request. If the other person already sent one (crossed
 * requests), this accepts it immediately instead of creating a duplicate.
 */
export function sendRequest(fromUserId, toUserId) {
  const data = readAll();
  const existing = findBetween(data.requests, fromUserId, toUserId);

  if (existing?.status === 'accepted') return { status: 'friends', request: existing };

  if (existing?.status === 'pending' && existing.fromUserId === toUserId) {
    existing.status = 'accepted';
    existing.respondedAt = Date.now();
    writeAll(data);
    return { status: 'friends', request: existing };
  }

  if (existing?.status === 'pending') return { status: 'pending_outgoing', request: existing };

  const request = {
    id: crypto.randomUUID(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: Date.now(),
    respondedAt: null
  };
  // A previously declined request between the same two people is replaced
  // rather than piling up — only one relationship record per pair matters.
  data.requests = data.requests.filter((r) => r !== existing);
  data.requests.push(request);
  writeAll(data);
  return { status: 'pending_outgoing', request };
}

export function respondToRequest(requestId, userId, accept) {
  const data = readAll();
  const request = data.requests.find((r) => r.id === requestId);
  if (!request) return null;
  if (request.toUserId !== userId) return null;
  if (request.status !== 'pending') return request;
  request.status = accept ? 'accepted' : 'declined';
  request.respondedAt = Date.now();
  writeAll(data);
  return request;
}

export function listFriendIds(userId) {
  const { requests } = readAll();
  return requests
    .filter((r) => r.status === 'accepted' && (r.fromUserId === userId || r.toUserId === userId))
    .map((r) => (r.fromUserId === userId ? r.toUserId : r.fromUserId));
}

export function listIncomingRequests(userId) {
  const { requests } = readAll();
  return requests.filter((r) => r.status === 'pending' && r.toUserId === userId);
}

export function listOutgoingRequests(userId) {
  const { requests } = readAll();
  return requests.filter((r) => r.status === 'pending' && r.fromUserId === userId);
}
