import crypto from 'crypto';
import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo.js';

const TABLE = 'adma_auth_sessions';

export const SESSION_COOKIE = 'adma_session';

// Console roles (organizer/superadmin/marketing_partner) get a short-lived session since
// console access is the higher-value target; everyone else gets a longer one so attendees
// and exhibitors aren't forced to re-login constantly during the show.
const CONSOLE_ROLES = ['organizer', 'superadmin', 'marketing_partner'];
const CONSOLE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttlMs = CONSOLE_ROLES.includes(user.role) ? CONSOLE_TTL_MS : DEFAULT_TTL_MS;
  const now = Date.now();
  const expiresAt = new Date(now + ttlMs);

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      token,
      user_id: user.id,
      role: user.role,
      exhibitor_id: user.exhibitor_id, // set only for the synthetic exhibitor-login session
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt.toISOString(),
      expires_at_ttl: Math.floor(expiresAt.getTime() / 1000), // DynamoDB TTL attribute (epoch seconds)
      revoked: false,
    },
  }));

  return { token, expiresAt };
}

export async function validateSession(token) {
  if (!token) return null;
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { token } }));
  const session = result.Item;
  if (!session) return null;
  if (session.revoked) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  return session;
}

export async function revokeSession(token) {
  if (!token) return;
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { token },
      UpdateExpression: 'SET revoked = :r',
      ExpressionAttributeValues: { ':r': true },
      ConditionExpression: 'attribute_exists(#t)',
      ExpressionAttributeNames: { '#t': 'token' },
    }));
  } catch (e) {
    if (e.name !== 'ConditionalCheckFailedException') console.error('revokeSession failed:', e.message);
    // otherwise: token already gone/never existed — nothing to revoke
  }
}

export async function revokeAllSessionsForUser(userId) {
  const result = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'user_id = :u AND revoked = :f',
    ExpressionAttributeValues: { ':u': userId, ':f': false },
  }));
  await Promise.all((result.Items || []).map(s => revokeSession(s.token)));
}
