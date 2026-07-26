import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_virtual_enquiries', {
  defaults: () => ({ status: 'New' }),
  gsiFields: { exhibitor_id: 'exhibitor-index' },
  // Enquiry/lead-gen forms (ExhibitorDetail.jsx, TenderDetail.jsx, CollaborationDetail.jsx)
  // are intentionally usable by anonymous visitors — no login gate exists client-side.
  // Listing enquiries is still restricted since the contents are visitor PII.
  auth: { read: 'auth', write: 'public' },
});
