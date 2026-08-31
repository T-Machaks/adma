// Virtual exhibitor packages — Free / Basic / Enhanced / Premium.
// Independent of the physical booth tier (Platinum/Gold/Silver/Bronze), which only
// applies to the physical show. Stored directly on the exhibitor record as `package`.
//
// Free (added 2026-08-31) — a directory-only listing below Basic, granted at approval
// like every other package (no payment gate at signup for any tier — see
// server/routes/exhibitor-applications.js). Meant as a zero-commitment on-ramp for
// prospects who aren't ready to commit to even Basic's contact-form exposure: logo,
// name, and category tags only. No contact form (that's what distinguishes it from
// Basic — everything else Basic already hides from the public page too, see
// ExhibitorDetail.jsx's `isEnhancedPlus` gating). No booth number either — `booth` is a
// physical-show attribute, only meaningful for exhibitors also registered for a
// previous/next ADMA physical exhibition, and mostly won't apply to Free signups, which
// are expected to be virtual-only workspaces (see ExhibitorDetail.jsx/Exhibitors.jsx,
// which both now omit the booth/section line entirely when neither field is set).
const STAND_TIER_RANK = { Free: 0, Basic: 1, Enhanced: 2, Premium: 3 };

export function getStandTier(exhibitor) {
  return exhibitor?.package || 'Basic';
}

export function standTierAtLeast(exhibitor, min) {
  return STAND_TIER_RANK[getStandTier(exhibitor)] >= STAND_TIER_RANK[min];
}

export const STAND_TIER_PERKS = {
  Free:     ['Logo & company name listing', 'Category tags'],
  Basic:    ['Everything in Free', 'Brief company profile (up to 250 characters)', 'Contact form'],
  Enhanced: ['Everything in Basic', 'Full company profile & products', 'Gallery of 6 scrolling images with captions', 'Quote enquiries', 'Analytics'],
  Premium:  ['Everything in Enhanced', 'Full profile featured on entire page', 'Gallery of 9 scrolling images with captions', 'Brochure downloads & video clips', 'Digital magazine ads', 'Full analytics dashboard'],
};

// Item 9 — package feature limits, enforced in both the exhibitor portal and public display.
export const PACKAGE_LIMITS = {
  Free:     { descChars: 100,  galleryMax: 0 },
  Basic:    { descChars: 250,  galleryMax: 0 },
  Enhanced: { descChars: 500,  galleryMax: 6 },
  Premium:  { descChars: 1000, galleryMax: 9 },
};

export function getPackageLimits(exhibitor) {
  return PACKAGE_LIMITS[getStandTier(exhibitor)];
}
