import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';

// AWS Bedrock (partner-operated), not the direct Anthropic API — no API key here.
// Credentials come from the standard AWS SDK chain (the EC2 instance's IAM role in
// production; AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY locally), the same way
// server/lib/s3.js's S3Client picks up credentials with no explicit config. Region
// has no default and must be set explicitly — pick one where Claude models are
// actually enabled in the Bedrock console's "Model access" page (that's a separate,
// one-time per-account/region toggle — an IAM policy alone isn't enough).
//
// `AnthropicBedrock` (not `AnthropicBedrockMantle`, a different export in the same
// package) — confirmed against the SDK's own README: it's the one that actually
// signs requests to the real bedrock-runtime.<region>.amazonaws.com endpoint via
// the standard AWS credential chain. The Mantle variant hits a different host
// (bedrock-mantle.<region>.api.aws) with a different model catalog and 404s on
// every model ID that real Bedrock accepts.
const awsRegion = process.env.AWS_BEDROCK_REGION;
const client = awsRegion ? new AnthropicBedrock({ awsRegion }) : null;

// Bedrock model IDs take an `anthropic.` prefix instead of the first-party
// `claude-haiku-4-5` string, and this model doesn't support on-demand invocation
// by its bare model ID — it must be addressed via an inference profile ID
// (confirmed against Bedrock directly: the bare `anthropic.claude-haiku-4-5...`
// ID 400s with "on-demand throughput isn't supported ... retry with an inference
// profile"). Haiku because this is a short, structured, low-stakes generation
// task (a handful of FAQ pairs from a paragraph of context) triggered on-demand
// by an exhibitor — no need for a larger model's extra reasoning, and it should
// stay fast and cheap. Verify this exact string in Bedrock's "Model access" page
// if requests fail with a model-not-found error — exact availability/naming can
// vary by AWS account and region.
const MODEL = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

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

// Rewrites a company description to fit within a character budget, preserving
// every fact already present and inventing nothing new. Grounds the exhibitor's
// realistic use case: their saved description no longer fits after a package
// downgrade (limits.descChars shrinks — the textarea's own maxLength only blocks
// further typing, it doesn't retroactively trim an already-saved value), or they
// just want a tighter, more polished version within the same budget.
export async function suggestDescription({ name, description, categories, maxChars }) {
  if (!client) throw new Error('AI suggestions are not configured on this server yet.');
  if (!description || !description.trim()) {
    throw new Error("Write a description first so there's something to work from.");
  }
  const limit = Number(maxChars) > 0 ? Math.floor(Number(maxChars)) : 500;

  const context = [
    name && `Company name: ${name}`,
    Array.isArray(categories) && categories.length && `Category: ${categories.join(', ')}`,
    `Current description (${description.trim().length} characters): ${description.trim().slice(0, 2000)}`,
  ].filter(Boolean).join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You're helping an exhibitor at the ADMA Agri Show (an agricultural trade show in Zimbabwe) fit their public profile description into a strict character budget. Rewrite the description below so it is AT MOST ${limit} characters (including spaces), keeps every fact it already states, invents nothing new, and reads as a complete, polished sentence or two — never a truncated fragment. Friendly, professional tone.

${context}

Respond with ONLY the rewritten description text — no quotes, no preamble, no markdown, nothing else.`,
    }],
  });

  const text = (msg.content?.find(b => b.type === 'text')?.text || '').trim();
  if (!text) throw new Error('Could not generate a suggestion right now — please try again.');
  // Safety net in case the model slightly overshoots the budget.
  return text.slice(0, limit);
}

// Shared drafter for the three exhibitor marketplace listing types (job postings,
// tenders, partner collaborations) — same shape of problem as suggestFaqs: a short
// structured-to-prose generation grounded only in fields the exhibitor already
// filled in (title + category/type + whatever else is on the form), never
// inventing salary, dates, or requirements the title doesn't imply.
const LISTING_KINDS = {
  job: {
    noun: 'job posting',
    context: 'a role they are hiring for at their booth/company',
    fields: 'description (what the role involves day-to-day, 2-3 sentences) and requirements (plain-text, one requirement per line, 3-5 lines, no bullet characters)',
    shape: '{"description": "...", "requirements": "..."}',
  },
  tender: {
    noun: 'tender / procurement notice',
    context: 'a scope of work they want suppliers to bid on',
    fields: 'description (the scope of work — what\'s needed and any specifics implied by the title/category, 2-4 sentences)',
    shape: '{"description": "..."}',
  },
  collaboration: {
    noun: 'partnership / collaboration opportunity',
    context: 'an outgrower scheme, contract farming, or joint-venture opportunity they are offering',
    fields: 'description (what the opportunity involves and who it suits, 2-4 sentences)',
    shape: '{"description": "..."}',
  },
};

export async function suggestListingCopy({ kind, title, category, extra }) {
  if (!client) throw new Error('AI suggestions are not configured on this server yet.');
  const spec = LISTING_KINDS[kind];
  if (!spec) throw new Error('Unknown listing type.');
  if (!title || !title.trim()) {
    throw new Error("Add a title first so there's something to draft from.");
  }

  const extraLines = extra && typeof extra === 'object'
    ? Object.entries(extra)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `${k}: ${String(v).trim()}`)
      .join('\n')
    : '';

  const context = [
    `Title: ${title.trim()}`,
    category && `Category/Type: ${category}`,
    extraLines,
  ].filter(Boolean).join('\n').slice(0, 1000);

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You're helping an exhibitor at the ADMA Agri Show (an agricultural trade show in Zimbabwe) draft a ${spec.noun} for ${spec.context}. Based ONLY on the info below — don't invent facts, salary, dates, or requirements it doesn't imply — write ${spec.fields}. Plain, professional, concise language, no markdown formatting or headers.

${context}

Respond with ONLY a JSON object, no other text, no markdown code fences, in this exact shape:
${spec.shape}`,
    }],
  });

  const text = msg.content?.find(b => b.type === 'text')?.text || '';
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not generate a draft right now — please try again.');
  }
  if (!parsed || typeof parsed.description !== 'string' || !parsed.description.trim()) {
    throw new Error('Could not generate a draft right now — please try again.');
  }
  const result = { description: parsed.description.trim() };
  if (kind === 'job') result.requirements = typeof parsed.requirements === 'string' ? parsed.requirements.trim() : '';
  return result;
}
