import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';

// AWS Bedrock (partner-operated), not the direct Anthropic API — no API key here.
// Credentials come from the standard AWS SDK chain (the EC2 instance's IAM role in
// production; AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY locally), the same way
// server/lib/s3.js's S3Client picks up credentials with no explicit config. Region
// has no default and must be set explicitly — pick one where Claude models are
// actually enabled in the Bedrock console's "Model access" page (that's a separate,
// one-time per-account/region toggle — an IAM policy alone isn't enough).
const awsRegion = process.env.AWS_BEDROCK_REGION;
const client = awsRegion ? new AnthropicBedrockMantle({ awsRegion }) : null;

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
