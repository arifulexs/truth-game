import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, '..', 'questions', 'questions.json');

/**
 * Populates categories/questions from the bundled questions.json, but only
 * if the questions table is currently empty. This makes it safe to call on
 * every boot — it seeds a brand-new database once, and does nothing on every
 * boot after that (including once the admin site has made edits, so an admin
 * deleting a question doesn't get "undone" by the seed on the next restart).
 */
export async function seedQuestionsIfEmpty() {
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM questions');
  const existingCount = Number(rows[0].count);
  if (existingCount > 0) return { seeded: false, count: existingCount };

  const raw = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  let inserted = 0;
  const now = Date.now();

  for (const [key, category] of Object.entries(raw.categories)) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO categories (key, label, description) VALUES (?, ?, ?)',
      args: [key, category.label, category.description || '']
    });
    for (const q of category.questions) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO questions (id, category_key, question_text, created_at) VALUES (?, ?, ?, ?)',
        args: [q.id, key, q.question, now]
      });
      inserted++;
    }
  }

  return { seeded: true, count: inserted };
}
