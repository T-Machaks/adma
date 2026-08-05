# ADMA Digital — Incident Response Plan

**Effective:** 2026-08-05
**Owner:** Tyflex Investments / Mediaserv (operator of ADMA Digital)
**Applies to:** the ADMA Digital platform (`admadigital.co.zw`) — its EC2 host, DynamoDB tables, S3 buckets, and any account with console, exhibitor, or server access.

This is a working one-pager, not a formal ISO 27035 program — sized for a two-person team operating a real production platform with payment and personal-data flows. Review and update it after every real incident, and at least once a year regardless.

## 1. What counts as an incident

Any of the following, confirmed or reasonably suspected:

- Unauthorized access to an account (console, exhibitor, or attendee), or evidence of a leaked/reused credential.
- Data exposure — personal information (names, emails, company info) or payment metadata visible to someone who shouldn't see it.
- Site or API unavailability caused by something other than routine maintenance (e.g. suspected DDoS, a bad deploy that broke production — see the 2026-07-26 example below).
- A vulnerability discovered in a dependency, in ADMA's own code, or in AWS configuration, with a realistic path to exploitation.
- Payment fraud or a Paynow/EFT transaction dispute that looks abusive rather than a genuine customer issue.

## 2. Severity levels

| Level | Definition | Example |
|---|---|---|
| **SEV1 — Critical** | Active data breach, payment fraud in progress, or the site down for all users | Attacker actively exfiltrating `adma_users`; Paynow credentials compromised |
| **SEV2 — High** | Contained security issue with real but bounded impact | A single exhibitor account compromised via credential stuffing; a broken deploy causing a partial outage |
| **SEV3 — Low** | Vulnerability or misconfiguration found with no evidence of exploitation | A `npm audit` high-severity finding in a dependency; a CSP violation report that turns out to be a false positive |

## 3. Response steps

1. **Contain.** Depending on the incident: revoke the affected session(s)/account(s) (`revokeSession`/`revokeAllSessionsForExhibitor` in `server/lib/session.js`, or `portal_locked: true` on the exhibitor record), roll back the last deploy (`git log` → `git checkout <last-good-sha>` → rebuild → `pm2 restart adma-api`), or take the affected route/table offline if there's no safer option.
2. **Assess.** What data or access was actually touched? Check DynamoDB directly for the affected records, `pm2 logs adma-api` for request history, and (once Phase 1 item 6 — CloudTrail — is enabled) the CloudTrail event history for the AWS-side blast radius.
3. **Notify.**
   - **Internal:** the acting admin notifies the other party with platform access (currently: T-Machaks and `tamuka@tyflex.co.zw`) immediately on SEV1/SEV2.
   - **External (affected exhibitors/attendees):** for any confirmed exposure of personal or payment data, notify affected accounts **within 72 hours** of confirmation, by email, in plain language — what happened, what data was involved, what we've done about it, and what they should do (e.g. change their password). Use `marketing@admadigital.co.zw` as the sending/reply-to address.
   - **Payment provider:** for anything touching Paynow transactions, also notify Paynow support directly per their merchant terms.
4. **Remediate.** Fix the root cause (patch the dependency, close the access-control gap, revert the bad deploy for good), not just the symptom.
5. **Record.** Add an entry to the incident log below — every real incident, regardless of severity, gets logged. This is also what makes a future audit or CAIQ update credible.
6. **Review.** For SEV1/SEV2, do a short retro afterward: what happened, what worked, what to change (add it to this document if it changes the process).

## 4. Incident log

| Date | Severity | What happened | Response | Outcome |
|---|---|---|---|---|
| 2026-07-26 | SEV2 | A document-level Content-Security-Policy rollout broke OAuth login, images, and video across the platform in production. | Identified via real console errors, root-caused, and **reverted** the enforcing CSP the same day; CSP was later reintroduced safely in `Report-Only` mode with a working violation-reporting endpoint (`server/routes/csp-report.js`) before ever being flipped back to enforcing. | Resolved same day. No data exposure — a functional regression, not a security breach. Process lesson: any future CSP (or similarly broad) change ships `Report-Only` first, monitored, before enforcing. |

## 5. Contacts

| Role | Contact |
|---|---|
| Platform operator / superadmin | `tamuka@tyflex.co.zw` |
| General help & enquiries | `marketing@admadigital.co.zw` |
| Hosting | AWS (account `479887547220`, region af-south-1) |
| Payment provider | Paynow (Zimbabwe) — merchant support per Paynow's own channels |

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 2.*
