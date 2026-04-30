/**
 * @file rampRoutingService.test.ts
 * @description Jest tests for the rampRoutingService.
 */

import { getDirectionsToSite } from '../rampRoutingService';
import { AnglerAccessSite } from '../../data/marylandAnglerAccessSites';

describe('rampRoutingService', () => {
  const baseSite: AnglerAccessSite = {
    id: 'angler_001',
    name: 'Patuxent River Access',
    county: 'Prince George',
    waterbody: 'Patuxent River',
    fishTypes: 'Largemouth Bass',
    specialReg: 'None',
    hasRamp: true,
    hasSoftLaunch: false,
    lat: 39.050,
    lng: -76.640,
  };

  it('should use parking coordinates when available', () => {
    const site = {
      ...baseSite,
      parkingLat: 39.051,
      parkingLng: -76.641,
    };
    const result = getDirectionsToSite(site);
    expect(result.destination.lat).toBe(39.051);
    expect(result.destination.lng).toBe(-76.641);
  });

  it('should fall back to site coordinates', () => {
    const result = getDirectionsToSite(baseSite);
    expect(result.destination.lat).toBe(39.050);
    expect(result.destination.lng).toBe(-76.640);
  });

  it('should generate valid Apple Maps URL', () => {
    const result = getDirectionsToSite(baseSite);
    expect(result.primaryUrl).toMatch(/^http:\/\/maps\.apple\.com/);
    expect(result.primaryUrl).toContain('daddr=');
  });

  it('should generate valid Google Maps URL', () => {
    const result = getDirectionsToSite(baseSite);
    expect(result.secondaryUrl).toMatch(/^https:\/\/www\.google\.com/);
    expect(result.secondaryUrl).toContain('api=1');
  });

  it('should include origin when provided', () => {
    const origin = { lat: 39.045, lng: -76.641 };
    const result = getDirectionsToSite(baseSite, origin);
    expect(result.primaryUrl).toContain('saddr=39.045,-76.641');
    expect(result.secondaryUrl).toContain('origin=39.045,-76.641');
  });

  it('should handle special characters in site name', () => {
    const specialSite = {
      ...baseSite,
      name: "Smith's Landing & Boat Ramp",
    };
    const result = getDirectionsToSite(specialSite);
    expect(result.destination.name).toBe("Smith's Landing & Boat Ramp");
  });

  it('should include parking hint in label when available', () => {
    const siteWithParking = {
      ...baseSite,
      parkingLat: 39.051,
      parkingLng: -76.641,
    };
    const result = getDirectionsToSite(siteWithParking);
    expect(result.label).toContain('parking');
  });

  it('should not include parking in label without parking coords', () => {
    const result = getDirectionsToSite(baseSite);
    expect(result.label).not.toContain('parking');
  });

  it('should return correct label format', () => {
    const result = getDirectionsToSite(baseSite);
    expect(result.label).toMatch(/^Boat ramp at/);
  });
});
