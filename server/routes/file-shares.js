import { Router } from 'express';
import crypto from 'crypto';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo.js';
import { generateId } from '../lib/idgen.js';
import { createPresignedPut } from '../lib/s3.js';
import { logSecurityEvent } from '../lib/securityLog.js';
import { requireRole } from '../lib/authMiddleware.js';
import { sendOtpEmail } from '../lib/mailer.js';

// Fixed staff mailbox — deliberately hardcoded rather than an app-settings field like
// the other notify-email cases in this codebase (newApplicationNotifyEmail etc.): this
// one was requested as a specific, always-on address, not something an organizer should
// be able to accidentally point elsewhere.
const NOTIFY_EMAIL = 'exhibitors@admadigital.co.zw';

// ADMA's own expiring-link file drop — replaces asking a brand-new exhibitor for a
// WeTransfer/SharePoint link when the organizer is setting up their profile for them.
// An organizer/superadmin creates a link for an existing exhibitor; the exhibitor visits
// it with no login required and drops files straight into S3. The link itself stops
// working after LINK_TTL_DAYS; the uploaded files live for FILE_TTL_DAYS after upload
// regardless of the link's own expiry, cleaned up by an S3 Lifecycle rule on the
// file-shares/ prefix (not by this code) — see security/RISK_REGISTER.md.
const TABLE = 'adma_file_shares';
const LINK_TTL_DAYS = 14;
const FILE_TTL_DAYS = 60;
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500MB — generous for exhibitor kits/videos, still a sane upper bound

const router = Router();

function isExpired(share) {
  return new Date(share.expires_at) < new Date();
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// One email per file (not batched per session — there's no reliable "the exhibitor is
// done uploading" signal from the public page, just individual upload completions), so
// staff see each file the moment it lands rather than waiting on an arbitrary timeout.
async function notifyFileUploaded(share, file) {
  // filename is exhibitor-controlled (typed on an unauthenticated page) — escaped before
  // going into HTML, unlike exhibitor_name/note which are organizer-set at link-creation
  // time and already trusted content elsewhere in the console.
  const filename = escapeHtml(file.filename);
  await sendOtpEmail(NOTIFY_EMAIL, null, {
    subject: `ADMA Digital — ${share.exhibitor_name} uploaded a file`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <h2 style="margin:0 0 8px;color:#111">New file share upload</h2>
        <p style="color:#555"><strong>${share.exhibitor_name}</strong> just uploaded a file via their ADMA file share link${share.note ? ` (${share.note})` : ''}.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#111"><strong>${filename}</strong></p>
          <p style="margin:4px 0 0;color:#888;font-size:13px">${formatBytes(file.size)}</p>
        </div>
        <p style="color:#555">
          <a href="${file.url}" style="color:#1b3729">View / download the file directly</a>,
          or open Admin &amp; Security → Exhibitor Portal Logins → Files for ${share.exhibitor_name}
          to apply it straight to their profile as Logo, Booth Image, or Gallery.
        </p>
      </div>
    `,
  });
}

// ── Organizer/superadmin — create & manage links ──────────────────────────────────

router.post('/', requireRole('organizer', 'superadmin'), async (req, res) => {
  try {
    const { exhibitor_id, note } = req.body;
    if (!exhibitor_id) return res.status(400).json({ error: 'exhibitor_id is required.' });

    const exResult = await ddb.send(new GetCommand({ TableName: 'adma_exhibitors', Key: { id: exhibitor_id } }));
    const exhibitor = exResult.Item;
    if (!exhibitor || exhibitor.deleted) return res.status(404).json({ error: 'Exhibitor not found.' });

    const token = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    // Keep the record around for a while after the link itself stops working, so the
    // organizer can still see it (and its file list) in the console — well past even
    // the longest a file could still legitimately exist (FILE_TTL_DAYS from upload).
    const recordTtl = new Date(expiresAt.getTime() + (FILE_TTL_DAYS + 30) * 24 * 60 * 60 * 1000);

    const item = {
      token,
      exhibitor_id,
      exhibitor_name: exhibitor.name,
      created_by: req.user.id,
      created_by_email: req.user.email,
      note: note || '',
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt.toISOString(),
      expires_at_ttl: Math.floor(recordTtl.getTime() / 1000),
      revoked: false,
      files: [],
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    logSecurityEvent('file_share_created', { token, exhibitorId: exhibitor_id, createdBy: req.user.id, ip: req.ip });
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireRole('organizer', 'superadmin'), async (req, res) => {
  try {
    const { exhibitor_id } = req.query;
    let items;
    if (exhibitor_id) {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'exhibitor-index',
        KeyConditionExpression: 'exhibitor_id = :e',
        ExpressionAttributeValues: { ':e': exhibitor_id },
      }));
      items = result.Items || [];
    } else {
      const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
      items = result.Items || [];
    }
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:token/revoke', requireRole('organizer', 'superadmin'), async (req, res) => {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { token: req.params.token },
      UpdateExpression: 'SET revoked = :r',
      ExpressionAttributeValues: { ':r': true },
      ConditionExpression: 'attribute_exists(#t)',
      ExpressionAttributeNames: { '#t': 'token' },
    }));
    logSecurityEvent('file_share_revoked', { token: req.params.token, revokedBy: req.user.id, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return res.status(404).json({ error: 'Link not found.' });
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:token', requireRole('organizer', 'superadmin'), async (req, res) => {
  try {
    // Link metadata only — never touches the uploaded files themselves, which keep
    // living out FILE_TTL_DAYS in S3 regardless of what happens to this record.
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { token: req.params.token } }));
    logSecurityEvent('file_share_deleted', { token: req.params.token, deletedBy: req.user.id, ip: req.ip });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public — the exhibitor's own upload page, no login required ──────────────────

router.get('/public/:token', async (req, res) => {
  try {
    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { token: req.params.token } }));
    const share = result.Item;
    if (!share) return res.status(404).json({ error: 'This link is invalid.' });
    if (share.revoked) return res.status(410).json({ error: 'This link has been deactivated.' });
    if (isExpired(share)) return res.status(410).json({ error: 'This link has expired.' });
    res.json({
      exhibitor_name: share.exhibitor_name,
      expires_at: share.expires_at,
      files: (share.files || []).map(f => ({ id: f.id, filename: f.filename, size: f.size, uploaded_at: f.uploaded_at })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/public/:token/upload-url', async (req, res) => {
  try {
    const { filename, content_type, size } = req.body;
    if (!filename?.trim()) return res.status(400).json({ error: 'filename is required.' });
    if (typeof size === 'number' && size > MAX_FILE_BYTES) {
      return res.status(400).json({ error: 'File is too large (500MB max).' });
    }

    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { token: req.params.token } }));
    const share = result.Item;
    if (!share) return res.status(404).json({ error: 'This link is invalid.' });
    if (share.revoked) return res.status(410).json({ error: 'This link has been deactivated.' });
    if (isExpired(share)) return res.status(410).json({ error: 'This link has expired.' });

    const fileId = generateId();
    const safeName = filename.trim().replace(/[/\\]/g, '_').slice(-180); // keep the S3 key sane; original name is preserved in the record for display
    const key = `file-shares/${req.params.token}/${fileId}-${safeName}`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, content_type || 'application/octet-stream');
    res.json({ uploadUrl, publicUrl, fileId, key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/public/:token/register', async (req, res) => {
  try {
    const { fileId, filename, size, content_type, publicUrl } = req.body;
    if (!fileId || !filename || !publicUrl) return res.status(400).json({ error: 'fileId, filename and publicUrl are required.' });

    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { token: req.params.token } }));
    const share = result.Item;
    if (!share) return res.status(404).json({ error: 'This link is invalid.' });
    if (share.revoked) return res.status(410).json({ error: 'This link has been deactivated.' });
    if (isExpired(share)) return res.status(410).json({ error: 'This link has expired.' });

    const fileRecord = {
      id: fileId,
      filename,
      size: size || 0,
      content_type: content_type || 'application/octet-stream',
      url: publicUrl,
      uploaded_at: new Date().toISOString(),
    };
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { token: req.params.token },
      UpdateExpression: 'SET files = list_append(if_not_exists(files, :empty), :f)',
      ExpressionAttributeValues: { ':f': [fileRecord], ':empty': [] },
    }));
    logSecurityEvent('file_share_upload', { token: req.params.token, exhibitorId: share.exhibitor_id, filename, size, ip: req.ip });
    res.status(201).json(fileRecord);

    // Fire-and-forget — the upload already succeeded and was already saved above; a
    // mailer hiccup here must never turn that into a failure response to the exhibitor,
    // who's already moved on by the time this resolves.
    notifyFileUploaded(share, fileRecord).catch(e => console.error('file-share upload notify failed:', e.message));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
