import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';

const TABLE = 'minecon_users';
const router = Router();

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

function sanitize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// POST /api/auth/signup  — attendee account creation with password
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, company } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    const existing = await findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: email.toLowerCase(),
      company: company || '',
      role: 'attendee',
      status: 'active',
      password_hash,
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));
    res.status(201).json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login  — validates password for attendees; skips check for internal roles
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: 'No account found with that email.' });

    if (user.role === 'attendee') {
      if (!user.password_hash) {
        return res.status(401).json({ error: 'This account has no password set. Please sign up again.' });
      }
      const match = await bcrypt.compare(password || '', user.password_hash);
      if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    }

    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── OAuth helper — find or create user from social provider ─────────────────
async function upsertOAuthUser({ email, full_name, oauth_provider, oauth_id }) {
  const existing = await findByEmail(email);
  if (existing) return existing;
  const user = {
    id: generateId(),
    created_date: new Date().toISOString(),
    full_name: full_name || email.split('@')[0],
    email: email.toLowerCase(),
    company: '',
    role: 'attendee',
    status: 'active',
    oauth_provider,
    oauth_id,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: user }));
  return user;
}

// POST /api/auth/google
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

// POST /api/auth/microsoft
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

// POST /api/auth/facebook
router.post('/facebook', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });

    const r = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`);
    if (!r.ok) return res.status(401).json({ error: 'Invalid Facebook token' });
    const profile = await r.json();
    if (!profile.email) return res.status(401).json({ error: 'Facebook account has no email address. Please use email registration.' });

    const user = await upsertOAuthUser({ email: profile.email, full_name: profile.name, oauth_provider: 'facebook', oauth_id: profile.id });
    res.json(sanitize(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
