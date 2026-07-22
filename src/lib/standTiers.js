// Virtual exhibitor packages — Basic / Enhanced / Premium.
// Independent of the physical booth tier (Platinum/Gold/Silver/Bronze), which only
// applies to the physical show. Stored directly on the exhibitor record as `package`.

const STAND_TIER_RANK = { Basic: 1, Enhanced: 2, Premium: 3 };

export function getStandTier(exhibitor) {
  return exhibitor?.package || 'Basic';
}

export function standTierAtLeast(exhibitor, min) {
  return STAND_TIER_RANK[getStandTier(exhibitor)] >= STAND_TIER_RANK[min];
}

export const STAND_TIER_PERKS = {
  Basic:    ['Logo display', 'Brief company profile (up to 250 characters)', 'Contact form'],
  Enhanced: ['Everything in Basic', 'Full company profile & products', 'Gallery of 6 scrolling images', 'Quote enquiries', 'Analytics'],
  Premium:  ['Everything in Enhanced', 'Full profile featured on entire page', 'Gallery of 9 scrolling images', 'Brochure downloads & video clips', 'Digital magazine ads', 'Full analytics dashboard'],
};

// Item 9 — package feature limits, enforced in both the exhibitor portal and public display.
export const PACKAGE_LIMITS = {
  Basic:    { descChars: 250,  galleryMax: 0 },
  Enhanced: { descChars: 500,  galleryMax: 6 },
  Premium:  { descChars: 1000, galleryMax: 9 },
};

export function getPackageLimits(exhibitor) {
  return PACKAGE_LIMITS[getStandTier(exhibitor)];
}
