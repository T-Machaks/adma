import { Router } from 'express';
import { requireAuth } from '../lib/authMiddleware.js';
import { suggestFaqs, suggestDescription, suggestListingCopy } from '../lib/ai.js';

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

// POST /api/ai/suggest-description — rewrites a company description to fit a
// character budget (see suggestDescription's doc comment for why this is a real,
// reachable need and not just a "nice to have"). Same stateless in-progress-form
// shape as suggest-faq.
router.post('/suggest-description', requireAuth, async (req, res) => {
  try {
    const { name, description, categories, maxChars } = req.body;
    const description_ = await suggestDescription({ name, description, categories, maxChars });
    res.json({ description: description_ });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/ai/suggest-listing — shared drafter behind Job/Tender/Collaboration
// postings. `kind` must be one of the keys suggestListingCopy actually recognizes
// (validated server-side, not just trusted from the client) so this can't be
// pointed at an arbitrary prompt.
router.post('/suggest-listing', requireAuth, async (req, res) => {
  try {
    const { kind, title, category, extra } = req.body;
    const result = await suggestListingCopy({ kind, title, category, extra });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
