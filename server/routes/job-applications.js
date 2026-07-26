import { crudRouter } from '../lib/crudRouter.js';
import { CONSOLE_ROLES, getMyExhibitorId } from '../lib/ownership.js';

async function ownsApplication(req, item) {
  if (CONSOLE_ROLES.includes(req.user.role)) return true;
  if (item.email?.toLowerCase() === req.user.email?.toLowerCase()) return true;
  return item.exhibitor_id === await getMyExhibitorId(req);
}

export default crudRouter('adma_job_applications', {
  defaults: () => ({ status: 'New' }),
  gsiFields: { job_id: 'job-index' },
  auth: { read: ownsApplication, write: ownsApplication },
  extraRoutes(r) {
    // An application can only ever be submitted as yourself — override whatever the
    // client sent for email instead of trusting it.
    r.post('/', (req, res, next) => {
      req.body.email = req.user?.email;
      next();
    });
  },
});
