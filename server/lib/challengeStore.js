import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo.js';

const TABLE = 'adma_auth_challenges';

// Pre-login challenge store (email/SMS OTP, TOTP, forced password change, password
// reset) — token -> { type, userId, ...extra, expiresAt }. Backed by DynamoDB, not an
// in-memory Map (what this replaced, 2026-08-31) — an in-memory Map is private to one
// Node process, but the platform runs two EC2 instances behind an ALB with no session
// affinity. A login flow's first request (submit password, get a challenge token back)
// and its second request (submit the OTP/code a few seconds later, using that token)
// have no guarantee of landing on the same instance — a plain Map meant the second
// instance had never heard of the token, surfacing as "Session expired. Please log in
// again." to users doing everything right and promptly. Mirrors session.js's
// adma_auth_sessions table (same TTL-attribute pattern) — real post-login sessions
// were already correctly shared this way; this was the one piece of auth state that
// wasn't. See RISK_REGISTER.md for the incident.

export async function createChallenge(token, data) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { token, ...data, expires_at_ttl: Math.floor(data.expiresAt / 1000) },
  }));
}

// expiresAt is checked here too, not just relied on via DynamoDB TTL — TTL deletion is
// "usually within 48 hours" per AWS's own docs, not instant, so a just-expired entry
// could otherwise still be read as valid for a while after its expiresAt has passed.
export async function getChallenge(token) {
  if (!token) return null;
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { token } }));
  const entry = result.Item;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

// Partial update — used by /otp/resend and /totp/fallback to switch an existing
// challenge's method (email <-> sms) or type (totp -> email/sms) in place, bumping
// expiresAt, rather than creating a new token the client would then have to swap to.
export async function updateChallenge(token, patch) {
  const names = {};
  const values = {};
  const sets = Object.entries(patch).map(([k, v], i) => {
    names[`#f${i}`] = k;
    values[`:v${i}`] = v;
    return `#f${i} = :v${i}`;
  });
  if (patch.expiresAt) {
    values[':ttl'] = Math.floor(patch.expiresAt / 1000);
    sets.push('expires_at_ttl = :ttl');
  }
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { token },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function deleteChallenge(token) {
  if (!token) return;
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { token } }));
}
