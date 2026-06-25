import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';

const USER_TABLE = 'minecon_users';
const EXH_TABLE  = 'minecon_exhibitors';
const DEMO_PASSWORD = '@MineCon2026';

const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

const { Items: exhibitors } = await ddb.send(new ScanCommand({ TableName: EXH_TABLE }));

let created = 0, skipped = 0;

for (const exh of exhibitors) {
  if (exh.user_id) { skipped++; continue; }

  const displayName = exh.company_name || exh.name || exh.id;
  const slug = displayName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const email = `${slug}.${exh.id}@portal.minecon.global`;

  const userId = generateId();
  await ddb.send(new PutCommand({
    TableName: USER_TABLE,
    Item: {
      id: userId,
      created_date: new Date().toISOString(),
      full_name: displayName,
      email,
      company: displayName,
      phone: '',
      role: 'exhibitor',
      status: 'active',
      password_hash,
    },
  }));

  await ddb.send(new UpdateCommand({
    TableName: EXH_TABLE,
    Key: { id: exh.id },
    UpdateExpression: 'SET user_id = :u, #s = :s, company_name = :c',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':u': userId,
      ':s': 'active',
      ':c': displayName,
    },
  }));

  console.log(`✓ ${displayName}`);
  created++;
}

console.log(`\nDone. Created ${created} user accounts, skipped ${skipped} already linked.`);
