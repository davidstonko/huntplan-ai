/**
 * @file tabAccessibility.test.ts
 * @description Because every mode shares the same five tab names, the
 * VoiceOver label must prepend the mode ("Hunt Map tab", not "Map tab").
 */

import { deriveTabAccessibilityLabel } from '../tabA11y';

describe('deriveTabAccessibilityLabel', () => {
  it('prepends the mode so identical tab names stay distinguishable', () => {
    expect(deriveTabAccessibilityLabel('MapTab', 'hunt')).toBe('Hunt Map tab');
    expect(deriveTabAccessibilityLabel('PlanTab', 'fish')).toBe('Fish Plan tab');
    expect(deriveTabAccessibilityLabel('LogTab', 'camp')).toBe('Camp Log tab');
    expect(deriveTabAccessibilityLabel('MoreTab', 'hike')).toBe('Hike More tab');
  });

  it('keeps "AI" as one word', () => {
    expect(deriveTabAccessibilityLabel('AITab', 'hunt')).toBe('Hunt AI tab');
  });

  it('falls back to a mode-less label when no mode is given', () => {
    expect(deriveTabAccessibilityLabel('MapTab')).toBe('Map tab');
  });
});
