import { Router } from 'express';
import { createPresignedPut, deleteS3Object, getS3ObjectMetadata } from '../lib/s3.js';
import { requireAuth, requireRole } from '../lib/authMiddleware.js';
import { getMyExhibitorId } from '../lib/ownership.js';

const r = Router();

r.post('/booth-image-url', requireAuth, async (req, res) => {
  try {
    const { exhibitorId, oldImageUrl } = req.body;
    if (!exhibitorId) return res.status(400).json({ error: 'exhibitorId required' });

    // Delete old image from S3 if present
    if (oldImageUrl) {
      const url = new URL(oldImageUrl);
      const key = decodeURIComponent(url.pathname.slice(1)); // remove leading /
      await deleteS3Object(key);
    }

    const key = `booth-images/${exhibitorId}-${Date.now()}.jpg`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/jpeg');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/gallery-image-url', requireAuth, async (req, res) => {
  try {
    const { exhibitorId } = req.body;
    if (!exhibitorId) return res.status(400).json({ error: 'exhibitorId required' });

    const key = `gallery-images/${exhibitorId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/jpeg');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/tender-document-url', requireAuth, async (req, res) => {
  try {
    const { exhibitorId, oldDocumentUrl } = req.body;
    if (!exhibitorId) return res.status(400).json({ error: 'exhibitorId required' });

    if (oldDocumentUrl) {
      const url = new URL(oldDocumentUrl);
      const key = decodeURIComponent(url.pathname.slice(1));
      await deleteS3Object(key);
    }

    const key = `tender-documents/${exhibitorId}-${Date.now()}.pdf`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'application/pdf');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/site-plan-image-url', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  try {
    const { oldFileUrl, contentType, fileName } = req.body;

    if (oldFileUrl) {
      const url = new URL(oldFileUrl);
      const key = decodeURIComponent(url.pathname.slice(1));
      await deleteS3Object(key);
    }

    const ext = fileName?.split('.').pop() || 'png';
    const key = `site-plan/plan-${Date.now()}.${ext}`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType || 'image/png');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/exhibitor-list-url', requireRole('organizer', 'marketing_partner', 'superadmin'), async (req, res) => {
  try {
    const { oldFileUrl, contentType, fileName } = req.body;

    if (oldFileUrl) {
      const url = new URL(oldFileUrl);
      const key = decodeURIComponent(url.pathname.slice(1));
      await deleteS3Object(key);
    }

    const ext = fileName?.split('.').pop() || 'xlsx';
    const key = `exhibitor-lists/list-${Date.now()}.${ext}`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType || 'application/octet-stream');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/job-cv-url', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    const key = `job-cvs/${jobId}-${Date.now()}.pdf`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'application/pdf');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/lot-image-url', requireAuth, async (req, res) => {
  try {
    const { lotId } = req.body;
    if (!lotId) return res.status(400).json({ error: 'lotId required' });

    const key = `lot-images/${lotId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/jpeg');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deliberately public — ExhibitorApply.jsx uploads a logo as part of the exhibitor
// application form, before the applicant has any account to authenticate with.
r.post('/exhibitor-logo-url', async (req, res) => {
  try {
    const key = `exhibitor-logos/${Date.now()}.png`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/png');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/marketing-image-url', requireAuth, async (req, res) => {
  try {
    const { ownerId, purpose, format } = req.body;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    const ext = format === 'png' ? 'png' : 'jpg';
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
    const key = `marketing-images/${purpose || 'misc'}/${ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType);
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/video-ad-url', requireAuth, async (req, res) => {
  try {
    const { ownerId, purpose } = req.body;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    const key = `video-ads/${purpose || 'misc'}/${ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'video/mp4');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/upload/video-status — polled by VideoUploadOrUrlField.jsx right after a
// video-ad-url upload finishes, to find out whether server/lambda/video-compress.js
// (an S3-triggered Lambda, deployed separately from this app server, see that
// file's header comment) has finished re-encoding the video down to size yet.
// Exists because the presigned-PUT flow used to mean "PUT succeeds -> publicUrl is
// immediately the final asset" — that's no longer true once a background
// compression step can still be rewriting the object in place after the upload
// returns, so the frontend needs a real way to ask "is it actually done" instead
// of assuming.
r.get('/video-status', requireAuth, async (req, res) => {
  try {
    const { publicUrl } = req.query;
    if (!publicUrl) return res.status(400).json({ error: 'publicUrl required' });
    const url = new URL(publicUrl);
    const key = decodeURIComponent(url.pathname.slice(1));
    const metadata = await getS3ObjectMetadata(key);
    if (!metadata) return res.status(404).json({ error: 'Not found' });
    res.json({ processed: metadata.processed === 'true' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/guide-image-url', requireAuth, async (req, res) => {
  try {
    const { pageNum, oldImageUrl } = req.body;
    if (!pageNum) return res.status(400).json({ error: 'pageNum required' });

    if (oldImageUrl) {
      const url = new URL(oldImageUrl);
      const key = decodeURIComponent(url.pathname.slice(1));
      await deleteS3Object(key);
    }

    const key = `guide-images/page-${pageNum}-${Date.now()}.jpg`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/jpeg');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// EFT "pay another way" proof-of-payment — a receipt, so it could reasonably be a PDF or
// a photographed image; contentType/extension come from the actual file, not assumed.
// Keyed by the caller's own exhibitor id (never a client-supplied owner id) since this is
// payment-adjacent.
r.post('/payment-pop-url', requireAuth, async (req, res) => {
  try {
    const exhibitorId = await getMyExhibitorId(req);
    if (!exhibitorId) return res.status(400).json({ error: 'No booth linked to your account.' });

    const { oldFileUrl, contentType, fileName } = req.body;
    if (oldFileUrl) {
      const url = new URL(oldFileUrl);
      const key = decodeURIComponent(url.pathname.slice(1));
      await deleteS3Object(key);
    }

    const ext = fileName?.split('.').pop() || 'pdf';
    const key = `payment-pop/${exhibitorId}-${Date.now()}.${ext}`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, contentType || 'application/octet-stream');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
