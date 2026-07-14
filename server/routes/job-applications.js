import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_job_applications', {
  defaults: () => ({ status: 'New' }),
  gsiFields: { job_id: 'job-index' },
});
