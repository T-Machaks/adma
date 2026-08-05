# ADMA Digital — Risk Register

**Effective:** 2026-08-05
**Review cadence:** quarterly at minimum, and after any incident (per `INCIDENT_RESPONSE_PLAN.md`) or major feature push. The point of this document isn't sophistication — it's evidence of a repeating process (CAIQ Phase 3 item 17).

**Scoring:** Likelihood and Impact each rated Low/Medium/High. Risk = the combination, not a formula — used to order the backlog, not to pretend false precision.

| # | Risk | Likelihood | Impact | Risk | Owner | Status | Mitigation | Next review |
|---|---|---|---|---|---|---|---|---|
| 1 | No independent penetration test has ever been performed | Medium | High | **High** | Platform operator | Open | Scope + cost estimate ready in `PENTEST_SCOPE.md` (~$1,500–4,000 for a regional-firm scoped engagement); needs budget approval to commission (CAIQ Phase 3 item 15) | Before next major feature push, or 2027 site plan launch |
| 2 | Single EC2 instance, no redundant/multi-AZ infrastructure | Low (no incident to date) | Medium (a warm standby exists, but promotion is manual and unrehearsed) | **Low** | Platform operator | **Mitigated 2026-08-05/06** (options 1 & 2) | Automated daily EBS snapshots + EC2 auto-recovery alarm (option 1, ~$1-5/mo), plus a live warm-standby instance in a different AZ (option 2, ~$10-15/mo — see `PROMOTION_RUNBOOK.md`). Only gap left: the promotion runbook has never been rehearsed end-to-end. Full automatic multi-AZ (option 3) still open, ~$35-50+/mo, gated on scale | Rehearse promotion runbook within 90 days; revisit option 3 at next funding/revenue milestone |
| 3 | `server/.env` secrets and nginx config exist only on the EC2 instance, no off-instance backup | Low | High (re-provisioning every credential from scratch on instance loss) | **Medium** | Platform operator | Open | Tracked in `DISASTER_RECOVERY_PLAN.md` §5 | Next DR plan review |
| 4 | AWS CloudTrail not enabled — no audit trail of AWS-account-level actions | Medium | Medium | ~~Medium~~ **Closed** | Platform operator | **Closed 2026-08-05.** Verified genuinely delivering log files, not just configured — see `CLOUDTRAIL_SETUP.md` | — | — |
| 5 | No centralized log shipping (CloudWatch) — security logs live only in pm2's local stdout capture | Medium | Medium | ~~Medium~~ **Closed** | Platform operator | **Closed 2026-08-05.** CloudWatch agent shipping pm2 logs, verified receiving real events, 365-day retention — see `CLOUDWATCH_LOGGING_SETUP.md` | — | — |
| 6 | CSP still in Report-Only mode — not actually blocking any injection in production | Medium | Medium | **Medium** | Platform operator / Claude | Open, in progress | 3 real gaps found and fixed 2026-08-05 (`i.ytimg.com`, `blob:`, Zoom); needs one more clean observation window before flipping to enforcing (learned from the 2026-07-26 incident — never flip on an assumption again) | Re-check violation logs in ~2-4 weeks, then flip if clean |
| 7 | Two frontend dependencies have unpatched high/critical CVEs (`react-router`, `pdfjs-dist`) needing major version bumps | Low (pdfjs-dist has no live attack surface) / Low-Medium (react-router is web-reachable but CVE is narrow — RSC mode CSRF, a mode this app doesn't use) | Medium | **Low-Medium** | Platform operator / Claude | Open, tracked | CI (`security-audit.yml`) surfaces this on every push; fix requires dedicated regression testing of the app's routing before the `react-router` major bump | Next dependency-focused pass |
| 8 | No customer-managed KMS encryption keys — relies entirely on AWS default encryption | Low | Low (no customer has asked; AWS default encryption is genuinely adequate at this scale) | **Low** | Platform operator | Accepted for now | Documented in `DATA_CLASSIFICATION_AND_RETENTION.md` §4 | Revisit only if a partner/customer specifically requires it |
| 9 | No independent legal review of the Privacy Policy / no formal Data Processing Agreements with vendors | Low | Medium (regulatory/contractual exposure, not a security exploit) | **Low-Medium** | Platform operator (needs outside legal help) | Open | Self-review pass done, flagged as non-legal-advice in `PRIVACY_POLICY_REVIEW_NOTES.md` | Before any enterprise/large-partner contract that would ask for a DPA |
| 10 | No formal onboarding/offboarding or background-screening process | Low (team is currently 1-2 people, all long-known) | Medium (grows fast once hiring starts) | **Low** | Platform operator | Prepared, not yet needed | Checklist ready in `ONBOARDING_OFFBOARDING.md` for whenever hiring starts | Activate at first hire |
| 11 | S3 bucket versioning/backup status not yet reviewed | Unknown (not yet assessed) | Medium (uploaded exhibitor images/video, EFT proof-of-payment documents) | **Medium (unknown — treat as open until assessed)** | Platform operator / Claude | Open | Flagged in `BACKUP_AND_RESTORE.md` §5 as not yet reviewed | Next backup/DR-focused pass |
| 12 | Payment dispute/fraud handling is informal (no documented chargeback/dispute procedure beyond the general Incident Response plan) | Low (no incidents to date) | Medium (real money, real customers) | **Low-Medium** | Platform operator | Partially covered | `INCIDENT_RESPONSE_PLAN.md` covers "payment fraud" generically; a Paynow-specific dispute procedure isn't separately documented | Next payments-focused pass |

## Risks resolved since the original 2026-08-04 assessment

For context — these rows existed in earlier thinking about this platform's risk posture and are now closed, kept here as a record rather than silently dropped:

- ~~No DynamoDB backup / PITR~~ — **Closed 2026-08-05.** Enabled fleet-wide, restore tested end-to-end. See `BACKUP_AND_RESTORE.md`.
- ~~No Incident Response plan~~ — **Closed 2026-08-05.** See `INCIDENT_RESPONSE_PLAN.md`.
- ~~Single superadmin account, no segregation of duties~~ — **Closed 2026-08-05** (turned out a second account already existed; a real authz bug that prevented it from working was fixed).
- ~~MFA optional/bypassable for console roles~~ — **Closed 2026-08-05.** See the CAIQ plan doc, Phase 2 item 8.
- ~~No application-level or nginx-level rate limiting~~ — **Closed.** App-level existed already; nginx-level added and load-tested 2026-08-05.
- ~~AWS CloudTrail not enabled~~ — **Closed 2026-08-05,** via CloudShell. Verified real log files delivering to S3.
- ~~No centralized log shipping~~ — **Closed 2026-08-05.** CloudWatch agent live, verified receiving events.
- ~~Single EC2 instance with no automated backup or recovery~~ — **Mitigated 2026-08-05.** Daily DLM snapshots + auto-recovery alarm live.
- ~~No redundant compute — one instance is the whole platform~~ — **Mitigated 2026-08-06.** Warm standby live in a different AZ, verified reachable/healthy end-to-end. See `PROMOTION_RUNBOOK.md`.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 17.*
