import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { GetCommand, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { sendSmsOtp, verifySmsOtp } from '../lib/omniflex.js';
import { generateSecret, generateQrDataUrl, verifyToken } from '../lib/totp.js';

const TABLE = 'adma_users';
const APP_URL = 'https://adma.tyflex.co.zw';
const router = Router();

function welcomeHtml(user) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f2e1c;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#eab308;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">ADMA Agri Show 2026</h1>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Zimbabwe's Largest Agricultural Exhibition</p>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="margin:0 0 6px;color:#111;font-size:20px;">Account Created ✓</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px;">
          Hi <strong>${user.full_name}</strong>, your ADMA Agri Show account has been created with the email
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
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">ADMA Agri Show 2026 · ART Farm, Pomona, Harare, Zimbabwe</p>
        <p style="margin:0;color:#cbd5e1;font-size:11px;">If you did not create this account, please ignore this email.</p>
      </div>
    </div>`;
}

// Superadmins — only these accounts can hold the organizer role and add other organizers
const SUPERADMIN_EMAILS = ['info@agrishow.co.zw', 'tamuka@tyflex.co.zw'];

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
function generateOtp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

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
    res.status(201).json(sanitize(user));

    sendOtpEmail(user.email, null, {
      subject: 'Welcome to ADMA Agri Show 2026 — Account Created',
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

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: 'No account found with that email.' });
    if (user.status === 'pending')
      return res.status(403).json({ error: 'Your account is pending organizer approval.' });

    // Password check — required for accounts that have one set
    if (user.password_hash) {
      const match = await bcrypt.compare(password || '', user.password_hash);
      if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    }

    cleanExpired();

    // Force password change on first login
    if (user.must_change_password) {
      const token = newToken();
      challengeStore.set(token, { type: 'password_change', userId: user.id, expiresAt: newExpiry() });
      return res.json({ must_change_password: true, change_token: token });
    }

    // Organizers + superadmin → TOTP (authenticator app)
    if (user.role === 'organizer' || user.role === 'superadmin') {
      const token = newToken();

      if (!user.totp_secret) {
        // First time — generate secret and QR code for setup
        const secret = generateSecret();
        const qr_code = await generateQrDataUrl(user.email, secret);
        challengeStore.set(token, { type: 'totp_setup', userId: user.id, secret, expiresAt: newExpiry() });
        return res.json({ totp_required: true, mfa_token: token, first_time: true, qr_code });
      }

      // TOTP already configured — just prompt for code
      challengeStore.set(token, { type: 'totp', userId: user.id, expiresAt: newExpiry() });
      return res.json({ totp_required: true, mfa_token: token, first_time: false });
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
        return res.status(401).json({ error: 'Incorrect verification code.' });
      }
    } else {
      if (entry.otp !== otp.trim())
        return res.status(401).json({ error: 'Incorrect verification code.' });
    }

    challengeStore.delete(mfa_token);
    const user = await getById(entry.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
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

    if (!await verifyToken(secret, code.trim()))
      return res.status(401).json({ error: 'Incorrect authenticator code. Please try again.' });

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
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/exhibitor-demo-login  — demo mode, common password ────
router.post('/exhibitor-demo-login', async (req, res) => {
  try {
    const { user_id, password } = req.body;
    if (!user_id || !password) return res.status(400).json({ error: 'user_id and password required.' });
    if (password !== '@AgriShow2026') return res.status(401).json({ error: 'Incorrect password.' });
    const user = await getById(user_id);
    if (!user || user.role !== 'exhibitor') return res.status(404).json({ error: 'Exhibitor not found.' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Account is not active.' });
    res.json(sanitize(user));
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
    subject: 'Welcome to ADMA Agri Show 2026 — Account Created',
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
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/auth/organizer/add-user  — superadmin only ─────────────────
router.post('/organizer/add-user', async (req, res) => {
  try {
    const { requester_email, full_name, email, password } = req.body;
    if (!requester_email || !SUPERADMIN_EMAILS.includes(requester_email.toLowerCase()))
      return res.status(403).json({ error: 'Only superadmin organizers can add organizer accounts.' });

    if (!full_name || !email || !password)
      return res.status(400).json({ error: 'full_name, email and password are required.' });

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
    res.status(201).json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
