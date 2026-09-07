// One-off, read-only utility: dumps every non-deleted exhibitor's id/name/contact
// fields so a bulk profile-info update can be matched against real records instead
// of guessing names. Run on the server (has DynamoDB access via the EC2 instance's
// IAM role, same as the app itself — no separate credentials needed):
//
//   node scripts/list-exhibitors.mjs
//
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const raw = new DynamoDBClient({ region: 'af-south-1' });
const ddb = DynamoDBDocumentClient.from(raw);

const result = await ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' }));
const items = (result.Items || []).filter(e => !e.deleted);
items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

for (const e of items) {
  console.log(JSON.stringify({
    id: e.id,
    name: e.name || '',
    contact_email: e.contact_email || '',
    phone: e.phone || '',
    description_len: (e.description || '').length,
  }));
}
console.log(`\n${items.length} exhibitors total`);
