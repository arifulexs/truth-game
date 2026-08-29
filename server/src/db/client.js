import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/*
 * Turso databases speak the exact same libSQL protocol as a local SQLite
 * file — so the same client, and the same SQL, works in both places:
 *   - Locally, with no setup: a plain file on disk.
 *   - In production, pointed at a real Turso database via env vars, which
 *     is what actually persists data on hosts with an ephemeral filesystem
 *     (Render's free tier included — local files there get wiped on every
 *     restart/redeploy/spin-down).
 */
function buildClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    return createClient({ url, authToken });
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const localPath = path.join(DATA_DIR, 'app.db');
  console.warn(
    `[warn] TURSO_DATABASE_URL not set — using a local SQLite file at ${localPath}. ` +
      'Fine for development; this file will NOT survive a redeploy on most free hosts. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN before deploying.'
  );
  return createClient({ url: `file:${localPath}` });
}

export const db = buildClient();
