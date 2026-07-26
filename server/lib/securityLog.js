// Structured security-event logging. Emits one JSON line per event to stdout — pm2
// already captures stdout to a file, and a flat JSON-lines format is a drop-in fit for
// CloudWatch Logs (or any other log aggregator) later with zero code changes here.
// Not a replacement for a real audit trail (no CloudTrail/log-shipping yet), but a
// meaningful step up from unstructured console.error strings for the events that
// actually matter for detecting brute-force/account-abuse: logins, password resets,
// MFA failures, and admin-driven account lock/unlock.
export function logSecurityEvent(type, details = {}) {
  const entry = {
    security_event: type,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log(JSON.stringify(entry));
}
