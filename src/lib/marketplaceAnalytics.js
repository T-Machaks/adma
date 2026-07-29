export const LISTING_TYPE_LABEL = { job: 'Job', tender: 'Tender', collaboration: 'Collaboration' };
export const SUBMISSION_LABEL = { job: 'Applications', tender: 'Expressions of Interest', collaboration: 'Expressions of Interest' };

// Tallies listing_view/listing_click engagement events by listing_id, from the shared
// EngagementEvent stream (src/lib/tracking.js's trackListing() is what writes these).
export function countEventsByListing(events) {
  const views = {};
  const clicks = {};
  events.forEach(e => {
    if (!e.listing_id) return;
    if (e.type === 'listing_view') views[e.listing_id] = (views[e.listing_id] || 0) + 1;
    if (e.type === 'listing_click') clicks[e.listing_id] = (clicks[e.listing_id] || 0) + 1;
  });
  return { views, clicks };
}

// Counts how many items in a submissions array (job applications or virtual enquiries)
// reference each listing, keyed by the given field name ('job_id', 'tender_id', 'collaboration_id').
export function countSubmissionsByField(submissions, field) {
  const counts = {};
  submissions.forEach(s => {
    if (!s[field]) return;
    counts[s[field]] = (counts[s[field]] || 0) + 1;
  });
  return counts;
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function triggerCsvDownload(filename, lines) {
  const csv = lines.map(row => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Downloads a standalone analytics report (summary metrics + full submission list) for a
// single listing — used for organizer-posted listings that have no exhibitor of their own
// to see this data inside their own booth analytics.
export function downloadListingReport(listing, listingType, { views = 0, clicks = 0, submissions = [] }) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (listing.title || 'listing').replace(/[^\w]+/g, '_').slice(0, 60) || 'listing';
  const isJob = listingType === 'job';

  const lines = [
    ['Metric', 'Value'],
    ['Listing', listing.title || ''],
    ['Type', LISTING_TYPE_LABEL[listingType] || listingType],
    ['Company', listing.company_name || ''],
    ['Status', listing.status || 'Open'],
    ['Views', views],
    ['External Link Clicks', clicks],
    [SUBMISSION_LABEL[listingType] || 'Submissions', submissions.length],
    [],
    isJob
      ? ['Applicant Name', 'Email', 'Phone', 'Message', 'Date']
      : ['Name', 'Email', 'Company', 'Phone', 'Message', 'Date'],
    ...submissions.map(s => isJob
      ? [s.name, s.email, s.phone || '', (s.message || '').replace(/\s+/g, ' '), s.created_date ? new Date(s.created_date).toLocaleDateString('en-GB') : '']
      : [s.name, s.email, s.company || '', s.phone || '', (s.message || '').replace(/\s+/g, ' '), s.created_date ? new Date(s.created_date).toLocaleDateString('en-GB') : '']
    ),
  ];

  triggerCsvDownload(`${safeName}_analytics_${date}.csv`, lines);
}

// Downloads an overview CSV across many listings (one row per listing) — used for a
// booth's or organizer's whole marketplace table, as opposed to one listing's own report.
export function downloadListingsOverviewCSV(filename, rows) {
  const lines = [
    ['Title', 'Type', 'Company', 'Status', 'Views', 'External Link Clicks', 'Submissions'],
    ...rows.map(r => [r.title, LISTING_TYPE_LABEL[r.listingType] || r.listingType, r.company_name || '', r.status || 'Open', r.views || 0, r.clicks || 0, r.submissions || 0]),
  ];
  triggerCsvDownload(filename, lines);
}
