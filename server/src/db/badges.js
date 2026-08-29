import { db } from './client.js';

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function rowToBadge(row) {
  if (!row) return null;
  return { key: row.key, label: row.label, emoji: row.emoji, color: row.color, animated: Number(row.animated) === 1 };
}

export async function listAllBadges() {
  const { rows } = await db.execute('SELECT * FROM badges ORDER BY created_at ASC');
  return rows.map(rowToBadge);
}

export async function badgeExists(key) {
  const { rows } = await db.execute({ sql: 'SELECT 1 FROM badges WHERE key = ?', args: [key] });
  return rows.length > 0;
}

export async function createBadge({ label, emoji, color, animated }) {
  const trimmedLabel = (label || '').trim();
  const trimmedEmoji = (emoji || '').trim();
  if (!trimmedLabel) throw new Error('Badge name is required.');
  if (!trimmedEmoji) throw new Error('Badge icon (an emoji) is required.');

  const key = slugify(trimmedLabel);
  if (!key) throw new Error('That name could not be turned into a valid badge key.');
  if (await badgeExists(key)) throw new Error('A badge with that name already exists.');

  const badge = {
    key,
    label: trimmedLabel,
    emoji: trimmedEmoji,
    color: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#d6336c',
    animated: !!animated
  };
  await db.execute({
    sql: 'INSERT INTO badges (key, label, emoji, color, animated, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [badge.key, badge.label, badge.emoji, badge.color, badge.animated ? 1 : 0, Date.now()]
  });
  return badge;
}

export async function deleteBadge(key) {
  await db.execute({ sql: 'DELETE FROM user_badges WHERE badge_key = ?', args: [key] });
  await db.execute({ sql: 'DELETE FROM badges WHERE key = ?', args: [key] });
}

export async function assignBadge(userId, badgeKey) {
  if (!(await badgeExists(badgeKey))) throw new Error('That badge does not exist.');
  await db.execute({
    sql: 'INSERT OR IGNORE INTO user_badges (user_id, badge_key, assigned_at) VALUES (?, ?, ?)',
    args: [userId, badgeKey, Date.now()]
  });
}

export async function removeBadgeFromUser(userId, badgeKey) {
  await db.execute({ sql: 'DELETE FROM user_badges WHERE user_id = ? AND badge_key = ?', args: [userId, badgeKey] });
}

export async function getBadgesForUser(userId) {
  const { rows } = await db.execute({
    sql: `SELECT b.* FROM badges b
          JOIN user_badges ub ON ub.badge_key = b.key
          WHERE ub.user_id = ?
          ORDER BY ub.assigned_at ASC`,
    args: [userId]
  });
  return rows.map(rowToBadge);
}

/** All user->badge assignments at once — used to build the in-memory cache. */
export async function getAllUserBadgeAssignments() {
  const { rows } = await db.execute(`
    SELECT ub.user_id, b.* FROM user_badges ub
    JOIN badges b ON b.key = ub.badge_key
  `);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id).push(rowToBadge(row));
  }
  return map;
}
