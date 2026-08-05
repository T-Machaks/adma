# Moving off a single EC2 instance — outline, not a commitment

**Effective:** 2026-08-05
**Status:** planning outline only. This is real infrastructure spend and complexity — appropriate once the platform's scale/revenue justifies it (per the original CAIQ plan's own framing), not before. Nothing in this document should be read as "do this now."

## Why this is Phase 3, not Phase 1/2

A single EC2 instance is a real risk (see `RISK_REGISTER.md` #2), but the mitigations already in place — DynamoDB PITR with a tested restore, and a documented (if unrehearsed) EC2 rebuild procedure in `DISASTER_RECOVERY_PLAN.md` — cover the most likely failure modes (data loss, instance corruption) at low cost. What they don't cover is **availability during the rebuild window** (a few hours of downtime per `DISASTER_RECOVERY_PLAN.md`'s RTO estimate). Whether a few hours of potential downtime is acceptable is a business decision tied to the platform's actual usage pattern (e.g. a spike around the physical event vs. steady year-round traffic) — not a technical one.

## Options, roughly cheapest → most involved

1. **AMI-based auto-recovery (cheapest, least architectural change).** Keep the single-instance model, but add: (a) a scheduled AMI snapshot of the instance (captures the OS/nginx/pm2 setup, not just app code which is already in git), and (b) CloudWatch alarm + EC2 auto-recovery action on instance-status-check failures — AWS can automatically restart a failed instance on new hardware without full manual intervention. Doesn't solve a full AZ outage, but solves the more common "instance became unhealthy" case cheaply.
2. **Warm standby (moderate cost, real complexity increase).** A second, smaller EC2 instance in a different AZ, kept updated (same git deploy process, just run twice) but not serving traffic — promoted manually (DNS/load-balancer switch) if the primary fails. Roughly doubles compute cost but is a well-understood, low-risk pattern.
3. **Auto Scaling Group behind an Application Load Balancer, 2+ instances across AZs (most involved, real DevOps investment).** True multi-AZ resilience — traffic automatically routes around a failed instance/AZ with no manual intervention. Requires: moving `server/.env` secrets to AWS Secrets Manager or Parameter Store (can't rely on a file living on one specific instance anymore), a load balancer, health checks, and revisiting the deploy process (currently a manual SSH + `git pull` — would need to become a proper rolling deploy). This is the option that actually removes the single-point-of-failure risk, not just mitigates it.

## Recommendation

Start with option 1 (AMI snapshot + auto-recovery) as a cheap, high-value first step whenever there's an afternoon to spend on it — it's a genuine, low-cost improvement to `RISK_REGISTER.md` #2 without committing to ongoing extra infrastructure cost. Treat options 2/3 as real projects to schedule once traffic/revenue data justifies the added cost and complexity, not something to do speculatively.

## What NOT to do without this being a deliberate decision

Don't let a future session (AI-assisted or not) casually "improve reliability" by standing up a second instance or a load balancer as a side effect of an unrelated task — this changes the deploy process, the secrets-management story, and the monthly AWS bill. Any of options 1–3 above should be its own explicitly-scoped piece of work, confirmed with the platform operator first.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 16.*
