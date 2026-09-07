# ADMA Digital — CSA CAIQ v4.0.3 Self-Assessment & Security Improvement Plan

**Date:** 2026-08-04 (baseline) — **re-scored 2026-08-05, 2026-08-28, 2026-08-31** after executing Phases 1–3 plus ongoing work
**Scope:** ADMA Digital platform (React/Vite/Tailwind PWA + Express/DynamoDB API, two AWS EC2 instances + a video-compression Lambda, region af-south-1)
**Framework:** Cloud Security Alliance Consensus Assessments Initiative Questionnaire (CAIQ) v4.0.3 — 263 questions across 17 Cloud Controls Matrix (CCM) domains
**Prepared as:** Level 1 self-assessment (no independent/third-party verification yet — see [Methodology & Limitations](#methodology--limitations))

---

## 0. Re-score — overall: 31.7% → 60.8% → 64.2% → 64.8% → 65.4% → 66.1% → 66.5% → **66.9%** (2026-08-04 through 2026-08-31)

The full 263-question questionnaire was re-scored, question by question, against everything shipped across Phases 1–3 plus the CloudShell-executed AWS infrastructure work (CloudTrail, CloudWatch log shipping, automated snapshots/auto-recovery). This was a **real re-score, not an estimate** — every one of the changed answers cites the specific document or verified technical artifact behind it (see the updated `ADMA_CAIQ_v4.0.3_Completed_2026-08-31.xlsx`, kept alongside every prior dated file for audit trail rather than overwriting them; Round 5 and 5b share this same file, same-day-round convention from Round 4/4b).

| | 2026-08-04 | Round 1 | Round 2 | Round 3 | Round 4 | Round 4b | Round 5 | **Round 5b** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Overall score** | 31.7% | 60.8% | 64.2% | 64.8% | 65.4% | 66.1% | 66.5% | **66.9%** |
| Answered Yes | 30 | 95 | 104 | 106 | 106 | 108 | 110 | 112 |
| Answered Partial | 96 | 109 | 108 | 107 | 110 | 109 | 107 | 105 |
| Answered No | 120 | 42 | 34 | 33 | 30 | 29 | 29 | 29 |
| N/A | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 |

### Round 4 (2026-08-28) — a small, honest movement

This round is deliberately modest — 10 rows touched, only 3 of which actually moved an answer (all No→Partial), against real new evidence from a genuine multi-day gap of production work rather than a dedicated remediation sprint. See `ADMA_CAIQ_v4.0.3_Completed_2026-08-28.xlsx` for the full sheet; every change is marked "UPDATE 2026-08-28" in its notes column, same convention as prior rounds.

**What moved an answer:**
- **STA-10.1, STA-13.1** (No → Partial) — `VENDOR_DEPENDENCY_REVIEW.md`'s "at minimum annually" review commitment is a real, if partial, analog to "supply chain agreements reviewed annually" and "partner governance reviewed periodically," matching the reasoning already applied to STA-05.1/STA-14.1 in Round 3 but never extended to these two.
- **TVM-10.1** (No → Partial) — a **consistency correction**, not new evidence: `.github/workflows/security-audit.yml` running on every push/PR plus weekly already justified TVM-03.1/05.1/07.1 moving to Yes/Partial in Round 3, but was never applied to this near-identical sub-question about reporting metrics at defined intervals. Found while reviewing the domain for unrelated reasons — flagged and fixed rather than left inconsistent.

**What got stronger evidence without changing the answer** (DSP-05.2, IAM-01.2, IAM-03.1, SEF-01.1, SEF-04.1, SEF-06.1, CCC-02.1) — real events genuinely worth recording even though none were enough alone to flip Partial→Yes:
- **A real IAM access review happened** (not just a policy statement about one): the interactive/CLI credential (`adma-vscode-cli`) was found holding two AWS-managed FullAccess policies far broader than anything it actually used, replaced with scoped equivalents, and the tightening was verified with real denied-access tests — not assumed. (IAM-01.2, IAM-03.1)
- **A second real incident was logged and, unlike the first, directly drove a same-day process change** — a SEV1 memory-exhaustion outage, caused by maintenance work run directly on the production instances, led immediately to a concrete change (disk-backed paths, targeted installs instead of full reinstalls) rather than just a written retro. That's real evidence the incident response plan is a living process, not a document read once and filed. (SEF-01.1, SEF-04.1, SEF-06.1)
- **A new data flow was documented at the moment it was introduced**, not after the fact: AWS Bedrock (`server/lib/ai.js`) sends exhibitor business text to an AI model in **us-east-1** — a genuine cross-border transfer distinct from the rest of the AWS footprint (af-south-1) — and `DATA_CLASSIFICATION_AND_RETENTION.md`, `VENDOR_DEPENDENCY_REVIEW.md`, and the public Privacy Policy were all updated the same day, before this re-score, not as part of it. (DSP-05.2)
- **A concrete example of the change-testing standard**: every change this session went through an isolated build-check (a disk-backed copy with symlinked `node_modules`, ESLint + a full `vite build`) on its own branch before merging and deploying — applied consistently across 6+ separate changes, not asserted once. (CCC-02.1)

**A correction that went the other way, outside the spreadsheet:** `RISK_REGISTER.md` #7 previously stated `pdfjs-dist`'s known CVE "has no live attack surface" since it was only used in offline scripts. That's no longer true — a PDF-logo-upload feature now runs the same library against user-supplied files directly in the browser. No CAIQ question hinges narrowly enough on this to flip, but the risk register and this document's own prior TVM narrative were both corrected rather than left stating something now false. This is exactly the kind of finding CAIQ's honesty is supposed to surface — a security posture correctly *decreasing* somewhere, alongside genuine gains elsewhere.

**New infrastructure this round, documented but not yet claimed as a CAIQ positive anywhere:** a video-compression Lambda (`adma-video-compress`, S3-triggered, its own scoped IAM role, a custom ffmpeg layer) — see `security/VIDEO_COMPRESSION_LAMBDA.md`. Deliberately not cited toward any specific answer above; it's new enough, and its own "known gaps" section (no failure alerting, built by hand not IaC) honest enough, that claiming it as evidence this round would be premature.

### Round 4b (same day) — the flagged stale blocks, fixed

Round 4 flagged two pre-existing stale blocks rather than rushing them; asked directly whether to fix them or move to something else, the answer was to finish them. 27 rows reviewed individually (same per-question rigor as every other round — no bulk find-replace), 3 more answers moved:

- **DSP block** (11 of the 12 flagged rows) — `DATA_CLASSIFICATION_AND_RETENTION.md`'s four sections (classification, retention, deletion, encryption) turned out to substantively answer most of them once actually cited: DSP-06.2 moved **Partial→Yes** (identical §5 annual-review evidence already credited to DSP-01.2, just never cross-applied — a consistency fix), DSP-12.1 moved **No→Partial** (the Privacy Policy's declared-purposes section plus per-record ownership scoping). The rest kept their answer but got real citations replacing the stale boilerplate — including DSP-10.1, which now cites the very AWS Bedrock disclosure work from earlier in this same round. **Left alone on purpose:** DSP-15.1 (production-data-in-non-production) — no real evidence either way, not worth stretching for.
- **LOG block** (all 10 flagged rows) — the false "no... AWS CloudTrail" claim (wrong since 2026-08-05) removed from every row. LOG-06.1 moved **Partial→Yes** (reliable time source is inherited from AWS's own NTP infrastructure, same SSRM basis as Datacenter Security's 100%) — a clean, direct match once actually checked. The rest correctly stayed Partial: collection existing isn't the same as active anomaly monitoring/alerting, which genuinely still doesn't exist (LOG-03.2 stays "No" for the same reason, untouched).
- **BCR block** (6 of 7 rows, found while reviewing LOG) — "no failover/redundancy" was itself stale, unchanged since before the warm-standby instance went live (2026-08-06). Corrected to reflect what's real: a manually-promoted (not automatic) standby, verified reachable end-to-end. No answers moved — a real capability gap (manual vs. automatic) remains, just described accurately now instead of as "nothing exists." **Left alone:** BCR-10.2 (local emergency authorities in DR exercises) — not a realistic fit for this team's actual DR testing, no evidence to cite.

Net effect: 66.1%, and — as important as the number — DSP (72.9%) and LOG (66.7%) domains no longer contain a demonstrably false factual claim anywhere in this document.

**Round 2** added a batch of low-cost, zero-risk documentation: `security/INTEROPERABILITY_AND_API_POLICY.md` and `security/GOVERNANCE_ADDENDUM.md` (new), plus explicit annual-review-cadence commitments added to five existing policy docs that were previously missing one. 15 more answers changed. **Interoperability & Portability alone moved from 37.5% to 68.8%** — the export feature did the heavy lifting in round 1, and formalizing the surrounding policy closed most of the rest.

**Round 3** followed the go-ahead to pursue real multi-AZ infrastructure. A warm-standby EC2 instance is now live in a different availability zone (`security/PROMOTION_RUNBOOK.md`), verified reachable and healthy end-to-end from outside — not just launched. That's a direct, clean match for BCR-11.1 ("redundant equipment independently located"), which had been a correctly-honest "No" through rounds 1–2 since no such redundancy existed yet. **Business Continuity Management moved from 69.4% to 77.8%.**

### Round 5 (2026-08-31) — the ALB/WAF cutover, and a correction to the earlier estimate

The infrastructure this document's own "Is 80% reachable?" section (below) said would move the score most — ALB + WAF fronting both instances — is now genuinely live: `adma-alb` load-balances both EC2 instances (both `healthy`), terminates TLS with a real ACM cert, redirects HTTP→HTTPS, sits behind WAF (AWS Managed Rule Groups), and the shared security group is restricted to ALB-only. Not provisioned-and-idle — real production traffic (`admadigital.co.zw`) has been cut over to it and verified end-to-end.

**The honest result: +0.4 points (66.1% → 66.5%), not the +5–6 points estimated below.** Reviewing all 14 Infrastructure & Virtualization Security rows individually (not a bulk find-replace) found the earlier estimate was optimistic: the shared evidence blurb on those rows lists several gaps together ("no formal hardening baseline, network segmentation, WAF, or IDS/IPS"), but WAF/segmentation was only ever the *specific* blocker for one of them:

- **IVS-03.5** (Partial→Yes) — "network configurations supported by documented justification of all allowed services/protocols/ports" — the SG lockdown plus its documented justification (`RISK_REGISTER.md` #17–#19) is a direct, clean match.
- The other 8 Partial IVS rows are Partial for reasons WAF/segmentation doesn't touch at all: no formal *written* policy document (IVS-01.1/01.2), no annual network-config review cadence (IVS-03.4), the ALB→instance leg now being unencrypted internally — a new nuance worth flagging honestly, not something to gloss over (IVS-03.2), no OS/hypervisor hardening baseline like a CIS benchmark (IVS-04.1), no non-production environment (IVS-05.1), multi-tenant infrastructure isolation being a different concept from public→ALB→backend segmentation (IVS-06.1), and cloud-migration-specific encryption (IVS-07.1). Each got an honest `UPDATE 2026-08-31` note correcting the stale "no WAF/segmentation" framing without inflating the verdict.

**Business Continuity Management moved similarly** — one row, not several. **BCR-04.1** (Partial→Yes) specifically asked whether "operational resilience capability results" are incorporated into the BC plan; the ALB's automatic health-check-driven traffic failover is a real new capability, now also documented in `PROMOTION_RUNBOOK.md`'s new "ALB automatic traffic failover" section (not just infrastructure existing — the plan document was updated to actually incorporate it). BCR-01.1, BCR-02.1, and BCR-07.1 got the same honest correction as the IVS rows above without their verdicts moving — they're Partial for a broader policy-completeness bar than one new capability satisfies.

**Two real incidents happened during this rollout, both caught and fixed within minutes, both recorded honestly in `RISK_REGISTER.md`** (#19, and the ordering mistake noted in #2) rather than omitted because the outcome was ultimately good: a stray second IP on the DNS A record (inherited from the original DirectAdmin migration, never questioned until it started serving an unrelated certificate) caused a real "connection not private" warning for a live visitor; and the security group was tightened once *before* DNS actually pointed at the ALB, causing a brief self-inflicted outage until reverted and redone in the correct order.

**The lesson for future estimates in this document**: a shared evidence blurb across many rows describing several gaps together doesn't mean fixing one of those gaps moves all the rows — check each question's actual bar individually before estimating impact, the same discipline this document already applies when actually scoring.

### Round 5b (same day) — the Cryptography domain's own stale block, found while checking for more

Asked directly what else could move the score, rather than guess, the answer was to actually check the domains this document hadn't recently reviewed row-by-row — Cryptography, Governance/Risk, and Supply Chain. Governance and Supply Chain turned out to already be accurate (every Partial/No row already cites real, current evidence — nothing stale found). **Cryptography had the exact same stale-block pattern Round 4b found in DSP/LOG/BCR**: `KEY_MANAGEMENT_POLICY.md` has existed since 2026-08-05 (26 days), cross-applied to 9 of 23 rows at the time, but never extended to the other 14 — 13 of which still said "no formal key management policy... relies on AWS-managed default keys" verbatim, describing a document that had existed for weeks.

Checked all 23 rows individually against what the policy actually covers (not a bulk find-replace):
- **CEK-03.1** (Partial→Yes) — "data at-rest/in-transit cryptographically protected using approved-standard libraries" — Policy §1/§2 (AES-256 at rest, TLS 1.2+ in transit) is a direct match, same reasoning already credited to the near-identical CEK-04.1.
- **CEK-11.1** (Partial→Yes) — "private keys provisioned for a unique purpose... managed" — Policy §3's per-secret-type table is a direct match, same reasoning already credited to CEK-10.1 and CEK-21.1.
- **The other 11 stale rows kept their verdict** (CEK-06.1, 08.1, 09.1, 09.2, 12.1, 14.1, 15.1–20.1) but got the same false-claim removed and replaced with the *real* reason they're still Partial/No — mostly genuine gaps the policy itself honestly flags as open (no rotation schedule, no destruction process, no formal lifecycle-state procedures for suspension/activation/compromise, self-review isn't the same as independent audit). One (CEK-08.1) turned out to be Partial for an entirely different reason than the stale text implied — it's about giving *customers* self-service key management, not about ADMA's own internal documentation, which the stale text had conflated.

**Cryptography moved 50.0% → 54.3%.** Net effect this round: **66.5% → 66.9%.**

### Is 80% realistically reachable?

Ran the math honestly rather than assuming yes because it was asked for. **80% is not reachable through more documentation or infrastructure work alone.** Three domains are structurally capped by things that take calendar time, not engineering effort:
- **Threat & Vulnerability Management (50.0%)** — capped without an independent pentest (TVM-06.1 alone, plus the malware-protection sub-questions, which are genuinely not applicable without a managed endpoint fleet).
- **Audit & Assurance (31.3%)** — three of its eight questions (A&A-02/03/04) specifically require an *independent* assessment; no amount of internal documentation satisfies "independent."
- **Human Resources (27.5%)** — background-check and formal-employment-agreement questions that only make sense once hiring grows past people already known personally.

**Update 2026-08-31 — this paragraph originally estimated real multi-AZ infrastructure (ALB + WAF) would add roughly +5–6 points; see Round 5 above for what actually happened once it was built and cut over to real traffic: +0.4 points (66.1%→66.5%), not +5–6.** The estimate assumed most of Infrastructure & Virtualization Security's Partial rows were Partial specifically *because* of missing WAF/segmentation; checking each row's actual bar individually found only one genuinely was. Infrastructure & Virtualization Security moved 67.9%→71.4% and Business Continuity Management 77.8%→80.6% — real, honest gains, just smaller than first estimated. The ALB/WAF work was still worth doing independently of CAIQ — it's the infrastructure the 2026-08-28 SEV1 incident (`INCIDENT_RESPONSE_PLAN.md`) argued for on its own merits (no load balancer meant one instance's resource exhaustion was a full outage, which is exactly what happened) — it just wasn't the path to 80% this document once thought it was.

**The highest-leverage next step toward 80% is the pentest** (`security/PENTEST_SCOPE.md`, ~$1,500–4,000) — it's the only lever that unlocks meaningful movement in both Threat & Vulnerability Management *and* Audit & Assurance at once, and it's evidence a market/exhibitor audience actually recognizes, unlike another internal policy document.

**What moved it, roughly in order of impact:** the self-service data export endpoint (single-handedly took Interoperability & Portability from 0% to 37.5% — CAIQ's IPY-02.1 asks almost verbatim for exactly that capability), the real MFA-enforcement bug fix plus extensive IAM-segregation proof (IAM 54.8%→81.0%), the Incident Response/Risk Register/Vendor Review/Key Management/Data Classification policy documents (each directly and specifically answering several questions, not just generically "showing effort"), and CloudTrail+CloudWatch both being verified genuinely delivering events, not just configured (Logging 47.2%→63.9%, Audit & Assurance 0%→31.3%).

**What correctly stayed weak, and why that's honest rather than a gap in the exercise:** Threat & Vulnerability Management (45.8%) still has no independent pentest — that single control (TVM-06.1) was left "No" on purpose, since a scope document isn't the same as a completed test. Human Resources (25.0%) still lacks background-check/employment-agreement processes that only make sense once hiring starts beyond people already known personally. Audit & Assurance (31.3%) still lacks any independent third-party assessment. These three are exactly the items still flagged as open in `RISK_REGISTER.md` — the score and the risk register agree with each other, which is itself a small piece of evidence the re-score wasn't inflated.

**A minor data-hygiene note surfaced during the re-score, with zero score impact:** two rows in the original spreadsheet build (an "End of Standard" marker and the CSA copyright footer) were accidentally included as if they were real questions, both auto-tagged N/A under Universal Endpoint Management. Since N/A rows are excluded from the score calculation either way, this doesn't change the 246-applicable-question denominator or the final percentage — flagged here for transparency, not corrected in-place to avoid restructuring a historical document under time pressure.

## 1. Executive Summary (original, 2026-08-04 baseline)

| | |
|---|---|
| **Overall score** | **31.7%** (of 246 applicable questions; 17 questions marked N/A) — **see Section 0 for the current 64.8% re-score** |
| **Answered Yes** | 30 |
| **Answered Partial** | 96 |
| **Answered No** | 120 |
| **N/A** | 17 |
| **CSA STAR level today** | Not yet published — this exercise is the prerequisite for **STAR Level 1 (Self-Assessment)** |

ADMA Digital is a small, fast-moving team operating a real production platform with real payment (Paynow) and personal-data flows, and it already has **meaningfully better technical security than its process maturity suggests**: server-side sessions, RBAC, per-record ownership scoping, TOTP MFA, bcrypt hashing, rate limiting, and a scoped AWS IAM credential are all shipped and working. What's missing is almost entirely **governance and documentation** — audit, risk, incident response, HR/vendor policy, backup/DR — the parts of CAIQ that assume a org with a dedicated security function, which a two-person team building a trade-show platform hasn't needed until now.

**The score is low mainly because CAIQ scores the *absence of a paper trail*, not just the absence of controls.** Several "No" answers below describe things ADMA already effectively does informally (e.g. change control via git) but has never written down as a policy — those are the cheapest points to recover.

## 2. Score by CCM Domain

**All snapshots shown** — 2026-08-04 (original) through Round 5 (current) — sorted by the current score, lowest → highest.

| Domain | 2026-08-04 | Round 1 | Round 2 | Round 3 | Round 4 | Round 4b | Round 5 | **Round 5b (current)** | Qs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Human Resources | 0.0% | 25.0% | 27.5% | 27.5% | 27.5% | 27.5% | 27.5% | **27.5%** | 20 |
| Audit & Assurance | 0.0% | 31.3% | 31.3% | 31.3% | 31.3% | 31.3% | 31.3% | **31.3%** | 8 |
| Threat & Vulnerability Management | 0.0% | 45.8% | 45.8% | 45.8% | 50.0% | 50.0% | 50.0% | **50.0%** | 12 |
| Governance, Risk and Compliance | 0.0% | 44.4% | 50.0% | 50.0% | 50.0% | 50.0% | 50.0% | **50.0%** | 9 |
| Supply Chain Mgmt, Transparency & Accountability | 0.0% | 43.3% | 46.7% | 46.7% | 53.3% | 53.3% | 53.3% | **53.3%** | 15 |
| Cryptography, Encryption & Key Management | 21.7% | 47.8% | 50.0% | 50.0% | 50.0% | 50.0% | 50.0% | **54.3%** | 23 |
| Logging and Monitoring | 47.2% | 63.9% | 63.9% | 63.9% | 63.9% | 66.7% | 66.7% | **66.7%** | 18 |
| Interoperability & Portability | 0.0% | 37.5% | 68.8% | 68.8% | 68.8% | 68.8% | 68.8% | **68.8%** | 8 |
| Infrastructure & Virtualization Security | 50.0% | 67.9% | 67.9% | 67.9% | 67.9% | 67.9% | 71.4% | **71.4%** | 14 |
| Application & Interface Security | 50.0% | 72.7% | 72.7% | 72.7% | 72.7% | 72.7% | 72.7% | **72.7%** | 11 |
| Security Incident Mgmt, E-Discovery & Cloud Forensics | 0.0% | 59.1% | 72.7% | 72.7% | 72.7% | 72.7% | 72.7% | **72.7%** | 11 |
| Data Security and Privacy Lifecycle Management | 43.8% | 66.7% | 68.8% | 68.8% | 68.8% | 72.9% | 72.9% | **72.9%** | 24 |
| Business Continuity Mgmt & Operational Resilience | 0.0% | 61.1% | 69.4% | 77.8% | 77.8% | 77.8% | 80.6% | **80.6%** | 18 |
| Identity & Access Management | 54.8% | 81.0% | 81.0% | 81.0% | 81.0% | 81.0% | 81.0% | **81.0%** | 21 |
| Change Control and Configuration Management | 63.6% | 86.4% | 90.9% | 90.9% | 90.9% | 90.9% | 90.9% | **90.9%** | 11 |
| Datacenter Security | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | **100.0%** | 23 |
| Universal Endpoint Management | N/A | N/A | N/A | N/A | N/A | N/A | N/A | **N/A** | 17 |

Round 4 moved Threat & Vulnerability Management and Supply Chain Management. Round 4b (same day, the flagged-stale-block follow-up) moved Data Security and Privacy (68.8%→72.9%) and Logging and Monitoring (63.9%→66.7%). Round 5 (2026-08-31, the ALB/WAF cutover) moved Infrastructure & Virtualization Security (67.9%→71.4%, one row of 14) and Business Continuity Mgmt (77.8%→80.6%, one row of 18). Round 5b (same day, checking Cryptography/Governance/Supply Chain for the same staleness) moved Cryptography (50.0%→54.3%, 2 rows of 23) — Governance and Supply Chain were already accurate, nothing to fix. Every other domain is carried forward unchanged.

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
| 10 | Centralized log shipping to CloudWatch | **Done, 2026-08-05.** The EC2 instance initially had no IAM role attached at all (confirmed via the instance metadata endpoint) — the account owner attached `EC2-SSM-Role` with `CloudWatchAgentServerPolicy` via CloudShell, then the CloudWatch agent was installed and configured over SSH. Verified genuinely receiving events (real timestamps on both log streams within seconds), 365-day retention. See `security/CLOUDWATCH_LOGGING_SETUP.md`. |
| 11 | Flip CSP from Report-Only to enforcing | **Not yet — deliberately waiting on a real clean window, confirmed with the user.** Before touching enforcement, pulled real production violation logs rather than trusting the directive list looked complete (per the 2026-07-26 incident's lesson). Found 3 genuine, currently-recurring gaps — missing `blob:` and `i.ytimg.com` in `img-src`, `i.ytimg.com` in `connect-src`, and both Zoom domains in `frame-src` — fixed in both `server/index.js` and the actual enforcing surface (nginx) at ~15:51 UTC 2026-08-05. Checked again afterward: only ~50 minutes of clean traffic had passed against a history of violations roughly every few hours to a day — nowhere near enough. Asked the user directly rather than guessing; they chose to wait for a real 24-48h clean window before flipping. **Target re-check: ~2026-08-07.** No AWS cost either way — this is a free header change, the only "cost" is the risk of a repeat outage if flipped too early. |
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
| 6 | Enable AWS CloudTrail | **Done, 2026-08-05, via CloudShell.** The app's IAM credentials are correctly scoped to DynamoDB/S3 only and couldn't do this (confirmed via a real `AccessDeniedException`), so the account owner ran it via CloudShell. Multi-region trail, verified genuinely delivering real log files to S3 (not just `IsLogging: true`). See `security/CLOUDTRAIL_SETUP.md`. |
| 7 | Acceptable Use / confidentiality note | **Done.** See `security/ACCEPTABLE_USE_POLICY.md`. |

### Phase 3 progress (as of 2026-08-05)

| # | Action | Status |
|---|---|---|
| 15 | Commission a third-party penetration test | **Scope + real cost estimate ready, not commissioned** — commissioning needs real budget/vendor engagement, which I can't do myself. See `security/PENTEST_SCOPE.md`: **~$1,500–4,000 USD** for a 3-5 day scoped grey-box engagement, cheapest via a regional (South Africa/Zimbabwe) firm rather than an international brand-name one. |
| 16 | Move off a single EC2 instance | **Option 1 done, 2026-08-05, via CloudShell (~$1-5/month).** Directly tested first (not assumed) — `ec2:DescribeInstances`/`CreateImage`/`CreateSnapshot`, DLM, and a CloudWatch-alarm-only approach were all denied to the app's own credentials, the last one needing `iam:CreateServiceLinkedRole` specifically — so the account owner ran it via CloudShell instead. Live: a DLM policy for daily automated EBS snapshots (7-day retention) and a CloudWatch alarm that auto-recovers the instance on a hardware-level status check failure. Options 2 (warm standby, ~$10–15/mo) and 3 (full multi-AZ, ~$35–50+/mo) remain open, gated on scale — see `security/INFRASTRUCTURE_RESILIENCE_OUTLINE.md`. |
| 17 | Formal risk register | **Done.** See `security/RISK_REGISTER.md` — 12 open/tracked risks synthesized from everything found across Phases 1–3, plus a "resolved since 2026-08-04" section so closed risks aren't silently dropped from the record. |
| 18 | Automated SAST scanning | **Done.** `.github/workflows/codeql.yml` — GitHub CodeQL, `security-and-quality` query suite, JavaScript/TypeScript (covers both frontend and backend), runs on push/PR/weekly. Free for this repo (public). |
| 19 | Privacy policy legal review / DPA | **Self-review pass done (not a substitute for real legal review).** Found and fixed one concrete factual gap: the policy (dated 26 July) never mentioned Paynow despite real payment processing shipping 2026-08-04 — added. 7 other items flagged in `security/PRIVACY_POLICY_REVIEW_NOTES.md` that genuinely need a lawyer's judgment (international transfer disclosure, named regulator, legal basis framing, minors policy, financial retention minimums, cookie disclosure, public breach-notification commitment) — explicitly not resolved here. |
| 20 | Onboarding/offboarding checklist | **Done, prepared ahead of need.** See `security/ONBOARDING_OFFBOARDING.md` — not yet exercised since the team hasn't grown, but ready for the first hire/contractor. |

### Rough score impact

Phase 1 alone (documentation-heavy, ~1 week of focused effort) should meaningfully lift **Audit & Assurance, Governance, Business Continuity, Logging, and Change Control** from ~0–48% toward 40–60%+, since most of those items convert existing informal practice into a documented "Yes"/"Partial." Phase 2 pushes Identity & Access Management and Application & Interface Security into the 70–90% range. Phase 3 is what would be needed to responsibly claim CSA STAR Level 2 (independently audited) rather than Level 1 (self-assessed).

## 6. Methodology & Limitations

- This is a **self-assessment produced by an AI coding assistant reading the ADMA Digital codebase, deployment notes, and prior project history** — it is not an independent audit, and CSA STAR requires either a self-assessment (Level 1, which this satisfies) or a third-party attestation (Level 2, which this does **not** satisfy).
- Answers were derived from: direct code inspection (`server/index.js`, `server/lib/*`, `server/routes/*`, `package.json` dependencies), prior verified project history (session/RBAC rollout, Paynow integration, CSP incident), and reasonable defaults for organizational/HR/governance questions where no counter-evidence exists in the repo (mostly answered "No" — absence of a policy doc was treated as absence of the control, which is the standard conservative CAIQ convention).
- Some answers may be **more pessimistic than reality** if a policy or process exists outside this repository (e.g. verbally agreed, or documented elsewhere) that wasn't visible to this review — worth a manual pass over the "No" rows in the spreadsheet to correct any of those.
- Some answers may be **more optimistic than reality** if a control that "looks" implemented in code has a bug or isn't actually active in production (e.g. DynamoDB PITR — flagged above as "not confirmed," deliberately not assumed either way).
- The completed questionnaire — `ADMA_CAIQ_v4.0.3_Completed_2026-08-04.xlsx` (original baseline), `ADMA_CAIQ_v4.0.3_Completed_2026-08-05.xlsx` (Round 1–3), and `ADMA_CAIQ_v4.0.3_Completed_2026-08-28.xlsx` (**Round 4 + 4b, current**) — all kept, none overwritten, for audit trail — preserves the standard CAIQ v4.0.3 question set and CCM control mapping, with three added columns: **CAIQ Answer** (Yes/Partial/No/N/A), **SSRM Control Ownership** (who owns the control — ADMA vs. inherited from AWS vs. shared), and **Implementation Notes/Evidence** (the specific reasoning behind each answer, referencing real files/systems where applicable — every change is prefixed "UPDATE \<date\>:" in that column so the diff from baseline is traceable within the sheet itself). Filter/sort by the "No" answers in the current sheet to work the backlog directly.
- The 2026-08-05 re-score changed 117 of 263 answers; the combined 2026-08-28 rounds changed 37 (Round 4: 10 rows, 3 answer flips; Round 4b: 27 rows, 3 more answer flips — 6 total this session, all No→Partial or Partial→Yes, never the reverse except the one deliberate correction below). Every change is a question-level judgment grounded in a specific, named, real artifact (a document, a verified deployed feature, a directly-tested IAM permission) — not a blanket domain-wide bump. Where no new evidence existed for a specific question, its answer was left exactly as it was, even within domains that moved substantially overall (e.g. Threat & Vulnerability Management's pentest question, TVM-06.1, stayed "No").
- Round 4b closed out the two stale blocks Round 4 had flagged rather than rushed (see Section 0) — three rows were deliberately left untouched even after review (DSP-15.1, BCR-10.2, LOG-03.2) because no real evidence existed to cite either way, not because they were skipped.
- Separately, `RISK_REGISTER.md` #7 moved in the *other* direction this session — a prior "no live attack surface" claim about `pdfjs-dist` became false partway through the day once a PDF-upload feature shipped, and was corrected rather than left standing. Not reflected as a CAIQ answer change (no single question hinges narrowly enough on it), but recorded here since a re-score that only ever reports gains isn't a credible one.

---
*Generated 2026-08-04. Re-scored 2026-08-05 (Rounds 1–3), 2026-08-28 (Round 4 + 4b), 2026-08-31 (Round 5 — ALB/WAF cutover; Round 5b — Cryptography stale-block correction) — see Section 0. Next re-score due after CSP flips to enforcing, a pentest is commissioned, or the next major phase of work lands, whichever comes first.*
