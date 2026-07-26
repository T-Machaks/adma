import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from './dynamo.js';

// Organizer/superadmin/marketing_partner see everything — console pages like
// MarketingHub.jsx and Analytics.jsx fetch full unscoped lists for reporting.
export const CONSOLE_ROLES = ['organizer', 'superadmin', 'marketing_partner'];

// Resolves the calling session's own exhibitor record id, for resources that
// aren't themselves the exhibitor record (adslots, collaborations, job/tender
// listings, meeting-requests, booth-messages, job-applications). Memoized on
// req so a list-filter pass with many items only resolves this once.
export async function getMyExhibitorId(req) {
  if (req._myExhibitorId !== undefined) return req._myExhibitorId;
  if (!req.user || req.user.role !== 'exhibitor') return (req._myExhibitorId = null);
  if (req.user.exhibitor_id) return (req._myExhibitorId = req.user.exhibitor_id);

  const email = req.user.email?.toLowerCase();
  const company = req.user.company?.toLowerCase();
  if (!email && !company) return (req._myExhibitorId = null);

  const result = await ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' }));
  const match = (result.Items || []).find(e =>
    (e.contact_email && email && e.contact_email.toLowerCase() === email) ||
    (e.name && company && e.name.toLowerCase() === company)
  );
  return (req._myExhibitorId = match?.id ?? null);
}
