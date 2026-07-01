import { Router } from 'express';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';

const TABLE = 'adma_guide_pages';
const r = Router();

r.get('/', async (_req, res) => {
  try {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    res.json(result.Items || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.put('/:pageNum', async (req, res) => {
  try {
    const page_num = req.params.pageNum;
    const item = { page_num, ...req.body, updated_at: new Date().toISOString() };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
