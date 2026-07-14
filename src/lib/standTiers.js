// Virtual stand tiers — derived from booth tier, not a separate field.
// Basic (Bronze): logo, gallery, contact form.
// Enhanced (Silver, Gold): + full profile, chat/messaging, analytics.
// Premium (Platinum): + AI-referenceable full profile, lead capture, lead export.

const STAND_TIER_BY_BOOTH = {
  Bronze:   'Basic',
  Silver:   'Enhanced',
  Gold:     'Enhanced',
  Platinum: 'Premium',
};

const STAND_TIER_RANK = { Basic: 1, Enhanced: 2, Premium: 3 };

export function getStandTier(boothTier) {
  return STAND_TIER_BY_BOOTH[boothTier] || 'Basic';
}

export function standTierAtLeast(boothTier, min) {
  return STAND_TIER_RANK[getStandTier(boothTier)] >= STAND_TIER_RANK[min];
}

export const STAND_TIER_PERKS = {
  Basic:    ['Logo & company gallery (up to 6 images)', 'Attendee contact form'],
  Enhanced: ['Everything in Basic', 'Full company profile & products', 'Live chat with attendees', 'Booth analytics'],
  Premium:  ['Everything in Enhanced', 'AI-referenceable full profile (AgriBot)', 'Lead capture form', 'Lead export (CSV)'],
};
