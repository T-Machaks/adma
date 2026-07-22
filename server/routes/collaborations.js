import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';

const TABLE = 'adma_collaborations';

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Pending' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  extraRoutes(r) {
    // POST /api/collaborations/:id/request-payment — notifies the configured
    // billing contact that a Partner Collaboration listing is awaiting payment/activation.
    r.post('/:id/request-payment', async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        const item = result.Item;
        if (!item) return res.status(404).json({ error: 'Collaboration not found' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const billingEmail = settingsResult.Item?.paidFeatureRequestEmail;
        if (!billingEmail) return res.status(400).json({ error: 'No billing email configured in Organiser Portal.' });

        await sendOtpEmail(billingEmail, null, {
          subject: `ADMA — Paid listing request: ${item.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Partner Collaboration listing request</h2>
              <p style="color:#555"><strong>${item.company_name}</strong> has posted a Partner Collaboration listing that requires payment before it can go live.</p>
              <p style="color:#555"><strong>Title:</strong> ${item.title}<br/><strong>Type:</strong> ${item.type || '—'}</p>
              <p style="color:#555">Once payment is confirmed, activate the listing from the ADMA organiser console — Paid Listing Requests.</p>
            </div>
          `,
        });

        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
