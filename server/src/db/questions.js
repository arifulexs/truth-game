import crypto from 'node:crypto';
import { db } from './client.js';

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function listCategoriesWithCounts() {
  const { rows } = await db.execute(`
    SELECT c.key, c.label, c.description, COUNT(q.id) as count
    FROM categories c
    LEFT JOIN questions q ON q.category_key = c.key
    GROUP BY c.key
    ORDER BY c.label ASC
  `);
  return rows.map((r) => ({ key: r.key, label: r.label, description: r.description, count: Number(r.count) }));
}

export async function getAllQuestionsFlat() {
  const { rows } = await db.execute('SELECT id, category_key, question_text FROM questions');
  return rows.map((r) => ({ id: r.id, category: r.category_key, question: r.question_text }));
}

export async function listQuestionsForCategory(categoryKey) {
  const { rows } = await db.execute({
    sql: 'SELECT id, question_text, created_at FROM questions WHERE category_key = ? ORDER BY created_at ASC',
    args: [categoryKey]
  });
  return rows.map((r) => ({ id: r.id, text: r.question_text, createdAt: Number(r.created_at) }));
}

export async function categoryExists(key) {
  const { rows } = await db.execute({ sql: 'SELECT 1 FROM categories WHERE key = ?', args: [key] });
  return rows.length > 0;
}

export async function createCategory({ label, description }) {
  const trimmedLabel = (label || '').trim();
  if (!trimmedLabel) throw new Error('Category name is required.');
  const key = slugify(trimmedLabel);
  if (!key) throw new Error('That name could not be turned into a valid category key.');
  if (await categoryExists(key)) throw new Error('A category with that name already exists.');

  await db.execute({
    sql: 'INSERT INTO categories (key, label, description) VALUES (?, ?, ?)',
    args: [key, trimmedLabel, (description || '').trim()]
  });
  return { key, label: trimmedLabel, description: (description || '').trim(), count: 0 };
}

export async function updateCategory(key, { label, description }) {
  if (!(await categoryExists(key))) throw new Error('Category not found.');
  await db.execute({
    sql: 'UPDATE categories SET label = ?, description = ? WHERE key = ?',
    args: [(label || '').trim(), (description || '').trim(), key]
  });
}

export async function deleteCategory(key) {
  const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM questions WHERE category_key = ?', args: [key] });
  if (Number(rows[0].count) > 0) {
    throw new Error('This category still has questions in it. Delete or move those first.');
  }
  await db.execute({ sql: 'DELETE FROM categories WHERE key = ?', args: [key] });
}

export async function createQuestion({ categoryKey, text }) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Question text is required.');
  if (!(await categoryExists(categoryKey))) throw new Error('That category does not exist.');

  const id = `${categoryKey}_${crypto.randomUUID().slice(0, 8)}`;
  await db.execute({
    sql: 'INSERT INTO questions (id, category_key, question_text, created_at) VALUES (?, ?, ?, ?)',
    args: [id, categoryKey, trimmed, Date.now()]
  });
  return { id, categoryKey, text: trimmed };
}

export async function updateQuestion(id, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Question text is required.');
  const result = await db.execute({ sql: 'UPDATE questions SET question_text = ? WHERE id = ?', args: [trimmed, id] });
  if (result.rowsAffected === 0) throw new Error('Question not found.');
}

export async function deleteQuestion(id) {
  const result = await db.execute({ sql: 'DELETE FROM questions WHERE id = ?', args: [id] });
  if (result.rowsAffected === 0) throw new Error('Question not found.');
}
