// Lambda backing AgriBot's Bedrock Action Group for ADMA Agri Show 2026.
// Matches operationIds/paths in bedrock-action-schema.yaml.
//
// Deploy as a Node 20.x Lambda, ESM handler `adma-bedrock-action-handler.handler`.
// Needs an execution role with dynamodb:Scan/GetItem/Query/PutItem on the adma_* tables,
// and outbound internet access (VPC + NAT, or no VPC) to call the notifications API.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'af-south-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
);

// The real Express API — used only to trigger the same email/SMS notifications
// the web app sends after creating a meeting request or enquiry. AgriBot writes
// straight to DynamoDB (fast, no auth needed), then fires this so the exhibitor
// and visitor still get notified exactly as if they'd used the app.
const APP_URL = 'https://adma.tyflex.co.zw';

async function notify(path, body) {
  try {
    await fetch(`${APP_URL}/api/notifications/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[notify] ${path} failed:`, e.message);
  }
}

function getParams(event) {
  const out = {};
  for (const p of event.parameters || []) out[p.name] = p.value;
  return out;
}

function getBody(event) {
  const out = {};
  const props = event.requestBody?.content?.['application/json']?.properties || [];
  for (const p of props) out[p.name] = p.value;
  return out;
}

// Scans a table, optionally filtering on a set of equality conditions.
// Any filter value that's undefined/empty is skipped rather than matched literally.
async function scanWithOptionalFilters(tableName, filters) {
  const entries = Object.entries(filters).filter(([, v]) => v);
  if (entries.length === 0) {
    const r = await ddb.send(new ScanCommand({ TableName: tableName }));
    return r.Items || [];
  }
  const names = {}, values = {}, parts = [];
  entries.forEach(([k, v], i) => {
    names[`#k${i}`] = k;
    values[`:v${i}`] = v;
    parts.push(`#k${i} = :v${i}`);
  });
  const r = await ddb.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: parts.join(' AND '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
  return r.Items || [];
}

function respond(event, statusCode, data) {
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      httpMethod: event.httpMethod,
      httpStatusCode: statusCode,
      responseBody: {
        'application/json': { body: JSON.stringify(data) },
      },
    },
  };
}

export const handler = async (event) => {
  console.log('AgriBot action:', JSON.stringify(event));

  const { apiPath, httpMethod } = event;
  const params = getParams(event);
  const body = getBody(event);

  try {

    // GET /api/exhibitors
    if (apiPath === '/api/exhibitors' && httpMethod === 'GET') {
      let items;

      if (params.tier || params.category) {
        const names = {}, values = {}, parts = [];
        let i = 0;
        if (params.tier)     { names[`#k${i}`] = 'tier';     values[`:v${i}`] = params.tier;     parts.push(`#k${i} = :v${i}`); i++; }
        if (params.category) { names[`#k${i}`] = 'category'; values[`:v${i}`] = params.category; parts.push(`#k${i} = :v${i}`); i++; }
        const r = await ddb.send(new ScanCommand({
          TableName: 'adma_exhibitors',
          FilterExpression: parts.join(' AND '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }));
        items = r.Items || [];
      } else {
        const r = await ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' }));
        items = r.Items || [];
      }

      if (params.sortBy) {
        const f = params.sortBy;
        items.sort((a, b) => (a[f] ?? '') > (b[f] ?? '') ? 1 : -1);
      }

      return respond(event, 200, items);
    }

    // GET /api/exhibitors/{id}
    if (apiPath.startsWith('/api/exhibitors/') && httpMethod === 'GET') {
      const id = params.id || apiPath.split('/').at(-1);
      const r = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id } }));
      if (!r.Item) return respond(event, 404, { error: 'Exhibitor not found' });
      return respond(event, 200, r.Item);
    }

    // POST /api/meeting-requests
    if (apiPath === '/api/meeting-requests' && httpMethod === 'POST') {
      const item = {
        id: randomUUID(),
        created_date: new Date().toISOString(),
        status: 'Pending',
        ...body,
      };
      await ddb.send(new PutCommand({ TableName: 'adma_meeting_requests', Item: item }));
      await notify('meeting', { meeting: item, action: 'created' });
      return respond(event, 201, item);
    }

    // GET /api/meeting-requests/{id}
    if (apiPath.startsWith('/api/meeting-requests/') && httpMethod === 'GET') {
      const id = params.id || apiPath.split('/').at(-1);
      const r = await ddb.send(new GetCommand({ TableName: 'adma_meeting_requests', Key: { id } }));
      if (!r.Item) return respond(event, 404, { error: 'Meeting request not found' });
      return respond(event, 200, r.Item);
    }

    // POST /api/virtual-enquiries
    if (apiPath === '/api/virtual-enquiries' && httpMethod === 'POST') {
      const item = {
        id: randomUUID(),
        created_date: new Date().toISOString(),
        status: 'New',
        ...body,
      };
      await ddb.send(new PutCommand({ TableName: 'adma_virtual_enquiries', Item: item }));
      await notify('enquiry', { enquiry: item });
      return respond(event, 201, item);
    }

    // GET /api/registrations/by-email
    // Matches the real REST API: no match is a 200 with a null body, not a 404 —
    // AgriBot's instructions tell it to treat this as "not registered", not an error.
    if (apiPath === '/api/registrations/by-email' && httpMethod === 'GET') {
      const email = (params.email || '').toLowerCase();
      if (!email) return respond(event, 400, { error: 'email is required' });
      const r = await ddb.send(new QueryCommand({
        TableName: 'adma_registrations',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :e',
        ExpressionAttributeValues: { ':e': email },
        Limit: 1,
      }));
      return respond(event, 200, r.Items?.[0] ?? null);
    }

    // GET /api/announcements
    if (apiPath === '/api/announcements' && httpMethod === 'GET') {
      const r = await ddb.send(new ScanCommand({ TableName: 'adma_announcements' }));
      let items = r.Items || [];

      const sortBy = params.sortBy || 'created_date';
      const desc = sortBy.startsWith('-') || sortBy === 'created_date';
      const field = sortBy.replace(/^-/, '');
      items.sort((a, b) => {
        const av = a[field] ?? '', bv = b[field] ?? '';
        return desc ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
      });

      return respond(event, 200, items);
    }

    // GET /api/job-listings
    if (apiPath === '/api/job-listings' && httpMethod === 'GET') {
      let items = await scanWithOptionalFilters('adma_job_listings', { category: params.category, status: params.status });
      return respond(event, 200, items);
    }

    // GET /api/tender-listings
    if (apiPath === '/api/tender-listings' && httpMethod === 'GET') {
      let items = await scanWithOptionalFilters('adma_tender_listings', { category: params.category, status: params.status });
      return respond(event, 200, items);
    }

    // GET /api/auctions
    if (apiPath === '/api/auctions' && httpMethod === 'GET') {
      const r = await ddb.send(new ScanCommand({ TableName: 'adma_auctions' }));
      return respond(event, 200, r.Items || []);
    }

    return respond(event, 404, { error: `No handler for ${httpMethod} ${apiPath}` });

  } catch (e) {
    console.error('AgriBot Lambda error:', e);
    return respond(event, 500, { error: e.message });
  }
};
