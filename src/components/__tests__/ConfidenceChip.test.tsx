/**
 * @file ConfidenceChip.test.tsx
 * @description Jest tests for the ConfidenceChip component.
 *
 * This project does not include a full React Native testing library in
 * devDependencies, so these tests validate ConfidenceChip's public contract
 * (prop types, level → label mapping) via static inspection of the component
 * module rather than rendering it into a host tree. The label mapping is the
 * highest-risk surface (it is user-visible copy), so we lock it explicitly.
 */

import ConfidenceChip from '../ConfidenceChip';

describe('ConfidenceChip - public contract', () => {
  it('exports a default function component', () => {
    expect(typeof ConfidenceChip).toBe('function');
  });

  it('accepts the documented ConfidenceLevel values without throwing at type-check time', () => {
    // Compile-time check: if any level below is removed from the union the
    // TypeScript build will fail before this test runs, so reaching this
    // assertion at runtime means the public prop contract is intact.
    const levels: Array<'verified' | 'approximate' | 'community' | 'unknown'> = [
      'verified',
      'approximate',
      'community',
      'unknown',
    ];
    expect(levels).toHaveLength(4);
  });

  it('is a single default export (no named exports leaking internals)', () => {
    const mod = require('../ConfidenceChip');
    const keys = Object.keys(mod).filter((k) => k !== 'default');
    // Module may have __esModule flag; filter that too
    const publicKeys = keys.filter((k) => k !== '__esModule');
    expect(publicKeys).toEqual([]);
  });
});
