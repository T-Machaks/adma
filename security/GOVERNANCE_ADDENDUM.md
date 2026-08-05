# ADMA Digital — Governance Addendum

**Effective:** 2026-08-05
**Purpose:** closes several small, specific governance gaps that didn't fit cleanly into the existing policy documents — a policy-exception process, security community engagement, incident metrics, and regulatory points of contact.

## 1. Policy exception process

Where a genuine business need requires deviating from a documented policy (e.g. `ACCEPTABLE_USE_POLICY.md`, `CHANGE_MANAGEMENT.md`), the exception must be:

1. **Requested explicitly** — stated in writing (a commit message, a note in the relevant security doc, or a direct message to the platform operator), naming which policy and why.
2. **Approved by the platform operator or a superadmin** before the exception is acted on — not after the fact.
3. **Time-bounded** where possible — a one-off deviation, not a silent permanent policy change. If it turns out to be a permanent need, the underlying policy document should be updated instead of accumulating standing exceptions.
4. **Logged** — added to `RISK_REGISTER.md` if it introduces any new risk, or noted in the relevant policy document's own history if it's a one-time operational exception.

At the current team size (1-2 people), this is intentionally lightweight — the point is that deviations are *visible and deliberate*, not that they require a committee.

## 2. Security community engagement

ADMA Digital does not currently maintain formal contact with cloud-security-specific special interest groups (e.g. CSA chapters, regional CERT/CSIRT bodies). Given the platform now handles real payment and personal data at meaningful scale, establishing at least one such contact is a reasonable near-term step — candidates include CSA's own community resources (fitting, given this whole exercise uses their CAIQ framework) and any Zimbabwe/regional CERT. Not yet done — tracked here as an open item rather than claimed.

## 3. Incident metrics

Building on `INCIDENT_RESPONSE_PLAN.md`'s incident log (currently one backfilled entry, the 2026-07-26 CSP rollout), the following metrics should be tracked going forward, reviewed at the same quarterly cadence as `RISK_REGISTER.md`:

- Number of incidents by severity (SEV1/2/3) per quarter
- Mean time to containment (from detection to the first containment action)
- Mean time to resolution (from detection to root-cause fix deployed)
- Number of CSP violations reported (already logged via `logSecurityEvent('csp_violation', ...)`, now centrally visible in CloudWatch Logs)
- Number of failed login attempts / `totp_failed` events per period (already logged, now centrally queryable via CloudWatch Logs Insights)

No dashboard exists yet for these — they're currently queryable ad hoc from CloudWatch Logs (`/adma-digital/api` log group), not auto-aggregated. Building a lightweight CloudWatch dashboard for these metrics is a reasonable next technical step once there's more incident history to make it meaningful.

## 4. Regulatory / law-enforcement points of contact

Not yet established. If a data-disclosure request from a law enforcement or regulatory authority is ever received, route it to the platform operator immediately and do not respond directly without legal review — this is explicitly one of the items flagged in `PRIVACY_POLICY_REVIEW_NOTES.md` as needing real legal input (which regulator has jurisdiction, what Zimbabwe's Cyber and Data Protection Act 2021 requires procedurally) rather than a process this document can responsibly invent.

## 5. Supply chain agreement review

`VENDOR_DEPENDENCY_REVIEW.md` documents every vendor's data access and trust rationale, and commits to review at least annually or when a new integration is added. Formal contractual review (verifying AWS's/Paynow's/Microsoft's actual terms of service explicitly cover the provisions CAIQ asks about — logging capability, incident communication, right-to-audit, termination, data privacy) has not yet been done — reasonable to bundle into the same legal-review pass flagged in `PRIVACY_POLICY_REVIEW_NOTES.md`, since it needs the same kind of legal reading, not engineering work.

## Review cadence

This document, along with `RISK_REGISTER.md`, `VENDOR_DEPENDENCY_REVIEW.md`, `KEY_MANAGEMENT_POLICY.md`, `INCIDENT_RESPONSE_PLAN.md`, `CHANGE_MANAGEMENT.md`, and `DATA_CLASSIFICATION_AND_RETENTION.md`, should be reviewed **at least annually**, and immediately after any significant organizational change (new hire, new major vendor, a real security incident).

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — closes small gaps in Governance/Risk/Compliance, Security Incident Management, and Supply Chain domains.*
