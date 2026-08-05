# ADMA Digital — Interoperability & Data Portability Policy

**Effective:** 2026-08-05
**Companion to:** the self-service data export feature (`GET /api/users/me/export`) and `DATA_CLASSIFICATION_AND_RETENTION.md`.

## 1. API communication standards

All ADMA Digital application services communicate over a single, consistent internal pattern: a REST/JSON API (`/api/*`) built on a shared `crudRouter` abstraction (`server/lib/crudRouter.js`) applied uniformly across every resource type — exhibitors, users, payments, meetings, listings, and everything else. This isn't a formal published API specification, but it is a real, maintained, consistently-applied standard, not an ad hoc collection of one-off endpoints.

- **Transport:** HTTPS/TLS 1.2+ only (enforced via HSTS) — no unencrypted API access exists.
- **Format:** JSON request/response bodies throughout.
- **Auth:** session-cookie based (HttpOnly, Secure, SameSite=Lax), never API keys embedded in client code.

## 2. Application development portability

The application is built on widely-adopted, non-proprietary open-source technology (React, Vite, Express, standard AWS SDKs) with no vendor-specific lock-in at the application-code layer — the codebase itself could be redeployed against a different cloud provider's compute and a different NoSQL database with real but bounded engineering effort (the DynamoDB-specific calls are isolated to a `server/lib/dynamo.js` wrapper and per-route files, not scattered arbitrarily). This is a design characteristic, not a guarantee — no formal portability testing against an alternate provider has been performed.

## 3. Data exchange, usage, and portability

This is the practical, customer-facing part of interoperability, and it's now backed by a real feature, not just a policy statement:

- **Programmatic data retrieval:** any signed-in user (attendee or exhibitor) can retrieve their own data — account details, exhibitor profile (if applicable), event registrations, meeting requests, attendee notes, and payment history — via `GET /api/users/me/export`, returned as a downloadable, human- and machine-readable JSON file. This is linked directly from the Privacy Policy page's "Your rights" section.
- **Data integrity:** the export reflects the live database state at request time (no caching layer between the export and the source of truth).
- **Persistence:** exported data isn't stored anywhere new by this feature — it's generated fresh on each request and streamed directly to the requester, per `DATA_CLASSIFICATION_AND_RETENTION.md`'s retention rules for the underlying records.

## 4. On contract termination / account closure

If a user's relationship with ADMA Digital ends (account deletion, exhibitor booth non-renewal), the data-portability picture is:

- **Format:** the same JSON export described above remains available for as long as the account exists and can be requested before closure.
- **Duration data is stored:** per `DATA_CLASSIFICATION_AND_RETENTION.md` §2 (exhibitor data: active subscription + 2 years; attendee data: while active, archived after 1+ year inactive).
- **Scope of data retained/available:** the same categories covered by the export endpoint.
- **Deletion:** handled via the manual request process in `DATA_CLASSIFICATION_AND_RETENTION.md` §3 (`marketing@admadigital.co.zw`) — not yet a fully automated self-service "delete my account" flow.

## 5. Review

This policy should be reviewed annually, and whenever the underlying export feature's scope changes (new data categories added to the platform).

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — strengthens the Interoperability & Portability domain (was 0% in the 2026-08-04 assessment, 37.5% after the 2026-08-05 re-score).*
