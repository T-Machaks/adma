import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { QueryCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { sendOtpEmail } from '../lib/mailer.js';

const APP_TABLE  = 'adma_exhibitor_applications';
const USER_TABLE = 'adma_users';
const EXH_TABLE  = 'adma_exhibitors';

const router = Router();

// POST /api/exhibitor-applications  — public, submit a new exhibitor application
router.post('/', async (req, res) => {
  try {
    const { full_name, email, company, tier, description, logo_url, password } = req.body;

    if (!full_name || !email || !company || !tier || !description || !logo_url || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    if (description.length > 150)
      return res.status(400).json({ error: 'Description must be 150 characters or fewer.' });

    const validTiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
    if (!validTiers.includes(tier))
      return res.status(400).json({ error: 'Invalid tier.' });

    // Check for duplicate email
    const existing = await ddb.send(new QueryCommand({
      TableName: APP_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase() },
      Limit: 1,
    }));
    if (existing.Items?.length)
      return res.status(409).json({ error: 'An application for this email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const app = {
      id: generateId(),
      created_date: new Date().toISOString(),
      full_name,
      email: email.toLowerCase(),
      company,
      tier,
      description,
      logo_url,
      password_hash,
      status: 'pending',
    };
    await ddb.send(new PutCommand({ TableName: APP_TABLE, Item: app }));

    const { password_hash: _, ...safe } = app;
    res.status(201).json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/exhibitor-applications  — organizer only, list all applications
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let result;
    if (status) {
      result = await ddb.send(new ScanCommand({
        TableName: APP_TABLE,
        FilterExpression: '#s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': status },
      }));
    } else {
      result = await ddb.send(new ScanCommand({ TableName: APP_TABLE }));
    }
    const items = (result.Items || []).map(({ password_hash, ...rest }) => rest);
    items.sort((a, b) => (b.created_date > a.created_date ? 1 : -1));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/exhibitor-applications/:id/approve  — organizer only
router.put('/:id/approve', async (req, res) => {
  try {
    const { approved_tier } = req.body;

    // Fetch application
    const appResult = await ddb.send(new ScanCommand({
      TableName: APP_TABLE,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': req.params.id },
    }));
    const app = appResult.Items?.[0];
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application already processed.' });

    const tier = approved_tier || app.tier;

    // Create user account
    const userId = generateId();
    await ddb.send(new PutCommand({
      TableName: USER_TABLE,
      Item: {
        id: userId,
        created_date: new Date().toISOString(),
        full_name: app.full_name,
        email: app.email,
        company: app.company,
        phone: '',
        role: 'exhibitor',
        status: 'active',
        password_hash: app.password_hash,
      },
    }));

    // Create exhibitor record
    const tierMap = { Platinum: 'platinum', Gold: 'gold', Silver: 'silver', Bronze: 'bronze' };
    await ddb.send(new PutCommand({
      TableName: EXH_TABLE,
      Item: {
        id: generateId(),
        created_date: new Date().toISOString(),
        company_name: app.company,
        user_id: userId,
        tier: tierMap[tier] || 'bronze',
        featured: tier === 'Platinum',
        logo_url: app.logo_url,
        description: app.description,
        booth_section: 'Machinery Hall',
        status: 'active',
      },
    }));

    // Mark application as approved
    await ddb.send(new UpdateCommand({
      TableName: APP_TABLE,
      Key: { id: app.id },
      UpdateExpression: 'SET #s = :s, approved_tier = :t, approved_date = :d',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'approved', ':t': tier, ':d': new Date().toISOString() },
    }));

    // Notify applicant
    try {
      await sendOtpEmail(app.email, null, {
        subject: 'ADMA Agri Show 2026 — Exhibitor Application Approved',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">Welcome to ADMA Agri Show 2026, ${app.full_name}!</h2>
            <p style="color:#555">Your exhibitor application for <strong>${app.company}</strong> has been approved at the <strong>${tier}</strong> tier.</p>
            <p style="color:#555">You can now log in to the Exhibitor Portal at <a href="https://adma.tyflex.co.zw/exhibitor-login">adma.tyflex.co.zw</a> using your registered email and password.</p>
          </div>
        `,
      });
    } catch (_) { /* non-fatal */ }

    res.json({ ok: true, tier });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/exhibitor-applications/:id/reject  — organizer only
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    const appResult = await ddb.send(new ScanCommand({
      TableName: APP_TABLE,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': req.params.id },
    }));
    const app = appResult.Items?.[0];
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application already processed.' });

    await ddb.send(new UpdateCommand({
      TableName: APP_TABLE,
      Key: { id: app.id },
      UpdateExpression: 'SET #s = :s, rejection_reason = :r, rejected_date = :d',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'rejected', ':r': reason || '', ':d': new Date().toISOString() },
    }));

    try {
      await sendOtpEmail(app.email, null, {
        subject: 'ADMA Agri Show 2026 — Exhibitor Application Update',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">ADMA Agri Show 2026 Exhibitor Application</h2>
            <p style="color:#555">Thank you for applying, ${app.full_name}. Unfortunately, your application for <strong>${app.company}</strong> was not approved at this time.</p>
            ${reason ? `<p style="color:#555"><strong>Reason:</strong> ${reason}</p>` : ''}
            <p style="color:#555">If you believe this is an error, please contact <a href="mailto:info@agrishow.co.zw">info@agrishow.co.zw</a>.</p>
          </div>
        `,
      });
    } catch (_) { /* non-fatal */ }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
