/**
 * Run once to create all adma_* DynamoDB tables for the ADMA Digital app.
 * Usage: node server/scripts/create-tables.js
 */
import 'dotenv/config';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'af-south-1' });

async function ensureTable(name, { hashKey = 'id', gsis = [] } = {}) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    console.log(`✓ ${name} already exists`);
    return;
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
  }

  const attrNames = new Set([hashKey, ...gsis.map(g => g.attr)]);
  const AttributeDefinitions = [...attrNames].map(a => ({ AttributeName: a, AttributeType: 'S' }));

  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions,
    KeySchema: [{ AttributeName: hashKey, KeyType: 'HASH' }],
    ...(gsis.length ? {
      GlobalSecondaryIndexes: gsis.map(g => ({
        IndexName: g.index,
        KeySchema: [{ AttributeName: g.attr, KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      })),
    } : {}),
  }));
  console.log(`✓ Created ${name}`);
}

await ensureTable('adma_exhibitors');
await ensureTable('adma_users',                 { gsis: [{ attr: 'email',       index: 'email-index' }] });
await ensureTable('adma_registrations',         { gsis: [{ attr: 'email',       index: 'email-index' }] });
await ensureTable('adma_announcements');
await ensureTable('adma_meeting_requests',      { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_sponsors');
await ensureTable('adma_virtual_enquiries',     { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_engagements',           { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_attendee_notes',        { gsis: [{ attr: 'user_email',   index: 'user-email-index' }] });
await ensureTable('adma_adslots');
await ensureTable('adma_exhibitor_applications',{ gsis: [{ attr: 'email',       index: 'email-index' }] });
await ensureTable('adma_sessions');
await ensureTable('adma_booth_messages',        { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_job_listings',          { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_job_applications',      { gsis: [{ attr: 'job_id',       index: 'job-index' }] });
await ensureTable('adma_tender_listings',       { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_auctions');
await ensureTable('adma_lots',                  { gsis: [{ attr: 'auction_id',   index: 'auction-index' }] });
await ensureTable('adma_bids',                  { gsis: [{ attr: 'lot_id',       index: 'lot-index' }] });
await ensureTable('adma_collaborations',        { gsis: [{ attr: 'exhibitor_id', index: 'exhibitor-index' }] });
await ensureTable('adma_app_settings',   { hashKey: 'pk' });
await ensureTable('adma_guide_pages',    { hashKey: 'page_num' });
await ensureTable('adma_magazine_pages', { hashKey: 'page_num' });

console.log('\nAll ADMA tables ready.');
