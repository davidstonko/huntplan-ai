/**
 * userMarkupStorage — persistence contract tests.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../userMarkupStorage';
import type { UserMarkup } from '../../types/userMarkup';

function makeLine(id: string): UserMarkup {
  return {
    id,
    createdAt: '2026-04-24T10:00:00Z',
    updatedAt: '2026-04-24T10:00:00Z',
    mode: 'hunt',
    title: `line ${id}`,
    shapeType: 'LineString',
    coordinates: [
      [-77, 39],
      [-76.9, 39.1],
    ],
  };
}

function makePoly(id: string): UserMarkup {
  return {
    id,
    createdAt: '2026-04-24T10:00:00Z',
    updatedAt: '2026-04-24T10:00:00Z',
    mode: 'camp',
    title: `poly ${id}`,
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
}

describe('userMarkupStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cold-start read returns []', async () => {
    expect(await loadAll()).toEqual([]);
  });

  it('round-trips a line + polygon', async () => {
    const line = makeLine('L1');
    const poly = makePoly('P1');
    await saveAll([line, poly]);
    const loaded = await loadAll();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toMatchObject({ id: 'L1', shapeType: 'LineString' });
    expect(loaded[1]).toMatchObject({ id: 'P1', shapeType: 'Polygon' });
  });

  it('drops structurally-invalid rows silently', async () => {
    const good = makeLine('good');
    const bad = { ...makeLine('bad'), coordinates: [[-77, 39]] } as UserMarkup;
    await AsyncStorage.setItem(
      __STORAGE_KEY_FOR_TESTS,
      JSON.stringify({ schemaVersion: 1, markups: [good, bad] }),
    );
    const loaded = await loadAll();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('good');
  });

  it('returns [] when schemaVersion is a future number', async () => {
    await AsyncStorage.setItem(
      __STORAGE_KEY_FOR_TESTS,
      JSON.stringify({ schemaVersion: 999, markups: [makeLine('x')] }),
    );
    expect(await loadAll()).toEqual([]);
  });

  it('returns [] on corrupt JSON', async () => {
    await AsyncStorage.setItem(__STORAGE_KEY_FOR_TESTS, '{not: "json"');
    expect(await loadAll()).toEqual([]);
  });

  it('clearAll drops the key', async () => {
    await saveAll([makeLine('x')]);
    await clearAll();
    const raw = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw).toBeNull();
  });
});
