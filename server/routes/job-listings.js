import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

const TABLE = 'adma_job_listings';

async function ownsJobListing(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter(TABLE, {
  defaults: () => ({ status: 'Open' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Read stays public — this is a real public job board. Only editing/deleting is
  // scoped to the exhibitor who posted it.
  auth: { read: 'public', write: ownsJobListing },
  extraRoutes(r) {
    r.post('/', requireAuth, async (req, res, next) => {
      if (req.user.role === 'exhibitor') req.body.exhibitor_id = await getMyExhibitorId(req);
      next();
    });

    // POST /api/job-listings/:id/request-payment — requests activation of the paid
    // CV-upload application flow for this job listing.
    r.post('/:id/request-payment', requireAuth, async (req, res) => {
      try {
        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id: req.params.id } }));
        const item = result.Item;
        if (!item) return res.status(404).json({ error: 'Job listing not found' });
        if (!await ownsJobListing(req, item)) return res.status(403).json({ error: 'You do not have permission to do that.' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const billingEmail = settingsResult.Item?.paidFeatureRequestEmail;
        if (!billingEmail) return res.status(400).json({ error: 'No billing email configured in Organiser Portal.' });

        await ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id: req.params.id },
          UpdateExpression: 'SET interactive_status = :s',
          ExpressionAttributeValues: { ':s': 'requested' },
        }));

        await sendOtpEmail(billingEmail, null, {
          subject: `ADMA — Paid feature request: CV applications for ${item.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Job listing — CV applications requested</h2>
              <p style="color:#555"><strong>${item.company_name}</strong> has requested the paid CV-upload application feature for their job listing.</p>
              <p style="color:#555"><strong>Job title:</strong> ${item.title}</p>
              <p style="color:#555">Once payment is confirmed, activate this feature from the ADMA organiser console — Paid Listing Requests.</p>
            </div>
          `,
        });

        res.json({ ok: true, interactive_status: 'requested' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  },
});
