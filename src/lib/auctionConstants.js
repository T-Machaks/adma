export const LOT_CATEGORIES = ['Livestock', 'Equipment'];
export const AUCTION_TYPES = ['Timed', 'Live'];

// 'native'   — ADMA hosts bidding itself (existing behaviour).
// 'external' — the auction is actually run on a partner's own site; ADMA is a proxy/listing only.
export const AUCTION_SOURCE_TYPES = ['native', 'external'];

// 'link_only'  — just a link out to the partner site, no bid data shown in ADMA.
// 'api_synced' — the partner pushes lot/bid updates into ADMA via webhook, so current bid,
//                bid count, and bid history are shown here too, but bidding itself still
//                happens on the partner's site (linked out, not submitted through ADMA).
export const EXTERNAL_SYNC_MODES = ['link_only', 'api_synced'];
export const EXTERNAL_SYNC_MODE_LABELS = {
  link_only:  'Link only — no bid data shown in ADMA',
  api_synced: 'API-synced — partner pushes bid updates into ADMA',
};
