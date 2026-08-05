# Enabling AWS CloudTrail — one-time console setup

**CAIQ Phase 1, item 6.** This cannot be done by the application's own AWS credentials — confirmed via a real `AccessDeniedException` (`cloudtrail:DescribeTrails` denied for `arn:aws:iam::479887547220:user/tamuka`), consistent with that IAM user being deliberately scoped to DynamoDB/S3 only. This needs to be done once, manually, by whoever has full AWS Console access to account `479887547220`.

## Steps

1. Sign in to the **AWS Console** → search **CloudTrail** → region **af-south-1 (Cape Town)**.
2. **Trails** → **Create trail**.
3. **Trail name**: `adma-digital-trail` (or similar).
4. **Storage location**: create a new S3 bucket (e.g. `adma-cloudtrail-logs-479887547220`) or use an existing one — either is fine; a new dedicated bucket is cleaner to manage retention/lifecycle rules on later.
5. **Log file SSE-KMS encryption**: leave default (SSE-S3) unless you already manage a KMS key — fine for this platform's current scale.
6. **Management events**: leave **enabled**, Read and Write. This is the part that actually creates the audit trail CAIQ's Audit & Assurance / Logging domains are asking about (who did what to the AWS account itself — IAM changes, security-group edits, etc.).
7. **Data events**: optional for now — enabling S3 object-level and/or DynamoDB item-level events gives finer-grained logging but adds cost proportional to request volume. Skip this at first; management events alone closes the CAIQ gap. Revisit if a future incident investigation needs it.
8. Click **Create trail**.
9. (Optional, recommended) On the new S3 bucket, add a **lifecycle rule** to transition logs to Glacier after ~90 days and expire after ~1 year, matching the retention window noted in `DATA_CLASSIFICATION_AND_RETENTION.md`.

## After it's on

Nothing else needs to change in the app — this is pure AWS-account-level logging, independent of ADMA Digital's own code. Once enabled, note the date here and update the CAIQ assessment's Logging/Audit & Assurance domain scores accordingly:

- [ ] CloudTrail enabled on: _______________
- [ ] Trail name / S3 bucket: _______________

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 6.*
