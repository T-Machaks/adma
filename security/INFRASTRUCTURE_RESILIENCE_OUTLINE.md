# Moving off a single EC2 instance — option 1 DONE (2026-08-05), options 2-3 still just an outline

**Effective:** 2026-08-05 (updated same day — option 1 executed via CloudShell)
**Status:** **option 1 is live.** Options 2-3 remain a planning outline only — real infrastructure spend and complexity, appropriate once the platform's scale/revenue justifies it, not before.

**Option 1 executed 2026-08-05 via CloudShell** (full account access — this was correctly blocked for the app's own scoped credentials, confirmed via real `UnauthorizedOperation`/`AccessDeniedException` responses on `ec2:CreateSnapshot`/`CreateImage`/`DescribeInstances` and DLM before escalating to CloudShell):
- **Automated daily EBS snapshots**: DLM lifecycle policy `policy-0797d7e3fb8dd1f95`, targets the root volume (`vol-0a1a2633b41e7a17e`, tagged `AdmaBackup=daily`), daily at 03:00 UTC, retains 7.
- **EC2 auto-recovery**: CloudWatch alarm `adma-ec2-auto-recovery` on `StatusCheckFailed_System` for instance `i-0a3174c66880b0e04`, action `arn:aws:automate:af-south-1:ec2:recover`. Confirmed created (state settles to OK/ALARM after its first 2 evaluation periods — `INSUFFICIENT_DATA` immediately after creation is normal, not a problem).

## Why this is Phase 3, not Phase 1/2

A single EC2 instance is a real risk (see `RISK_REGISTER.md` #2), but the mitigations already in place — DynamoDB PITR with a tested restore, and a documented (if unrehearsed) EC2 rebuild procedure in `DISASTER_RECOVERY_PLAN.md` — cover the most likely failure modes (data loss, instance corruption) at low cost. What they don't cover is **availability during the rebuild window** (a few hours of downtime per `DISASTER_RECOVERY_PLAN.md`'s RTO estimate). Whether a few hours of potential downtime is acceptable is a business decision tied to the platform's actual usage pattern (e.g. a spike around the physical event vs. steady year-round traffic) — not a technical one.

## Options, roughly cheapest → most involved, with estimated monthly AWS cost

Current baseline (for comparison): one `t3.micro` instance in af-south-1 ≈ **$9–11/month** compute + a few cents for the 8GB root volume — call it **~$10/month today**.

1. **AMI-based auto-recovery (cheapest, least architectural change) — ✅ DONE 2026-08-05.** A scheduled EBS snapshot of the instance plus a CloudWatch alarm + EC2 auto-recovery action on instance-status-check failures — AWS can automatically restart a failed instance on new hardware without manual intervention. Doesn't solve a full AZ outage, but solves the more common "instance became unhealthy" case cheaply.
   **Actual added cost: ~$1–5/month** — EBS snapshot storage at roughly $0.05/GB-month (an 8GB root volume, so ~$0.40 for one retained snapshot; a week of daily incremental snapshots is still only a few dollars since only changed blocks are billed after the first one) + a CloudWatch alarm at ~$0.10/month. No new compute cost — it recovers the *same* instance, doesn't run a second one.
2. **Warm standby (moderate cost, real complexity increase).** A second, smaller EC2 instance in a different AZ, kept updated (same git deploy process, just run twice) but not serving traffic — promoted manually (DNS/load-balancer switch) if the primary fails.
   **Estimated added cost: ~$10–15/month** — roughly doubles compute (a second `t3.micro`) plus its own small EBS volume. Well-understood, low-risk pattern for the cost.
3. **Auto Scaling Group behind an Application Load Balancer, 2+ instances across AZs (most involved, real DevOps investment).** True multi-AZ resilience — traffic automatically routes around a failed instance/AZ with no manual intervention. Requires: moving `server/.env` secrets to AWS Secrets Manager or Parameter Store (~$0.40/secret/month, can't rely on a file living on one specific instance anymore), a load balancer, health checks, and revisiting the deploy process (currently a manual SSH + `git pull` — would need to become a proper rolling deploy).
   **Estimated added cost: ~$35–50+/month** — an Application Load Balancer alone is roughly $16–20/month base + data-processing charges, plus 2× `t3.micro` compute (~$18–22/month combined), plus Secrets Manager. This is the option that actually removes the single-point-of-failure risk, not just mitigates it — but at real, ongoing extra cost and DevOps overhead, not a one-time fee.

*(All figures are rough estimates from general AWS af-south-1 pricing knowledge, not a live quote from the AWS Pricing Calculator — get an exact number there before budgeting, especially since af-south-1 (Cape Town) pricing sometimes runs a bit above US regions.)*

## Recommendation

Option 1 is live. Treat options 2/3 as real projects to schedule once traffic/revenue data justifies the added ongoing cost and complexity, not something to do speculatively.

## What NOT to do without this being a deliberate decision

Don't let a future session (AI-assisted or not) casually "improve reliability" by standing up a second instance or a load balancer as a side effect of an unrelated task — this changes the deploy process, the secrets-management story, and the monthly AWS bill. Any of options 1–3 above should be its own explicitly-scoped piece of work, confirmed with the platform operator first.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 16.*
