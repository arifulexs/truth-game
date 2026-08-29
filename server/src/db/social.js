import crypto from 'node:crypto';
import { db } from './client.js';

function rowToRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: Number(row.created_at),
    respondedAt: row.responded_at ? Number(row.responded_at) : null
  };
}

async function findBetween(userA, userB) {
  const { rows } = await db.execute({
    sql: `SELECT * FROM friend_requests
          WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
          ORDER BY created_at DESC LIMIT 1`,
    args: [userA, userB, userB, userA]
  });
  return rowToRequest(rows[0]);
}

/** 'friends' | 'pending_outgoing' | 'pending_incoming' | 'none' — from viewerId's perspective. */
export async function relationshipStatus(viewerId, otherId) {
  const existing = await findBetween(viewerId, otherId);
  if (!existing) return 'none';
  if (existing.status === 'accepted') return 'friends';
  if (existing.status === 'declined') return 'none';
  return existing.fromUserId === viewerId ? 'pending_outgoing' : 'pending_incoming';
}

export async function areFriends(userA, userB) {
  return (await relationshipStatus(userA, userB)) === 'friends';
}

/**
 * Sends a friend request. If the other person already sent one (crossed
 * requests), this accepts it immediately instead of creating a duplicate.
 */
export async function sendRequest(fromUserId, toUserId) {
  const existing = await findBetween(fromUserId, toUserId);

  if (existing?.status === 'accepted') return { status: 'friends', request: existing };

  if (existing?.status === 'pending' && existing.fromUserId === toUserId) {
    const respondedAt = Date.now();
    await db.execute({
      sql: 'UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?',
      args: ['accepted', respondedAt, existing.id]
    });
    return { status: 'friends', request: { ...existing, status: 'accepted', respondedAt } };
  }

  if (existing?.status === 'pending') return { status: 'pending_outgoing', request: existing };

  // A previously declined request between the same two people is replaced.
  if (existing?.status === 'declined') {
    await db.execute({ sql: 'DELETE FROM friend_requests WHERE id = ?', args: [existing.id] });
  }

  const request = {
    id: crypto.randomUUID(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: Date.now(),
    respondedAt: null
  };
  await db.execute({
    sql: 'INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [request.id, request.fromUserId, request.toUserId, request.status, request.createdAt, null]
  });
  return { status: 'pending_outgoing', request };
}

export async function respondToRequest(requestId, userId, accept) {
  const { rows } = await db.execute({ sql: 'SELECT * FROM friend_requests WHERE id = ?', args: [requestId] });
  const request = rowToRequest(rows[0]);
  if (!request) return null;
  if (request.toUserId !== userId) return null;
  if (request.status !== 'pending') return request;

  const status = accept ? 'accepted' : 'declined';
  const respondedAt = Date.now();
  await db.execute({
    sql: 'UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?',
    args: [status, respondedAt, requestId]
  });
  return { ...request, status, respondedAt };
}

export async function removeFriend(userA, userB) {
  const existing = await findBetween(userA, userB);
  if (!existing || existing.status !== 'accepted') return false;
  await db.execute({ sql: 'DELETE FROM friend_requests WHERE id = ?', args: [existing.id] });
  return true;
}

export async function listFriendIds(userId) {
  const { rows } = await db.execute({
    sql: `SELECT from_user_id, to_user_id FROM friend_requests
          WHERE status = 'accepted' AND (from_user_id = ? OR to_user_id = ?)`,
    args: [userId, userId]
  });
  return rows.map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id));
}

export async function listIncomingRequests(userId) {
  const { rows } = await db.execute({
    sql: "SELECT * FROM friend_requests WHERE status = 'pending' AND to_user_id = ?",
    args: [userId]
  });
  return rows.map(rowToRequest);
}

export async function listOutgoingRequests(userId) {
  const { rows } = await db.execute({
    sql: "SELECT * FROM friend_requests WHERE status = 'pending' AND from_user_id = ?",
    args: [userId]
  });
  return rows.map(rowToRequest);
}
