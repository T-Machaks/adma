/**
 * Run once to create the minecon_exhibitor_applications DynamoDB table.
 * Usage: node server/scripts/create-tables.js
 */
import 'dotenv/config';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'af-south-1' });

async function ensureTable(name, extraGSIs = []) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    console.log(`✓ ${name} already exists`);
    return;
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
  }

  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id',    AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      ...extraGSIs.flatMap(g => g.attrs || []),
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      ...extraGSIs,
    ],
  }));
  console.log(`✓ Created ${name}`);
}

await ensureTable('minecon_exhibitor_applications');
console.log('Done.');
