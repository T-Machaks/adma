import { EngagementEvent } from '@/api/entities';

/**
 * Fire-and-forget engagement tracker.
 * @param {string} exhibitorId
 * @param {string} exhibitorName
 * @param {'profile_view'|'meeting_click'|'ad_click'|'featured_click'} type
 * @param {'directory'|'home_featured'|'home_carousel'|'magazine'|'connect_hub'|'sponsors'} source
 */
export function track(exhibitorId, exhibitorName, type, source) {
  if (!exhibitorId && !exhibitorName) return;
  EngagementEvent.create({ exhibitor_id: exhibitorId, exhibitor_name: exhibitorName, type, source })
    .catch(() => {});
}

/**
 * Fire-and-forget tracker for marketplace listing pages (jobs/tenders/collaborations).
 * Works for listings without an exhibitor too — those just carry a listing_id/listing_type
 * with no exhibitor_id, so they can still be aggregated in organizer-side analytics.
 * @param {{id: string, exhibitor_id?: string, company_name?: string}} listing
 * @param {'job'|'tender'|'collaboration'} listingType
 * @param {'listing_view'|'listing_click'} type
 * @param {'jobs'|'tenders'|'collaborations'} source
 */
export function trackListing(listing, listingType, type, source) {
  if (!listing?.id) return;
  const payload = { listing_id: listing.id, listing_type: listingType, type, source };
  // Omit exhibitor_id/name entirely rather than sending null — the engagements table's
  // exhibitor-index GSI requires a String type on any item that includes the attribute,
  // so a present-but-null value 500s the write for listings with no exhibitor.
  if (listing.exhibitor_id) {
    payload.exhibitor_id = listing.exhibitor_id;
    payload.exhibitor_name = listing.company_name;
  }
  EngagementEvent.create(payload).catch(() => {});
}
