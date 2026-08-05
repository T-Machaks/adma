# ADMA Digital — Disaster Recovery Plan

**Effective:** 2026-08-05
**Companion to:** `security/BACKUP_AND_RESTORE.md` (the data-layer recovery procedure this plan sits on top of).

This is an honest, right-sized DR plan for the platform's current scale — a single EC2 instance and DynamoDB, no redundant infrastructure yet. The goal is a documented plan with realistic targets, not a claim of enterprise-grade resilience.

## 1. What "disaster" means here

| Scenario | Data at risk? | Covered by |
|---|---|---|
| DynamoDB table corrupted/accidentally emptied | Yes | PITR restore (§2) |
| EC2 instance lost (terminated, corrupted, unreachable) | No — the instance holds no unique data (see below) | Relaunch from git (§3) |
| S3 bucket data lost | Yes (uploaded images/videos, EFT proof-of-payment) | Not yet covered — open item (§5) |
| Full AWS region outage (af-south-1) | Yes, everything | Not covered — out of scope for this platform's current scale (§5) |

**The EC2 instance itself holds no unique, unrecoverable data.** The application code is 100% in git (`T-Machaks/adma`, `main` branch); the only non-git state on the instance is `server/.env` (secrets — see §4) and the nginx config at `/etc/nginx/conf.d/adma.conf` (not tracked in git, backed up with timestamped copies before every edit per `CHANGE_MANAGEMENT.md`, but not off-instance). This means an instance loss is a **rebuild**, not a **data recovery** problem.

## 2. DynamoDB recovery — RPO/RTO

- **RPO (Recovery Point Objective): effectively seconds.** PITR gives per-second continuous backup granularity across all 49 tables (enabled 2026-08-05, see `BACKUP_AND_RESTORE.md`).
- **RTO (Recovery Time Objective): ~15–30 minutes for a single table, generously.** The one real test performed (a 1-item table) completed in ~3.5 minutes; larger tables (`adma_users`, `adma_exhibitors`, `adma_payments`) will take longer proportional to size, but DynamoDB restores are not linear-blocking on the whole account — multiple tables could in principle be restored in parallel if several were affected at once. **This number is an estimate, not yet validated against a large/production-sized table** — re-test against `adma_users` or `adma_exhibitors` specifically before treating this RTO as reliable (open item, see §5).
- **Recovery is always to a new table name, never in-place** — this means every DynamoDB recovery scenario also requires an application code/config change (the table name is a hardcoded constant per route file) and a redeploy to actually cut over. Budget for that redeploy time (a few minutes, per the existing deploy process in `CHANGE_MANAGEMENT.md`) on top of the raw restore time above.

## 3. EC2 instance recovery — RTO

If the EC2 instance itself is lost or unrecoverable:

1. Launch a new EC2 instance in af-south-1 (same instance type/AMI family as the current one — Amazon Linux 2023, per prior deployment notes).
2. Install Node.js, nginx, pm2, and Certbot (standard setup — not yet scripted/automated; this is a manual, documented gap, see §5).
3. `git clone` the repository, restore `server/.env` from wherever it's backed up (§4), run `npm install` (both root and `server/`), `npm run build`.
4. Restore the nginx config from the most recent local backup copy (`adma.conf.bak-*`) — if the instance itself is gone, this file only survives if it was copied off-instance beforehand (currently it is **not** — open item, §5).
5. Re-issue the TLS certificate via Certbot (`admadigital.co.zw`, `adma.tyflex.co.zw`) — DNS already points at Route 53/registrar-level records, only the instance's IP needs updating there if it changes.
6. Start pm2, verify the site.

**Estimated RTO: 2–4 hours**, dominated by manual OS/package setup and DNS propagation if the IP changes — this is a rough, undemonstrated estimate (this procedure has never actually been rehearsed end-to-end). Rehearsing it once (e.g. spinning up a throwaway EC2 instance and timing the steps) would turn this from an estimate into a tested number — recommended as a near-term follow-up.

## 4. Secrets recovery

`server/.env` (AWS credentials, OAuth client secrets, mailer/SMS provider credentials) exists **only on the EC2 instance today** — correctly gitignored, but that also means it is currently a single point of failure for secrets, not just data. **Open item:** back up `.env` securely off-instance (a password manager entry, or an encrypted copy in private storage) so instance loss doesn't also mean re-provisioning every third-party credential from scratch.

## 5. Open items (not yet done — tracked here so they don't get lost)

- [ ] Validate the DynamoDB RTO estimate against a real large table, not just the small one already tested.
- [ ] Rehearse the EC2 rebuild procedure once, end-to-end, to convert the §3 estimate into a tested number.
- [ ] Back up `server/.env` securely off-instance.
- [ ] Back up the nginx config off-instance (not just timestamped copies on the same instance that could be lost with it).
- [ ] Review S3 bucket versioning/backup status (uploaded exhibitor images/video, EFT proof-of-payment documents) — not yet assessed as part of this pass.
- [ ] Consider scripting the EC2 setup steps (§3) as a shell script or user-data script, so a rebuild isn't manual/tribal-knowledge-dependent.

Multi-AZ/warm-standby infrastructure (removing the single-EC2-instance dependency entirely) is intentionally **not** in this plan — see CAIQ Phase 3 item 16. That's a real-money infrastructure investment appropriate once the platform's scale/revenue justifies it, not before.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 2 item 13.*
