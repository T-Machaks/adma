import { describe, it, expect, vi, beforeEach } from 'vitest';

// buildItem()'s sms_bundle branch checks getPoolBalance() BEFORE getBundlePrices() —
// pricing is the necessary next step toward actually taking payment, so "was
// getBundlePrices ever called" is a direct proxy for "did this get anywhere near the
// payment API" without needing to stand up the full Express route + Paynow mocking.
vi.mock('../lib/omniflexReseller.js', () => ({
  getPoolBalance: vi.fn(),
  getBundlePrices: vi.fn(),
  provisionWorkspace: vi.fn(),
  allocateBundle: vi.fn(),
  SMS_BUNDLE_CREDITS: { SMS500: 500, SMS1000: 1000 },
}));
// buildItem() unconditionally imports these too — none of them run for the sms_bundle
// branch, but the module-level import must not blow up outside a real AWS/DB context.
vi.mock('../lib/dynamo.js', () => ({ ddb: { send: vi.fn() } }));
vi.mock('./rate-card.js', () => ({ getRateCard: vi.fn(), computeServerPrice: vi.fn() }));
vi.mock('../lib/mailer.js', () => ({ sendOtpEmail: vi.fn() }));

import { buildItem } from './payments.js';
import { getPoolBalance, getBundlePrices } from '../lib/omniflexReseller.js';

const EXHIBITOR_ID = 'exhibitor_123';

describe('buildItem — sms_bundle pre-payment pool check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 503 and never prices the bundle when the pool is known to be short', async () => {
    getPoolBalance.mockResolvedValue(200); // less than SMS500's 500 credits
    getBundlePrices.mockResolvedValue({ SMS500: 15, SMS1000: 25 });

    await expect(
      buildItem(null, EXHIBITOR_ID, { type: 'sms_bundle', item_key: 'SMS500' })
    ).rejects.toMatchObject({ status: 503 });

    expect(getBundlePrices).not.toHaveBeenCalled();
  });

  it('proceeds normally (builds the cart item) when the pool balance is unknown (null)', async () => {
    getPoolBalance.mockResolvedValue(null);
    getBundlePrices.mockResolvedValue({ SMS500: 15, SMS1000: 25 });

    const item = await buildItem(null, EXHIBITOR_ID, { type: 'sms_bundle', item_key: 'SMS500' });

    expect(getBundlePrices).toHaveBeenCalledTimes(1);
    expect(item).toMatchObject({ type: 'sms_bundle', item_key: 'SMS500', amount: 15, sms_credits: 500, fulfilled: false });
  });

  it('proceeds normally when the pool balance is sufficient', async () => {
    getPoolBalance.mockResolvedValue(1000); // plenty for a 500-credit bundle
    getBundlePrices.mockResolvedValue({ SMS500: 15, SMS1000: 25 });

    const item = await buildItem(null, EXHIBITOR_ID, { type: 'sms_bundle', item_key: 'SMS500' });

    expect(getBundlePrices).toHaveBeenCalledTimes(1);
    expect(item.amount).toBe(15);
  });
});
