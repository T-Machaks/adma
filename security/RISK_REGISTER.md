# ADMA Digital — Risk Register

**Effective:** 2026-08-05
**Review cadence:** quarterly at minimum, and after any incident (per `INCIDENT_RESPONSE_PLAN.md`) or major feature push. The point of this document isn't sophistication — it's evidence of a repeating process (CAIQ Phase 3 item 17).

**Scoring:** Likelihood and Impact each rated Low/Medium/High. Risk = the combination, not a formula — used to order the backlog, not to pretend false precision.

| # | Risk | Likelihood | Impact | Risk | Owner | Status | Mitigation | Next review |
|---|---|---|---|---|---|---|---|---|
| 1 | No independent penetration test has ever been performed | Medium | High | **High** | Platform operator | Open | Scope + cost estimate ready in `PENTEST_SCOPE.md` (~$1,500–4,000 for a regional-firm scoped engagement); needs budget approval to commission (CAIQ Phase 3 item 15) | Before next major feature push, or 2027 site plan launch |
| 2 | Single EC2 instance, no redundant/multi-AZ infrastructure | Low (no incident to date) | High (total outage if lost) | **Medium** | Platform operator | Partially mitigated | `DISASTER_RECOVERY_PLAN.md` gives a documented (but unrehearsed) rebuild procedure. Real options costed in `INFRASTRUCTURE_RESILIENCE_OUTLINE.md`: cheapest (snapshot + auto-recovery) ~$1–5/mo, warm standby ~$10–15/mo, full multi-AZ ~$35–50+/mo — all confirmed blocked on the account owner's own EC2/IAM console access, not something the app's own credentials can execute | Q4 2026 or after next funding/revenue milestone |
| 3 | `server/.env` secrets and nginx config exist only on the EC2 instance, no off-instance backup | Low | High (re-provisioning every credential from scratch on instance loss) | **Medium** | Platform operator | Open | Tracked in `DISASTER_RECOVERY_PLAN.md` §5 | Next DR plan review |
| 4 | AWS CloudTrail not enabled — no audit trail of AWS-account-level actions | Medium | Medium | **Medium** | Platform operator (needs console access the app's IAM user doesn't have) | Blocked on manual action | Steps in `CLOUDTRAIL_SETUP.md` | As soon as convenient — cheap, ~30 min |
| 5 | No centralized log shipping (CloudWatch) — security logs live only in pm2's local stdout capture | Medium | Medium | **Medium** | Platform operator (needs IAM role attachment) | Blocked on manual action | Steps in `CLOUDWATCH_LOGGING_SETUP.md` | As soon as convenient |
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

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 17.*
