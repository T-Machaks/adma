# ADMA Digital — Key & Encryption Management Policy

**Effective:** 2026-08-05
**Companion to:** `security/DATA_CLASSIFICATION_AND_RETENTION.md` §4 (brief encryption note) — this document is the fuller, dedicated version for the CAIQ Cryptography domain, which asks about more than just "is data encrypted": algorithm choices, key ownership, access control, and rotation practice.

## 1. Encryption at rest

| What | Mechanism | Key ownership |
|---|---|---|
| DynamoDB (all 49 tables) | AWS-managed encryption at rest, on by default for every DynamoDB table, AES-256 | AWS-owned keys (not customer-managed KMS) |
| S3 (uploaded images/video/documents) | Default bucket encryption (SSE-S3), AES-256 | AWS-owned keys |

**No customer-managed KMS keys are in use.** This is a deliberate, documented choice at the platform's current scale — AWS's default encryption is genuinely adequate protection against the realistic threat model here (a stolen disk, an internal AWS process bug), and customer-managed keys add real operational overhead (key policies, rotation scheduling, access auditing) without a corresponding customer/partner requirement asking for it yet. Revisit if a partner or enterprise customer specifically requires it — see `RISK_REGISTER.md` #8.

## 2. Encryption in transit

- **TLS 1.2+** on every connection to `admadigital.co.zw`, terminated at nginx using a Let's Encrypt certificate (auto-renewed via Certbot).
- **HSTS** enforced (`Strict-Transport-Security: max-age=31536000; includeSubDomains`), so browsers refuse to downgrade to plain HTTP after the first visit.
- Internal traffic (nginx → the Express process on `127.0.0.1:3001`) is unencrypted loopback traffic on the same host — not exposed to the network, so this is standard practice, not a gap.

## 3. Application-level secrets (distinct from AWS-managed data encryption)

This is the part a "just check the AWS console" review misses — the app also manages its own cryptographic material, separate from what DynamoDB/S3 encrypt at rest:

| Secret | Where it lives | How it's protected | Rotation |
|---|---|---|---|
| User passwords | `adma_users.password_hash` | **bcrypt, cost factor 10** — never stored or logged in plaintext, never returned in any API response (`users.js` strips it from every response) | User-driven (forgot-password flow); no forced periodic rotation policy |
| TOTP (MFA) secrets | `adma_users.totp_secret` | Stored as the raw base32 secret — **inherent to how TOTP works** (the server must hold the same shared secret the authenticator app does to verify codes; this is not "unencrypted when it should be encrypted," it's how symmetric OTP algorithms function). Relies on DynamoDB's at-rest encryption (§1) as the only protection layer, same as any other sensitive field. Never returned in any API response. | Regenerated if a user resets their MFA device |
| Session tokens | `adma_auth_sessions.token` (partition key) | Generated via `crypto.randomBytes(32)` — cryptographically random, 256 bits of entropy, not derived from anything guessable | Expire automatically (24h console roles / 30 days others) and are individually revocable |
| AWS access keys (the app's own scoped IAM user) | `server/.env` on the EC2 host only | Correctly gitignored, confirmed not in git history; scoped to DynamoDB/S3 only (least privilege, proven via real `UnauthorizedOperation` responses when broader access was attempted) | **No rotation schedule defined — open item, see §5** |
| OAuth client secrets (Google/Microsoft/Facebook) | `server/.env` | Same as above | Same as above |
| Mailer (Microsoft Graph) / SMS (OmniFlex) / Paynow credentials | `server/.env` | Same as above | Same as above |

## 4. Access control on keys/secrets

- **`server/.env`** is readable only by whoever has SSH access to the EC2 instance (currently the platform operator) — see `ACCEPTABLE_USE_POLICY.md` for who that covers and what's expected of them.
- **AWS-managed encryption keys** (DynamoDB/S3 default) are implicitly accessible to any AWS principal with data-plane access to those specific resources — which for this app is exactly the one scoped IAM user, confirmed least-privilege.
- **No one holds a "master key"** across all of this — there's no single secret whose compromise unlocks everything at once, other than root/full AWS account access itself (which is a separate, higher-tier concern outside this document's scope).

## 5. Review cadence

This policy should be reviewed **at least annually**, and immediately after any credential rotation, suspected compromise, or new secret type being introduced (e.g. a new third-party integration requiring its own API key).

## 6. Open items

- [ ] **Define a rotation schedule** for `server/.env` secrets (AWS keys, OAuth secrets, mailer/SMS/Paynow credentials) — currently no periodic rotation happens; a reasonable starting policy would be annual rotation plus immediate rotation on any suspected exposure (this overlaps with `INCIDENT_RESPONSE_PLAN.md`'s containment step for a credential-leak scenario).
- [ ] **Back up `.env` securely off-instance** (already flagged in `DISASTER_RECOVERY_PLAN.md` §5 as a DR gap — it's also a key-management gap from this document's angle: right now there's exactly one copy of every application secret in existence).
- [ ] Revisit customer-managed KMS only if a specific partner/customer requirement emerges (§1).

---
*Part of ADMA Digital's CAIQ v4.0.3 remediation plan — strengthens the Cryptography domain (was 21.7% in the 2026-08-04 assessment).*
