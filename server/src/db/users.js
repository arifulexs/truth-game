import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readAll() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [] };
  }
}

function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function findByEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  return readAll().users.find((u) => u.email === normalized) || null;
}

export function findById(id) {
  return readAll().users.find((u) => u.id === id) || null;
}

export function createUser({ displayName, email, passwordHash }) {
  const data = readAll();
  const user = {
    id: crypto.randomUUID(),
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt: Date.now()
  };
  data.users.push(user);
  writeAll(data);
  return user;
}

export function updateDisplayName(id, displayName) {
  const data = readAll();
  const user = data.users.find((u) => u.id === id);
  if (!user) return null;
  user.displayName = displayName.trim();
  writeAll(data);
  return user;
}

export function toPublicUser(user) {
  if (!user) return null;
  return { id: user.id, displayName: user.displayName, email: user.email };
}
