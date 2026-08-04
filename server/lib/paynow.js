// Paynow (Zimbabwe payment gateway, developers.paynow.co.zw) wrapper around the
// official `paynow` npm SDK. Web/redirect checkout only — Paynow's own hosted checkout
// page already lets the payer choose EcoCash/OneMoney/card, so there's no need to also
// build a direct sendMobile()/USSD-instructions flow in this app.
//
// Required env vars for real payments:
//   PAYNOW_INTEGRATION_ID
//   PAYNOW_INTEGRATION_KEY
// Absent (e.g. local dev, or production before the merchant account is set up) → every
// function below falls into stub mode, returning synthetic responses that route through
// this app's own /payment/stub page instead of calling the real gateway. Nothing else in
// the app needs to change once real credentials are added.

import { Paynow } from 'paynow';

const INTEGRATION_ID = process.env.PAYNOW_INTEGRATION_ID;
const INTEGRATION_KEY = process.env.PAYNOW_INTEGRATION_KEY;
const APP_URL = 'https://admadigital.co.zw';

export function isPaynowConfigured() {
  return !!(INTEGRATION_ID && INTEGRATION_KEY);
}

function client() {
  const paynow = new Paynow(INTEGRATION_ID, INTEGRATION_KEY);
  paynow.resultUrl = `${APP_URL}/api/payments/result`;
  paynow.returnUrl = `${APP_URL}/payment/return`;
  return paynow;
}

// { paymentId, reference, amount, itemName, email } → { success, redirectUrl, pollUrl }
export async function initiatePayment({ paymentId, reference, amount, itemName, email }) {
  if (!isPaynowConfigured()) {
    return {
      success: true,
      redirectUrl: `/payment/stub/${paymentId}`,
      pollUrl: `stub:${paymentId}`,
    };
  }
  const paynow = client();
  const payment = paynow.createPayment(reference, email);
  payment.add(itemName, amount);
  const response = await paynow.send(payment);
  if (!response.success) throw new Error(response.error || 'Paynow payment initiation failed');
  return { success: true, redirectUrl: response.redirectUrl, pollUrl: response.pollUrl };
}

// Stub records are resolved by the stub-checkout page hitting /api/payments/:id/simulate
// directly, not by polling — this only ever runs against a real Paynow pollUrl.
//
// The installed SDK's README documents a `status.paid()` method, but the shipped v2.2.2
// code (verified directly in node_modules/paynow/dist/paynow.js) has no such method —
// pollTransaction() just returns the same InitResponse shape as send(), whose `.status`
// is the lowercased raw status string from Paynow ("paid", "created", "cancelled", etc.).
// Comparing against that string directly is what actually works at runtime.
export async function pollPaymentStatus(pollUrl) {
  if (!pollUrl || pollUrl.startsWith('stub:')) return { paid: false };
  const paynow = client();
  const result = await paynow.pollTransaction(pollUrl);
  return { paid: result?.status === 'paid' };
}
