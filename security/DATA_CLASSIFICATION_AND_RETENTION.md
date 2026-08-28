# ADMA Digital — Data Classification & Retention Statement

**Effective:** 2026-08-05 (reviewed 2026-08-28 — added AWS Bedrock processing note to §1)
**Companion to:** `src/pages/PrivacyPolicy.jsx` (the public-facing version of this — this document is the internal, more technical companion, and the two should stay consistent if either changes).

## 1. Data classification

| Category | Examples | Where it lives | Sensitivity |
|---|---|---|---|
| **Account/identity PII** | Name, email, phone, company | `adma_users`, `adma_exhibitors` | Medium — enables account takeover if leaked, not financial |
| **Authentication secrets** | Password hashes (bcrypt), TOTP secrets, session tokens | `adma_users.password_hash`/`totp_secret`, `adma_auth_sessions` | High — never logged, never returned in any API response (`users.js` strips both fields from every response) |
| **Payment metadata** | Amount, reference, line-item description, Paynow poll/redirect URLs, EFT proof-of-payment file | `adma_payments`, S3 (`payment-pop` uploads) | High — no card numbers or bank credentials ever touch ADMA's own systems (Paynow's hosted checkout handles those; EFT is an uploaded PDF/image, not raw bank credentials) |
| **Exhibitor business content** | Company descriptions, logos, gallery images, product/service details, ad creative | `adma_exhibitors`, `adma_adslots`, S3 (`marketing-image`, `video-ad`) | Low–Medium — mostly intended to be public-facing already. Name/description/category text is also sent to **AWS Bedrock** (`server/lib/ai.js`, in **us-east-1**, not af-south-1) when an exhibitor uses an "AI suggestions" control — opt-in per use, not automatic, and never stored by Bedrock beyond the request itself; see `VENDOR_DEPENDENCY_REVIEW.md` |
| **Engagement analytics** | Booth visits, QR scans, ad clicks, meeting requests, messages | `adma_engagements`, `adma_meeting_requests`, `adma_booth_messages` | Low — operational data, used to give exhibitors visibility into attendee interest |
| **Technical/security logs** | IP address, request metadata, CSP violation reports | pm2 stdout, `server/routes/csp-report.js` | Low individually, Medium in aggregate — collected for rate-limiting/abuse-detection, not analytics |

## 2. Retention

| Data type | Retention | Notes |
|---|---|---|
| Exhibitor account/profile data | Active subscription + 2 years after expiry | In case of renewal or a dispute — matches the public Privacy Policy |
| Attendee/visitor account data | While active; may be archived/removed after 1+ year of inactivity | No automated job does this yet — currently a manual/as-needed process |
| Payment records (`adma_payments`) | Indefinite (financial record-keeping) | Never contains raw card/bank credentials — see classification table above |
| Security logs (login attempts, password resets, admin actions, CSP reports) | Limited operational window (weeks, not years) | Sufficient to investigate abuse; not retained indefinitely today since there's no centralized log shipping yet (see CAIQ Phase 2 item 10) |
| Session tokens (`adma_auth_sessions`) | 24h (console roles) / 30 days (attendee/exhibitor), enforced via DynamoDB TTL | Auto-expired; also explicitly revocable (logout, account lock) |

## 3. Deletion requests

Today this is handled **manually**, on request to `marketing@admadigital.co.zw` (per the public Privacy Policy's Section 8):
1. Confirm the requester's identity (matching the account email).
2. Locate all records referencing them: `adma_users` (their own account), plus any records elsewhere that reference them by email/id (`adma_meeting_requests`, `adma_registrations`, `adma_attendee_notes`, etc. — the ownership model in `server/lib/ownership.js` already documents which tables key off which identity field, which is also the map for finding everything to delete).
3. Delete or anonymize the identified records; exhibitor-authored business content (booth listings, ads) is handled case-by-case since it may need to stay for other exhibitors'/attendees' historical context, or be fully removed at the exhibitor's request.
4. Confirm completion back to the requester.

There is no automated "delete my account" self-service flow yet — this is a documented manual process, not a gap in capability, per CAIQ's standard convention (a documented manual process is a legitimate "Partial," an undocumented one is a "No").

## 4. Encryption

- **In transit:** TLS on all connections (enforced via HSTS in `server/index.js`'s Helmet configuration).
- **At rest:** AWS-managed encryption on DynamoDB (encryption at rest is on by default for all DynamoDB tables) and S3 (default bucket encryption). See `security/KEY_MANAGEMENT_POLICY.md` for the dedicated write-up of key ownership, application-level secrets, and the deliberate no-customer-managed-KMS decision.

## 5. Review cadence

This policy should be reviewed **at least annually**, and whenever a new data category is introduced to the platform or a data-protection regulation applicable to Zimbabwe changes.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 5.*
