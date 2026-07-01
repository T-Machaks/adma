import { Router } from 'express';
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { sendSms } from '../lib/omniflex.js';

const r = Router();
const APP_URL = 'https://adma.tyflex.co.zw';

function normalizePhone(phone) {
  if (!phone) return null;
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('07') && clean.length === 10) return '+263' + clean.slice(1);
  if (clean.startsWith('+263')) return clean;
  return null;
}

async function emailSilent(to, subject, html) {
  if (!to) return;
  return sendOtpEmail(to, null, { subject, html }).catch(e =>
    console.error(`[notify] email to ${to} failed: ${e.message}`)
  );
}

async function smsSilent(phone, message) {
  const p = normalizePhone(phone);
  if (!p) return;
  return sendSms(p, message).catch(e =>
    console.error(`[notify] sms to ${p} failed: ${e.message}`)
  );
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

function header(preheader = '') {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0f2e1c;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#eab308;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">ADMA Agri Show 2026</h1>
    </div>
    <div style="padding:28px 24px;">`;
}

function footer() {
  return `</div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">ADMA Agri Show 2026 · ART Farm, Pomona, Harare, Zimbabwe</p>
    </div>
    </div>`;
}

function row(label, value) {
  return `<tr style="border-bottom:1px solid #f1f5f9;">
    <td style="padding:9px 0;color:#888;font-size:13px;width:42%;">${label}</td>
    <td style="padding:9px 0;color:#111;font-size:13px;font-weight:600;">${value ?? '—'}</td>
  </tr>`;
}

function meetingRequestAttendeeHtml(m) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">Meeting Request Submitted</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${m.visitor_name}</strong>, your meeting request has been received.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Exhibitor', m.exhibitor_name)}
      ${m.exhibitor_booth ? row('Booth', m.exhibitor_booth) : ''}
      ${row('Date', m.preferred_date)}
      ${row('Time', m.preferred_time)}
      ${m.reason ? row('Purpose', m.reason) : ''}
    </table>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#78350f;font-size:13px;">The exhibitor will review your request and confirm or suggest an alternative time. You'll receive an email and SMS when your meeting status is updated.</p>
    </div>
    <a href="${APP_URL}/meetings" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">View My Meetings →</a>
  ` + footer();
}

function meetingRequestExhibitorHtml(m) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">New Meeting Request</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">You have a new meeting request from <strong>${m.visitor_name}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Visitor', m.visitor_name)}
      ${m.visitor_company ? row('Company', m.visitor_company) : ''}
      ${row('Date', m.preferred_date)}
      ${row('Time', m.preferred_time)}
      ${m.reason ? row('Purpose', m.reason) : ''}
    </table>
    <p style="color:#555;font-size:13px;">Log in to the exhibitor portal to confirm or decline this request.</p>
    <a href="${APP_URL}/exhibitor" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Respond in Exhibitor Portal →</a>
  ` + footer();
}

function meetingStatusHtml(m, action) {
  const confirmed = action === 'confirmed';
  return header() + `
    <h2 style="margin:0 0 6px;color:${confirmed ? '#16a34a' : '#dc2626'};font-size:18px;">
      Meeting ${confirmed ? 'Confirmed ✓' : 'Not Accepted'}
    </h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">
      Hi <strong>${m.visitor_name}</strong>,
      ${confirmed
        ? `your meeting with <strong>${m.exhibitor_name}</strong> has been confirmed.`
        : `your meeting request with <strong>${m.exhibitor_name}</strong> was not accepted at this time.`}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Exhibitor', m.exhibitor_name)}
      ${m.exhibitor_booth ? row('Booth', m.exhibitor_booth) : ''}
      ${row('Date', m.preferred_date)}
      ${row('Time', m.preferred_time)}
      ${row('Status', confirmed ? '✓ Confirmed' : 'Not accepted')}
    </table>
    ${confirmed
      ? `<div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;padding:14px;margin-bottom:20px;">
           <p style="margin:0;color:#065f46;font-size:13px;">Please be at the exhibitor's booth at the confirmed time. Bring your visitor badge QR code.</p>
         </div>`
      : `<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:14px;margin-bottom:20px;">
           <p style="margin:0;color:#7f1d1d;font-size:13px;">You are welcome to submit a new meeting request with a different time or exhibitor.</p>
         </div>`}
    <a href="${APP_URL}/meetings" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">
      ${confirmed ? 'View Confirmed Meeting →' : 'Submit Another Request →'}
    </a>
  ` + footer();
}

const TYPE_COLOUR = {
  Important: '#dc2626',
  Reminder:  '#d97706',
  Update:    '#16a34a',
  General:   '#2563eb',
};

function announcementHtml(a, recipientName) {
  const colour = TYPE_COLOUR[a.type] || '#64748b';
  return header() + `
    <div style="display:inline-block;background:${colour}20;border:1px solid ${colour}40;border-radius:6px;padding:3px 10px;margin-bottom:14px;">
      <span style="color:${colour};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${a.type || 'Update'}</span>
    </div>
    <h2 style="margin:0 0 12px;color:#111;font-size:18px;">${a.title}</h2>
    ${recipientName ? `<p style="margin:0 0 16px;color:#555;font-size:14px;">Hi <strong>${recipientName}</strong>,</p>` : ''}
    <p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;">${(a.body || '').replace(/\n/g, '<br>')}</p>
    <a href="${APP_URL}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Open ADMA Agri Show App →</a>
  ` + footer();
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Meeting request created / status changed
r.post('/meeting', async (req, res) => {
  res.json({ ok: true }); // respond immediately

  const { meeting, action } = req.body;
  if (!meeting || !action) return;

  try {
    if (action === 'created') {
      // Attendee confirmation
      await emailSilent(
        meeting.visitor_email,
        `Meeting request submitted — ${meeting.exhibitor_name}`,
        meetingRequestAttendeeHtml(meeting)
      );
      await smsSilent(
        meeting.visitor_phone,
        `ADMA Agri Show 2026: Meeting request with ${meeting.exhibitor_name} on ${meeting.preferred_date} at ${meeting.preferred_time} submitted. You'll be notified when confirmed.`
      );

      // Exhibitor notification (look up contact email)
      if (meeting.exhibitor_id) {
        const result = await ddb.send(new GetCommand({
          TableName: 'adma_exhibitors',
          Key: { id: meeting.exhibitor_id },
        })).catch(() => null);
        const exhibitor = result?.Item;
        if (exhibitor?.contact_email) {
          await emailSilent(
            exhibitor.contact_email,
            `New meeting request from ${meeting.visitor_name}`,
            meetingRequestExhibitorHtml(meeting)
          );
        }
        if (exhibitor?.phone) {
          await smsSilent(
            exhibitor.phone,
            `ADMA Agri Show 2026: New meeting request from ${meeting.visitor_name} for ${meeting.preferred_date} at ${meeting.preferred_time}. Log in to your portal to respond.`
          );
        }
      }
    } else if (action === 'confirmed' || action === 'declined') {
      await emailSilent(
        meeting.visitor_email,
        action === 'confirmed'
          ? `Meeting confirmed — ${meeting.exhibitor_name}`
          : `Meeting update — ${meeting.exhibitor_name}`,
        meetingStatusHtml(meeting, action)
      );
      await smsSilent(
        meeting.visitor_phone,
        action === 'confirmed'
          ? `ADMA Agri Show 2026: Your meeting with ${meeting.exhibitor_name} on ${meeting.preferred_date} at ${meeting.preferred_time} is CONFIRMED. See you there!`
          : `ADMA Agri Show 2026: Your meeting request with ${meeting.exhibitor_name} was not accepted. You may submit a new request at ${APP_URL}/meetings`
      );
    }
  } catch (e) {
    console.error('[notify] meeting error:', e.message);
  }
});

// Announcement broadcast to all registrations
r.post('/announcement', async (req, res) => {
  res.json({ ok: true }); // respond immediately, run blast in background

  const { announcement } = req.body;
  if (!announcement?.title) return;

  setImmediate(async () => {
    try {
      const result = await ddb.send(new ScanCommand({ TableName: 'adma_registrations' }));
      const registrations = result.Items || [];
      const subject = `ADMA Agri Show 2026 [${announcement.type || 'Update'}]: ${announcement.title}`;
      const smsBody  = `ADMA Agri Show 2026 [${announcement.type || 'Update'}]: ${announcement.title}. ${(announcement.body || '').slice(0, 120)}`;

      for (const reg of registrations) {
        await emailSilent(reg.email, subject, announcementHtml(announcement, reg.full_name));
        await smsSilent(reg.phone, smsBody);
        // Brief pause to avoid rate limits
        await new Promise(ok => setTimeout(ok, 150));
      }
      console.log(`[notify] Announcement "${announcement.title}" sent to ${registrations.length} registrations.`);
    } catch (e) {
      console.error('[notify] announcement blast error:', e.message);
    }
  });
});

// ── Enquiry submitted by attendee ────────────────────────────────────────────
function enquirySenderHtml(q, exName) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">Enquiry Received ✓</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${q.name}</strong>, your enquiry has been sent to <strong>${exName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Exhibitor', exName)}
      ${q.company ? row('Your Company', q.company) : ''}
      ${row('Your Message', `<span style="white-space:pre-wrap;">${q.message || '—'}</span>`)}
    </table>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#78350f;font-size:13px;">The exhibitor will review your message and contact you directly. You can also book a meeting with them at ADMA Agri Show 2026.</p>
    </div>
    <a href="${APP_URL}/exhibitors" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Browse More Exhibitors →</a>
  ` + footer();
}

function enquiryExhibitorHtml(q) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">New Enquiry Received</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">You have received a new information request via ADMA Agri Show 2026.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('From', q.name)}
      ${q.email ? row('Email', `<a href="mailto:${q.email}" style="color:#f59e0b;">${q.email}</a>`) : ''}
      ${q.company ? row('Company', q.company) : ''}
      ${q.phone ? row('Phone', q.phone) : ''}
      ${row('Message', `<span style="white-space:pre-wrap;">${q.message || '—'}</span>`)}
    </table>
    <p style="color:#555;font-size:13px;">Reply directly to this person at their email address above, or follow up at the event.</p>
    <a href="${APP_URL}/exhibitor" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">View Exhibitor Portal →</a>
  ` + footer();
}

function enquiryReplyHtml(q, reply, exName) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">Reply from ${exName}</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${q.name}</strong>, you have received a reply to your enquiry.</p>
    <div style="background:#f8fafc;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Reply from ${exName}</p>
      <p style="margin:0;color:#111;font-size:14px;white-space:pre-wrap;">${reply}</p>
    </div>
    <div style="background:#f1f5f9;border-radius:8px;padding:12px 14px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Your original enquiry</p>
      <p style="margin:0;color:#64748b;font-size:13px;white-space:pre-wrap;">${q.message || '—'}</p>
    </div>
    <a href="${APP_URL}/exhibitors" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Browse More Exhibitors →</a>
  ` + footer();
}

r.post('/enquiry-reply', async (req, res) => {
  res.json({ ok: true });
  const { enquiry, reply, exhibitorName } = req.body;
  if (!enquiry?.email || !reply) return;
  try {
    await emailSilent(
      enquiry.email,
      `Reply from ${exhibitorName || enquiry.exhibitor_name} — ADMA Agri Show 2026`,
      enquiryReplyHtml(enquiry, reply, exhibitorName || enquiry.exhibitor_name)
    );
    if (enquiry.phone) {
      await smsSilent(
        enquiry.phone,
        `ADMA Agri Show 2026: ${exhibitorName || enquiry.exhibitor_name} has replied to your enquiry: "${reply.slice(0, 120)}${reply.length > 120 ? '…' : ''}"`
      );
    }
  } catch (e) {
    console.error('[notify] enquiry-reply error:', e.message);
  }
});

r.post('/enquiry', async (req, res) => {
  res.json({ ok: true });
  const { enquiry } = req.body;
  if (!enquiry?.email) return;

  try {
    // Fetch exhibitor to get contact_email
    let exhibitorEmail = null;
    if (enquiry.exhibitor_id) {
      const result = await ddb.send(new GetCommand({
        TableName: 'adma_exhibitors',
        Key: { id: enquiry.exhibitor_id },
      })).catch(() => null);
      exhibitorEmail = result?.Item?.contact_email || null;
    }

    // 1. Confirmation to sender
    await emailSilent(
      enquiry.email,
      `Enquiry received — ${enquiry.exhibitor_name}`,
      enquirySenderHtml(enquiry, enquiry.exhibitor_name)
    );
    if (enquiry.phone) {
      await smsSilent(
        enquiry.phone,
        `ADMA Agri Show 2026: Your enquiry to ${enquiry.exhibitor_name} has been received. They will be in touch with you directly.`
      );
    }

    // 2. Notify exhibitor
    if (exhibitorEmail) {
      await emailSilent(
        exhibitorEmail,
        `New enquiry from ${enquiry.name} — ADMA Agri Show 2026`,
        enquiryExhibitorHtml(enquiry)
      );
    }
  } catch (e) {
    console.error('[notify] enquiry error:', e.message);
  }
});

// Bulk SMS stub — logs payload, ready for OmniFlex mass-send when available
r.post('/bulk-sms', async (req, res) => {
  const { message, campaign } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  console.log(`[bulk-sms] campaign="${campaign}" message="${message.slice(0, 80)}…"`);
  // TODO: scan registrations, normalise phones, call sendSms for each
  res.json({ queued: true, campaign });
});

export default r;
