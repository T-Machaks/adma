import { Router } from 'express';
import express from 'express';
import { logSecurityEvent } from '../lib/securityLog.js';

const router = Router();

// Browsers send these as application/csp-report or application/reports+json, never
// application/json, so the global express.json() parser (which only matches
// application/json) never populates req.body here — parse everything as JSON instead.
router.post('/', express.json({ type: () => true, limit: '100kb' }), (req, res) => {
  const body = req.body;
  // Legacy report-uri format: { "csp-report": {...} }. Modern Reporting API (report-to):
  // an array of { type: "csp-violation", body: {...} }.
  const reports = Array.isArray(body) ? body : [body];

  for (const r of reports) {
    const csp = r?.['csp-report'] || r?.body || r;
    if (!csp) continue;
    logSecurityEvent('csp_violation', {
      blockedUri: csp['blocked-uri'] || csp.blockedURL,
      violatedDirective: csp['violated-directive'] || csp.effectiveDirective,
      documentUri: csp['document-uri'] || csp.url,
      sourceFile: csp['source-file'] || csp.sourceFile,
      lineNumber: csp['line-number'] || csp.lineNumber,
      ip: req.ip,
    });
  }

  res.status(204).end();
});

export default router;
