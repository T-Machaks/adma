# ADMA Digital — Backup & Restore Procedure

**Effective:** 2026-08-05

## 1. What's enabled

**DynamoDB point-in-time recovery (PITR) is enabled on all 49 production tables** (both `adma_*` and `minecon_*` — this AWS account hosts both platforms), as of 2026-08-05. PITR gives continuous backups with per-second granularity, restorable to any point in the last 35 days (AWS's standard PITR window).

This closes the top risk flagged in the 2026-08-04 CAIQ assessment: previously, PITR status had never been confirmed, and in fact was off everywhere.

## 2. Restore procedure

To recover a table (accidental delete, bad write, corruption, etc.):

1. **Do not restore over the live table** — `RestoreTableToPointInTime` always creates a **new** table with a different name; the original table is untouched. This is deliberate: it lets you inspect the restored data before deciding whether/how to cut over.
2. Identify the target table and the point in time to restore to (either `UseLatestRestorableTime: true` for "as recent as possible," or a specific ISO timestamp within the last 35 days).
3. Run the restore (AWS Console → DynamoDB → table → **Backups** tab → **Restore**, or via the SDK/CLI: `aws dynamodb restore-table-to-point-in-time`).
4. Wait for the new table to reach `ACTIVE` status (typically a few minutes for small tables; scales with table size).
5. Verify the restored data looks correct.
6. Cut over: either point the application at the new table name (requires an app config/code change — table names are currently hardcoded per route file, e.g. `const TABLE = 'adma_exhibitors'`), or rename tables (DynamoDB doesn't support in-place rename — this means deleting/recreating, so in practice cutover means updating the app's table-name constant and redeploying).
7. Once confirmed good, delete the old (broken) table or keep it temporarily for forensic comparison, per the severity of what happened (see `INCIDENT_RESPONSE_PLAN.md`).

## 3. Test-restore record

Per the CAIQ Phase 1 commitment to not just enable PITR but **actually test a restore**, one was performed end-to-end on 2026-08-05:

- **Source table:** `adma_app_settings` (small, low-risk, first table PITR was enabled on)
- **Action:** `RestoreTableToPointInTime` → new scratch table `_diag_pitr_restore_test`, using `UseLatestRestorableTime`
- **Result:** restore completed in ~3.5 minutes (`CREATING` → `ACTIVE`), restored item count matched the source exactly (1/1 items, byte-identical), scratch table deleted immediately after verification.
- **Conclusion:** the restore mechanism works as documented above. This should be re-tested periodically (e.g. every 6–12 months, or after any major schema change) rather than assumed to still work indefinitely.

## 4. Recovery objectives (informal, for now)

- **RPO (Recovery Point Objective):** effectively seconds, given PITR's continuous/per-second backup granularity.
- **RTO (Recovery Time Objective):** not formally committed yet — restore time scales with table size; the tested restore above took ~3.5 min for a 1-item table. A full DR plan with realistic RTO targets for the largest tables (e.g. `adma_users`, `adma_exhibitors`) is CAIQ Phase 2 item 13.

## 5. What this does *not* cover

- **The EC2 instance itself** — no AMI snapshot schedule or auto-recovery exists yet; a lost/corrupted instance would need to be manually relaunched from the git repository (the EC2 host holds no unique data — `server/.env` secrets and the nginx config are the only non-git state, and both should be backed up separately; see the open item below).
- **S3-stored files** (uploaded images/videos, EFT proof-of-payment documents) — versioning/backup status on the S3 buckets themselves has not yet been reviewed as part of this pass; worth a follow-up check.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 1 item 1.*
