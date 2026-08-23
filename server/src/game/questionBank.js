import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'questions', 'questions.json');

const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// Flat lookup: questionId -> { id, question, category }
const byId = new Map();
// categoryKey -> array of question ids
const idsByCategory = new Map();

for (const [categoryKey, category] of Object.entries(raw.categories)) {
  const ids = [];
  for (const q of category.questions) {
    byId.set(q.id, { ...q, category: categoryKey });
    ids.push(q.id);
  }
  idsByCategory.set(categoryKey, ids);
}

export const QUESTIONS_PER_GAME = 20;

/**
 * Returns the list of categories available, with a live count of questions
 * in each — used by the Create Room screen so new categories added to
 * questions.json show up automatically without any frontend changes.
 */
export function listCategories() {
  return Object.entries(raw.categories).map(([key, category]) => ({
    key,
    label: category.label,
    description: category.description || '',
    count: category.questions.length
  }));
}

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Combines questions from the given category keys, dedupes, shuffles, and
 * returns exactly `count` unique question ids. Returns null if there aren't
 * enough unique questions available across the selected categories.
 */
export function selectQuestions(categoryKeys, count = QUESTIONS_PER_GAME) {
  const uniqueIds = new Set();
  for (const key of categoryKeys) {
    const ids = idsByCategory.get(key);
    if (!ids) continue;
    for (const id of ids) uniqueIds.add(id);
  }
  if (uniqueIds.size < count) return null;
  return shuffle(Array.from(uniqueIds)).slice(0, count);
}

export function getQuestionText(questionId) {
  return byId.get(questionId)?.question ?? '[Question unavailable]';
}

export function isValidCategory(key) {
  return idsByCategory.has(key);
}
