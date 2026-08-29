import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { requireAdmin } from '../auth/adminMiddleware.js';
import * as questionsDb from '../db/questions.js';
import * as badgesDb from '../db/badges.js';
import * as users from '../db/users.js';
import { refreshQuestionCache } from '../game/questionBank.js';
import { refreshBadgeCache } from '../game/badgeCache.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ---- Categories & questions ----

router.get('/categories', async (_req, res) => {
  res.json({ categories: await questionsDb.listCategoriesWithCounts() });
});

router.post('/categories', async (req, res) => {
  try {
    const category = await questionsDb.createCategory(req.body || {});
    await refreshQuestionCache();
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: 'CATEGORY_ERROR', message: err.message });
  }
});

router.patch('/categories/:key', async (req, res) => {
  try {
    await questionsDb.updateCategory(req.params.key, req.body || {});
    await refreshQuestionCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'CATEGORY_ERROR', message: err.message });
  }
});

router.delete('/categories/:key', async (req, res) => {
  try {
    await questionsDb.deleteCategory(req.params.key);
    await refreshQuestionCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'CATEGORY_ERROR', message: err.message });
  }
});

router.get('/categories/:key/questions', async (req, res) => {
  res.json({ questions: await questionsDb.listQuestionsForCategory(req.params.key) });
});

router.post('/questions', async (req, res) => {
  try {
    const { categoryKey, text } = req.body || {};
    const question = await questionsDb.createQuestion({ categoryKey, text });
    await refreshQuestionCache();
    res.status(201).json({ question });
  } catch (err) {
    res.status(400).json({ error: 'QUESTION_ERROR', message: err.message });
  }
});

router.patch('/questions/:id', async (req, res) => {
  try {
    await questionsDb.updateQuestion(req.params.id, req.body?.text);
    await refreshQuestionCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'QUESTION_ERROR', message: err.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    await questionsDb.deleteQuestion(req.params.id);
    await refreshQuestionCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'QUESTION_ERROR', message: err.message });
  }
});

// ---- Badges ----

router.get('/badges', async (_req, res) => {
  res.json({ badges: await badgesDb.listAllBadges() });
});

router.post('/badges', async (req, res) => {
  try {
    const badge = await badgesDb.createBadge(req.body || {});
    res.status(201).json({ badge });
  } catch (err) {
    res.status(400).json({ error: 'BADGE_ERROR', message: err.message });
  }
});

router.delete('/badges/:key', async (req, res) => {
  await badgesDb.deleteBadge(req.params.key);
  await refreshBadgeCache();
  res.json({ ok: true });
});

router.get('/users/search', async (req, res) => {
  const q = req.query.q || '';
  if (q.trim().length < 2) return res.json({ results: [] });
  const matches = await users.searchByDisplayName(q, req.userId, 15);
  const results = await Promise.all(
    matches.map(async (u) => ({ ...users.toPeerSummary(u), badges: await badgesDb.getBadgesForUser(u.id) }))
  );
  res.json({ results });
});

router.post('/users/:userId/badges', async (req, res) => {
  try {
    await badgesDb.assignBadge(req.params.userId, req.body?.badgeKey);
    await refreshBadgeCache();
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'BADGE_ERROR', message: err.message });
  }
});

router.delete('/users/:userId/badges/:badgeKey', async (req, res) => {
  await badgesDb.removeBadgeFromUser(req.params.userId, req.params.badgeKey);
  await refreshBadgeCache();
  res.json({ ok: true });
});

export default router;
