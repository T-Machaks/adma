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

  // ── Booth / registration tiers ────────────────────────────────────────────
  // colorText   — used in ChatWidget quick-registration form
  // colorBorder / colorRing / colorLabel — used in Register page tier picker
  boothTiers: [
    { id: 'Platinum', label: 'Platinum', price: 5000, colorText: 'text-emerald-400', colorBorder: 'border-emerald-400', colorRing: 'ring-emerald-400', colorLabel: 'text-emerald-600', desc: 'Premium positioning, max visibility' },
    { id: 'Gold',     label: 'Gold',     price: 3000, colorText: 'text-amber-400',   colorBorder: 'border-amber-400',   colorRing: 'ring-amber-400',   colorLabel: 'text-amber-500',   desc: 'Featured placement, high-profile booth' },
    { id: 'Silver',   label: 'Silver',   price: 1500, colorText: 'text-slate-400',   colorBorder: 'border-slate-400',   colorRing: 'ring-slate-400',   colorLabel: 'text-slate-400',   desc: 'Standard exhibitor listing' },
    { id: 'Bronze',   label: 'Bronze',   price: 800,  colorText: 'text-orange-700',  colorBorder: 'border-orange-700',  colorRing: 'ring-orange-700',  colorLabel: 'text-orange-800',  desc: 'Entry-level presence' },
  ],

  // ── Attendee tickets ──────────────────────────────────────────────────────
  attendeeTickets: [
    { id: 'General Admission',      label: 'General Admission',  price: 10 },
    { id: 'VIP (includes parking)', label: 'VIP (incl. parking)', price: 25 },
  ],

  // All ticket prices keyed by ticket-type string (used in form logic)
  ticketPrices: {
    'General Admission':      10,
    'VIP (includes parking)': 25,
    'Exhibitor Pass':         0,
    'Speaker Pass':           0,
  },

  // Which ticket types each registration role can select
  ticketMap: {
    Attendee:    ['General Admission', 'VIP (includes parking)'],
    Exhibitor:   ['Exhibitor Pass'],
    Sponsor:     ['VIP (includes parking)', 'Exhibitor Pass'],
    Speaker:     ['Speaker Pass'],
    'VIP Guest': ['VIP (includes parking)'],
  },

  // Badge category per registration role
  badgeMap: {
    Attendee: 'Visitor', Exhibitor: 'Exhibitor', Sponsor: 'Sponsor',
    Speaker: 'Speaker', 'VIP Guest': 'VIP',
  },

  // ── Booth add-ons ──────────────────────────────────────────────────────────
  // label     — short form used in ChatWidget
  // fullLabel — long form used in Register page
  boothAddons: [
    { id: 'extra_pass',  label: 'Extra Staff Pass',  fullLabel: 'Additional Exhibitor Pass', desc: 'Extra staff badge (up to 5)',   price: 100, maxQty: 5 },
    { id: 'electricity', label: 'Electricity (16A)', fullLabel: 'Electricity (16A)',          desc: 'Single-phase connection',       price: 200, maxQty: 1 },
    { id: 'furniture',   label: 'Furniture Package', fullLabel: 'Furniture Package',          desc: 'Table, 2 chairs & display',    price: 300, maxQty: 1 },
    { id: 'premium_loc', label: 'Premium Location',  fullLabel: 'Premium Location',           desc: 'Upgrade to high-traffic area', price: 500, maxQty: 1 },
  ],

  // ── Registration role types ────────────────────────────────────────────────
  // iconType is resolved to a Lucide component by each consuming component.
  registrationRoles: [
    { value: 'Attendee',  iconType: 'user',     color: 'bg-blue-500',   desc: 'Farmer, buyer & industry visitor' },
    { value: 'Exhibitor', iconType: 'building', color: 'bg-amber-500',  desc: 'Company with a stand' },
    { value: 'Sponsor',   iconType: 'star',     color: 'bg-yellow-500', desc: 'Event sponsor partner' },
    { value: 'Speaker',   iconType: 'mic',      color: 'bg-purple-500', desc: 'Conference presenter' },
    { value: 'VIP Guest', iconType: 'crown',    color: 'bg-rose-500',   desc: 'Special invite or dignitary' },
  ],

  // ── Payment methods ────────────────────────────────────────────────────────
  // iconType ('smartphone' | 'creditcard') is resolved to a Lucide component
  // by each consuming component.
  paymentMethods: [
    { id: 'ecocash',  label: 'EcoCash',        hint: 'EcoCash mobile money', iconType: 'smartphone' },
    { id: 'onemoney', label: 'OneMoney',        hint: 'NetOne OneMoney',      iconType: 'smartphone' },
    { id: 'card',     label: 'Visa/Mastercard', hint: 'Debit or credit card', iconType: 'creditcard' },
  ],

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
