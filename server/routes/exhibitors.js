import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { nextMay30ISO } from '../lib/subscription.js';
import { logSecurityEvent } from '../lib/securityLog.js';
import { revokeAllSessionsForExhibitor } from '../lib/session.js';
import { requireAuth } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';
import { sendOtpEmail } from '../lib/mailer.js';

// Fields only an organiser/superadmin/marketing_partner may set — an exhibitor must
// never be able to grant themselves a package, unlock their own portal, or fake a paid
// billing/add-on state via a self-service PUT. `package` had no such guard before this
// was generalized from the single portal_locked check; folding it in here too.
const ORGANIZER_ONLY_FIELDS = [
  'portal_locked', 'package',
  'package_billed_at', 'package_expires_at',
  'marketplace_addon_status', 'marketplace_addon_billed_at', 'marketplace_addon_expires_at',
];

// Mirrors the same email/company matching ExhibitorHome.jsx uses client-side to
// resolve "my booth" from the session's email/company.
function ownsBooth(req, exhibitor) {
  if (!req.user) return false;
  if (req.user.role === 'organizer' || req.user.role === 'superadmin') return true;
  if (ORGANIZER_ONLY_FIELDS.some(f => f in req.body)) return false;
  if (req.user.role !== 'exhibitor') return false;
  const email = req.user.email?.toLowerCase();
  const company = req.user.company?.toLowerCase();
  return (exhibitor.contact_email && email && exhibitor.contact_email.toLowerCase() === email)
      || (exhibitor.name && company && exhibitor.name.toLowerCase() === company);
}

export default crudRouter('adma_exhibitors', {
  defaults: () => ({ featured: false, package: 'Basic', subscription_expires_at: nextMay30ISO() }),
  auth: { read: 'public', write: ownsBooth },
  extraRoutes(r) {
    // Logs lock/unlock separately before falling through to crudRouter's own generic
    // PUT /:id handler (registered after extraRoutes runs) — Express runs both handlers
    // in registration order for the same method+path as long as this one calls next().
    r.put('/:id', async (req, res, next) => {
      if ('portal_locked' in req.body) {
        logSecurityEvent('exhibitor_lock_changed', {
          exhibitorId: req.params.id,
          locked: !!req.body.portal_locked,
          ip: req.ip,
        });
        // Locking should take effect immediately, not just block the next login attempt —
        // kill any session the exhibitor is actively using right now.
        if (req.body.portal_locked) {
          const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: req.params.id } }));
          await revokeAllSessionsForExhibitor(req.params.id, result.Item?.user_id);
        }
      }
      next();
    });

    // POST /api/exhibitors/marketplace-addon/request — exhibitor requests activation of
    // the account-level Marketplace Add-on (Section C of the rate card). Mirrors the
    // shape of job-listings.js's /:id/request-payment: sets a 'requested' status server-
    // side and emails the organiser's paidFeatureRequestEmail — no payment/activation
    // happens here, that's a separate organiser-only action in Paid Listing Requests.
    r.post('/marketplace-addon/request', requireAuth, async (req, res) => {
      try {
        const { tier, period } = req.body;
        if (!['text', 'interactive'].includes(tier)) return res.status(400).json({ error: 'tier must be "text" or "interactive".' });
        if (!period) return res.status(400).json({ error: 'period is required.' });

        const exhibitorId = await getMyExhibitorId(req);
        if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });

        const exhibitorResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
        const exhibitor = exhibitorResult.Item;
        if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });

        await ddb.send(new UpdateCommand({
          TableName: 'adma_exhibitors',
          Key: { id: exhibitorId },
          UpdateExpression: 'SET marketplace_addon_tier = :t, marketplace_addon_period = :p, marketplace_addon_status = :s',
          ExpressionAttributeValues: { ':t': tier, ':p': period, ':s': 'requested' },
        }));

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const billingEmail = settingsResult.Item?.paidFeatureRequestEmail;
        if (billingEmail) {
          await sendOtpEmail(billingEmail, null, {
            subject: `ADMA — Marketplace Add-on requested: ${exhibitor.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 8px;color:#111">Marketplace Add-on requested</h2>
                <p style="color:#555"><strong>${exhibitor.name}</strong> has requested the <strong>${tier === 'interactive' ? 'Interactive' : 'Text Only'}</strong> Marketplace Add-on, billed <strong>${period}</strong>.</p>
                <p style="color:#555">This unlocks Jobs, Tenders &amp; Collaborations posting for their account. Once payment is confirmed, activate it from the ADMA organiser console — Paid Listing Requests.</p>
              </div>
            `,
          }).catch(() => {});
        }

        res.json({ ok: true, marketplace_addon_status: 'requested' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/exhibitors/upgrade-enquiry — exhibitor asks about upgrading their
    // package/tier. exhibitor_id is always resolved from the session, never trusted
    // from the client, so one exhibitor can't file an enquiry "as" another.
    r.post('/upgrade-enquiry', requireAuth, async (req, res) => {
      try {
        const exhibitorId = await getMyExhibitorId(req);
        if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });

        const exhibitorResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
        const exhibitor = exhibitorResult.Item;
        if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });

        const settingsResult = await ddb.send(new GetCommand({ TableName: 'adma_app_settings', Key: { pk: 'singleton' } }));
        const notifyEmail = settingsResult.Item?.packageUpgradeEnquiryEmail;
        if (!notifyEmail) return res.status(400).json({ error: 'No upgrade enquiry email configured in Organiser Portal.' });

        const targetPackage = req.body.target_package;

        await sendOtpEmail(notifyEmail, null, {
          subject: `ADMA Digital — Package upgrade enquiry: ${exhibitor.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h2 style="margin:0 0 8px;color:#111">Package upgrade enquiry</h2>
              <p style="color:#555"><strong>${exhibitor.name}</strong> (currently ${exhibitor.package || 'Basic'}) is interested in upgrading${targetPackage ? ` to <strong>${targetPackage}</strong>` : ''}.</p>
              <p style="color:#555"><strong>Contact:</strong> ${exhibitor.contact_email || 'no contact email on file'}</p>
              <p style="color:#555">Follow up with them directly to arrange the upgrade.</p>
            </div>
          `,
        });

        if (exhibitor.contact_email) {
          await sendOtpEmail(exhibitor.contact_email, null, {
            subject: 'ADMA Digital — We received your upgrade enquiry',
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
                <h2 style="margin:0 0 8px;color:#111">Thanks for your interest!</h2>
                <p style="color:#555">We've received your enquiry about upgrading <strong>${exhibitor.name}</strong>'s package${targetPackage ? ` to <strong>${targetPackage}</strong>` : ''}. The ADMA team will be in touch shortly.</p>
              </div>
            `,
          }).catch(() => { /* non-fatal — the organiser copy above is the one that matters */ });
        }

        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  },
});
