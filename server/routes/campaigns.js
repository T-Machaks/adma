import { crudRouter } from '../lib/crudRouter.js';

// Saved, editable campaign message templates for the organizer console's
// Communications page — label + subject (email) + body (used as-is for SMS, wrapped
// in the standard HTML template for email). Organizer-only, no public read (unlike
// announcements.js, these aren't shown to attendees directly — they're only ever sent
// as a broadcast via /api/notifications/broadcast).
export default crudRouter('adma_campaigns', {
  defaults: () => ({}),
  auth: { read: ['organizer', 'marketing_partner', 'superadmin'], write: ['organizer', 'marketing_partner', 'superadmin'] },
});
