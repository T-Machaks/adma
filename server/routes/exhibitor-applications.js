import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { QueryCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { nextMay30ISO } from '../lib/subscription.js';

const APP_TABLE  = 'adma_exhibitor_applications';
const USER_TABLE = 'adma_users';
const EXH_TABLE  = 'adma_exhibitors';

const router = Router();

// POST /api/exhibitor-applications  — public, submit a new exhibitor application
router.post('/', async (req, res) => {
  try {
    const { full_name, email, company, description, logo_url, password } = req.body;
    const exhibit_type = req.body.exhibit_type === 'virtual' ? 'virtual' : 'physical';
    const tier = req.body.tier;
    const pkg = req.body.package;

    if (!full_name || !email || !company || !description || !logo_url || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    if (description.length > 150)
      return res.status(400).json({ error: 'Description must be 150 characters or fewer.' });

    if (exhibit_type === 'physical') {
      const validTiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
      if (!validTiers.includes(tier))
        return res.status(400).json({ error: 'Invalid tier.' });
    } else {
      const validPackages = ['Basic', 'Enhanced', 'Premium'];
      if (!validPackages.includes(pkg))
        return res.status(400).json({ error: 'Invalid package.' });
    }

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
      exhibit_type,
      tier: exhibit_type === 'physical' ? tier : undefined,
      package: exhibit_type === 'virtual' ? pkg : undefined,
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
    const { approved_tier, approved_package } = req.body;

    // Fetch application
    const appResult = await ddb.send(new ScanCommand({
      TableName: APP_TABLE,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': req.params.id },
    }));
    const app = appResult.Items?.[0];
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.status !== 'pending') return res.status(409).json({ error: 'Application already processed.' });

    const isVirtual = app.exhibit_type === 'virtual';
    // Physical tier stays as-approved (Platinum/Gold/Silver/Bronze); the virtual platform
    // package is independent — for physical applicants, Platinum defaults to Premium and
    // others to Basic, but virtual-only applicants choose their package directly.
    const tier = isVirtual ? undefined : (approved_tier || app.tier);
    const pkg = isVirtual ? (approved_package || app.package) : (tier === 'Platinum' ? 'Premium' : 'Basic');

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
    await ddb.send(new PutCommand({
      TableName: EXH_TABLE,
      Item: {
        id: generateId(),
        created_date: new Date().toISOString(),
        name: app.company,
        user_id: userId,
        tier,
        package: pkg,
        subscription_expires_at: nextMay30ISO(),
        featured: tier === 'Platinum',
        logo_url: app.logo_url,
        description: app.description,
        section: isVirtual ? undefined : 'Machinery Hall',
        status: 'active',
      },
    }));

    // Mark application as approved
    await ddb.send(new UpdateCommand({
      TableName: APP_TABLE,
      Key: { id: app.id },
      UpdateExpression: isVirtual
        ? 'SET #s = :s, approved_package = :p, approved_date = :d'
        : 'SET #s = :s, approved_tier = :t, approved_date = :d',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: isVirtual
        ? { ':s': 'approved', ':p': pkg, ':d': new Date().toISOString() }
        : { ':s': 'approved', ':t': tier, ':d': new Date().toISOString() },
    }));

    // Notify applicant
    try {
      await sendOtpEmail(app.email, null, {
        subject: isVirtual
          ? 'ADMA Digital — Exhibitor Application Approved'
          : 'ADMA Agri Show 2026 — Exhibitor Application Approved',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">Welcome, ${app.full_name}!</h2>
            <p style="color:#555">Your exhibitor application for <strong>${app.company}</strong> has been approved${
              isVirtual ? ` for a virtual presence on ADMA Digital at the <strong>${pkg}</strong> package` : ` at the <strong>${tier}</strong> tier`
            }.</p>
            <p style="color:#555">You can now log in to the Exhibitor Portal at <a href="https://admadigital.co.zw/exhibitor-login">admadigital.co.zw</a> using your registered email and password.</p>
          </div>
        `,
      });
    } catch (_) { /* non-fatal */ }

    res.json({ ok: true, tier, package: pkg });
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
      const isVirtual = app.exhibit_type === 'virtual';
      await sendOtpEmail(app.email, null, {
        subject: isVirtual
          ? 'ADMA Digital — Exhibitor Application Update'
          : 'ADMA Agri Show 2026 — Exhibitor Application Update',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px;color:#111">${isVirtual ? 'ADMA Digital' : 'ADMA Agri Show 2026'} Exhibitor Application</h2>
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
