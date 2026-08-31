// Lets an exhibitor download a CSV of contacts they can reasonably reach out to:
// every other exhibitor's public booth contact (already shown in the directory) plus
// their OWN leads — people who actually engaged this exhibitor's booth (enquiries,
// meeting requests, job applicants). Deliberately NOT a full attendee/registration
// export — see the privacy-scoping discussion this was built against.
import { Router } from 'express';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { requireRole } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';

const r = Router();

// CSV field escaping: quote a field if it contains a comma, quote, or newline;
// double up any internal quotes.
function csvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(fields) {
  return fields.map(csvField).join(',') + '\r\n';
}

r.get('/export.csv', requireRole('exhibitor'), async (req, res) => {
  try {
    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });

    const [exhibitorsResult, enquiriesResult, meetingsResult, applicationsResult] = await Promise.all([
      ddb.send(new ScanCommand({ TableName: 'adma_exhibitors' })),
      ddb.send(new ScanCommand({ TableName: 'adma_virtual_enquiries', FilterExpression: 'exhibitor_id = :id', ExpressionAttributeValues: { ':id': exhibitorId } })),
      ddb.send(new ScanCommand({ TableName: 'adma_meeting_requests', FilterExpression: 'exhibitor_id = :id', ExpressionAttributeValues: { ':id': exhibitorId } })),
      ddb.send(new ScanCommand({ TableName: 'adma_job_applications', FilterExpression: 'exhibitor_id = :id', ExpressionAttributeValues: { ':id': exhibitorId } })),
    ]);

    // Merged by normalized email (falling back to phone, then name) so the same
    // person who e.g. both enquired and requested a meeting appears once, not twice
    // — important for a list meant to feed broadcast messaging, not just "reference".
    const contacts = new Map();
    const upsert = (category, name, email, phone, company, note) => {
      const key = (email || phone || name || '').trim().toLowerCase();
      if (!key) return;
      const existing = contacts.get(key);
      if (existing) {
        if (note && !existing.notes.includes(note)) existing.notes.push(note);
        if (!existing.email && email) existing.email = email;
        if (!existing.phone && phone) existing.phone = phone;
      } else {
        contacts.set(key, { category, name: name || '', email: email || '', phone: phone || '', company: company || '', notes: note ? [note] : [] });
      }
    };

    for (const ex of exhibitorsResult.Items || []) {
      if (ex.id === exhibitorId) continue; // skip self
      upsert('Exhibitor', ex.name, ex.contact_email, ex.phone, ex.name, ex.website || '');
    }
    for (const e of enquiriesResult.Items || []) {
      upsert('Enquiry Lead', e.name, e.email, e.phone, e.company, `Enquired ${e.created_date ? new Date(e.created_date).toLocaleDateString() : ''}`.trim());
    }
    for (const m of meetingsResult.Items || []) {
      upsert('Meeting Lead', m.visitor_name, m.visitor_email, m.visitor_phone, m.visitor_company, `Meeting requested for ${m.preferred_date || ''}`.trim());
    }
    for (const a of applicationsResult.Items || []) {
      upsert('Job Applicant', a.name, a.email, a.phone, '', a.job_title ? `Applied: ${a.job_title}` : '');
    }

    let csv = csvRow(['Category', 'Name', 'Email', 'Phone', 'Company', 'Notes']);
    for (const c of contacts.values()) {
      csv += csvRow([c.category, c.name, c.email, c.phone, c.company, c.notes.join('; ')]);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="adma-contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
