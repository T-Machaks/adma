/**
 * One-off backfill: adds the independent virtual `package` field and
 * `subscription_expires_at` to any adma_exhibitors record that doesn't have them yet.
 * Platinum members default to Premium; everyone else defaults to Basic.
 * Run from the server/ directory: node scripts/migrate-packages.js
 */
import 'dotenv/config';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { nextMay30ISO } from '../lib/subscription.js';

const TABLE = 'adma_exhibitors';

async function run() {
  const { Items: items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE }));
  let updated = 0;

  for (const ex of items) {
    if (ex.package && ex.subscription_expires_at) continue;

    const pkg = ex.package || (ex.tier === 'Platinum' ? 'Premium' : 'Basic');
    const expiresAt = ex.subscription_expires_at || nextMay30ISO();

    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: ex.id },
      UpdateExpression: 'SET #pkg = :pkg, subscription_expires_at = :exp',
      ExpressionAttributeNames: { '#pkg': 'package' },
      ExpressionAttributeValues: { ':pkg': pkg, ':exp': expiresAt },
    }));
    updated++;
    console.log(`✓ ${ex.name || ex.id} → package=${pkg}, expires=${expiresAt}`);
  }

  console.log(`\nDone. ${updated}/${items.length} exhibitor records updated.`);
}

run().catch(e => { console.error(e); process.exit(1); });
