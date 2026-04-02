/**
 * Test suite for exportService GPX/KML/CSV generation.
 * Validates XML structure, coordinate formatting, and special character escaping.
 */

import {
  planToGPX,
  trackToGPX,
  planToKML,
  trackToKML,
  harvestsToCSV,
  campToGPX,
  campToKML,
} from '../services/exportService';
import { HuntPlan, RecordedTrack } from '../types/scout';
import { DeerCamp } from '../types/deercamp';

describe('exportService', () => {
  // Sample hunt plan
  const samplePlan: HuntPlan = {
    id: 'plan-1',
    name: 'Green Ridge Scouting',
    createdAt: '2026-04-02T08:00:00Z',
    updatedAt: '2026-04-02T12:00:00Z',
    color: '#2E7D32',
    visible: true,
    parkingPoint: {
      id: 'parking-1',
      lat: 39.0458,
      lng: -76.6413,
      icon: 'parking',
      label: 'Main Lot',
      notes: 'Near gate',
    },
    waypoints: [
      {
        id: 'wp-1',
        lat: 39.0500,
        lng: -76.6450,
        icon: 'stand',
        label: 'Stand Alpha',
        notes: 'Oak tree, views north',
      },
      {
        id: 'wp-2',
        lat: 39.0520,
        lng: -76.6400,
        icon: 'water',
        label: 'Creek Crossing',
        notes: 'Deer movement point',
      },
    ],
    routes: [
      {
        id: 'route-1',
        points: [
          [-76.6413, 39.0458],
          [-76.6450, 39.0500],
          [-76.6400, 39.0520],
        ],
        style: 'solid',
        label: 'Scout Trail',
        distanceMeters: 850,
      },
    ],
    areas: [
      {
        id: 'area-1',
        polygon: [
          [-76.6500, 39.0400],
          [-76.6300, 39.0400],
          [-76.6300, 39.0600],
          [-76.6500, 39.0600],
        ],
        label: 'Food Plot',
        areaAcres: 12.5,
      },
    ],
    notes: 'Early season hotspot',
  };

  // Sample GPS track
  const sampleTrack: RecordedTrack = {
    id: 'track-1',
    name: 'Morning Scout Walk',
    date: '2026-04-02',
    points: [
      { lat: 39.0458, lng: -76.6413, timestamp: 1617297600000, altitude: 320 },
      { lat: 39.0468, lng: -76.6420, timestamp: 1617297660000, altitude: 325 },
      { lat: 39.0478, lng: -76.6430, timestamp: 1617297720000, altitude: 330 },
    ],
    distanceMeters: 300,
    durationSeconds: 600,
    visible: true,
  };

  describe('GPX Export', () => {
    it('planToGPX should generate valid GPX 1.1 XML', () => {
      const gpx = planToGPX(samplePlan);

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1"');
      expect(gpx).toContain('creator="MDHuntFishOutdoors"');
      expect(gpx).toContain('</gpx>');
    });

    it('planToGPX should include parking point', () => {
      const gpx = planToGPX(samplePlan);
      expect(gpx).toContain('<wpt lat="39.045800" lon="-76.641300">');
      expect(gpx).toContain('<name>Main Lot</name>');
      expect(gpx).toContain('<desc>parking waypoint');
    });

    it('planToGPX should include waypoints with correct lat/lon', () => {
      const gpx = planToGPX(samplePlan);
      expect(gpx).toContain('lat="39.050000"');
      expect(gpx).toContain('lon="-76.645000"');
      expect(gpx).toContain('<name>Stand Alpha</name>');
    });

    it('planToGPX should include routes as <rte> elements', () => {
      const gpx = planToGPX(samplePlan);
      expect(gpx).toContain('<rte>');
      expect(gpx).toContain('<name>Scout Trail</name>');
      expect(gpx).toContain('<rtept');
      expect(gpx).toContain('</rte>');
    });

    it('planToGPX should include areas as closed route polygons', () => {
      const gpx = planToGPX(samplePlan);
      expect(gpx).toContain('<name>Food Plot</name>');
      expect(gpx).toContain('closed polygon');
    });

    it('trackToGPX should generate valid GPX with track points', () => {
      const gpx = trackToGPX(sampleTrack);

      expect(gpx).toContain('<?xml version="1.0"');
      expect(gpx).toContain('<trk>');
      expect(gpx).toContain('<trkseg>');
      expect(gpx).toContain('<trkpt');
      expect(gpx).toContain('</trkseg>');
      expect(gpx).toContain('</trk>');
    });

    it('trackToGPX should include elevation data', () => {
      const gpx = trackToGPX(sampleTrack);
      expect(gpx).toContain('<ele>320.0</ele>');
      expect(gpx).toContain('<ele>325.0</ele>');
      expect(gpx).toContain('<ele>330.0</ele>');
    });

    it('trackToGPX should include ISO timestamps', () => {
      const gpx = trackToGPX(sampleTrack);
      expect(gpx).toContain('<time>');
      expect(gpx).toContain('T');
      expect(gpx).toContain('Z</time>');
    });
  });

  describe('KML Export', () => {
    it('planToKML should generate valid KML 2.2 XML', () => {
      const kml = planToKML(samplePlan);

      expect(kml).toContain('<?xml version="1.0"');
      expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
      expect(kml).toContain('<Document>');
      expect(kml).toContain('</kml>');
    });

    it('planToKML should include waypoints as Placemarks', () => {
      const kml = planToKML(samplePlan);
      expect(kml).toContain('<Placemark>');
      expect(kml).toContain('<Point>');
      expect(kml).toContain('<coordinates>');
      expect(kml).toContain('</coordinates>');
      expect(kml).toContain('</Point>');
    });

    it('planToKML should format coordinates as lon,lat,0', () => {
      const kml = planToKML(samplePlan);
      // Waypoint at lat 39.0500, lng -76.6450 should be formatted as -76.6450,39.0500,0
      expect(kml).toContain('-76.645000,39.050000,0');
    });

    it('planToKML should include routes as LineStrings', () => {
      const kml = planToKML(samplePlan);
      expect(kml).toContain('<LineString>');
      expect(kml).toContain('</LineString>');
    });

    it('planToKML should include areas as Polygons', () => {
      const kml = planToKML(samplePlan);
      expect(kml).toContain('<Polygon>');
      expect(kml).toContain('<outerBoundaryIs>');
      expect(kml).toContain('<LinearRing>');
      expect(kml).toContain('</LinearRing>');
      expect(kml).toContain('</outerBoundaryIs>');
      expect(kml).toContain('</Polygon>');
    });

    it('trackToKML should generate valid KML with track as LineString', () => {
      const kml = trackToKML(sampleTrack);

      expect(kml).toContain('<kml');
      expect(kml).toContain('<Placemark>');
      expect(kml).toContain('<LineString>');
      expect(kml).toContain('</LineString>');
      expect(kml).toContain('</Placemark>');
    });
  });

  describe('CSV Export', () => {
    it('harvestsToCSV should generate valid CSV with headers', () => {
      const harvests = [
        {
          species: 'White-tailed Deer',
          date: '2025-11-15',
          weapon: 'Rifle',
          county: 'Washington',
          landName: 'Greenridge WMA',
          antlerPoints: 8,
          weight: 185,
          gameCheckNumber: 'ABC123',
        },
      ];

      const csv = harvestsToCSV(harvests);

      expect(csv).toContain('Species,Date,Weapon,County');
      expect(csv).toContain('White-tailed Deer');
      expect(csv).toContain('2025-11-15');
      expect(csv).toContain('Washington');
    });

    it('harvestsToCSV should escape fields with commas', () => {
      const harvests = [
        {
          species: 'Deer, white-tailed',
          date: '2025-11-15',
          weapon: 'Rifle',
          county: 'Washington, County',
          landName: 'Greenridge WMA',
        },
      ];

      const csv = harvestsToCSV(harvests);

      // Fields with commas should be wrapped in quotes
      expect(csv).toContain('"Deer, white-tailed"');
      expect(csv).toContain('"Washington, County"');
    });
  });

  describe('Special Character Handling', () => {
    it('should escape XML special characters in plan name', () => {
      const planWithSpecialChars: HuntPlan = {
        ...samplePlan,
        name: 'Test & Development <alpha>',
      };

      const gpx = planToGPX(planWithSpecialChars);
      expect(gpx).toContain('Test &amp; Development &lt;alpha&gt;');
    });

    it('should escape XML special characters in notes', () => {
      const planWithQuotes: HuntPlan = {
        ...samplePlan,
        notes: 'Notes with "quotes" and <tags>',
      };

      const gpx = planToGPX(planWithQuotes);
      expect(gpx).toContain('&quot;');
      expect(gpx).toContain('&lt;');
      expect(gpx).toContain('&gt;');
    });
  });

  describe('Coordinate Precision', () => {
    it('should format coordinates to 6 decimal places', () => {
      const gpx = planToGPX(samplePlan);

      // Check that coordinates are formatted with 6 decimals
      expect(gpx).toMatch(/lat="39\.\d{6}"/);
      expect(gpx).toMatch(/lon="-76\.\d{6}"/);
    });
  });

  describe('Camp Export', () => {
    it('campToGPX should export camp annotations', () => {
      const camp: DeerCamp = {
        id: 'camp-1',
        name: 'Spring Camp 2026',
        createdAt: '2026-04-02T08:00:00Z',
        createdBy: 'user-1',
        centerPoint: { lat: 39.0458, lng: -76.6413 },
        defaultZoom: 12,
        members: [
          { userId: 'user-1', username: 'John', role: 'admin', color: '#E03C31', joinedAt: '2026-04-02T08:00:00Z' },
        ],
        annotations: [
          {
            id: 'ann-1',
            type: 'waypoint',
            createdBy: 'user-1',
            createdAt: '2026-04-02T08:00:00Z',
            data: {
              id: 'wp-1',
              lat: 39.0500,
              lng: -76.6450,
              icon: 'stand',
              label: 'Camp Stand',
              notes: 'Test stand',
            },
          },
        ],
        photos: [],
        activityFeed: [],
      };

      const gpx = campToGPX(camp);
      expect(gpx).toContain('Spring Camp 2026');
      expect(gpx).toContain('<wpt');
      expect(gpx).toContain('Camp Stand');
    });

    it('campToKML should export camp annotations in KML format', () => {
      const camp: DeerCamp = {
        id: 'camp-1',
        name: 'Spring Camp 2026',
        createdAt: '2026-04-02T08:00:00Z',
        createdBy: 'user-1',
        centerPoint: { lat: 39.0458, lng: -76.6413 },
        defaultZoom: 12,
        members: [],
        annotations: [],
        photos: [],
        activityFeed: [],
      };

      const kml = campToKML(camp);
      expect(kml).toContain('Spring Camp 2026');
      expect(kml).toContain('<kml');
      expect(kml).toContain('</kml>');
    });
  });
});
