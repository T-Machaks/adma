import { describe, it, expect, vi, beforeEach } from 'vitest';

// The pre-payment pool check (payments.sms-pool.test.js) is the primary defense, but
// the pool can still drain between that check and the actual allocate() call — this
// covers that race: allocate() returns 409 pool_insufficient on an *already-paid*
// order. No auto-refund exists (see the comment in completePayment() itself for why),
// so the real assertions here are: ops gets alerted, and the item is left unfulfilled
// rather than silently marked done.
vi.mock('../lib/dynamo.js', () => ({ ddb: { send: vi.fn() } }));
vi.mock('./rate-card.js', () => ({ getRateCard: vi.fn(), computeServerPrice: vi.fn() }));
vi.mock('../lib/mailer.js', () => ({ sendOtpEmail: vi.fn().mockResolvedValue({}) }));
vi.mock('../lib/omniflexReseller.js', () => ({
  getPoolBalance: vi.fn(),
  getBundlePrices: vi.fn(),
  provisionWorkspace: vi.fn(),
  allocateBundle: vi.fn(),
  SMS_BUNDLE_CREDITS: { SMS500: 500, SMS1000: 1000 },
}));
vi.mock('./adslots.js', () => ({ markAdSlotRequested: vi.fn(), createAdSlotFromRequest: vi.fn() }));

import { completePayment } from './payments.js';
import { ddb } from '../lib/dynamo.js';
import { getRateCard } from './rate-card.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { allocateBundle } from '../lib/omniflexReseller.js';

const record = {
  id: 'payment_1',
  reference: 'ADMA-payment_1',
  status: 'pending',
  exhibitor_id: 'exhibitor_123',
  exhibitor_name: 'Test Exhibitor',
  exhibitor_email: 'exhibitor@example.com',
  amount: 15,
  currency: 'USD',
  items: [
    { id: 'item_1', type: 'sms_bundle', item_key: 'SMS500', item_label: '500 SMS Credits', amount: 15, sms_credits: 500, fulfilled: false },
  ],
};

describe('completePayment — sms_bundle allocate() 409 pool_insufficient backstop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRateCard.mockResolvedValue({ billingPeriods: {} });
  });

  it('alerts ops and leaves the item unfulfilled, without ever charging/touching the exhibitor again', async () => {
    ddb.send
      .mockResolvedValueOnce({}) // status: pending -> paid
      .mockResolvedValueOnce({ Item: { omniflex_org_id: 'org_abc' } }) // exhibitor lookup
      .mockResolvedValueOnce({ Item: { paidFeatureRequestEmail: 'ops@example.com' } }); // app settings, for the ops alert

    allocateBundle.mockRejectedValue(Object.assign(new Error('Pool insufficient'), { status: 409, code: 'pool_insufficient' }));

    await completePayment({ ...record });

    // Exactly 3 ddb calls — a 4th would be the "SET #items[idx].fulfilled = :t" update,
    // which must never fire on the failure path.
    expect(ddb.send).toHaveBeenCalledTimes(3);

    expect(sendOtpEmail).toHaveBeenCalledWith(
      'ops@example.com',
      null,
      expect.objectContaining({ subject: expect.stringContaining('SMS credit allocation failed') })
    );
    // The unconditional payment-confirmation email to the exhibitor still goes out —
    // the payment itself genuinely succeeded, only the credit allocation didn't.
    expect(sendOtpEmail).toHaveBeenCalledWith(
      'exhibitor@example.com',
      null,
      expect.objectContaining({ subject: expect.stringContaining('Payment confirmed') })
    );
  });
});
