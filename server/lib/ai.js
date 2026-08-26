import Anthropic from '@anthropic-ai/sdk';

// Same "read from process.env, set via pm2 on the server, never committed" pattern
// as MAILER_*/OMNIFLEX_* (see server/lib/mailer.js, server/lib/omniflex.js) — no key
// present just means the feature is off (see the guard below), not a startup crash.
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

// Haiku 4.5 — this is a short, structured, low-stakes generation task (a handful of
// FAQ pairs from a paragraph of context), not something that benefits from a larger
// model's extra reasoning, and it's an exhibitor-triggered on-demand call that should
// stay fast and cheap.
const MODEL = 'claude-haiku-4-5-20251001';

// Generates candidate FAQ question/answer pairs for an exhibitor's public profile,
// grounded in whatever they've written as their company description. Purely
// suggestive — nothing is saved here, the caller decides what (if anything) to keep.
export async function suggestFaqs({ name, description, categories }) {
  if (!client) throw new Error('AI suggestions are not configured on this server yet.');
  if (!description || description.trim().length < 20) {
    throw new Error('Add a bit more to your company description first (at least a sentence or two) so suggestions have something to work from.');
  }

  const context = [
    name && `Company name: ${name}`,
    Array.isArray(categories) && categories.length && `Category: ${categories.join(', ')}`,
    // Capped — this is context for a short generation task, not a document to
    // analyse in full, and keeps token cost predictable regardless of how long a
    // description someone has written.
    `Description: ${description.trim().slice(0, 1000)}`,
  ].filter(Boolean).join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You're helping an exhibitor at the ADMA Agri Show (an agricultural trade show in Zimbabwe) write a "Frequently Asked Questions" section for their public exhibitor profile page. Based on the company info below, suggest 5 realistic, useful FAQ question/answer pairs an event attendee might genuinely ask this exhibitor. Keep answers short (1-2 sentences), specific to what's actually implied by the description (don't invent facts it doesn't support), and written in a friendly, professional tone.

${context}

Respond with ONLY a JSON array, no other text, no markdown code fences, in this exact shape:
[{"question": "...", "answer": "..."}]`,
    }],
  });

  const text = msg.content?.find(b => b.type === 'text')?.text || '';
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not generate suggestions right now — please try again.');
  }
  if (!Array.isArray(parsed)) throw new Error('Could not generate suggestions right now — please try again.');

  return parsed
    .filter(f => f && typeof f.question === 'string' && typeof f.answer === 'string' && f.question.trim() && f.answer.trim())
    .slice(0, 6)
    .map(f => ({ question: f.question.trim(), answer: f.answer.trim() }));
}
