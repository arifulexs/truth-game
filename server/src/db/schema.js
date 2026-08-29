import { db } from './client.js';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    responded_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`,
  `CREATE TABLE IF NOT EXISTS categories (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category_key TEXT NOT NULL,
    question_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_key)`,
  `CREATE TABLE IF NOT EXISTS badges (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#d6336c',
    animated INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT NOT NULL,
    badge_key TEXT NOT NULL,
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, badge_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id)`
];

export async function initSchema() {
  for (const sql of STATEMENTS) {
    await db.execute(sql);
  }
}
