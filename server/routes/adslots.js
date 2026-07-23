import { Router } from 'express';
import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';

const TABLE = 'adma_adslots';

export default crudRouter(TABLE, {
  defaults: () => ({ active: true, internal: false, accent: '#f59e0b', bg: 'from-slate-700 to-slate-900' }),
  extraRoutes(r) {
    r.get('/active', async (req, res) => {
      try {
        const result = await ddb.send(new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'active = :t',
          ExpressionAttributeValues: { ':t': true },
        }));
        res.json(result.Items || []);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/adslots/:id/request-review — exhibitor requests organiser review of a
    // new self-service ad slot, or of pending edits (item.pending_changes) to an
    // existing live one, before it goes/stays live.
    r.post('/:id/request-review', async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        const item = result.Item;
        if (!item) return res.status(404).json({ error: 'Ad slot not found' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const reviewEmail = settingsResult.Item?.paidFeatureRequestEmail;
        if (!reviewEmail) return res.status(400).json({ error: 'No review contact email configured in Organiser Portal.' });

        await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: req.params.id },
          UpdateExpression: 'SET review_status = :s',
          ExpressionAttributeValues: { ':s': 'requested' },
        }));

        const isEdit = !!item.pending_changes;
        await sendOtpEmail(reviewEmail, null, {
          subject: `ADMA — Ad slot ${isEdit ? 'edit' : 'creation'} review: ${item.company}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Ad slot ${isEdit ? 'edit' : 'creation'} requires review</h2>
              <p style="color:#555"><strong>${item.company}</strong> has ${isEdit ? 'submitted changes to' : 'created'} their carousel ad slot and it's awaiting review before it goes live.</p>
              <p style="color:#555">Review and activate it from the ADMA organiser console — Paid Listing Requests.</p>
            </div>
          `,
        });

        res.json({ ok: true, review_status: 'requested' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
