import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GetCommand, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { sendSmsOtp, verifySmsOtp } from '../lib/omniflex.js';
import { generateSecret, generateQrDataUrl, verifyToken } from '../lib/totp.js';
import { logSecurityEvent } from '../lib/securityLog.js';
import { createSession, revokeSession, SESSION_COOKIE } from '../lib/session.js';
import { requireRole, requireAuth } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';

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
  const { password_hash, totp_secret, ...rest } = user;
  return rest;
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

    // Force password change on first login
    if (user.must_change_password) {
      const token = newToken();
      challengeStore.set(token, { type: 'password_change', userId: user.id, expiresAt: newExpiry() });
      return res.json({ must_change_password: true, change_token: token });
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

    const password_hash = await bcrypt.hash(new_password, 10);
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: user.id },
      UpdateExpression: 'SET password_hash = :p REMOVE must_change_password',
      ExpressionAttributeValues: { ':p': password_hash },
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

    const password_hash = await bcrypt.hash(new_password, 10);
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: user.id },
      UpdateExpression: 'SET password_hash = :p REMOVE must_change_password',
      ExpressionAttributeValues: { ':p': password_hash },
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

    const existing = await findByEmail(email);
    if (existing && existing.id !== exhibitor.user_id) {
      return res.status(409).json({ error: 'That email is already in use by another account.' });
    }

    const linkedUser = await getById(exhibitor.user_id);
    if (!linkedUser) return res.status(404).json({ error: 'Linked login account not found.' });

    const normalizedEmail = email.toLowerCase();
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: linkedUser.id },
      UpdateExpression: 'SET email = :e',
      ExpressionAttributeValues: { ':e': normalizedEmail },
    }));
    await ddb.send(new UpdateCommand({
      TableName: 'adma_exhibitors',
      Key: { id: exhibitor_id },
      UpdateExpression: 'SET contact_email = :e',
      ExpressionAttributeValues: { ':e': normalizedEmail },
    }));

    logSecurityEvent('exhibitor_login_email_set', { exhibitorId: exhibitor_id, userId: linkedUser.id, sentEmail: !!send_email, ip: req.ip });
    if (send_email) await sendPasswordResetLink({ ...linkedUser, email: normalizedEmail }, req);

    res.json({ ok: true, email: normalizedEmail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

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
