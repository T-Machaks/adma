import { crudRouter } from '../lib/crudRouter.js';

export default crudRouter('adma_sessions', {
  defaults: () => ({ status: 'scheduled', viewer_count: 0, chat_enabled: true, qa_enabled: true }),
});
