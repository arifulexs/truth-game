import crypto from 'node:crypto';
import { db } from './client.js';

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    passwordHash: row.password_hash,
    isAdmin: Number(row.is_admin) === 1,
    createdAt: Number(row.created_at)
  };
}

export async function findByEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [normalized] });
  return rowToUser(rows[0]);
}

export async function findById(id) {
  const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return rowToUser(rows[0]);
}

/** Case-insensitive substring match on display name, excluding the searcher themselves. */
export async function searchByDisplayName(query, excludeUserId, limit = 10) {
  const q = (query || '').trim();
  if (!q) return [];
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE id != ? AND display_name LIKE ? COLLATE NOCASE LIMIT ?',
    args: [excludeUserId, `%${q}%`, limit]
  });
  return rows.map(rowToUser);
}

export async function createUser({ displayName, email, passwordHash, isAdmin = false }) {
  const user = {
    id: crypto.randomUUID(),
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    isAdmin,
    createdAt: Date.now()
  };
  await db.execute({
    sql: 'INSERT INTO users (id, display_name, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [user.id, user.displayName, user.email, user.passwordHash, user.isAdmin ? 1 : 0, user.createdAt]
  });
  return user;
}

export async function updateDisplayName(id, displayName) {
  await db.execute({ sql: 'UPDATE users SET display_name = ? WHERE id = ?', args: [displayName.trim(), id] });
  return findById(id);
}

export function toPublicUser(user) {
  if (!user) return null;
  return { id: user.id, displayName: user.displayName, email: user.email, isAdmin: user.isAdmin };
}

/** Slimmer than toPublicUser — for search results and friend lists, no email exposed. */
export function toPeerSummary(user) {
  if (!user) return null;
  return { id: user.id, displayName: user.displayName };
}
