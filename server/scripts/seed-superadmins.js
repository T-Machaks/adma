/**
 * Creates the superadmin organizer account(s) if they don't already exist.
 * Default password: @AgriShow2026  (must be changed on first login)
 *
 * Usage: node server/scripts/seed-superadmins.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';

const TABLE = 'adma_users';
const DEFAULT_PASSWORD = '@AgriShow2026';

// info@agrishow.co.zw was a stale demo account (deleted) — keep this list to only real,
// intended console-level accounts. Add new entries here only when actually provisioning
// a real person.
const SUPERADMINS = [
  { email: 'tamuka@tyflex.co.zw', full_name: 'Tamuka' },
];

const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

for (const sa of SUPERADMINS) {
  const existing = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': sa.email },
    Limit: 1,
  }));

  if (existing.Items?.length) {
    console.log(`✓ ${sa.email} already exists — skipping`);
    continue;
  }

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name: sa.full_name,
      email: sa.email,
      company: 'ADMA',
      phone: '',
      role: 'organizer',
      status: 'active',
      password_hash,
      must_change_password: true,
    },
  }));

  console.log(`✓ Created ${sa.email} with default password`);
}

console.log('Done. Run the app and log in — you will be prompted to set a new password.');
