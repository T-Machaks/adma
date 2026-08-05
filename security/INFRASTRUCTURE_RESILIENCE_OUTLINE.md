# Moving off a single EC2 instance — outline, not a commitment

**Effective:** 2026-08-05 (updated 2026-08-05 with real permission testing + cost estimates)
**Status:** planning outline with cost estimates. This is real infrastructure spend and complexity — appropriate once the platform's scale/revenue justifies it (per the original CAIQ plan's own framing), not before. Nothing in this document should be read as "do this now."

**Confirmed blocked on manual action — same pattern as CloudTrail/CloudWatch logging.** Tested directly against the app's own AWS credentials rather than assuming: `ec2:DescribeInstances`, `ec2:CreateImage`, `ec2:CreateSnapshot`, and DLM (Data Lifecycle Manager, for scheduled snapshots) are all `UnauthorizedOperation`/`AccessDeniedException` — fully consistent with the deliberate DynamoDB/S3-only scoping. Even the CloudWatch-alarm-based auto-recovery approach (option 1 below) hit a wall: creating an alarm with the `ec2:recover` action requires `iam:CreateServiceLinkedRole`, also denied. **Nothing in this document can be executed by me — every option needs the account owner's own broader AWS console/IAM access**, at minimum once to set up (option 1), or as an ongoing infrastructure decision (options 2–3).

## Why this is Phase 3, not Phase 1/2

A single EC2 instance is a real risk (see `RISK_REGISTER.md` #2), but the mitigations already in place — DynamoDB PITR with a tested restore, and a documented (if unrehearsed) EC2 rebuild procedure in `DISASTER_RECOVERY_PLAN.md` — cover the most likely failure modes (data loss, instance corruption) at low cost. What they don't cover is **availability during the rebuild window** (a few hours of downtime per `DISASTER_RECOVERY_PLAN.md`'s RTO estimate). Whether a few hours of potential downtime is acceptable is a business decision tied to the platform's actual usage pattern (e.g. a spike around the physical event vs. steady year-round traffic) — not a technical one.

## Options, roughly cheapest → most involved, with estimated monthly AWS cost

Current baseline (for comparison): one `t3.micro` instance in af-south-1 ≈ **$9–11/month** compute + a few cents for the 8GB root volume — call it **~$10/month today**.

1. **AMI-based auto-recovery (cheapest, least architectural change).** A scheduled EBS/AMI snapshot of the instance (captures the OS/nginx/pm2 setup, not just app code which is already in git) plus a CloudWatch alarm + EC2 auto-recovery action on instance-status-check failures — AWS can automatically restart a failed instance on new hardware without manual intervention. Doesn't solve a full AZ outage, but solves the more common "instance became unhealthy" case cheaply.
   **Estimated added cost: ~$1–5/month** — EBS snapshot storage at roughly $0.05/GB-month (an 8GB root volume, so ~$0.40 for one retained snapshot; a week of daily incremental snapshots is still only a few dollars since only changed blocks are billed after the first one) + a CloudWatch alarm at ~$0.10/month. No new compute cost — it recovers the *same* instance, doesn't run a second one.
2. **Warm standby (moderate cost, real complexity increase).** A second, smaller EC2 instance in a different AZ, kept updated (same git deploy process, just run twice) but not serving traffic — promoted manually (DNS/load-balancer switch) if the primary fails.
   **Estimated added cost: ~$10–15/month** — roughly doubles compute (a second `t3.micro`) plus its own small EBS volume. Well-understood, low-risk pattern for the cost.
3. **Auto Scaling Group behind an Application Load Balancer, 2+ instances across AZs (most involved, real DevOps investment).** True multi-AZ resilience — traffic automatically routes around a failed instance/AZ with no manual intervention. Requires: moving `server/.env` secrets to AWS Secrets Manager or Parameter Store (~$0.40/secret/month, can't rely on a file living on one specific instance anymore), a load balancer, health checks, and revisiting the deploy process (currently a manual SSH + `git pull` — would need to become a proper rolling deploy).
   **Estimated added cost: ~$35–50+/month** — an Application Load Balancer alone is roughly $16–20/month base + data-processing charges, plus 2× `t3.micro` compute (~$18–22/month combined), plus Secrets Manager. This is the option that actually removes the single-point-of-failure risk, not just mitigates it — but at real, ongoing extra cost and DevOps overhead, not a one-time fee.

*(All figures are rough estimates from general AWS af-south-1 pricing knowledge, not a live quote from the AWS Pricing Calculator — get an exact number there before budgeting, especially since af-south-1 (Cape Town) pricing sometimes runs a bit above US regions.)*

## Recommendation

Option 1 (AMI/EBS snapshot + auto-recovery) is the highest value-per-dollar — a few dollars a month for real protection against the most common failure mode. It just needs someone with EC2 IAM access to click through it once (I can't). Treat options 2/3 as real projects to schedule once traffic/revenue data justifies the added ongoing cost and complexity, not something to do speculatively.

## Steps for option 1 (you, AWS Console — I genuinely cannot do this)

1. **EC2 Console** → **Snapshots** → **Create snapshot** → select volume `vol-0a1a2633b41e7a17e` (the instance's root volume, found via its NVMe serial number over SSH — confirmed for real, not guessed) → create.
2. To automate it going forward: **EC2 Console** → **Elastic Block Store** → **Lifecycle Manager** → create an EBS snapshot policy targeting that volume (or tag the volume and target by tag) — e.g. daily, retain 7.
3. **CloudWatch Console** → **Alarms** → **Create alarm** → metric `StatusCheckFailed_System`, namespace `AWS/EC2`, dimension `InstanceId = i-0a3174c66880b0e04` → threshold "greater than 0" for 2 consecutive periods → **Alarm action** → **EC2 action** → **Recover this instance**. (The console flow creates the needed service-linked role automatically the first time — this is exactly the step my own credentials got `iam:CreateServiceLinkedRole` denied on.)
4. Note the instance details here for reference: instance ID `i-0a3174c66880b0e04`, type `t3.micro` (Nitro-based — supports the recover action), root volume `vol-0a1a2633b41e7a17e` (8GB).

## What NOT to do without this being a deliberate decision

Don't let a future session (AI-assisted or not) casually "improve reliability" by standing up a second instance or a load balancer as a side effect of an unrelated task — this changes the deploy process, the secrets-management story, and the monthly AWS bill. Any of options 1–3 above should be its own explicitly-scoped piece of work, confirmed with the platform operator first.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 16.*
