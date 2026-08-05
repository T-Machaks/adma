# ADMA Digital — Change Management Process

**Effective:** 2026-08-05
**Applies to:** all code and configuration changes to the ADMA Digital platform (frontend, backend, and infrastructure).

This documents the process that's already in practice — the point is to make it a written, auditable policy rather than change how the team actually works.

## 1. Who can deploy

Deploys to production are made by whoever has:
- Push access to the `main` branch of the `T-Machaks/adma` GitHub repository, and
- SSH access to the EC2 host(s) (key-based, IP-restricted via the EC2 security group's inbound SSH rule — see §5).

**As of 2026-08-06, there are two EC2 hosts:** the primary (`admadigital.co.zw`, `13.245.143.11`, af-south-1a) that serves live traffic, and a warm standby (`13.245.80.124`, af-south-1b) that runs the app but doesn't serve public traffic — see `PROMOTION_RUNBOOK.md`. Every deploy targets **both**, in the same step (§2.5) — the standby existing at all only provides real resilience if it's never more than one deploy behind.

Today that's the platform operator (T-Machaks) directly, optionally assisted by an AI coding agent (Claude Code) operating under their direction and using the same credentials/keys — every change it makes is still a real, reviewable git commit attributed accordingly.

## 2. Change process

1. **All changes are made as git commits** — no direct edits on the production server. The EC2 instance only ever runs code that was `git pull`'d from `main`; there is no separate "hotfix on the box" path.
2. **Commit messages describe what changed and why**, not just what — this is the change record CAIQ's Change Control domain is asking for. Commit history is the audit trail.
3. **Build before deploy.** The frontend is always rebuilt (`npm run build`) as part of deployment — a stale `dist/` is never served.
4. **Local verification before production**, proportional to risk:
   - Small/config-only changes: syntax check (`node --check`) and read-through are enough.
   - Changes touching auth, payments, or data ownership: run against a local backend instance connected to the real (shared) database, with synthetic test records that are cleaned up afterward — never leave test data in production tables.
   - UI-only changes: a local `npm run build` to catch compile errors at minimum; a manual click-through when the change is user-facing.
5. **Deploy**: `git push origin main`, then on **each** EC2 host in turn (primary, then standby): `cd ~/adma && git pull origin main && npm run build && pm2 restart adma-api` (add `cd server && npm install` first if backend dependencies changed). The standby doesn't need a smoke test against the public domain (it isn't serving it), but do confirm its `pm2` process and local `curl 127.0.0.1/api/health` are healthy after every deploy — a standby that's silently been broken since its last successful deploy provides zero real resilience.
6. **Smoke test after deploy** — at minimum, confirm the site (`/`) and API (`/api/rate-card` or an equivalent cheap endpoint) both return HTTP 200 immediately after the `pm2 restart`, against the primary's public domain.

## 3. Rollback procedure

If a deploy causes a regression:
1. Identify the last known-good commit (`git log --oneline`).
2. On the EC2 host: `git checkout <last-good-sha>` (or `git revert <bad-sha>` and pull that instead, to keep history linear and preserve the failed attempt as a recorded, reverted change rather than erasing it).
3. `npm run build && pm2 restart adma-api`.
4. Confirm the regression is gone via the same smoke test as §2.6.
5. Log the incident per `INCIDENT_RESPONSE_PLAN.md` if it caused real user-facing impact (as the 2026-07-26 CSP rollout did).

## 4. Configuration changes

- Application configuration (env vars, feature flags) lives in `server/.env` on the EC2 host — not tracked in git (correctly gitignored), so changes there are made directly on the host and should be noted in the relevant commit message or incident log if they're response to an issue.
- nginx configuration (`/etc/nginx/conf.d/adma.conf`) lives only on the server, not tracked in git. **Always back it up with a timestamped copy before editing** (e.g. `cp adma.conf adma.conf.bak-$(date +%Y%m%d)`), since there's no git history to fall back on for this file specifically.

## 5. Infrastructure/access changes

Changes to AWS-level configuration (IAM policies, EC2 security groups, DynamoDB table settings, S3 bucket policies) are made directly via the AWS Console or CLI by the platform operator — the application's own IAM credentials are deliberately scoped to DynamoDB/S3 data access only (least privilege) and cannot make these changes themselves. Any such change (e.g. updating the SSH security-group rule for a new IP, enabling a new table setting) should be noted here or in the incident log if it was made in response to an access problem.

## 6. Review cadence

This process should be reviewed **at least annually**, and whenever the deploy process itself changes materially (e.g. moving to automated CI/CD, or multi-instance infrastructure).

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 4.*
