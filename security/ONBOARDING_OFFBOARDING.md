# ADMA Digital — Onboarding & Offboarding Checklist

**Effective:** 2026-08-05
**Status:** prepared ahead of need — the team is currently 1-2 people, all long-established, so this hasn't been exercised yet. Use it starting at the first new hire, contractor, or collaborator with any console/server/database access.

## Onboarding

- [ ] Have the new person read and acknowledge `ACCEPTABLE_USE_POLICY.md` (once the team grows beyond its current size, this should become a signed/logged acknowledgement, not just a read — see that document's §4).
- [ ] Grant the minimum access actually needed for their role — not blanket superadmin by default:
  - **Console access** (organizer/marketing_partner role) → create via `/api/auth/organizer/add-user` (superadmin-only) or the Admin Panel's user management, with the least-privileged role that covers their work.
  - **SSH/server access** → issue them their own SSH key pair (never share the existing `.pem` file) and add their public key to the EC2 instance's `~/.ssh/authorized_keys`; update the security group's inbound rule process so they know how to request their IP be whitelisted (see `project_adma_overview` — SSH access is IP-restricted and this comes up often).
  - **AWS Console access**, if needed → create a dedicated IAM user for them (never share root or the app's own scoped service-account credentials) with the minimum permissions for their actual task.
- [ ] Confirm MFA/TOTP is set up on their first login if their role requires it (organizer/superadmin/marketing_partner — enforced automatically by the app as of 2026-08-05, see the CAIQ Phase 2 item 8 fix).
- [ ] Walk them through `CHANGE_MANAGEMENT.md` (the deploy/rollback process) before they make their first production change.
- [ ] Add them to the Incident Response contacts list in `INCIDENT_RESPONSE_PLAN.md` if their role means they'd be involved in a real incident.

## Offboarding

- [ ] Revoke their console account: set `status` to something other than `active` (or delete the account, per your data-retention preference) — don't just rely on them "not logging in anymore."
- [ ] Revoke all active sessions tied to them (`revokeSession`/direct `adma_auth_sessions` cleanup if needed).
- [ ] Remove their SSH public key from the EC2 instance's `authorized_keys`.
- [ ] Remove their entry from the EC2 security group's SSH inbound rule, if they had a standing one.
- [ ] Deactivate/delete any dedicated AWS IAM user created for them.
- [ ] Rotate any shared secret they had access to, if there ever was one (there shouldn't be, per `ACCEPTABLE_USE_POLICY.md` — this line exists as a safety net, not an expectation).
- [ ] Confirm they've returned or securely deleted any local copies of `.pem` keys, `.env` files, or exported data.
- [ ] Log the offboarding date and what was revoked, here or in a simple internal note, so there's a record.

## Background screening

Not currently in place — appropriate to skip at the current team size (people already known directly to the operator), but should be added as a real step (even a lightweight reference check) once hiring moves beyond people the operator already knows personally.

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — see `ADMA_CAIQ_Assessment_and_Security_Plan_2026-08-04.md`, Phase 3 item 20.*
