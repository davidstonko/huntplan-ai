/**
 * @file parcelService.test.ts
 * @description Tests for the Maryland parcel viewport service. Verifies field
 * mapping (owner MAILING address, never a name), the zoomed-out guard, the
 * offline fallback, and viewport caching.
 */

import axios from 'axios';
import {
  fetchParcelsInBounds,
  formatOwnerMailing,
  isLikelyPublicLand,
  _clearParcelCache,
  ParcelBounds,
} from '../parcelService';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

// A realistic GeoJSON feature shaped like the MD ArcGIS f=geojson response.
const sampleGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        ACCTID: '1405341183',
        ADDRESS: '6305 DEWEY DR',
        CITY: 'COLUMBIA',
        ZIPCODE: '21044',
        OWNADD1: '6305 DEWEY DR',
        OWNADD2: null,
        OWNCITY: 'COLUMBIA',
        OWNSTATE: 'MD',
        OWNERZIP: '21044',
        ACRES: 0.505,
        JURSCODE: 'HOWA',
        SDATWEBADR:
          'https://sdat.dat.maryland.gov/RealProperty/Pages/viewdetails.aspx?County=14&SearchType=ACCT&District=05&AccountNumber=341183',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-76.87, 39.2], [-76.86, 39.2], [-76.86, 39.21], [-76.87, 39.2]]],
      },
    },
    {
      // A right-of-way style row with no geometry — must be filtered out.
      type: 'Feature',
      properties: { ACCTID: 'ROW' },
      geometry: null,
    },
  ],
};

const goodBounds: ParcelBounds = {
  minLng: -76.875,
  minLat: 39.195,
  maxLng: -76.855,
  maxLat: 39.215,
};

beforeEach(() => {
  jest.clearAllMocks();
  _clearParcelCache();
});

describe('isLikelyPublicLand (SDAT exemption-class ownership prefix)', () => {
  // Real DESCEXCL values verified against the live MD parcel layer 2026-06-29.
  it('flags government-owned classes (STA/JUR/MUN/PUB) as public', () => {
    expect(isLikelyPublicLand({ DESCEXCL: 'STA Parks' })).toBe(true);
    expect(isLikelyPublicLand({ DESCEXCL: 'STA Game Preserves' })).toBe(true);
    // "STA Other" is how state-FOREST land is coded — old keyword match missed it.
    expect(isLikelyPublicLand({ DESCEXCL: 'STA Other' })).toBe(true);
    expect(isLikelyPublicLand({ DESCEXCL: 'JUR Parks & Recreation' })).toBe(true);
    expect(isLikelyPublicLand({ DESCEXCL: 'MUN Parks And Recreation' })).toBe(true);
    expect(isLikelyPublicLand({ DESCEXCL: 'PUB Other' })).toBe(true);
  });
  it('does NOT flag privately-owned classes as public', () => {
    // OTH Conservation Tax Credit = PRIVATE land with a tax break. The old
    // keyword match wrongly flagged it public via the word "conservation".
    expect(isLikelyPublicLand({ DESCEXCL: 'OTH Conservation Tax Credit' })).toBe(false);
    expect(
      isLikelyPublicLand({ DESCEXCL: 'PVT Churches, Synagogues, & Parsonages' }),
    ).toBe(false);
    expect(isLikelyPublicLand({ DESCEXCL: 'NPF Clubs' })).toBe(false);
    expect(isLikelyPublicLand({ DESCEXCL: null })).toBe(false);
    expect(isLikelyPublicLand({})).toBe(false);
  });
});

describe('formatOwnerMailing', () => {
  it('builds a one-line mailing address', () => {
    expect(
      formatOwnerMailing({
        OWNADD1: '6305 DEWEY DR',
        OWNCITY: 'COLUMBIA',
        OWNSTATE: 'MD',
        OWNERZIP: '21044',
      }),
    ).toBe('6305 DEWEY DR, COLUMBIA, MD 21044');
  });

  it('returns null when there is no owner address at all', () => {
    expect(
      formatOwnerMailing({ OWNADD1: null, OWNCITY: null, OWNSTATE: null, OWNERZIP: null }),
    ).toBeNull();
  });
});

describe('fetchParcelsInBounds', () => {
  it('maps fields to a clean parcel shape and drops geometry-less rows', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleGeoJSON });

    const fc = await fetchParcelsInBounds(goodBounds);

    expect(fc.features).toHaveLength(1); // ROW row filtered out
    const p = fc.features[0].properties;
    expect(p.acctid).toBe('1405341183');
    expect(p.acres).toBe(0.505);
    expect(p.ownerMailing).toBe('6305 DEWEY DR, COLUMBIA, MD 21044');
    expect(p.sdatUrl).toContain('sdat.dat.maryland.gov');
    expect(p.category).toBe('private'); // a residence, no exemption
    // Critically: there is NO owner name field on the parcel shape.
    expect((p as any).ownerName).toBeUndefined();
  });

  it('classifies a state-park parcel as public with land-use details', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              ACCTID: '0600999',
              ADDRESS: 'PATAPSCO VALLEY STATE PARK',
              ACRES: 14000,
              DESCEXCL: 'STA Parks',
              DESCLU: 'Exempt',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-76.8, 39.2], [-76.79, 39.2], [-76.79, 39.21], [-76.8, 39.2]]],
            },
          },
        ],
      },
    });
    const fc = await fetchParcelsInBounds(goodBounds);
    const p = fc.features[0].properties;
    expect(p.category).toBe('public');
    expect(p.exemptDesc).toBe('STA Parks');
    expect(p.landUse).toBe('Exempt');
  });

  it('queries the MD endpoint filtering out ROW/UNK parcels', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleGeoJSON });
    await fetchParcelsInBounds(goodBounds);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    const params = mockedGet.mock.calls[0][1].params;
    expect(params.where).toBe('OWNADD1 IS NOT NULL');
    expect(params.f).toBe('geojson');
    expect(params.geometryType).toBe('esriGeometryEnvelope');
  });

  it('refuses a zoomed-out (too large) viewport without hitting the network', async () => {
    const huge: ParcelBounds = { minLng: -79, minLat: 38, maxLng: -76, maxLat: 39.5 };
    const fc = await fetchParcelsInBounds(huge);
    expect(fc.features).toHaveLength(0);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('returns empty for an invalid viewport', async () => {
    const bad: ParcelBounds = { minLng: -76, minLat: 39, maxLng: -76.5, maxLat: 39 };
    const fc = await fetchParcelsInBounds(bad);
    expect(fc.features).toHaveLength(0);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('degrades to empty (never throws) when offline / endpoint errors', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network request failed'));
    const fc = await fetchParcelsInBounds(goodBounds);
    expect(fc.features).toHaveLength(0);
  });

  it('serves the same viewport from cache without a second network call', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleGeoJSON });
    await fetchParcelsInBounds(goodBounds);
    await fetchParcelsInBounds(goodBounds);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
