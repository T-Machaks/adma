# Centralized log shipping to CloudWatch — one-time console setup

**CAIQ Phase 2, item 10.** This needs a manual first step before any agent/config work can happen: confirmed via the EC2 instance metadata service (`curl http://169.254.169.254/latest/meta-data/iam/security-credentials/`) that the EC2 instance has **no IAM role attached at all** — the app's own AWS credentials in `server/.env` are a separate, deliberately DynamoDB/S3-scoped IAM *user*, not an instance role, and don't grant CloudWatch Logs access either. Nothing running on the box today can write to CloudWatch Logs without this being done first.

## Step 1 (you, AWS Console) — attach an IAM role to the EC2 instance

1. **IAM Console** → **Roles** → **Create role** → trusted entity type **AWS service** → use case **EC2**.
2. Attach the AWS-managed policy **`CloudWatchAgentServerPolicy`** (grants exactly what the CloudWatch agent needs — `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, plus a few CloudWatch metrics permissions — nothing broader).
3. Name it e.g. `adma-ec2-cloudwatch-role`, create it.
4. **EC2 Console** → select the instance (`13.245.143.11`) → **Actions** → **Security** → **Modify IAM role** → attach `adma-ec2-cloudwatch-role`.

This does **not** require restarting the instance or the application — an attached role becomes available to anything on the box within moments.

## Step 2 (I can do this once step 1 is done — just say so)

Once the role is attached, I can SSH in and:
1. Install the CloudWatch agent (`amazon-cloudwatch-agent` package, available directly from Amazon Linux's own repos).
2. Configure it to tail pm2's log files (`~/.pm2/logs/adma-api-out.log` / `adma-api-error.log`) into a log group (e.g. `/adma-digital/api`), which also captures every `logSecurityEvent(...)` JSON line already being emitted (`server/lib/securityLog.js` — already flat JSON-lines, a drop-in fit for this per its own code comment).
3. Set a log retention period on the new log group (recommend 1 year for security events, per `security/DATA_CLASSIFICATION_AND_RETENTION.md`).
4. Verify events are actually arriving in CloudWatch Logs before considering this done.

## After it's on

Update the CAIQ assessment's Logging domain score, and note the completion date here:

- [ ] IAM role attached: _______________
- [ ] CloudWatch agent installed & verified receiving events: _______________
- [ ] Log group retention set: _______________

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 2 item 10.*
