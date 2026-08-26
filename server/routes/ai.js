import { Router } from 'express';
import { requireAuth } from '../lib/authMiddleware.js';
import { suggestFaqs } from '../lib/ai.js';

const router = Router();

// POST /api/ai/suggest-faq — generates candidate FAQ Q&A pairs from an exhibitor's
// profile fields. Stateless (takes name/description/categories directly in the
// request body rather than looking an exhibitor up by id), so it works against an
// in-progress edit form before it's even been saved. Any authenticated user can call
// this (not exhibitor-only) since the organizer's console can edit exhibitor
// profiles on their behalf too — see server/index.js's aiLimiter for abuse/cost
// protection, tighter than the general API rate limit given this calls a paid
// external API per request.
router.post('/suggest-faq', requireAuth, async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    const suggestions = await suggestFaqs({ name, description, categories });
    res.json({ suggestions });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
