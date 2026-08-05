# ADMA Digital — CSA CAIQ v4.0.3 Self-Assessment & Security Improvement Plan

**Date:** 2026-08-04
**Scope:** ADMA Digital platform (React/Vite/Tailwind PWA + Express/DynamoDB API, single AWS EC2 instance, region af-south-1)
**Framework:** Cloud Security Alliance Consensus Assessments Initiative Questionnaire (CAIQ) v4.0.3 — 263 questions across 17 Cloud Controls Matrix (CCM) domains
**Prepared as:** Level 1 self-assessment (no independent/third-party verification yet — see [Methodology & Limitations](#methodology--limitations))

---

## 1. Executive Summary

| | |
|---|---|
| **Overall score** | **31.7%** (of 246 applicable questions; 17 questions marked N/A) |
| **Answered Yes** | 30 |
| **Answered Partial** | 96 |
| **Answered No** | 120 |
| **N/A** | 17 |
| **CSA STAR level today** | Not yet published — this exercise is the prerequisite for **STAR Level 1 (Self-Assessment)** |

ADMA Digital is a small, fast-moving team operating a real production platform with real payment (Paynow) and personal-data flows, and it already has **meaningfully better technical security than its process maturity suggests**: server-side sessions, RBAC, per-record ownership scoping, TOTP MFA, bcrypt hashing, rate limiting, and a scoped AWS IAM credential are all shipped and working. What's missing is almost entirely **governance and documentation** — audit, risk, incident response, HR/vendor policy, backup/DR — the parts of CAIQ that assume a org with a dedicated security function, which a two-person team building a trade-show platform hasn't needed until now.

**The score is low mainly because CAIQ scores the *absence of a paper trail*, not just the absence of controls.** Several "No" answers below describe things ADMA already effectively does informally (e.g. change control via git) but has never written down as a policy — those are the cheapest points to recover.

## 2. Score by CCM Domain

Sorted lowest → highest, since the plan below works this list top-down.

| Domain | Score | Yes | Partial | No | N/A | Qs |
|---|---:|---:|---:|---:|---:|---:|
| Audit & Assurance | 0.0% | 0 | 0 | 8 | 0 | 8 |
| Business Continuity Mgmt & Operational Resilience | 0.0% | 0 | 0 | 18 | 0 | 18 |
| Governance, Risk and Compliance | 0.0% | 0 | 0 | 9 | 0 | 9 |
| Human Resources | 0.0% | 0 | 0 | 20 | 0 | 20 |
| Interoperability & Portability | 0.0% | 0 | 0 | 8 | 0 | 8 |
| Security Incident Mgmt, E-Discovery & Cloud Forensics | 0.0% | 0 | 0 | 11 | 0 | 11 |
| Supply Chain Mgmt, Transparency & Accountability | 0.0% | 0 | 0 | 15 | 0 | 15 |
| Threat & Vulnerability Management | 0.0% | 0 | 0 | 12 | 0 | 12 |
| Universal Endpoint Management | N/A | 0 | 0 | 0 | 17 | 17 |
| Cryptography, Encryption & Key Management | 21.7% | 0 | 10 | 13 | 0 | 23 |
| Data Security and Privacy Lifecycle Management | 43.8% | 0 | 21 | 3 | 0 | 24 |
| Logging and Monitoring | 47.2% | 0 | 17 | 1 | 0 | 18 |
| Application & Interface Security | 50.0% | 0 | 11 | 0 | 0 | 11 |
| Infrastructure & Virtualization Security | 50.0% | 0 | 14 | 0 | 0 | 14 |
| Identity & Access Management | 54.8% | 4 | 15 | 2 | 0 | 21 |
| Change Control and Configuration Management | 63.6% | 3 | 8 | 0 | 0 | 11 |
| Datacenter Security | 100.0% | 23 | 0 | 0 | 0 | 23 |

**Datacenter Security scores 100%** because it is fully inherited from AWS — ADMA runs no physical infrastructure, so this domain is answered "Yes, inherited from AWS's own SOC 2 / ISO 27001 certifications." That's legitimate but worth flagging in any customer-facing use of this CAIQ: cite AWS's compliance reports as the evidence, don't imply ADMA itself was audited for it.

## 3. What's Already Working (don't re-litigate these)

- **Real server-side sessions & RBAC** — HttpOnly/Secure/SameSite cookies backed by a DynamoDB session table, role-based TTLs, centralized revocation (e.g. instant session kill on exhibitor lock). See `server/lib/session.js`, `server/lib/authMiddleware.js`.
- **Per-record ownership enforcement** — an exhibitor can't read or write another exhibitor's data; attendees are scoped to their own notes/applications/meeting requests. Extended to list *and* read endpoints, not just write (`server/lib/ownership.js`).
- **TOTP-based MFA** (`server/lib/totp.js`, `otplib`) is implemented and available.
- **Password hashing** via bcrypt (cost 10), never plaintext, never client-settable.
- **Least-privilege AWS credentials** — the app's IAM user is scoped to DynamoDB/S3 only; this was *proven*, not assumed (a real `UnauthorizedOperation` was hit when EC2 access was attempted).
- **Rate limiting** — stricter on `/api/auth/*` (20 req/15 min) than the rest of the API (600 req/15 min), blunting credential stuffing.
- **Security headers via Helmet** (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) plus a CSP already running in `Report-Only` mode with a working violation-reporting endpoint (`server/routes/csp-report.js`) — genuinely rare for a project this size to have gotten this far into CSP hardening safely (see [[feedback_csp_rollout]] for how a first attempt broke prod and was fixed properly).
- **Secrets hygiene** — `.env`, `.pem`, and `.csv` credential files are correctly gitignored and confirmed not tracked in git history.
- **Version control discipline** — all app code is in git; every deploy is a real, reviewable diff.

These are the right things to point to first if this CAIQ is ever shown to a partner, sponsor, or exhibitor doing vendor due diligence — they're the substantive part of a security posture, even though they don't show up as heavily in the domain-count-weighted score below (CAIQ weights governance/process domains just as heavily as technical ones).

## 4. Top Risks (ranked by real-world impact, not just domain score)

1. **No backup/DR — single point of total data loss.** DynamoDB PITR (point-in-time recovery) status has not been confirmed as enabled; there is no tested restore procedure; the app runs on one EC2 instance with no failover. If that instance or its EBS volume is lost, or if DynamoDB PITR isn't actually on, **there is currently no guaranteed way to recover exhibitor, attendee, and payment data.** This is the single highest-impact gap given the platform now processes real Paynow payments.
2. **No incident response plan.** The one real incident to date (the 2026-07-26 CSP rollout regression) was handled well *in the moment*, but reactively — there's no documented severity triage, no communication plan, no breach-notification procedure. If a real security incident (e.g. credential leak, payment fraud attempt) happens, response quality will depend entirely on who's awake at the time.
3. **No vulnerability/dependency scanning.** `npm audit` isn't run anywhere automatically (no CI pipeline exists at all). The server depends on `bcryptjs`, `otplib`, `paynow`, AWS SDKs, and OAuth libraries — a known CVE in any of these could sit undetected indefinitely.
4. **Single superadmin account, no segregation of duties.** Per project memory, only `tamuka@tyflex.co.zw` has console superadmin access. That's appropriate for team size today but is also a single point of failure (lost credentials/device = locked out of the whole platform) and leaves no independent check on privileged actions.
5. **MFA not enforced** — implemented but optional (`mfa_exempt` flag), so it protects only the accounts that opt in.
6. **No key management policy** — relies entirely on AWS default encryption; fine for now, but there's no documented statement of what's encrypted, with what, and who could access the underlying keys (relevant if this CAIQ is ever shown to a partner asking about payment-data handling).

## 5. Security Improvement Plan

Ordered in three phases. Phase 1 items are chosen because they're **cheap relative to their score/risk impact** — mostly writing down what already exists, plus a few small technical changes. Phases 2–3 require more sustained effort or a small budget.

### Phase 1 — 0–30 days (mostly documentation + config, low cost)

| # | Action | CAIQ domain(s) helped | Effort |
|---|---|---|---|
| 1 | **Confirm and enable DynamoDB point-in-time recovery (PITR)** on all production tables; document the restore procedure and actually test one restore into a scratch table. | BCM, DSP | Low — AWS console toggle + one test |
| 2 | **Write a one-page Incident Response plan**: who gets notified, severity levels, a breach-notification commitment (even "notify affected exhibitors within 72h"), and a log of past incidents (start by backfilling the 2026-07-26 CSP incident). | SEF, GRC | Low — half a day |
| 3 | **Turn on GitHub Actions (or equivalent) CI running `npm audit --audit-level=high`** on every push/PR for both `package.json` and `server/package.json`. Even without auto-fixing, visibility alone closes a real gap. | TVM, STA | Low — a few hours |
| 4 | **Document the existing change-management process** (git → manual `git pull`/`pm2 restart` on EC2) as a one-pager: who can deploy, what the rollback procedure is. This alone materially improves the Change Control domain score since the practice already exists — it just isn't written down. | CCC | Low — 1 hour |
| 5 | **Write a short data classification + retention statement**: what's collected (PII: names, emails, company info, payment metadata), how long it's kept, and how a deletion request would be handled today (manual is fine, just say so). | DSP | Low — half a day |
| 6 | **Enable AWS CloudTrail** for the account (management + optionally data events on the DynamoDB tables/S3 buckets) — currently not enabled per prior notes. Even with no active alerting yet, this creates the audit trail CAIQ's A&A and LOG domains are asking about. | LOG, A&A | Low — AWS console, ~30 min |
| 7 | **Write a one-page Acceptable Use / confidentiality note** for anyone with console or server access (even if it's currently one person) — this is the cheapest possible HR-domain point and matters immediately if a contractor or second admin is ever added. | HRS | Low — 30 min |

### Phase 2 progress (as of 2026-08-05)

| # | Action | Status |
|---|---|---|
| 8 | Enforce MFA for console roles | **Done.** Found and fixed a real bug: `mfa_exempt` could bypass MFA for *any* role, including organizer/superadmin, and `marketing_partner` wasn't TOTP-gated at all. Fixed and verified against 6 synthetic-account test paths. Bonus find while auditing: a hardcoded `SUPERADMIN_EMAILS` allowlist was silently denying a second, real, already-provisioned superadmin account from adding organizers — switched to role-based authz. |
| 9 | Second admin/backup-access account | **Turned out to already exist.** A DB query confirmed **two** real superadmin accounts (`tamuka@tyflex.co.zw`, `mediaservad@gmail.com`), both with TOTP already configured — contradicts the original assessment's "single point of failure" framing. The item 8 fix above was what let the second account actually exercise full superadmin capability. |
| 10 | Centralized log shipping to CloudWatch | **Blocked on manual action.** The EC2 instance has no IAM role attached at all (confirmed via the instance metadata endpoint) — nothing can write to CloudWatch Logs until one is. Console steps + what I'll do once unblocked are in `security/CLOUDWATCH_LOGGING_SETUP.md`. |
| 11 | Flip CSP from Report-Only to enforcing | **Not yet — real ongoing violations found, now fixed, still needs a clean window.** Before touching enforcement, pulled real production violation logs rather than trusting the directive list looked complete (per the 2026-07-26 incident's lesson). Found 3 genuine, currently-recurring gaps — missing `blob:` and `i.ytimg.com` in `img-src`, `i.ytimg.com` in `connect-src`, and both Zoom domains in `frame-src` — fixed in both `server/index.js` and the actual enforcing surface (nginx). Flipping to enforcing itself is intentionally deferred to a future pass, once a real clean observation window is confirmed — not bundled into today's fix. |
| 12 | WAF / interim rate-limiting | **Done.** Added an nginx-level `limit_req` zone on `/api/` (20 req/s per IP, burst 50, `nodelay`) — deliberately generous, sitting in front of the app's own finer-grained `express-rate-limit`, so it only engages against genuinely abusive floods rather than duplicating app-level limits. Verified live: 10 sequential normal requests all succeeded (200), an 80-request parallel burst got 76×200 + 4×429 once the burst allowance was exceeded, and normal traffic resumed immediately (200) right after — confirms it's a real leaky-bucket limiter, not a sustained block. Config backed up before the change per `CHANGE_MANAGEMENT.md`. |
| 13 | Document a DR plan (RTO/RPO) | **Done.** See `security/DISASTER_RECOVERY_PLAN.md` — honest estimates (DynamoDB restore ~15–30 min per table, EC2 rebuild ~2–4 hours), explicitly flagged as *estimates*, with a tracked list of what's still unrehearsed/unvalidated (large-table restore timing, a real EC2-rebuild rehearsal, off-instance secrets/nginx-config backup). |
| 14 | Vendor/dependency review | **Done.** See `security/VENDOR_DEPENDENCY_REVIEW.md` — every third party with real data access (AWS, Paynow, Google/Microsoft/Facebook OAuth, Microsoft Graph email, OmniFlex SMS, CC Sales) with what they see and why they're trusted. |

### Phase 2 — 30–90 days (moderate effort, some real engineering)

| # | Action | CAIQ domain(s) helped | Effort |
|---|---|---|---|
| 8 | **Enforce MFA for all `organizer`/`superadmin`/`marketing_partner` roles** — remove the `mfa_exempt` bypass for console-access roles specifically (keep it optional for attendee/exhibitor if desired). | IAM | Medium |
| 9 | **Ship a second admin/backup-access account** with its own MFA device, held by a trusted second party (even the user's own second device counts as a start), to remove the single-point-of-failure risk. | IAM, GRC | Low–Medium |
| 10 | **Add centralized log shipping** — pm2's stdout capture → CloudWatch Logs (a small `pm2-logrotate` + CloudWatch agent setup, or even a scheduled S3 sync) with a defined retention period (e.g. 1 year for security events). | LOG | Medium |
| 11 | **Flip the CSP from `Report-Only` to enforcing**, once a clean browsing period with zero violations is confirmed (per the existing rollout plan already under way). | AIS | Low (already in progress) |
| 12 | **Add a WAF** — AWS WAF in front of the ALB/CloudFront (would require fronting the single EC2 instance with a CloufFront distribution or ALB) or, cheaper, `nginx`-level rate/pattern rules as an interim step. | AIS, IVS | Medium |
| 13 | **Document an actual DR plan**: RTO/RPO targets (even generous ones — "4 hours" is fine for this platform's scale), and what "failover" means today (manually relaunching from an AMI/snapshot). Doesn't require redundant infra yet, just an honest documented plan. | BCM | Medium |
| 14 | **Basic vendor/dependency review pass**: list the third-party services with access to real data (AWS, Paynow, Google/Microsoft/Facebook OAuth, the email provider) and write one line each on what data they see and why they're trusted. | STA | Low–Medium |

### Phase 3 — 90–180+ days (larger investment, do once the platform's revenue/scale justifies it)

| # | Action | CAIQ domain(s) helped | Effort |
|---|---|---|---|
| 15 | **Commission a third-party penetration test** (even a scoped, low-cost one) before/after a major feature push (e.g. before wide Paynow rollout at full scale). This is the single biggest lever for the Threat & Vulnerability Management and Audit & Assurance domains, and the kind of evidence exhibitors/sponsors actually ask for. | TVM, A&A | High (cost) |
| 16 | **Move off a single EC2 instance** toward at least a warm-standby or multi-AZ setup (even a simple AMI-based auto-recovery, or migrating DynamoDB-backed Express app behind an Auto Scaling Group of 2) for real BCM resilience. | BCM, IVS | High |
| 17 | **Formal risk register + quarterly review cadence**, even a simple spreadsheet reviewed every quarter — the actual GRC ask isn't sophistication, it's *evidence of a repeating process*. | GRC, A&A | Medium (process, not tech) |
| 18 | **Automated SAST scanning** (e.g. GitHub CodeQL, Semgrep) added to the same CI pipeline from Phase 1 item 3. | AIS, TVM | Medium |
| 19 | **Data Processing Agreement / privacy policy legal review** — have the existing `PrivacyPolicy.jsx` content reviewed by someone with actual legal competence for Zimbabwe/regional data-protection obligations, not just AI-drafted boilerplate. | DSP | Medium (may need outside help) |
| 20 | **Formal onboarding/offboarding checklist and background-screening step**, once the team grows beyond one or two people. | HRS | Low, but only relevant once hiring starts |

### Phase 1 progress (as of 2026-08-05)

| # | Action | Status |
|---|---|---|
| 1 | Confirm/enable DynamoDB PITR + test a restore | **Done.** PITR was confirmed OFF on all 49 tables, then enabled fleet-wide; a real end-to-end restore was tested (`adma_app_settings` → scratch table → verified identical data → deleted). See `security/BACKUP_AND_RESTORE.md`. |
| 2 | Write an Incident Response plan | **Done.** See `security/INCIDENT_RESPONSE_PLAN.md` — includes the backfilled 2026-07-26 CSP incident as the first log entry. |
| 3 | CI running `npm audit --audit-level=high` | **Done.** `.github/workflows/security-audit.yml`, runs on push/PR/weekly for both `package.json` and `server/package.json`. Non-breaking fixes already applied (7→5 frontend findings, backend already clean at 0). Remaining findings need major version bumps not safe to force blindly: **`react-router` v7→v8** (core to the live app's routing — genuinely web-reachable, needs real regression testing before touching) and **`pdfjs-dist` v3→v6** (flagged CVE is "arbitrary JS execution on a malicious PDF," but confirmed via grep that `pdfjs-dist` is used **only** by two standalone local scripts, `scripts/convert-*.mjs`, run manually by the operator against self-authored magazine PDFs — not imported anywhere in `src/`, so it has **no live attack surface through the deployed website**. Still worth fixing eventually, just not urgent.). Tracked here rather than silently ignored — CI will correctly show this as red until addressed. |
| 4 | Document the change-management process | **Done.** See `security/CHANGE_MANAGEMENT.md`. |
| 5 | Data classification + retention statement | **Done.** See `security/DATA_CLASSIFICATION_AND_RETENTION.md`. |
| 6 | Enable AWS CloudTrail | **Blocked on manual action.** The app's IAM credentials are correctly scoped to DynamoDB/S3 only and cannot enable CloudTrail (confirmed via a real `AccessDeniedException`). Exact console steps are in `security/CLOUDTRAIL_SETUP.md` — needs the account owner to do this once. |
| 7 | Acceptable Use / confidentiality note | **Done.** See `security/ACCEPTABLE_USE_POLICY.md`. |

### Rough score impact

Phase 1 alone (documentation-heavy, ~1 week of focused effort) should meaningfully lift **Audit & Assurance, Governance, Business Continuity, Logging, and Change Control** from ~0–48% toward 40–60%+, since most of those items convert existing informal practice into a documented "Yes"/"Partial." Phase 2 pushes Identity & Access Management and Application & Interface Security into the 70–90% range. Phase 3 is what would be needed to responsibly claim CSA STAR Level 2 (independently audited) rather than Level 1 (self-assessed).

## 6. Methodology & Limitations

- This is a **self-assessment produced by an AI coding assistant reading the ADMA Digital codebase, deployment notes, and prior project history** — it is not an independent audit, and CSA STAR requires either a self-assessment (Level 1, which this satisfies) or a third-party attestation (Level 2, which this does **not** satisfy).
- Answers were derived from: direct code inspection (`server/index.js`, `server/lib/*`, `server/routes/*`, `package.json` dependencies), prior verified project history (session/RBAC rollout, Paynow integration, CSP incident), and reasonable defaults for organizational/HR/governance questions where no counter-evidence exists in the repo (mostly answered "No" — absence of a policy doc was treated as absence of the control, which is the standard conservative CAIQ convention).
- Some answers may be **more pessimistic than reality** if a policy or process exists outside this repository (e.g. verbally agreed, or documented elsewhere) that wasn't visible to this review — worth a manual pass over the "No" rows in the spreadsheet to correct any of those.
- Some answers may be **more optimistic than reality** if a control that "looks" implemented in code has a bug or isn't actually active in production (e.g. DynamoDB PITR — flagged above as "not confirmed," deliberately not assumed either way).
- The completed questionnaire (`ADMA_CAIQ_v4.0.3_Completed_2026-08-04.xlsx`, saved alongside this report) preserves the standard CAIQ v4.0.3 question set and CCM control mapping, with three added columns: **CAIQ Answer** (Yes/Partial/No/N/A), **SSRM Control Ownership** (who owns the control — ADMA vs. inherited from AWS vs. shared), and **Implementation Notes/Evidence** (the specific reasoning behind each answer, referencing real files/systems where applicable). Filter/sort by the "No" answers in that sheet to work the backlog directly.

---
*Generated 2026-08-04. Re-run this assessment after completing Phase 1 to get an updated score.*
