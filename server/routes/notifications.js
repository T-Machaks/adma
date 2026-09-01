import { Router } from 'express';
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { sendOtpEmail } from '../lib/mailer.js';
import { sendSms } from '../lib/omniflex.js';
import { requireAuth, requireRole } from '../lib/authMiddleware.js';

const r = Router();
const APP_URL = 'https://admadigital.co.zw';

// Accepts 07XXXXXXXX, +263XXXXXXXXX, or 00263XXXXXXXXX — anything else is treated
// as invalid and returns null so smsSilent() skips the send rather than guessing.
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  let national;
  if (digits.startsWith('00263') && digits.length === 14) national = digits.slice(5);
  else if (digits.startsWith('263') && digits.length === 12) national = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 10) national = digits.slice(1);
  else return null;
  return '+263' + national;
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
      <h1 style="margin:0;color:#eab308;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">ADMA Digital</h1>
    </div>
    <div style="padding:28px 24px;">`;
}

function footer() {
  return `</div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">ADMA Digital · Zimbabwe</p>
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
    <a href="${APP_URL}" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Open ADMA Digital App →</a>
  ` + footer();
}

function broadcastEmailHtml(message) {
  return header() + `
    <p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;">${(message || '').replace(/\n/g, '<br>')}</p>
  ` + footer();
}

// ── Broadcast audience resolution ───────────────────────────────────────────
// Pulls contacts from whichever of the three groups the organizer selected —
// registered attendees (Confirmed/Checked In only — Pending/Cancelled haven't
// actually completed registration), exhibitor booths, and/or every adma_users
// account regardless of role. Each channel dedupes independently against its own
// normalized form (a person's email and phone don't need to trace back to the same
// source record) so nobody who appears in more than one selected group gets the
// same message twice.
const AUDIENCE_GROUPS = ['attendees', 'exhibitors', 'users'];

async function resolveBroadcastAudience(groups) {
  const selected = groups.filter(g => AUDIENCE_GROUPS.includes(g));
  const [regsResult, exhibitorsResult, usersResult] = await Promise.all([
    selected.includes('attendees')
      ? ddb.send(new ScanCommand({
          TableName: 'adma_registrations',
          FilterExpression: '#s IN (:c, :ci)',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':c': 'Confirmed', ':ci': 'Checked In' },
        }))
      : Promise.resolve({ Items: [] }),
    selected.includes('exhibitors')
      ? ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' }))
      : Promise.resolve({ Items: [] }),
    selected.includes('users')
      ? ddb.send(new ScanCommand({ TableName: 'adma_users' }))
      : Promise.resolve({ Items: [] }),
  ]);

  const raw = [
    ...(regsResult.Items || []),
    ...(exhibitorsResult.Items || []).map(e => ({ email: e.contact_email, phone: e.phone })),
    ...(usersResult.Items || []),
  ];

  const emailSet = new Set();
  const phoneSet = new Set();
  for (const c of raw) {
    const email = c.email?.toLowerCase().trim();
    if (email && email.includes('@')) emailSet.add(email);
    const phone = normalizePhone(c.phone);
    if (phone) phoneSet.add(phone);
  }
  return { emails: [...emailSet], phones: [...phoneSet] };
}

// Bounded concurrency — there's no bulk/campaign-send endpoint wired up for either
// ADMA's own Graph mailbox or its direct OmniFlex account here, only one-at-a-time
// sends, so this caps how many are in flight at once instead of firing them all
// simultaneously. Email needs a much lower cap than SMS: Microsoft Graph enforces a
// low per-mailbox concurrent-request limit (confirmed live 2026-09-01 — sending 10 in
// parallel through the same NoReply@tyflex.co.zw mailbox threw "Application is over
// its MailboxConcurrency limit" for a third of them). OmniFlex hasn't shown the same
// issue at 10, so SMS keeps the higher cap.
const EMAIL_CONCURRENCY = 3;
const SMS_CONCURRENCY = 10;

// One retry with a short randomized delay for exactly that transient throttle — a
// concurrency cap alone reduces but doesn't eliminate the race (two workers can still
// land in the same instant), and this is cheap insurance against it. Everything else
// still fails immediately on the first attempt, same as before.
async function sendOneWithRetry(sendOne, target) {
  try {
    await sendOne(target);
  } catch (e) {
    if (!/429|concurrency/i.test(e.message)) throw e;
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    await sendOne(target);
  }
}

async function sendBatch(targets, sendOne, concurrency) {
  let sent = 0, failed = 0, i = 0;
  async function worker() {
    while (i < targets.length) {
      const target = targets[i++];
      try {
        await sendOneWithRetry(sendOne, target);
        sent++;
      } catch (e) {
        failed++;
        console.error(`[broadcast] send to ${target} failed: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  return { targeted: targets.length, sent, failed };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Meeting request created / status changed
r.post('/meeting', requireAuth, async (req, res) => {
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
        `ADMA Digital: Meeting request with ${meeting.exhibitor_name} on ${meeting.preferred_date} at ${meeting.preferred_time} submitted. You'll be notified when confirmed.`
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
            `ADMA Digital: New meeting request from ${meeting.visitor_name} for ${meeting.preferred_date} at ${meeting.preferred_time}. Log in to your portal to respond.`
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
          ? `ADMA Digital: Your meeting with ${meeting.exhibitor_name} on ${meeting.preferred_date} at ${meeting.preferred_time} is CONFIRMED. See you there!`
          : `ADMA Digital: Your meeting request with ${meeting.exhibitor_name} was not accepted. You may submit a new request at ${APP_URL}/meetings`
      );
    }
  } catch (e) {
    console.error('[notify] meeting error:', e.message);
  }
});

// Announcement broadcast to all registrations
r.post('/announcement', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  res.json({ ok: true }); // respond immediately, run blast in background

  const { announcement } = req.body;
  if (!announcement?.title) return;

  setImmediate(async () => {
    try {
      const result = await ddb.send(new ScanCommand({ TableName: 'adma_registrations' }));
      const registrations = result.Items || [];
      const subject = `ADMA Digital [${announcement.type || 'Update'}]: ${announcement.title}`;
      const smsBody  = `ADMA Digital [${announcement.type || 'Update'}]: ${announcement.title}. ${(announcement.body || '').slice(0, 120)}`;

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
      <p style="margin:0;color:#78350f;font-size:13px;">The exhibitor will review your message and contact you directly. You can also book a meeting with them on ADMA Digital.</p>
    </div>
    <a href="${APP_URL}/exhibitors" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Browse More Exhibitors →</a>
  ` + footer();
}

function enquiryExhibitorHtml(q) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">New Enquiry Received</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">You have received a new information request via ADMA Digital.</p>
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

r.post('/enquiry-reply', requireAuth, async (req, res) => {
  res.json({ ok: true });
  const { enquiry, reply, exhibitorName } = req.body;
  if (!enquiry?.email || !reply) return;
  try {
    await emailSilent(
      enquiry.email,
      `Reply from ${exhibitorName || enquiry.exhibitor_name} — ADMA Digital`,
      enquiryReplyHtml(enquiry, reply, exhibitorName || enquiry.exhibitor_name)
    );
    if (enquiry.phone) {
      await smsSilent(
        enquiry.phone,
        `ADMA Digital: ${exhibitorName || enquiry.exhibitor_name} has replied to your enquiry: "${reply.slice(0, 120)}${reply.length > 120 ? '…' : ''}"`
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
    // A contact email set directly on the listing (tender/collaboration) takes
    // priority over the exhibitor's registered booth email — organizer-posted generic
    // listings have no exhibitor record at all, and an exhibitor may want a different
    // inbox for one specific listing than their general booth contact.
    let exhibitorEmail = null;
    if (enquiry.tender_id) {
      const result = await ddb.send(new GetCommand({
        TableName: 'adma_tender_listings',
        Key: { id: enquiry.tender_id },
      })).catch(() => null);
      exhibitorEmail = result?.Item?.contact_email || null;
    } else if (enquiry.collaboration_id) {
      const result = await ddb.send(new GetCommand({
        TableName: 'adma_collaborations',
        Key: { id: enquiry.collaboration_id },
      })).catch(() => null);
      exhibitorEmail = result?.Item?.contact_email || null;
    }
    if (!exhibitorEmail && enquiry.exhibitor_id) {
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
        `ADMA Digital: Your enquiry to ${enquiry.exhibitor_name} has been received. They will be in touch with you directly.`
      );
    }

    // 2. Notify exhibitor
    if (exhibitorEmail) {
      await emailSilent(
        exhibitorEmail,
        `New enquiry from ${enquiry.name} — ADMA Digital`,
        enquiryExhibitorHtml(enquiry)
      );
    }
  } catch (e) {
    console.error('[notify] enquiry error:', e.message);
  }
});

// ── Job application submitted ────────────────────────────────────────────────
function jobApplicationSenderHtml(a) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">Application Received ✓</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${a.name}</strong>, your application for <strong>${a.job_title}</strong> at <strong>${a.exhibitor_name}</strong> has been received.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Role', a.job_title)}
      ${row('Company', a.exhibitor_name)}
      ${a.message ? row('Cover Message', `<span style="white-space:pre-wrap;">${a.message}</span>`) : ''}
    </table>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#78350f;font-size:13px;">The employer will review your application and reach out directly if they'd like to proceed.</p>
    </div>
    <a href="${APP_URL}/jobs" style="display:inline-block;background:#f59e0b;color:#1a2332;font-weight:700;font-size:13px;padding:10px 24px;border-radius:8px;text-decoration:none;">Browse More Jobs →</a>
  ` + footer();
}

function jobApplicationRecipientHtml(a) {
  return header() + `
    <h2 style="margin:0 0 6px;color:#111;font-size:18px;">New Job Application</h2>
    <p style="margin:0 0 20px;color:#555;font-size:14px;">You have received a new application for <strong>${a.job_title}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${row('Applicant', a.name)}
      ${a.email ? row('Email', `<a href="mailto:${a.email}" style="color:#f59e0b;">${a.email}</a>`) : ''}
      ${a.phone ? row('Phone', a.phone) : ''}
      ${a.cv_url ? row('CV', `<a href="${a.cv_url}" style="color:#f59e0b;">Download CV</a>`) : ''}
      ${a.message ? row('Cover Message', `<span style="white-space:pre-wrap;">${a.message}</span>`) : ''}
    </table>
    <p style="color:#555;font-size:13px;">Reply directly to the applicant at their email address above.</p>
  ` + footer();
}

r.post('/job-application', async (req, res) => {
  res.json({ ok: true });
  const { application } = req.body;
  if (!application?.email) return;

  try {
    // Prefer the job listing's own contact email over the exhibitor's registered one —
    // same override precedence as /enquiry.
    let recipientEmail = null;
    if (application.job_id) {
      const result = await ddb.send(new GetCommand({
        TableName: 'adma_job_listings',
        Key: { id: application.job_id },
      })).catch(() => null);
      recipientEmail = result?.Item?.contact_email || null;
    }
    if (!recipientEmail && application.exhibitor_id) {
      const result = await ddb.send(new GetCommand({
        TableName: 'adma_exhibitors',
        Key: { id: application.exhibitor_id },
      })).catch(() => null);
      recipientEmail = result?.Item?.contact_email || null;
    }

    await emailSilent(
      application.email,
      `Application received — ${application.exhibitor_name}`,
      jobApplicationSenderHtml(application)
    );

    if (recipientEmail) {
      await emailSilent(
        recipientEmail,
        `New job application from ${application.name} — ADMA Digital`,
        jobApplicationRecipientHtml(application)
      );
    }
  } catch (e) {
    console.error('[notify] job-application error:', e.message);
  }
});

// ── GET /api/notifications/broadcast-audience?groups=attendees,exhibitors — recipient
// counts for the confirm step, computed BEFORE any send happens. The frontend shows
// these numbers so an organizer can see exactly how many people (and via which
// channel) a broadcast will actually reach before committing to it — the send button
// itself isn't a strong enough safeguard on its own for something this size.
r.get('/broadcast-audience', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  try {
    const groups = String(req.query.groups || '').split(',').filter(Boolean);
    if (!groups.length) return res.status(400).json({ error: 'groups required' });
    const { emails, phones } = await resolveBroadcastAudience(groups);
    res.json({ emailCount: emails.length, smsCount: phones.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/notifications/broadcast — organizer broadcast to a selected audience ──
// `groups` (subset of attendees/exhibitors/users) picks who's targeted; `channel`
// (email/sms/both) picks how. Email goes through the same Graph API flow used
// everywhere else in this file (lib/mailer.js's sendOtpEmail, ADMA's own
// NoReply@tyflex.co.zw mailbox). SMS goes through ADMA's own direct OmniFlex account
// (lib/omniflex.js's sendSms, backed by OMNIFLEX_API_KEY) — deliberately NOT the
// reseller SSO path (lib/omniflexReseller.js / makeLoginLink), which is built for a
// human to open a browser session inside an exhibitor's own OmniFlex workspace, not a
// server-triggered bulk send, and deliberately not routed through any exhibitor
// account — marketing@admadigital.co.zw specifically already collided with ADMA's own
// OmniFlex house account once (see RISK_REGISTER.md).
r.post('/broadcast', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  try {
    const { channel, subject, message, campaign, groups } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });
    if (!['email', 'sms', 'both'].includes(channel)) return res.status(400).json({ error: 'channel must be email, sms, or both' });
    const selectedGroups = Array.isArray(groups) ? groups.filter(g => AUDIENCE_GROUPS.includes(g)) : [];
    if (!selectedGroups.length) return res.status(400).json({ error: 'groups required' });

    const { emails, phones } = await resolveBroadcastAudience(selectedGroups);

    const result = {};
    if (channel === 'email' || channel === 'both') {
      result.email = await sendBatch(emails, (email) =>
        sendOtpEmail(email, null, { subject: subject?.trim() || 'ADMA Digital', html: broadcastEmailHtml(message) }),
        EMAIL_CONCURRENCY
      );
    }
    if (channel === 'sms' || channel === 'both') {
      result.sms = await sendBatch(phones, (phone) => sendSms(phone, message), SMS_CONCURRENCY);
    }

    console.log(`[broadcast] campaign="${campaign}" channel=${channel} groups=${selectedGroups.join(',')} result=${JSON.stringify(result)}`);
    res.json({ ok: true, campaign, groups: selectedGroups, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
