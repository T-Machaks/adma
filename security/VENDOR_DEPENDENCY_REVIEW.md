# ADMA Digital — Vendor & Dependency Review

**Effective:** 2026-08-05

Every third-party service with access to real ADMA Digital data (personal, business, or payment), one line each on what they see and why they're trusted. Matches the "Third parties we share data with" section of the public `src/pages/PrivacyPolicy.jsx` — this is the internal, slightly more technical companion; keep both in sync if either changes.

| Vendor | What they see | Why trusted / evidence |
|---|---|---|
| **Amazon Web Services** (`server/lib/dynamo.js`, S3 upload routes) | Everything — all application data (DynamoDB) and all uploaded files (S3), region af-south-1 | Industry-standard cloud provider; ADMA's own access to it is least-privilege (the app's IAM user is scoped to DynamoDB/S3 only — confirmed via a real `UnauthorizedOperation` when broader access was attempted). AWS's own SOC 2 / ISO 27001 certifications are the basis for this platform's 100% Datacenter Security CAIQ domain score. |
| **Paynow** (`server/lib/paynow.js`) | Payment amount, reference, line-item description; card/mobile-money details are handled entirely on Paynow's own hosted checkout page — never touch ADMA's servers | Zimbabwe's established payment gateway for exactly this transaction volume/type; PCI-scope stays with Paynow, not ADMA, by design (web/redirect checkout only, no direct card capture). |
| **Google** (OAuth login, `@react-oauth/google`) | Name and email, only if a user chooses "Sign in with Google" | Standard OAuth2 — ADMA never sees the user's Google password, only what Google's own consent screen discloses. |
| **Microsoft** (OAuth login **and** transactional email via Microsoft Graph API, tenant `tyflex.co.zw`) | OAuth: name/email on login. Graph API: every transactional email ADMA sends (OTP codes, password resets, confirmations) passes through Microsoft's mail infrastructure, sent from `NoReply@tyflex.co.zw` | Same OAuth trust basis as Google. The Graph API mail relay is on the operator's own existing Microsoft 365 tenant (Tyflex Investments), not a third-party email vendor — effectively self-hosted from a trust perspective. |
| **Facebook** (OAuth login) | Name and email, only if a user chooses "Sign in with Facebook" | Same OAuth trust basis as Google/Microsoft. |
| **OmniFlex** (`server/lib/omniflex.js`) | Phone numbers and SMS message content, for SMS-based OTP/verification codes only | Local (Zimbabwe) SMS gateway — necessary since email-only OTP isn't reliable/fast enough for all users; scoped to OTP delivery, not marketing or bulk messaging. |
| **CC Sales** | Nothing shared automatically — pedigree livestock auction listings on ADMA link **out** to CC Sales' own platform; a user's data only reaches them if the user clicks through and interacts with CC Sales directly | Outbound link only, not an integration with API-level data sharing. |

## What's explicitly *not* shared

- ADMA does not sell or share personal data with any advertiser, data broker, or analytics vendor.
- No general-purpose analytics/tracking vendor (e.g. Google Analytics, Meta Pixel) is integrated — the only third parties touching user data are the ones in the table above, all functionally necessary (auth, payments, email/SMS delivery, hosting).

## Review cadence

This should be re-reviewed whenever a new third-party integration is added (the bar: "does this vendor receive real user data, and why"), and at minimum annually regardless, to catch any vendor whose own security posture may have changed.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 2 item 14.*
