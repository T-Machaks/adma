// Exhibitor-facing endpoints for the OmniFlex SMS Credits feature. Buying a bundle
// itself goes through the existing generic /api/payments cart (type: 'sms_bundle') —
// this file only covers the two things that don't fit that shape: live pricing +
// workspace-status for the page, and the SSO hop into the exhibitor's OmniFlex
// workspace once they have one.
import { Router } from 'express';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';
import { provisionWorkspace, makeLoginLink, getBundlePrices, getPoolBalance, SMS_BUNDLE_CREDITS } from '../lib/omniflexReseller.js';

const r = Router();

r.get('/summary', requireRole('exhibitor'), async (req, res) => {
  try {
    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });
    const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
    const prices = await getBundlePrices();
    const poolBalance = await getPoolBalance();
    // null (unknown pool) always reads as available — same "never hard-block on a
    // monitoring call" principle as the purchase-time check in payments.js.
    const available = Object.fromEntries(
      Object.entries(SMS_BUNDLE_CREDITS).map(([key, credits]) => [key, poolBalance === null || poolBalance >= credits])
    );
    res.json({ prices, hasWorkspace: !!result.Item?.omniflex_org_id, available });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Returns a one-time (~120s) SSO url rather than doing the redirect itself — this app's
// frontend goes through apiFetch() everywhere else, which expects JSON and turns a
// non-2xx into a clean error message; a raw 302 here would either be silently followed
// with no chance to show a friendly error, or (worse) surface unstyled JSON in the
// browser on failure. The frontend does `window.location.href = url` itself on success.
// Never logs or stores the url — used immediately, once.
r.get('/open', requireRole('exhibitor'), async (req, res) => {
  try {
    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });
    const result = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
    const exhibitor = result.Item;
    if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });
    if (!exhibitor.contact_email) return res.status(400).json({ error: 'Add a contact email to your booth before opening your SMS dashboard.' });

    // Sign the CALLER in under their own identity, not always the booth's shared
    // contact_email — getMyExhibitorId matches a teammate purely by company name (see
    // lib/ownership.js), so req.user here can be the booth owner or any invited
    // colleague. The booth owner (contact_email match) gets OmniFlex 'admin'; anyone
    // else gets 'operator' (can view/send campaigns, can't touch billing/users/routes —
    // see ROLE_PERMISSIONS in the omniflex repo). Passed on every call so a role change
    // here (e.g. a teammate promoted to owner) re-syncs on next login — see makeLoginLink.
    const isOwner = req.user.email?.toLowerCase() === exhibitor.contact_email.toLowerCase();
    const role = isOwner ? 'admin' : 'operator';
    const userResult = await ddb.send(new GetCommand({ TableName: 'adma_users', Key: { id: req.user.id } }));
    const callerName = userResult.Item?.full_name || exhibitor.name;
    const caller = { email: req.user.email, name: callerName, role };

    let orgId = exhibitor.omniflex_org_id;
    if (!orgId) {
      // Provisioning always establishes the booth OWNER as the workspace's admin_email,
      // regardless of who's actually clicking "Open Dashboard" right now — a teammate
      // triggering first-ever provisioning still gets JIT-created as 'operator' by the
      // makeLoginLink call below, in the same new workspace.
      const created = await provisionWorkspace({
        name: exhibitor.name,
        admin_email: exhibitor.contact_email,
        admin_name: exhibitor.name,
      });
      orgId = created.id;
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: exhibitorId },
        UpdateExpression: 'SET omniflex_org_id = :o',
        ExpressionAttributeValues: { ':o': orgId },
      }));
    }

    let link;
    try {
      link = await makeLoginLink(orgId, caller, '/');
    } catch (e) {
      // Stored org id is stale — re-provision once and retry, rather than leaving the
      // exhibitor stuck forever on a workspace id that no longer resolves.
      if (e.status === 404) {
        const created = await provisionWorkspace({
          name: exhibitor.name,
          admin_email: exhibitor.contact_email,
          admin_name: exhibitor.name,
        });
        orgId = created.id;
        await ddb.send(new UpdateCommand({
          TableName: 'adma_exhibitors',
          Key: { id: exhibitorId },
          UpdateExpression: 'SET omniflex_org_id = :o',
          ExpressionAttributeValues: { ':o': orgId },
        }));
        link = await makeLoginLink(orgId, caller, '/');
      } else {
        throw e;
      }
    }

    res.json({ url: link.url });
  } catch (e) {
    if (e.code === 'email_taken') {
      return res.status(409).json({ error: 'This email is already an OmniFlex account under a different workspace. Use a different email, or contact ADMA.' });
    }
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default r;
