/**
 * @file parcelService.ts
 * @description Maryland property PARCEL boundaries from the state's free, open
 * ArcGIS REST service (MD iMAP / MDP / SDAT). Queries by map viewport so we
 * never pull the ~2.5M statewide parcels at once — only what's on screen at
 * high zoom, the way onX/HuntStand load parcels on demand.
 *
 * IMPORTANT — what this data does and does NOT contain (verified 2026-06-27):
 *   - Boundaries (polygons): YES, free and open.
 *   - Owner MAILING ADDRESS (OWNADD1/OWNCITY/OWNSTATE/OWNERZIP): YES.
 *   - Owner NAME: NO. Maryland deliberately strips owner names from all open
 *     GIS/data. To see the name, users tap through to the per-parcel SDAT page
 *     (the service returns a ready-made `sdatUrl` for exactly that).
 * Showing owner NAMES in-app would require a licensed source (e.g. Regrid) and
 * is intentionally out of scope here.
 *
 * Offline-first: every failure path returns an empty FeatureCollection so the
 * map degrades to "no parcels shown" rather than hanging or crashing.
 *
 * Attribution required on any public-facing surface: "MD iMAP, MDP, SDAT".
 *
 * @module services/parcelService
 */

import axios from 'axios';

const PARCEL_LAYER_URL =
  'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query';

/** Parcels are only meaningful (and only queried) at this zoom or higher. */
export const MIN_PARCEL_ZOOM = 14;

/** Attribution string to render wherever parcels are displayed. */
export const PARCEL_ATTRIBUTION = 'Parcels: MD iMAP, MDP, SDAT';

const OUT_FIELDS = [
  'ACCTID',
  'ADDRESS',
  'CITY',
  'ZIPCODE',
  'OWNADD1',
  'OWNADD2',
  'OWNCITY',
  'OWNSTATE',
  'OWNERZIP',
  'ACRES',
  'JURSCODE',
  'SDATWEBADR',
  'DESCEXCL',
  'DESCLU',
].join(',');

const REQUEST_TIMEOUT_MS = 15000;
/** Refuse viewport pulls bigger than this (degrees) — a guard against a zoomed-out fetch. */
const MAX_BBOX_DEG = 0.4;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const MAX_CACHE_ENTRIES = 12;

export interface ParcelBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ParcelProperties {
  /** SDAT account id (stable parcel identifier). */
  acctid: string | null;
  /** Premise (property) street address. */
  address: string | null;
  city: string | null;
  zip: string | null;
  /** Parcel size in acres. */
  acres: number | null;
  /** Jurisdiction code (e.g. HOWA, BACO). */
  jurisdiction: string | null;
  /** Formatted owner MAILING address (NOT the owner's name). */
  ownerMailing: string | null;
  /** Deep link to this parcel's SDAT page, where the owner name is shown. */
  sdatUrl: string | null;
  /** SDAT tax-exemption class description, e.g. "STA Parks" (state park). */
  exemptDesc: string | null;
  /** SDAT land-use description, e.g. "Exempt". */
  landUse: string | null;
  /**
   * Heuristic bucket for at-a-glance coloring: 'public' = likely a huntable-
   * relevant public land (park/forest/WMA per the exemption class), else
   * 'private'. NOT authoritative — confirm access before hunting.
   */
  category: 'public' | 'private';
}

/**
 * Classify a parcel as likely PUBLIC LAND from its SDAT exemption class.
 * Matches park/forest/wildlife/recreation/conservation language so state
 * forests, parks, and WMAs read as public, while churches, schools, and
 * office buildings (also tax-exempt) stay 'private'. Heuristic, not legal.
 */
export function isLikelyPublicLand(props: {
  DESCEXCL?: string | null;
}): boolean {
  const ex = (props.DESCEXCL ?? '').toLowerCase();
  if (!ex) return false;
  return /park|forest|wildlife|wma|recreation|conservation|natural resource|greenway|preserve|\bdnr\b/.test(
    ex,
  );
}

export interface ParcelFeature {
  type: 'Feature';
  properties: ParcelProperties;
  geometry: { type: string; coordinates: any } | null;
}

export interface ParcelFeatureCollection {
  type: 'FeatureCollection';
  features: ParcelFeature[];
}

const EMPTY: ParcelFeatureCollection = { type: 'FeatureCollection', features: [] };

interface CacheEntry {
  ts: number;
  data: ParcelFeatureCollection;
}
const cache = new Map<string, CacheEntry>();

function bboxKey(b: ParcelBounds): string {
  const r = (n: number) => n.toFixed(3);
  return `${r(b.minLng)},${r(b.minLat)},${r(b.maxLng)},${r(b.maxLat)}`;
}

/** Build a one-line owner mailing address, or null if the data has none. */
export function formatOwnerMailing(p: {
  OWNADD1?: string | null;
  OWNADD2?: string | null;
  OWNCITY?: string | null;
  OWNSTATE?: string | null;
  OWNERZIP?: string | null;
}): string | null {
  const street = [p.OWNADD1, p.OWNADD2].filter(Boolean).join(' ').trim();
  const cityLine = [p.OWNCITY, p.OWNSTATE].filter(Boolean).join(', ').trim();
  const tail = [cityLine, p.OWNERZIP].filter(Boolean).join(' ').trim();
  const full = [street, tail].filter(Boolean).join(', ').trim();
  return full.length > 0 ? full : null;
}

function mapRawFeature(raw: any): ParcelFeature {
  const a = (raw && raw.properties) || {};
  return {
    type: 'Feature',
    properties: {
      acctid: a.ACCTID ?? null,
      address: a.ADDRESS ?? null,
      city: a.CITY ?? null,
      zip: a.ZIPCODE ?? null,
      acres: typeof a.ACRES === 'number' ? a.ACRES : null,
      jurisdiction: a.JURSCODE ?? null,
      ownerMailing: formatOwnerMailing(a),
      sdatUrl: a.SDATWEBADR ?? null,
      exemptDesc: a.DESCEXCL ?? null,
      landUse: a.DESCLU ?? null,
      category: isLikelyPublicLand(a) ? 'public' : 'private',
    },
    geometry: raw && raw.geometry ? raw.geometry : null,
  };
}

function isValidBounds(b: ParcelBounds): boolean {
  return (
    Number.isFinite(b.minLng) &&
    Number.isFinite(b.minLat) &&
    Number.isFinite(b.maxLng) &&
    Number.isFinite(b.maxLat) &&
    b.maxLng > b.minLng &&
    b.maxLat > b.minLat
  );
}

/**
 * Fetch Maryland parcels intersecting the given map viewport.
 *
 * Returns an empty FeatureCollection (never throws) when offline, on error,
 * for an invalid viewport, or when the viewport is too large (zoomed out) —
 * callers should only request this at >= MIN_PARCEL_ZOOM.
 */
export async function fetchParcelsInBounds(
  bounds: ParcelBounds,
): Promise<ParcelFeatureCollection> {
  if (!isValidBounds(bounds)) return EMPTY;

  // Guard: refuse a zoomed-out viewport that would pull a huge parcel set.
  if (
    bounds.maxLng - bounds.minLng > MAX_BBOX_DEG ||
    bounds.maxLat - bounds.minLat > MAX_BBOX_DEG
  ) {
    return EMPTY;
  }

  const key = bboxKey(bounds);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return hit.data;
  }

  try {
    const response = await axios.get(PARCEL_LAYER_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        where: 'OWNADD1 IS NOT NULL',
        geometry: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
        geometryType: 'esriGeometryEnvelope',
        inSR: 4326,
        outSR: 4326,
        spatialRel: 'esriSpatialRelIntersects',
        outFields: OUT_FIELDS,
        returnGeometry: true,
        resultRecordCount: 1000,
        f: 'geojson',
      },
    });

    const data = response.data;
    const rawFeatures: any[] = data && Array.isArray(data.features) ? data.features : [];
    const result: ParcelFeatureCollection = {
      type: 'FeatureCollection',
      features: rawFeatures.map(mapRawFeature).filter((f) => f.geometry !== null),
    };

    cache.set(key, { ts: Date.now(), data: result });
    if (cache.size > MAX_CACHE_ENTRIES) {
      // Evict the oldest entry.
      let oldestKey: string | null = null;
      let oldestTs = Infinity;
      for (const [k, v] of cache) {
        if (v.ts < oldestTs) {
          oldestTs = v.ts;
          oldestKey = k;
        }
      }
      if (oldestKey) cache.delete(oldestKey);
    }
    return result;
  } catch {
    // Offline / endpoint error / timeout → degrade to "no parcels".
    return hit ? hit.data : EMPTY;
  }
}

/** Test/maintenance helper — clears the in-memory viewport cache. */
export function _clearParcelCache(): void {
  cache.clear();
}
