import { Router } from 'express';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { crudRouter } from '../lib/crudRouter.js';
import { sendOtpEmail } from '../lib/mailer.js';

const TABLE = 'adma_registrations';
const APP_URL = 'https://admadigital.co.zw';

function confirmationHtml(r) {
  const qty = r.quantity || 1;
  const paid = r.total_amount > 0;

  const rows = [
    ['Registration Type', r.role_type],
    ['Name', r.full_name],
    ['Ticket', r.ticket_type + (qty > 1 ? ` × ${qty}` : '')],
    ['Badge Category', r.badge_category],
    r.exhibitor_tier && ['Exhibitor Tier', r.exhibitor_tier],
    ['Days', [r.day1 && 'Day 1', r.day2 && 'Day 2', r.day3 && 'Day 3'].filter(Boolean).join(', ') || 'Day 1'],
    paid && ['Amount Paid', `$${Number(r.total_amount).toLocaleString()} USD`],
    paid && r.payment_method && ['Payment Method', r.payment_method],
    paid && r.payment_ref && ['Payment Reference', r.payment_ref],
  ].filter(Boolean);

  const tableRows = rows.map(([label, value]) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 0;color:#888;font-size:13px;width:42%;">${label}</td>
      <td style="padding:10px 0;color:#111;font-size:13px;font-weight:600;">${value ?? '—'}</td>
    </tr>`).join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;">
      <!-- Header -->
      <div style="background:#0f2e1c;padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#eab308;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">ADMA Agri Show 2026</h1>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Zimbabwe's Largest Agricultural Exhibition</p>
      </div>

      <div style="padding:32px 24px;">
        <h2 style="margin:0 0 6px;color:#111;font-size:20px;">Registration Confirmed ✓</h2>
        <p style="margin:0 0 24px;color:#555;font-size:15px;">Hi <strong>${r.full_name}</strong>, your registration for ADMA Agri Show 2026 has been confirmed.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${tableRows}</table>

        <!-- QR Resources CTA -->
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h3 style="margin:0 0 8px;color:#92400e;font-size:15px;">Access Your Entry Ticket QR Code${qty > 1 ? 's' : ''}</h3>
          <p style="margin:0 0 16px;color:#78350f;font-size:13px;">
            Your digital visitor badge and entry ticket QR code${qty > 1 ? 's' : ''} are available in the ADMA Digital app.
            ${qty > 1 ? `You have <strong>${qty} separate ticket codes</strong> — one per ticket purchased.` : ''}
            Log in with <strong>${r.email}</strong> to access them.
          </p>
          <a href="${APP_URL}/qr-resources"
            style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">
            View My QR Badge &amp; Tickets →
          </a>
        </div>

        <!-- Next steps -->
        <div style="background:#f8fafc;border-radius:12px;padding:20px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Next Steps</p>
          <ul style="margin:0;padding:0 0 0 16px;color:#555;font-size:13px;line-height:2;">
            <li>Save this email as proof of registration</li>
            <li>Log in to <a href="${APP_URL}" style="color:#f59e0b;">${APP_URL.replace('https://', '')}</a> to access your QR badge</li>
            <li>Browse the exhibitor directory before the event</li>
            <li>Book meetings with exhibitors you want to see</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">ADMA Agri Show 2026 · ART Farm, Pomona, Harare, Zimbabwe</p>
        <p style="margin:0;color:#cbd5e1;font-size:11px;">If you did not register for this event, please ignore this email.</p>
      </div>
    </div>`;
}

export default crudRouter(TABLE, {
  defaults: () => ({
    role_type: 'Attendee',
    ticket_type: 'General Admission',
    badge_category: 'Visitor',
    status: 'Pending',
    otp_verified: false,
    day1: true,
    day2: false,
    day3: false,
    token: crypto.randomUUID(),
    checked_in: false,
    check_in_time: null,
  }),
  extraRoutes(r) {
    r.get('/by-email', async (req, res) => {
      try {
        const email = req.query.email?.toLowerCase();
        if (!email) return res.status(400).json({ error: 'email required' });
        const result = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :e',
          ExpressionAttributeValues: { ':e': email },
          Limit: 1,
        }));
        res.json(result.Items?.[0] ?? null);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.get('/by-email-all', async (req, res) => {
      try {
        const email = req.query.email?.toLowerCase();
        if (!email) return res.status(400).json({ error: 'email required' });
        let items = [];
        let lastKey;
        do {
          const result = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :e',
            ExpressionAttributeValues: { ':e': email },
            ExclusiveStartKey: lastKey,
          }));
          items = items.concat(result.Items || []);
          lastKey = result.LastEvaluatedKey;
        } while (lastKey);
        res.json(items);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    r.post('/confirm-email', async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'id required' });

        const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
        const reg = result.Item;
        if (!reg) return res.status(404).json({ error: 'Registration not found' });
        if (!reg.email) return res.status(400).json({ error: 'No email on registration' });

        await sendOtpEmail(reg.email, null, {
          subject: `ADMA Agri Show 2026 — Registration Confirmed${reg.payment_ref ? ` (Ref: ${reg.payment_ref})` : ''}`,
          html: confirmationHtml(reg),
        });

        res.json({ ok: true });
      } catch (e) {
        console.error('Confirmation email failed:', e.message);
        res.status(500).json({ error: e.message });
      }
    });
  },
});
