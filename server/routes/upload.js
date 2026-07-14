import { Router } from 'express';
import { createPresignedPut, deleteS3Object } from '../lib/s3.js';

const r = Router();

r.post('/booth-image-url', async (req, res) => {
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

r.post('/gallery-image-url', async (req, res) => {
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

r.post('/tender-document-url', async (req, res) => {
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

r.post('/lot-image-url', async (req, res) => {
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

r.post('/exhibitor-logo-url', async (req, res) => {
  try {
    const key = `exhibitor-logos/${Date.now()}.png`;
    const { uploadUrl, publicUrl } = await createPresignedPut(key, 'image/png');
    res.json({ uploadUrl, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/guide-image-url', async (req, res) => {
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

export default r;
