# ADMA Digital — Standby Promotion Runbook

**Effective:** 2026-08-06
**Applies to:** the warm-standby EC2 instance stood up under CAIQ Phase 3 item 16, option 1 (`security/INFRASTRUCTURE_RESILIENCE_OUTLINE.md`).

## What exists today

| | Primary | Standby |
|---|---|---|
| Instance ID | `i-0a3174c66880b0e04` | `i-0b3233db9d8a576e6` |
| Availability Zone | af-south-1a | af-south-1b |
| Public IP | `13.247.39.85` | `13.245.80.124` |
| Role | Registered target behind `adma-alb`, health-checked | Registered target behind `adma-alb`, health-checked |

The standby has the full stack installed and running (nginx, Node, pm2, the app itself, `server/.env` copied over securely via `scp`, never through git) and passes its own local health checks.

## ALB automatic traffic failover (2026-08-31) — read this before assuming "promotion" means what it used to

As of 2026-08-31, **both instances sit behind `adma-alb`**, which health-checks each on `/api/health` (HTTP:80) and automatically stops routing traffic to whichever one fails — no manual action needed to keep the site up if exactly one instance goes unhealthy. This is a genuinely new, automatic layer of resilience that didn't exist when this runbook was first written, and it changes what "promotion" actually means:

- **Single-instance failure (the common case)**: fully automatic now. The ALB detects the unhealthy target within its health-check interval and routes all traffic to the surviving instance. Nothing in this runbook needs to run for the site to stay up.
- **What's still manual**: replacing a *permanently* lost instance (terminated, corrupted beyond recovery) with a fresh one, and — since the standby historically had no TLS cert of its own by design (see below) — anything that depended on the standby serving traffic *directly* (bypassing the ALB). With the ALB terminating TLS itself, the standby no longer needs its own cert to serve real traffic; it already works as an ALB target on HTTP:80 exactly like primary.
- **Net effect**: this runbook's original step-by-step "promote the standby" procedure is now mostly obsolete for the everyday failure case — the ALB already does that automatically. What's still genuinely missing is *replacing a lost instance* (re-provisioning a new EC2 box, installing the stack, registering it with the target group) — that part has no runbook yet and remains a real gap, tracked in `RISK_REGISTER.md` #2.

## Keeping the standby in sync (routine, every deploy)

Per the updated `CHANGE_MANAGEMENT.md` — **every deploy now targets both instances**, not just the primary. This runbook is only for the *failover* scenario; day-to-day, the standby should never be more than one deploy behind.

## When to promote

Promote if the primary instance becomes unreachable, is terminated, or fails health checks (`https://admadigital.co.zw/api/health`) for longer than a few minutes with no clear fast fix.

## Promotion steps

1. **Confirm the primary is actually down**, not a transient blip — check `https://admadigital.co.zw/api/health` and SSH reachability from a couple of vantage points first. Don't fail over on a single failed check.
2. **Update DNS** — point `admadigital.co.zw`, `www.admadigital.co.zw`, and `adma.tyflex.co.zw`'s A records at the standby's IP (`13.245.80.124`, or whatever it is at promotion time — confirm via `aws ec2 describe-instances`). This is the same Route53 hosted zone used for `security.admadigital.co.zw` — see that setup for the exact `change-resource-record-sets` pattern.
3. **Issue a real TLS certificate on the standby**, now that DNS points there:
   ```bash
   sudo certbot --nginx -d admadigital.co.zw -d www.admadigital.co.zw -d adma.tyflex.co.zw --non-interactive --agree-tos -m <admin-email>
   ```
   This both obtains the certificate and updates the standby's nginx config to add the HTTPS server block automatically.
4. **Verify** — `https://admadigital.co.zw/` and `/api/health` both return 200 from an external vantage point (not just `curl` from the instance itself).
5. **If the primary comes back later**, don't just flip DNS back blindly — check whether any writes happened against the standby while it was live (DynamoDB is shared/regional, so both instances read/write the same tables regardless of which one is "active" — this isn't a split-brain data risk, only a compute/serving one) and decide whether the old primary should become the new standby, or resume as primary, based on what actually failed.

## What this does *not* cover

- **Automatic failover.** This is a manual runbook, not an automated process — promoting is a deliberate decision by whoever's on call, not a script that fires on its own. Automatic failover is what option 3 (ALB + Auto Scaling Group) in `INFRASTRUCTURE_RESILIENCE_OUTLINE.md` would provide, at real additional cost/complexity.
- **DNS propagation delay.** Even with a low TTL (300s on the `security.admadigital.co.zw` record — apply the same TTL to the main domain's records if not already low), some clients/resolvers cache longer. Expect a few minutes of mixed traffic during cutover, not an instant switch for every visitor.

## Rehearsal

This runbook has **not yet been rehearsed end-to-end** (i.e., a real promotion has never actually been performed, only the standby's baseline setup has been verified). Per `DISASTER_RECOVERY_PLAN.md`'s own standard, an unrehearsed runbook is an estimate, not a tested number — schedule a real rehearsal (during low-traffic hours, with DNS reverted immediately after) as a follow-up.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 16, option 1 (warm standby).*
