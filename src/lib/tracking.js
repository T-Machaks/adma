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
