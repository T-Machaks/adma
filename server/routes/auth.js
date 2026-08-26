import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GetCommand, QueryCommand, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { sendSmsOtp, verifySmsOtp } from '../lib/omniflex.js';
import { generateSecret, generateQrDataUrl, verifyToken } from '../lib/totp.js';
import { logSecurityEvent } from '../lib/securityLog.js';
import { createSession, revokeSession, revokeAllSessionsForUser, SESSION_COOKIE } from '../lib/session.js';
import { requireRole, requireAuth } from '../lib/authMiddleware.js';
import { getMyExhibitorId, CONSOLE_ROLES } from '../lib/ownership.js';

const TABLE = 'adma_users';
const APP_URL = 'https://admadigital.co.zw';
const router = Router();

async function issueSession(req, res, user) {
  const { token, expiresAt } = await createSession(user);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // req.secure reflects the real scheme (nginx forwards X-Forwarded-Proto and
    // `trust proxy` is set in index.js) — more reliable here than NODE_ENV, which
    // isn't currently set on the pm2 process.
    secure: req.secure,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function welcomeHtml(user) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f2e1c;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#eab308;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">ADMA Digital</h1>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">The Digital Platform for the ADMA Agri Show</p>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="margin:0 0 6px;color:#111;font-size:20px;">Account Created ✓</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px;">
          Hi <strong>${user.full_name}</strong>, your ADMA Digital account has been created with the email
          <strong>${user.email}</strong>.
        </p>
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Next Steps</p>
          <ul style="margin:0;padding:0 0 0 16px;color:#555;font-size:13px;line-height:2;">
            <li>Log in at <a href="${APP_URL}" style="color:#f59e0b;">${APP_URL.replace('https://', '')}</a></li>
            <li>Register for the event to get your QR badge</li>
            <li>Browse the exhibitor directory before the event</li>
          </ul>
        </div>
        <a href="${APP_URL}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Log In →</a>
      </div>
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">ADMA Digital · Zimbabwe</p>
        <p style="margin:0;color:#cbd5e1;font-size:11px;">If you did not create this account, please ignore this email.</p>
      </div>
    </div>`;
}

// Combined "you've been added + here's your registration + set your password" email —
// one email rather than three, since all of it lands on the same new account at once.
function teamMemberInviteHtml(user, companyName, resetUrl) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#111">You've been added to the ${companyName} team</h2>
      <p style="margin:0 0 20px;color:#555">Hi <strong>${user.full_name}</strong>, you now have exhibitor portal access for <strong>${companyName}</strong> on ADMA Digital, and you're registered for the event — your entry badge will be available once you log in.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Registration</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#888;font-size:13px;width:40%">Name</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${user.full_name}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px">Email</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${user.email}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px">Badge</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">Exhibitor</td></tr>
        </table>
      </div>
      <p style="margin:0 0 20px;color:#555">Set a password to finish activating your account:</p>
      <a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Set Password &amp; Log In →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#888">This link expires in 30 minutes. If you weren't expecting this, you can safely ignore it.</p>
    </div>`;
}

// Same "you've been added" notice as teamMemberInviteHtml, but for an existing
// account that already has a password — no reset link, just a plain heads-up with
// a login link so they can accept access with their current credentials.
function teamMemberUpgradeHtml(user, companyName, loginUrl) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#111">You've been added to the ${companyName} team</h2>
      <p style="margin:0 0 20px;color:#555">Hi <strong>${user.full_name}</strong>, your existing ADMA Digital account (<strong>${user.email}</strong>) now has exhibitor portal access for <strong>${companyName}</strong>, and you're registered for the event — your entry badge will be available once you log in.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Registration</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#888;font-size:13px;width:40%">Name</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${user.full_name}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px">Email</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${user.email}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px">Badge</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">Exhibitor</td></tr>
        </table>
      </div>
      <p style="margin:0 0 20px;color:#555">Log in with your existing password to accept and access the exhibitor portal:</p>
      <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Log In &amp; Accept →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#888">If you weren't expecting this, please contact ADMA Digital support.</p>
    </div>`;
}

function resetPasswordHtml(resetUrl) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;color:#111">Reset your password</h2>
      <p style="margin:0 0 24px;color:#555">Click the button below to set a new password for your ADMA Digital account. This link expires in 30 minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset Password →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#888">If you didn't request this, you can safely ignore this email — your password will stay unchanged.</p>
    </div>`;
}

// ── In-memory challenge store ─────────────────────────────────────────────────
// token -> { type: 'email'|'totp'|'totp_setup', userId, email, otp?, secret?, expiresAt }
const challengeStore = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [k, v] of challengeStore) {
    if (v.expiresAt < now) challengeStore.delete(k);
  }
}

function newToken() { return crypto.randomUUID(); }
function newExpiry() { return Date.now() + 10 * 60 * 1000; } // 10 min
function newResetExpiry() { return Date.now() + 30 * 60 * 1000; } // 30 min — email link, not an in-session OTP
function generateOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// Organizer/superadmin accounts require TOTP no matter which login path got them
// here (password, OAuth, ...) — sends the totp_required challenge response and
// returns true if it did, so the caller knows to stop instead of logging them in.
const CONSOLE_MFA_ROLES = ['organizer', 'superadmin', 'marketing_partner'];

async function totpChallengeIfRequired(res, user) {
  if (!CONSOLE_MFA_ROLES.includes(user.role)) return false;
  const token = newToken();
  if (!user.totp_secret) {
    const secret = generateSecret();
    const qr_code = await generateQrDataUrl(user.email, secret);
    challengeStore.set(token, { type: 'totp_setup', userId: user.id, secret, expiresAt: newExpiry() });
    res.json({ totp_required: true, mfa_token: token, first_time: true, qr_code });
    return true;
  }
  challengeStore.set(token, { type: 'totp', userId: user.id, expiresAt: newExpiry() });
  res.json({ totp_required: true, mfa_token: token, first_time: false });
  return true;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function findByEmail(email) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email.toLowerCase() },
    Limit: 1,
  }));
  return result.Items?.[0] ?? null;
}

async function getById(id) {
  const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return result.Item ?? null;
}

function sanitize(user) {
  const { password_hash, totp_secret, password_history, ...rest } = user;
  return rest;
}

// ── Password policy ──────────────────────────────────────────────────────────
// 180 days (~6 months) — a common enterprise/compliance-driven rotation window
// (PCI-DSS traditionally required 90 days; NIST SP 800-63B's current guidance is
// actually to avoid *mandatory periodic* rotation altogether unless there's reason
// to suspect compromise, since forced rotation tends to push people toward
// weaker, predictable variations). 180 days is a reasonable middle ground given
// it's paired with reuse prevention and a name-based weak-password check below,
// which is what NIST recommends leaning on instead of rotation alone.
const PASSWORD_EXPIRY_DAYS = 180;
// How many previous passwords are remembered and blocked from reuse.
const PASSWORD_HISTORY_LIMIT = 5;

function isPasswordExpired(user) {
  // No recorded change date (every account that existed before this feature
  // shipped) is treated as not-yet-expired rather than immediately expired —
  // backfillPasswordChangedAt below starts the clock from their next login
  // instead of force-changing every existing account's password all at once.
  if (!user.password_changed_at) return false;
  return Date.now() - new Date(user.password_changed_at).getTime() > PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

// Best-effort — starts the 6-month clock for accounts that predate this feature,
// the first time they log in after it ships. Not awaited for correctness (a
// failed write just means it's retried on the next login), only to record it.
async function backfillPasswordChangedAt(user) {
  if (user.password_changed_at) return;
  const now = new Date().toISOString();
  user.password_changed_at = now;
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: user.id },
      UpdateExpression: 'SET password_changed_at = :t',
      ExpressionAttributeValues: { ':t': now },
    }));
  } catch (e) {
    console.error('password_changed_at backfill failed:', e.message);
  }
}

// Blocks a password containing any part of the account holder's name (e.g. "Jane
// Smith" blocks "jane...", "...smith...", and "JaneSmith2026" with no space) —
// checked per name segment of 3+ characters so short/common segments ("Jo", "Li",
// a middle initial) don't over-trigger on unrelated words.
function containsName(password, fullName) {
  if (!password || !fullName) return false;
  const strip = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pw = strip(password);
  return fullName.toLowerCase().split(/\s+/).filter(w => w.length >= 3).some(part => pw.includes(strip(part)));
}

// Compares against the account's current password plus its remembered history —
// bcrypt hashes can't be compared directly, so this is a compare-per-candidate
// loop, kept cheap by PASSWORD_HISTORY_LIMIT capping how many there ever are.
async function isPasswordReused(newPassword, user) {
  const candidates = [user.password_hash, ...(user.password_history || [])].filter(Boolean);
  for (const hash of candidates) {
    if (await bcrypt.compare(newPassword, hash)) return true;
  }
  return false;
}

// Called right before overwriting password_hash — rolls the (soon-to-be-previous)
// hash onto the front of the remembered history, capped at PASSWORD_HISTORY_LIMIT.
function nextPasswordHistory(user) {
  if (!user.password_hash) return user.password_history || [];
  return [user.password_hash, ...(user.password_history || [])].slice(0, PASSWORD_HISTORY_LIMIT);
}

// Shared by every endpoint that sets a password (signup, forced change, reset,
// organizer-created accounts) so the two rules can't drift out of sync between them.
async function validateNewPassword(newPassword, user) {
  if (containsName(newPassword, user.full_name)) return 'Password must not contain your name.';
  if (await isPasswordReused(newPassword, user)) return `Password must be different from your last ${PASSWORD_HISTORY_LIMIT} passwords.`;
  return null;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidZimPhone(value) {
  if (!value) return true;
  const clean = value.replace(/[\s\-\(\)]/g, '');
  return /^(\+2637[0-9]{8}|07[0-9]{8})$/.test(clean);
}

function normalizeZimPhone(value) {
  if (!value) return '';
  const clean = value.replace(/[\s\-\(\)]/g, '');
  return clean.startsWith('07') ? '+263' + clean.slice(1) : clean;
}

// ── POST /api/auth/signup  ─────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, company, phone } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (!isValidEmail(email))
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (containsName(password, full_name))
      return res.status(400).json({ error: 'Password must not contain your name.' });

    if (phone && !isValidZimPhone(phone))
      return res.status(400).json({ error: 'Phone number must be a valid Zimbabwe mobile number (e.g. 0771234567 or +263771234567).' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: email.toLowerCase(),
      company: company || '',
      phone: normalizeZimPhone(phone),
      role: 'attendee',
      status: 'active',
      password_hash,
      password_changed_at: new Date().toISOString(),
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));
    await issueSession(req, res, user);
    res.status(201).json(sanitize(user));

    sendOtpEmail(user.email, null, {
      subject: 'Welcome to ADMA Digital — Account Created',
      html: welcomeHtml(user),
    }).catch(e => console.error('Welcome email failed:', e.message));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/login  ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const user = await findByEmail(email);
    if (!user) {
      logSecurityEvent('login_failed', { email: email.toLowerCase(), reason: 'no_account', ip: req.ip });
      return res.status(401).json({ error: 'No account found with that email.' });
    }
    if (user.status === 'pending')
      return res.status(403).json({ error: 'Your account is pending organizer approval.' });

    // Accounts with no password set (OAuth-only signups, exhibitor team members
    // added without a password) must not be loggable via this endpoint at all —
    // any password value would otherwise silently pass since there's nothing to
    // compare against.
    if (!user.password_hash) {
      logSecurityEvent('login_failed', { userId: user.id, email: user.email, reason: 'no_password_set', ip: req.ip });
      return res.status(401).json({ error: 'This account has no password set. Please sign in with Google/Microsoft/Facebook, or contact your organiser.' });
    }
    const match = await bcrypt.compare(password || '', user.password_hash);
    if (!match) {
      logSecurityEvent('login_failed', { userId: user.id, email: user.email, reason: 'bad_password', ip: req.ip });
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    logSecurityEvent('login_password_verified', { userId: user.id, email: user.email, role: user.role, ip: req.ip });
    cleanExpired();
    await backfillPasswordChangedAt(user);

    // Force password change on first login, or once the 6-month rotation window
    // (PASSWORD_EXPIRY_DAYS) has passed since it was last set.
    if (user.must_change_password || isPasswordExpired(user)) {
      const token = newToken();
      challengeStore.set(token, { type: 'password_change', userId: user.id, expiresAt: newExpiry() });
      return res.json({ must_change_password: true, change_token: token, password_expired: !user.must_change_password });
    }

    // Organizer/superadmin/marketing_partner → TOTP (authenticator app), unconditionally —
    // console-role MFA is not skippable via mfa_exempt (CAIQ Phase 2 item 8). This must run
    // BEFORE the mfa_exempt check below, since totpChallengeIfRequired already returns
    // false for any non-console role and would otherwise never get a chance to run.
    if (await totpChallengeIfRequired(res, user)) return;

    // Explicitly-flagged demo accounts skip the remaining 2FA step (email OTP). Opt-in per
    // account, attendee/exhibitor only — a console-role account can never reach this
    // branch, since the check above already returned true for it.
    if (user.mfa_exempt) {
      await issueSession(req, res, user);
      return res.json(sanitize(user));
    }

    // All other roles → email OTP via NoReply@tyflex.co.zw
    const otp = generateOtp();
    const token = newToken();
    challengeStore.set(token, {
      type: 'email',
      userId: user.id,
      email: user.email,
      phone: user.phone || '',
      otp,
      expiresAt: newExpiry(),
    });

    try {
      await sendOtpEmail(user.email, otp);
    } catch (mailErr) {
      console.error('Email OTP send failed:', mailErr.message);
      return res.status(503).json({ error: 'Could not send verification email. Please try again.' });
    }

    return res.json({
      mfa_required: true,
      mfa_token: token,
      email_hint: maskEmail(user.email),
      phone_hint: user.phone ? maskPhone(user.phone) : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/otp/verify  — email or SMS OTP ────────────────────────
router.post('/otp/verify', async (req, res) => {
  try {
    const { mfa_token, otp } = req.body;
    if (!mfa_token || !otp)
      return res.status(400).json({ error: 'mfa_token and otp are required.' });

    cleanExpired();
    const entry = challengeStore.get(mfa_token);
    if (!entry || !['email', 'sms'].includes(entry.type))
      return res.status(401).json({ error: 'Verification code expired. Please log in again.' });

    if (entry.type === 'sms') {
      try {
        await verifySmsOtp(entry.phone, otp.trim());
      } catch {
        logSecurityEvent('otp_failed', { userId: entry.userId, method: 'sms', ip: req.ip });
        return res.status(401).json({ error: 'Incorrect verification code.' });
      }
    } else {
      if (entry.otp !== otp.trim()) {
        logSecurityEvent('otp_failed', { userId: entry.userId, method: 'email', ip: req.ip });
        return res.status(401).json({ error: 'Incorrect verification code.' });
      }
    }

    challengeStore.delete(mfa_token);
    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    logSecurityEvent('login_success', { userId: user.id, email: user.email, role: user.role, method: entry.type, ip: req.ip });
    await issueSession(req, res, user);
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/otp/resend  — resend or switch method (email ↔ sms) ───
router.post('/otp/resend', async (req, res) => {
  try {
    const { mfa_token, method } = req.body;
    if (!mfa_token) return res.status(400).json({ error: 'mfa_token required.' });

    cleanExpired();
    const entry = challengeStore.get(mfa_token);
    if (!entry || !['email', 'sms'].includes(entry.type))
      return res.status(401).json({ error: 'Session expired. Please log in again.' });

    const target = method || entry.type;

    if (target === 'sms') {
      if (!entry.phone) return res.status(400).json({ error: 'No phone number on this account.' });
      try {
        await sendSmsOtp(entry.phone);
      } catch (smsErr) {
        console.error('SMS OTP send failed:', smsErr.message);
        return res.status(503).json({ error: 'Could not send SMS. Please try email instead.' });
      }
      entry.type = 'sms';
      entry.expiresAt = newExpiry();
      return res.json({ ok: true, method: 'sms' });
    }

    // email
    const otp = generateOtp();
    entry.otp = otp;
    entry.type = 'email';
    entry.expiresAt = newExpiry();
    try {
      await sendOtpEmail(entry.email, otp);
    } catch (mailErr) {
      console.error('Email OTP resend failed:', mailErr.message);
      return res.status(503).json({ error: 'Could not send verification email. Please try again.' });
    }
    res.json({ ok: true, method: 'email' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/change-password  — forced on first login ──────────────
router.post('/change-password', async (req, res) => {
  try {
    const { change_token, new_password } = req.body;
    if (!change_token || !new_password)
      return res.status(400).json({ error: 'change_token and new_password are required.' });
    if (new_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (new_password === '@AgriShow2026')
      return res.status(400).json({ error: 'You must choose a different password.' });

    cleanExpired();
    const entry = challengeStore.get(change_token);
    if (!entry || entry.type !== 'password_change')
      return res.status(401).json({ error: 'Session expired. Please log in again.' });

    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const validationError = await validateNewPassword(new_password, user);
    if (validationError) return res.status(400).json({ error: validationError });

    const password_hash = await bcrypt.hash(new_password, 10);
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: user.id },
      UpdateExpression: 'SET password_hash = :p, password_changed_at = :t, password_history = :h REMOVE must_change_password',
      ExpressionAttributeValues: { ':p': password_hash, ':t': new Date().toISOString(), ':h': nextPasswordHistory(user) },
    }));

    challengeStore.delete(change_token);

    // Immediately issue TOTP challenge so the user continues without re-entering credentials
    const token = newToken();
    const updatedUser = { ...user, password_hash, must_change_password: undefined };

    if (!updatedUser.totp_secret) {
      const secret  = generateSecret();
      const qr_code = await generateQrDataUrl(updatedUser.email, secret);
      challengeStore.set(token, { type: 'totp_setup', userId: updatedUser.id, secret, expiresAt: newExpiry() });
      return res.json({ totp_required: true, mfa_token: token, first_time: true, qr_code });
    }

    challengeStore.set(token, { type: 'totp', userId: updatedUser.id, expiresAt: newExpiry() });
    return res.json({ totp_required: true, mfa_token: token, first_time: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Shared by /forgot-password and the organizer-driven exhibitor email-provisioning
// endpoint below — issues a password_reset challenge and emails the link. Never
// throws on mail failure (caller just logs it), matching /forgot-password's original
// behavior of not letting a mail-provider hiccup surface as a user-facing error.
async function sendPasswordResetLink(user, req) {
  cleanExpired();
  const token = newToken();
  challengeStore.set(token, { type: 'password_reset', userId: user.id, expiresAt: newResetExpiry() });
  logSecurityEvent('password_reset_requested', { userId: user.id, email: user.email, ip: req.ip });
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  try {
    await sendOtpEmail(user.email, null, {
      subject: 'ADMA Digital — Reset your password',
      html: resetPasswordHtml(resetUrl),
    });
  } catch (mailErr) {
    console.error('Password reset email failed:', mailErr.message);
  }
}

// ── POST /api/auth/forgot-password  — request a reset link by email ──────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to enumerate registered emails.
    const user = await findByEmail(email);
    if (user) await sendPasswordResetLink(user, req);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/reset-password  — consume the emailed token ───────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password)
      return res.status(400).json({ error: 'token and new_password are required.' });
    if (new_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    cleanExpired();
    const entry = challengeStore.get(token);
    if (!entry || entry.type !== 'password_reset')
      return res.status(401).json({ error: 'This reset link has expired or was already used. Please request a new one.' });

    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const validationError = await validateNewPassword(new_password, user);
    if (validationError) return res.status(400).json({ error: validationError });

    const password_hash = await bcrypt.hash(new_password, 10);
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: user.id },
      UpdateExpression: 'SET password_hash = :p, password_changed_at = :t, password_history = :h REMOVE must_change_password',
      ExpressionAttributeValues: { ':p': password_hash, ':t': new Date().toISOString(), ':h': nextPasswordHistory(user) },
    }));

    challengeStore.delete(token);
    logSecurityEvent('password_reset_completed', { userId: user.id, email: user.email, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/totp/verify  — authenticator app code ─────────────────
router.post('/totp/verify', async (req, res) => {
  try {
    const { mfa_token, code } = req.body;
    if (!mfa_token || !code)
      return res.status(400).json({ error: 'mfa_token and code are required.' });

    cleanExpired();
    const entry = challengeStore.get(mfa_token);
    if (!entry || !['totp', 'totp_setup'].includes(entry.type))
      return res.status(401).json({ error: 'Session expired. Please log in again.' });

    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const secret = entry.type === 'totp_setup' ? entry.secret : user.totp_secret;
    if (!secret) return res.status(401).json({ error: 'TOTP not configured for this account.' });

    if (!await verifyToken(secret, code.trim())) {
      logSecurityEvent('totp_failed', { userId: user.id, email: user.email, ip: req.ip });
      return res.status(401).json({ error: 'Incorrect authenticator code. Please try again.' });
    }

    // If this was first-time setup, persist the TOTP secret
    if (entry.type === 'totp_setup') {
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: user.id },
        UpdateExpression: 'SET totp_secret = :s',
        ExpressionAttributeValues: { ':s': secret },
      }));
    }

    challengeStore.delete(mfa_token);
    logSecurityEvent('login_success', { userId: user.id, email: user.email, role: user.role, method: 'totp', ip: req.ip });
    await issueSession(req, res, user);
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/totp/fallback  — "authenticator not available" escape hatch ──
// Converts an in-progress totp/totp_setup challenge into an email or SMS OTP
// challenge on the same mfa_token, so the existing /otp/verify + /otp/resend
// endpoints handle the rest exactly as they do for non-organizer logins.
router.post('/totp/fallback', async (req, res) => {
  try {
    const { mfa_token, method } = req.body;
    if (!mfa_token) return res.status(400).json({ error: 'mfa_token is required.' });

    cleanExpired();
    const entry = challengeStore.get(mfa_token);
    if (!entry || !['totp', 'totp_setup'].includes(entry.type))
      return res.status(401).json({ error: 'Session expired. Please log in again.' });

    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const target = method === 'sms' ? 'sms' : 'email';
    if (target === 'sms' && !user.phone)
      return res.status(400).json({ error: 'No phone number on this account.' });

    if (target === 'sms') {
      try {
        await sendSmsOtp(user.phone);
      } catch (smsErr) {
        console.error('TOTP fallback SMS send failed:', smsErr.message);
        return res.status(503).json({ error: 'Could not send SMS. Please try email instead.' });
      }
      challengeStore.set(mfa_token, { type: 'sms', userId: user.id, email: user.email, phone: user.phone, expiresAt: newExpiry() });
      return res.json({ ok: true, method: 'sms', phone_hint: maskPhone(user.phone) });
    }

    const otp = generateOtp();
    try {
      await sendOtpEmail(user.email, otp);
    } catch (mailErr) {
      console.error('TOTP fallback email send failed:', mailErr.message);
      return res.status(503).json({ error: 'Could not send verification email. Please try again.' });
    }
    challengeStore.set(mfa_token, { type: 'email', userId: user.id, email: user.email, phone: user.phone || '', otp, expiresAt: newExpiry() });
    res.json({ ok: true, method: 'email', email_hint: maskEmail(user.email) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── OAuth helpers ─────────────────────────────────────────────────────────
async function upsertOAuthUser({ email, full_name, oauth_provider, oauth_id }) {
  const existing = await findByEmail(email);
  if (existing) return existing;
  const user = {
    id: generateId(),
    created_date: new Date().toISOString(),
    full_name: full_name || email.split('@')[0],
    email: email.toLowerCase(),
    company: '',
    phone: '',
    role: 'attendee',
    status: 'active',
    oauth_provider,
    oauth_id,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));

  sendOtpEmail(user.email, null, {
    subject: 'Welcome to ADMA Digital — Account Created',
    html: welcomeHtml(user),
  }).catch(e => console.error('Welcome email failed:', e.message));

  return user;
}

// ── POST /api/auth/google ─────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
    const { email, name, sub } = await r.json();
    if (!email) return res.status(401).json({ error: 'Could not retrieve email from Google' });
    const user = await upsertOAuthUser({ email, full_name: name, oauth_provider: 'google', oauth_id: sub });
    // Console-role MFA is not skippable via mfa_exempt (CAIQ Phase 2 item 8) -- the function
    // itself already gates on role, so this is unconditional here.
    if (await totpChallengeIfRequired(res, user)) return;
    await issueSession(req, res, user);
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/microsoft ──────────────────────────────────────────────
router.post('/microsoft', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return res.status(401).json({ error: 'Invalid Microsoft token' });
    const profile = await r.json();
    const email = profile.mail || profile.userPrincipalName;
    if (!email) return res.status(401).json({ error: 'Could not retrieve email from Microsoft' });
    const user = await upsertOAuthUser({ email, full_name: profile.displayName, oauth_provider: 'microsoft', oauth_id: profile.id });
    // Console-role MFA is not skippable via mfa_exempt (CAIQ Phase 2 item 8) -- the function
    // itself already gates on role, so this is unconditional here.
    if (await totpChallengeIfRequired(res, user)) return;
    await issueSession(req, res, user);
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/facebook ───────────────────────────────────────────────
router.post('/facebook', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const r = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`);
    if (!r.ok) return res.status(401).json({ error: 'Invalid Facebook token' });
    const profile = await r.json();
    if (!profile.email) return res.status(401).json({ error: 'Facebook account has no email. Please use email registration.' });
    const user = await upsertOAuthUser({ email: profile.email, full_name: profile.name, oauth_provider: 'facebook', oauth_id: profile.id });
    // Console-role MFA is not skippable via mfa_exempt (CAIQ Phase 2 item 8) -- the function
    // itself already gates on role, so this is unconditional here.
    if (await totpChallengeIfRequired(res, user)) return;
    await issueSession(req, res, user);
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/organizer/add-user  — superadmin only ─────────────────
router.post('/organizer/add-user', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    // req.user comes from the verified session cookie (server/lib/authMiddleware.js),
    // not a client-supplied field — a spoofed requester can no longer claim to be a
    // superadmin just by naming one in the request body.
    const requester = req.user ? await getById(req.user.id) : null;
    // Role is the source of truth (matches every other authz check in this app) — this
    // used to be a hardcoded SUPERADMIN_EMAILS allowlist that only listed one address,
    // silently locking out a second, legitimately-provisioned superadmin account (found
    // 2026-08-05 while auditing MFA coverage — CAIQ Phase 2 item 9's "second admin
    // account" already existed at the data level, this bug just prevented it from
    // exercising full superadmin capability).
    if (!requester || requester.role !== 'superadmin') {
      logSecurityEvent('add_organizer_denied', { requesterId: req.user?.id, ip: req.ip });
      return res.status(403).json({ error: 'Only superadmin organizers can add organizer accounts.' });
    }
    const requester_email = requester.email;

    if (!full_name || !email || !password)
      return res.status(400).json({ error: 'full_name, email and password are required.' });
    if (!isValidEmail(email))
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (containsName(password, full_name))
      return res.status(400).json({ error: 'Password must not contain your name.' });

    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: email.toLowerCase(),
      company: '',
      phone: '',
      role: 'organizer',
      status: 'active',
      password_hash,
      password_changed_at: new Date().toISOString(),
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));
    logSecurityEvent('organizer_added', { requesterEmail: requester_email, newUserId: user.id, newUserEmail: user.email, ip: req.ip });
    res.status(201).json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/organizer/set-exhibitor-email  — provision a real exhibitor login ──
// Sets the login email on an exhibitor's linked account and, unless send_email is
// explicitly false, emails them a password-reset link (the same one /forgot-password
// sends) so they set their own password — the organizer never handles or knows it.
// send_email defaults true for the explicit "Send Login Email" action; the plain Save
// button (fixing a typo, etc.) passes false so it doesn't re-email on every edit.
router.post('/organizer/set-exhibitor-email', requireRole('organizer', 'superadmin'), async (req, res) => {
  try {
    const { exhibitor_id, email, send_email = true } = req.body;
    if (!exhibitor_id || !email) return res.status(400).json({ error: 'exhibitor_id and email are required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const exhResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitor_id } }));
    const exhibitor = exhResult.Item;
    if (!exhibitor) return res.status(404).json({ error: 'Exhibitor not found.' });
    if (!exhibitor.user_id) return res.status(400).json({ error: 'This exhibitor has no linked login account.' });

    const normalizedEmail = email.toLowerCase();
    const existing = await findByEmail(normalizedEmail);

    let linkedUser;
    if (existing && existing.id !== exhibitor.user_id) {
      // The email belongs to a different, already-existing account (e.g. someone who
      // registered as an attendee and is now being made this exhibitor's login) rather
      // than a genuine collision — link that account to this exhibitor instead of
      // rejecting it, same upgrade pattern as invite-team-member below.
      if (CONSOLE_ROLES.includes(existing.role)) {
        return res.status(409).json({ error: 'That email is already in use by another account.' });
      }
      // An account can only be the primary login for one exhibitor at a time — silently
      // stealing it from another booth would break that other exhibitor's access.
      const otherExhibitors = await ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' }));
      const alreadyLinkedTo = (otherExhibitors.Items || []).find(e => e.id !== exhibitor_id && e.user_id === existing.id);
      if (alreadyLinkedTo) {
        return res.status(409).json({ error: `That account is already the login for exhibitor "${alreadyLinkedTo.name || alreadyLinkedTo.id}".` });
      }

      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: existing.id },
        UpdateExpression: 'SET company = :c, #role = :r, #status = :s',
        ExpressionAttributeNames: { '#role': 'role', '#status': 'status' },
        ExpressionAttributeValues: { ':c': exhibitor.name || '', ':r': 'exhibitor', ':s': 'active' },
      }));
      // Role/company just changed — kill any live sessions issued under the old role.
      await revokeAllSessionsForUser(existing.id);
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: exhibitor_id },
        UpdateExpression: 'SET user_id = :u, contact_email = :e',
        ExpressionAttributeValues: { ':u': existing.id, ':e': normalizedEmail },
      }));
      logSecurityEvent('exhibitor_login_relinked', { exhibitorId: exhibitor_id, previousUserId: exhibitor.user_id, newUserId: existing.id, ip: req.ip });
      linkedUser = { ...existing, company: exhibitor.name || '', role: 'exhibitor', status: 'active', email: normalizedEmail };
      // The old linked account (typically a placeholder stub created when the exhibitor
      // record was set up) is deliberately left untouched, not deleted — it's just no
      // longer this exhibitor's login.
    } else {
      const currentLinked = await getById(exhibitor.user_id);
      if (!currentLinked) return res.status(404).json({ error: 'Linked login account not found.' });
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { id: currentLinked.id },
        UpdateExpression: 'SET email = :e',
        ExpressionAttributeValues: { ':e': normalizedEmail },
      }));
      await ddb.send(new UpdateCommand({
        TableName: 'adma_exhibitors',
        Key: { id: exhibitor_id },
        UpdateExpression: 'SET contact_email = :e',
        ExpressionAttributeValues: { ':e': normalizedEmail },
      }));
      logSecurityEvent('exhibitor_login_email_set', { exhibitorId: exhibitor_id, userId: currentLinked.id, sentEmail: !!send_email, ip: req.ip });
      linkedUser = { ...currentLinked, email: normalizedEmail };
    }

    if (send_email) await sendPasswordResetLink(linkedUser, req);

    res.json({ ok: true, email: normalizedEmail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upgrade path for invite-team-member: the email belongs to an existing account
// (an attendee, or an exhibitor moving over from a different company) rather than
// a brand-new one. Reuses the account id/password — only role/company/status
// change — instead of the old behaviour of rejecting with "already exists".
async function upgradeToExhibitor(req, res, { existing, full_name, normalizedEmail, companyName, exhibitor }) {
  try {
    const previousRole = existing.role;
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: existing.id },
      UpdateExpression: 'SET full_name = :n, company = :c, #role = :r, #status = :s',
      ExpressionAttributeNames: { '#role': 'role', '#status': 'status' },
      ExpressionAttributeValues: { ':n': full_name, ':c': companyName, ':r': 'exhibitor', ':s': 'active' },
    }));
    const updatedUser = { ...existing, full_name, company: companyName, role: 'exhibitor', status: 'active' };

    // Role just changed — kill any live sessions issued under the old role so a
    // stale cookie can't keep acting as an attendee (or whatever they were before).
    await revokeAllSessionsForUser(existing.id);

    // Upgrade their existing registration in place if they have one (e.g. an
    // attendee ticket) rather than leaving two conflicting registrations behind;
    // otherwise create the same Confirmed exhibitor registration a new invite gets.
    const existingReg = await ddb.send(new QueryCommand({
      TableName: 'adma_registrations', IndexName: 'email-index',
      KeyConditionExpression: 'email = :e', ExpressionAttributeValues: { ':e': normalizedEmail },
      Limit: 1,
    }));
    if (existingReg.Items?.length) {
      const reg = existingReg.Items[0];
      await ddb.send(new UpdateCommand({
        TableName: 'adma_registrations',
        Key: { id: reg.id },
        UpdateExpression: 'SET full_name = :n, company = :c, role_type = :rt, ticket_type = :tt, badge_category = :bc, exhibitor_tier = :et, #status = :s',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':n': full_name, ':c': companyName, ':rt': 'Exhibitor', ':tt': 'Exhibitor Staff Pass',
          ':bc': 'Exhibitor', ':et': exhibitor?.package || null, ':s': 'Confirmed',
        },
      }));
    } else {
      await ddb.send(new PutCommand({
        TableName: 'adma_registrations',
        Item: {
          id: generateId(),
          created_date: new Date().toISOString(),
          full_name, email: normalizedEmail, company: companyName,
          role_type: 'Exhibitor', ticket_type: 'Exhibitor Staff Pass', badge_category: 'Exhibitor',
          exhibitor_tier: exhibitor?.package || null, status: 'Confirmed', otp_verified: true,
          day1: true, day2: true, day3: true, token: crypto.randomUUID(),
          checked_in: false, check_in_time: null,
        },
      }));
    }

    logSecurityEvent('team_member_upgraded', { invitedBy: req.user.id, userId: existing.id, email: normalizedEmail, previousRole, ip: req.ip });

    try {
      if (existing.password_hash) {
        // Already has credentials — just notify, with a login link, no reset needed.
        await sendOtpEmail(normalizedEmail, null, {
          subject: `ADMA Digital — You've been added to ${companyName || 'the'} team`,
          html: teamMemberUpgradeHtml(updatedUser, companyName || 'your', `${APP_URL}/login`),
        });
      } else {
        // Account exists but was never activated (no password set) — same combined
        // invite+set-password email a brand-new account gets.
        const token = newToken();
        challengeStore.set(token, { type: 'password_reset', userId: existing.id, expiresAt: newResetExpiry() });
        const resetUrl = `${APP_URL}/reset-password?token=${token}`;
        await sendOtpEmail(normalizedEmail, null, {
          subject: `ADMA Digital — You've been added to ${companyName || 'the'} team`,
          html: teamMemberInviteHtml(updatedUser, companyName || 'your', resetUrl),
        });
      }
    } catch (mailErr) {
      console.error('Team member upgrade email failed:', mailErr.message);
    }

    res.status(200).json(sanitize(updatedUser));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Keeps exhibitor portal team size in the range typical for a booth-staff seat
// allowance on B2B event platforms (most cap SMB/exhibitor tiers well under 10
// seats). Also mirrored client-side in ExhibitorTeam.jsx so the "Add Member"
// button disables before someone hits this as a server error — this check here
// is still the actual source of truth.
const MAX_TEAM_SIZE = 5;

async function countTeamMembers(companyName) {
  // Compared trim+lowercase in JS rather than as a DynamoDB FilterExpression
  // equality — some existing accounts have a `company` value with incidental
  // whitespace differences from adma_exhibitors.name (see ExhibitorTeam.jsx's
  // normCompany, the same fix applied there), which a byte-exact filter would
  // silently undercount.
  const norm = s => (s || '').trim().toLowerCase();
  const target = norm(companyName);
  const result = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: '#role = :r AND (attribute_not_exists(deleted) OR deleted = :f)',
    ExpressionAttributeNames: { '#role': 'role' },
    ExpressionAttributeValues: { ':r': 'exhibitor', ':f': false },
  }));
  return (result.Items || []).filter(u => norm(u.company) === target).length;
}

// ── POST /api/auth/invite-team-member  — exhibitor adds a colleague ──────
// Previously ExhibitorTeam.jsx just POSTed straight to /api/users, which created a
// bare account with no password, no way to ever set one, and no event registration —
// the new member had portal access in theory but no way to actually log in or get a
// badge. This creates the account, a Confirmed 'Exhibitor' registration (so QR/badge
// access works immediately, no separate payment step — it's covered by the inviting
// exhibitor's own package), and emails a single combined invite + set-password link.
router.post('/invite-team-member', requireAuth, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name || !email) return res.status(400).json({ error: 'full_name and email are required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const normalizedEmail = email.toLowerCase();
    const existing = await findByEmail(normalizedEmail);

    // The inviting exhibitor's OWN live company name/tier — never trust a client-
    // supplied `company` for this case, it's exactly the stale-copy bug being fixed.
    // An organizer using this same page has no linked exhibitor record, so falls back
    // to whatever they typed in the form.
    let companyName = req.body.company || '';
    let exhibitor = null;
    if (req.user.role === 'exhibitor') {
      const exhibitorId = await getMyExhibitorId(req);
      if (exhibitorId) {
        const exhResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } }));
        exhibitor = exhResult.Item || null;
        if (exhibitor?.name) companyName = exhibitor.name;
      }
    }

    if (existing) {
      // Genuinely already on this exact team — that's the one case still worth a 409.
      if (existing.role === 'exhibitor' && (existing.company || '').trim().toLowerCase() === companyName.trim().toLowerCase()) {
        return res.status(409).json({ error: 'This person is already on the team.' });
      }
      // Refuse to let this consumer-facing form silently reassign a staff/admin
      // account into an exhibitor team — that privilege change needs to happen
      // deliberately, not by an exhibitor (or anyone) typing in a matching email.
      if (CONSOLE_ROLES.includes(existing.role)) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
    }

    // Team-size cap — checked here so it covers both remaining paths that actually
    // grow the team: upgrading an existing account onto it (below), and creating a
    // brand-new one (further below). The "already on this team" case above doesn't
    // grow anything, so it's deliberately excluded from this check.
    if (companyName) {
      const teamCount = await countTeamMembers(companyName);
      if (teamCount >= MAX_TEAM_SIZE) {
        return res.status(409).json({ error: `Team size limit reached — exhibitors can have up to ${MAX_TEAM_SIZE} team members. Remove someone first, or contact the organiser.` });
      }
    }

    if (existing) {
      return upgradeToExhibitor(req, res, { existing, full_name, normalizedEmail, companyName, exhibitor });
    }

    const newUser = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: normalizedEmail,
      company: companyName,
      phone: '',
      role: 'exhibitor',
      status: 'active',
    };
    await ddb.send(new PutCommand({ TableName: 'adma_users', Item: newUser }));

    // adma_registrations' own CRUD route is organizer/superadmin-write-only, so this
    // can't go through Registration.create() from the client — written directly here,
    // same pattern server/routes/exhibitor-applications.js uses for its /approve handler.
    const registration = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: normalizedEmail,
      company: companyName,
      role_type: 'Exhibitor',
      ticket_type: 'Exhibitor Staff Pass',
      badge_category: 'Exhibitor',
      exhibitor_tier: exhibitor?.package || null,
      status: 'Confirmed',
      otp_verified: true,
      day1: true,
      day2: true,
      day3: true,
      token: crypto.randomUUID(),
      checked_in: false,
      check_in_time: null,
    };
    await ddb.send(new PutCommand({ TableName: 'adma_registrations', Item: registration }));

    const token = newToken();
    challengeStore.set(token, { type: 'password_reset', userId: newUser.id, expiresAt: newResetExpiry() });
    logSecurityEvent('team_member_invited', { invitedBy: req.user.id, newUserId: newUser.id, email: normalizedEmail, ip: req.ip });
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    try {
      await sendOtpEmail(normalizedEmail, null, {
        subject: `ADMA Digital — You've been added to ${companyName || 'the'} team`,
        html: teamMemberInviteHtml(newUser, companyName || 'your', resetUrl),
      });
    } catch (mailErr) {
      console.error('Team member invite email failed:', mailErr.message);
    }

    res.status(201).json(sanitize(newUser));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/resend-team-invite  — recover a stuck invite ──────────
// Covers two real cases found in production: (a) a team member added before this
// invite flow existed, who has no password and no registration at all — this backfills
// the missing registration and sends the invite email for the first time; (b) a normal
// "the invite email never arrived, send it again" request. Deliberately refuses to touch
// an account that already has a password set — that's what /forgot-password is for, and
// this endpoint must never become a way to hijack an active teammate's account.
router.post('/resend-team-invite', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required.' });

    const target = await findByEmail(email.toLowerCase());
    if (!target || target.role !== 'exhibitor') return res.status(404).json({ error: 'No team member found with that email.' });
    if (target.password_hash) return res.status(400).json({ error: 'This member has already set up their account — they should use "Forgot password" instead.' });

    const isOrganizer = req.user.role === 'organizer' || req.user.role === 'superadmin';
    if (!isOrganizer) {
      if (req.user.role !== 'exhibitor') return res.status(403).json({ error: 'You do not have permission to do that.' });
      const exhibitorId = await getMyExhibitorId(req);
      const exhResult = exhibitorId ? await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitorId } })) : null;
      const myCompany = (exhResult?.Item?.name || '').trim().toLowerCase();
      const targetCompany = (target.company || '').trim().toLowerCase();
      if (!myCompany || myCompany !== targetCompany) return res.status(403).json({ error: 'You do not have permission to do that.' });
    }

    const existingReg = await ddb.send(new QueryCommand({
      TableName: 'adma_registrations', IndexName: 'email-index',
      KeyConditionExpression: 'email = :e', ExpressionAttributeValues: { ':e': target.email },
      Limit: 1,
    }));
    if (!existingReg.Items?.length) {
      await ddb.send(new PutCommand({
        TableName: 'adma_registrations',
        Item: {
          id: generateId(),
          created_date: new Date().toISOString(),
          full_name: target.full_name,
          email: target.email,
          company: target.company || '',
          role_type: 'Exhibitor',
          ticket_type: 'Exhibitor Staff Pass',
          badge_category: 'Exhibitor',
          exhibitor_tier: null,
          status: 'Confirmed',
          otp_verified: true,
          day1: true,
          day2: true,
          day3: true,
          token: crypto.randomUUID(),
          checked_in: false,
          check_in_time: null,
        },
      }));
    }

    const token = newToken();
    challengeStore.set(token, { type: 'password_reset', userId: target.id, expiresAt: newResetExpiry() });
    logSecurityEvent('team_member_invite_resent', { requestedBy: req.user.id, userId: target.id, email: target.email, ip: req.ip });
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await sendOtpEmail(target.email, null, {
      subject: `ADMA Digital — You've been added to ${target.company || 'the'} team`,
      html: teamMemberInviteHtml(target, target.company || 'your', resetUrl),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/logout  ────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  await revokeSession(req.cookies?.[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

export default router;
