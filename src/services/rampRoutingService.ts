/**
 * @file rampRoutingService.ts
 * @description Service for generating navigation URLs to boat ramps and fishing access sites.
 *
 * Creates Apple Maps and Google Maps directions URLs for iOS users to navigate
 * to a specific angler access site. Prefers parking coordinates when available.
 */

import { AnglerAccessSite } from '../data/marylandAnglerAccessSites';

export interface RampRoutingResult {
  primaryUrl: string;    // Apple Maps URL
  secondaryUrl: string;  // Google Maps URL (fallback)
  label: string;         // Human-readable description
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
}

/**
 * Get navigation URLs to a boat ramp or angler access site.
 *
 * Generates both Apple Maps and Google Maps URLs. If parkingLat/parkingLng
 * are available, they are used as the destination; otherwise, the site's
 * primary coordinates are used.
 *
 * @param site - AnglerAccessSite with lat/lng (and optional parking coordinates)
 * @param origin - Optional user location { lat, lng }
 * @returns RampRoutingResult with Apple Maps (primary) and Google Maps (secondary) URLs
 */
export function getDirectionsToSite(
  site: AnglerAccessSite,
  origin?: { lat: number; lng: number }
): RampRoutingResult {
  // Determine destination: prefer parking coordinates
  const destLat = site.parkingLat ?? site.lat;
  const destLng = site.parkingLng ?? site.lng;
  const destName = `${site.name}${site.parkingLat ? ' (parking)' : ''}`;

  // Apple Maps URL
  let appleMapsUrl = `http://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
  if (origin) {
    appleMapsUrl = `http://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${destLat},${destLng}&dirflg=d`;
  }

  // Google Maps URL
  let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  if (origin) {
    googleMapsUrl += `&origin=${origin.lat},${origin.lng}`;
  }

  return {
    primaryUrl: appleMapsUrl,
    secondaryUrl: googleMapsUrl,
    label: `Boat ramp at ${destName}`,
    destination: {
      lat: destLat,
      lng: destLng,
      name: site.name,
    },
  };
}

/**
 * Backend-routed directions (optional future enhancement).
 *
 * This function is a placeholder for server-side routing logic if needed
 * (e.g., if you later want to fetch turn-by-turn directions server-side).
 * For now, the frontend uses the URL-based approach above.
 *
 * @param site - AnglerAccessSite
 * @param origin - User location
 * @returns RampRoutingResult
 */
export function getDirectionsViaBrowser(
  site: AnglerAccessSite,
  origin?: { lat: number; lng: number }
): RampRoutingResult {
  // Delegate to the standard URL-based routing
  return getDirectionsToSite(site, origin);
}
