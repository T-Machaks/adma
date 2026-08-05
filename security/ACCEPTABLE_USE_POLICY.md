# ADMA Digital — Acceptable Use & Confidentiality Policy

**Effective:** 2026-08-05
**Applies to:** anyone with console-level (organizer/superadmin/marketing_partner), server (SSH/EC2), or direct database access to ADMA Digital — currently the platform operator and any AI coding agent operating under their direction. This is deliberately short; extend it when a second independent admin, contractor, or employee is added (see CAIQ Phase 2 item 9).

## 1. Access is for platform operation only

Console, server, and database access exists to build, operate, and support the ADMA Digital platform. It is not to be used to:
- Access, export, or share exhibitor/attendee personal data for any purpose outside operating the platform (support requests, debugging, the legitimate features described in the Privacy Policy).
- Make undisclosed changes to payment records, pricing, or exhibitor tier/package status outside the normal application flows.
- Share login credentials, API keys, SSH keys, or `.env` secrets with anyone not covered by this policy.

## 2. Confidentiality

Anyone with the access described above agrees to:
- Treat all exhibitor and attendee personal data, and all payment-related data, as confidential — not to be discussed, shared, or exported outside legitimate platform operation or debugging.
- Keep credentials (passwords, SSH keys, AWS access keys, `.env` files) out of version control, chat messages, or any other non-secure channel. (Confirmed practice today: `.env`, `.pem`, and `.csv` credential files are gitignored and not present in git history.)
- Report any suspected credential leak or unauthorized access immediately, per `INCIDENT_RESPONSE_PLAN.md`.

## 3. Acceptable technical practice

- Follow the change process in `CHANGE_MANAGEMENT.md` for all production changes — no undocumented direct edits on the server.
- Never commit real credentials, customer PII, or payment data into the git repository, including in test fixtures, diagnostic scripts, or commit messages.
- Any diagnostic/test script that touches production data (the local dev environment shares the same real AWS database as production) must clean up its own test records before being considered complete.

## 4. Acknowledgement

By using console, server, or database access to ADMA Digital, an individual (or an AI agent operating on their behalf) agrees to this policy. As the team grows beyond its current size, this will be extended into a signed onboarding acknowledgement (see CAIQ Phase 3 item 20).

## 5. Review cadence

This policy should be reviewed **at least annually**, and immediately whenever a new person (contractor, employee, second admin) is given console, server, or database access.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 7.*
