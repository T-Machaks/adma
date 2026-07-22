// Single source of truth for ADMA Agri Show-specific configuration.
// Swap this file to white-label the platform for a different event.
// Event content (exhibitors, sponsors, announcements, ad slots) is served from
// the database via backend REST routes — it does not belong here.

const NAME   = 'ADMA Agri Show';
const YEAR   = 2026;
const PREFIX = 'adma';
const CDN    = 'https://adma-zw.s3.af-south-1.amazonaws.com/uploads/2026';
const S3     = 'https://adma-zw.s3.af-south-1.amazonaws.com';

export const EVENT_CONFIG = {
  // ── Identity ────────────────────────────────────────────────────────────
  appId:         PREFIX,
  eventName:     NAME,
  eventYear:     YEAR,
  eventFullName: `${NAME} ${YEAR}`,

  // ── Venue & contact ──────────────────────────────────────────────────────
  venue:        'ART Farm, Pomona, Harare',
  venueShort:   'ART Farm Pomona',
  website:      'https://agrishow.co.zw',
  contactEmail: 'info@agrishow.co.zw',

  // ── QR payload event code ─────────────────────────────────────────────────
  // Embedded in every QR payload so scanners reject codes from other events.
  qrEventCode: 'adma26',

  // ── Storage key prefixes ─────────────────────────────────────────────────
  // All localStorage keys use these rather than bare event-name strings.
  storagePrefix:   PREFIX,
  storageUserKey:  `${PREFIX}_user`,
  storageChatKey:  `${PREFIX}_chat_pos`,

  // ── Asset CDN roots ───────────────────────────────────────────────────────
  cdnBase: CDN,
  s3Base:  S3,

  // ── Branding ─────────────────────────────────────────────────────────────
  // Single swap point for the app logo. Replace the files at these paths to
  // rebrand — no code changes required.
  logo: {
    full:        '/adma-logo.png',
    transparent: '/adma-logo-transparent.png',
    favicon192:  '/adma-favicon-192.png',
    favicon512:  '/adma-favicon-512.png',
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  consoleRoles:   ['organizer', 'marketing_partner', 'superadmin'],
  exhibitorRoles: ['exhibitor'],

  // ── Exhibitor taxonomy (drives filter UI) ────────────────────────────────
  exhibitorTiers:      ['Platinum', 'Gold', 'Silver', 'Bronze'],
  exhibitorCategories: ['Machinery', 'Irrigation', 'Fertilizers & Inputs', 'Livestock', 'Agri-Tech', 'Finance', 'Logistics', 'Security', 'Services'],
  exhibitorSections:   ['Main Pavilion', 'Machinery Hall', 'Suppliers Village', 'Field Zone'],

  // ── Chat / AI assistant ────────────────────────────────────────────────────
  chat: {
    agentName:   'AgriBot',
    placeholder: `Ask anything about ${NAME}…`,
    suggestedPrompts: {
      exhibitor: ['My meeting requests', 'Book a meeting', 'Event announcements'],
      default:   [`Register for ${NAME}`, 'Book a meeting', 'Platinum exhibitors', 'Event schedule'],
    },
  },

  // ── App shell UI copy ─────────────────────────────────────────────────────
  nav: {
    myEventLabel:   'My ADMA',
    installBarCopy: `add ${NAME} to your home screen`,
  },
};
