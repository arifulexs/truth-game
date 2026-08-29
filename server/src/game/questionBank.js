import { getAllQuestionsFlat, listCategoriesWithCounts } from '../db/questions.js';

export const QUESTIONS_PER_GAME = 20;
export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25];

// In-memory cache, read synchronously by gameplay code (room creation
// shouldn't need a database round-trip). The database is the source of
// truth; this is refreshed on boot and whenever the admin site changes
// anything, via refreshQuestionCache().
let byId = new Map();
let idsByCategory = new Map();
let categoryMeta = [];

export async function refreshQuestionCache() {
  const [flatQuestions, categories] = await Promise.all([getAllQuestionsFlat(), listCategoriesWithCounts()]);

  const nextById = new Map();
  const nextIdsByCategory = new Map();
  for (const q of flatQuestions) {
    nextById.set(q.id, q);
    if (!nextIdsByCategory.has(q.category)) nextIdsByCategory.set(q.category, []);
    nextIdsByCategory.get(q.category).push(q.id);
  }

  byId = nextById;
  idsByCategory = nextIdsByCategory;
  categoryMeta = categories;
}

/**
 * Categories available, with a live count of questions in each — read by
 * the Create Room screen. Backed by the cache, so this stays fast even
 * though the underlying data lives in the database.
 */
export function listCategories() {
  return categoryMeta;
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
