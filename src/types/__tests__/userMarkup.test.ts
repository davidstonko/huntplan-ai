/**
 * userMarkup — type-level contract tests.
 */

import {
  isValidMarkup,
  closePolygon,
  resolveMarkupColor,
  DEFAULT_MARKUP_COLOR,
  type UserMarkup,
} from '../userMarkup';

describe('isValidMarkup (LineString)', () => {
  it('accepts a LineString with 2+ valid points', () => {
    const m: UserMarkup = {
      id: 'm1',
      createdAt: '',
      updatedAt: '',
      mode: 'hunt',
      title: 'Shoot lane',
      shapeType: 'LineString',
      coordinates: [
        [-77, 39],
        [-76.9, 39.1],
      ],
    };
    expect(isValidMarkup(m)).toBe(true);
  });

  it('rejects a LineString with <2 points', () => {
    const m: UserMarkup = {
      id: 'm1',
      createdAt: '',
      updatedAt: '',
      mode: 'hunt',
      title: 'x',
      shapeType: 'LineString',
      coordinates: [[-77, 39]],
    };
    expect(isValidMarkup(m)).toBe(false);
  });

  it('rejects non-finite coords', () => {
    const m: UserMarkup = {
      id: 'm1',
      createdAt: '',
      updatedAt: '',
      mode: 'hunt',
      title: 'x',
      shapeType: 'LineString',
      coordinates: [
        [NaN, 39],
        [-76.9, 39.1],
      ],
    };
    expect(isValidMarkup(m)).toBe(false);
  });
});

describe('isValidMarkup (Polygon)', () => {
  it('accepts a closed triangle (4 points, first == last)', () => {
    const m: UserMarkup = {
      id: 'p1',
      createdAt: '',
      updatedAt: '',
      mode: 'camp',
      title: 'Site A',
      shapeType: 'Polygon',
      coordinates: [
        [
          [-77, 39],
          [-76.9, 39],
          [-76.95, 39.1],
          [-77, 39],
        ],
      ],
    };
    expect(isValidMarkup(m)).toBe(true);
  });

  it('rejects an unclosed ring', () => {
    const m: UserMarkup = {
      id: 'p1',
      createdAt: '',
      updatedAt: '',
      mode: 'camp',
      title: 'x',
      shapeType: 'Polygon',
      coordinates: [
        [
          [-77, 39],
          [-76.9, 39],
          [-76.95, 39.1],
          [-77.01, 38.99], // not equal to first
        ],
      ],
    };
    expect(isValidMarkup(m)).toBe(false);
  });

  it('rejects a ring with <4 points', () => {
    const m: UserMarkup = {
      id: 'p1',
      createdAt: '',
      updatedAt: '',
      mode: 'camp',
      title: 'x',
      shapeType: 'Polygon',
      coordinates: [
        [
          [-77, 39],
          [-76.9, 39],
          [-77, 39],
        ],
      ],
    };
    expect(isValidMarkup(m)).toBe(false);
  });
});

describe('closePolygon', () => {
  it('leaves an already-closed ring unchanged', () => {
    const r = [
      [-77, 39],
      [-76.9, 39],
      [-76.95, 39.1],
      [-77, 39],
    ] as Array<[number, number]>;
    const out = closePolygon([r]);
    expect(out[0]).toEqual(r);
  });

  it('appends the first point to close an open ring', () => {
    const r = [
      [-77, 39],
      [-76.9, 39],
      [-76.95, 39.1],
    ] as Array<[number, number]>;
    const out = closePolygon([r]);
    expect(out[0]).toHaveLength(4);
    expect(out[0][0]).toEqual(out[0][out[0].length - 1]);
  });
});

describe('resolveMarkupColor', () => {
  const base: Omit<UserMarkup, 'coordinates' | 'shapeType'> = {
    id: 'x',
    createdAt: '',
    updatedAt: '',
    mode: 'hunt',
    title: '',
  };
  it('uses the markup color override', () => {
    const m: UserMarkup = {
      ...base,
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      color: '#ff0000',
    };
    expect(resolveMarkupColor(m)).toBe('#ff0000');
  });
  it('falls back to DEFAULT_MARKUP_COLOR', () => {
    const m: UserMarkup = {
      ...base,
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    expect(resolveMarkupColor(m)).toBe(DEFAULT_MARKUP_COLOR);
  });
});
