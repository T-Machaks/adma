# Centralized log shipping to CloudWatch — DONE (2026-08-05)

**CAIQ Phase 2, item 10 — closed.** `EC2-SSM-Role` (attached to the instance by the account owner) was granted `AmazonSSMManagedInstanceCore` + `CloudWatchAgentServerPolicy` via CloudShell, then the CloudWatch agent was installed and configured over SSH.

- **Log group:** `/adma-digital/api`, 365-day retention
- **Streams:** `adma-api-out` (stdout — includes every `logSecurityEvent(...)` JSON-lines event from `server/lib/securityLog.js`) and `adma-api-error` (stderr)
- **Config:** `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json` on the EC2 host, tailing pm2's log files (`/home/ec2-user/.pm2/logs/adma-api-{out,error}.log`)
- **Verified genuinely receiving events**, not just running — confirmed both log streams have real `firstEventTimestamp`/`lastEventTimestamp`/`lastIngestionTime` via `aws logs describe-log-streams`, within seconds of the agent starting.

This could not be done by the application's own scoped AWS credentials, and initially not by the EC2 instance either — the instance had **no IAM role attached at all** when first checked (confirmed via the instance metadata service). The account owner created and attached `EC2-SSM-Role`, then granted it the CloudWatch Agent policy via CloudShell, which unblocked this.

## Confirmed live

- [x] IAM role attached: **2026-08-05** (`EC2-SSM-Role`, granted `CloudWatchAgentServerPolicy` + `AmazonSSMManagedInstanceCore`)
- [x] CloudWatch agent installed & verified receiving events: **2026-08-05**
- [x] Log group retention set: **365 days**

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 2 item 10.*
