/**
 * Maryland 2025 Hunting Tract Lottery — DNR-administered lottery hunts on
 * state forest tracts. Each tract polygon represents a named hunting
 * complex/tract sold at auction to a single hunter for the season. The
 * three polyline records are posted access roads to the tracts.
 *
 * Source: services.arcgis.com/njFNhDsUCentVYJW/.../
 *   2025_Hunting_Tract_Lottery_WFL1/FeatureServer/1 (tracts) + /0 (roads).
 * Pulled 2026-04-19.
 *
 * These are small niche datasets (2 tracts in the 2025 pull) — they represent
 * special Permit Only hunts and should only be shown to users who opt into a
 * "lottery hunt" overlay.
 */

export interface HuntLotteryTract {
  id: string;
  /** DNR complex code (e.g., "W20"). */
  complex?: string;
  /** DNR complex-area name (e.g., "Dr. Phillips"). */
  complexName?: string;
  /** DNR tract identifier (often includes winning bidder name). */
  tract?: string;
  acres?: number;
  pricePerAcre?: number;
  totalPrice?: number;
  rings: [number, number][][];
}

export interface HuntLotteryRoad {
  id: string;
  complex?: string;
  roadType?: string;
  lengthFt?: number;
  lengthMi?: number;
  paths: [number, number][][];
}

export const MARYLAND_HUNT_LOTTERY_TRACTS: HuntLotteryTract[] = [
  {
    id: 'lot_1',
    complex: 'W20',
    complexName: 'Dr. Phillips',
    tract: '7228 - Phillips Karen W',
    acres: 79,
    pricePerAcre: 16.0,
    totalPrice: 1264.0,
    rings: [[[-75.749858,38.356056], [-75.747844,38.352971], [-75.754092,38.350406], [-75.757359,38.356225], [-75.753978,38.356149], [-75.753373,38.355099], [-75.752724,38.355166], [-75.75328,38.356133], [-75.749858,38.356056]]],
  },
  {
    id: 'lot_2',
    complex: 'S13',
    complexName: 'Hradwosky',
    tract: '4822 - Hradowsky',
    acres: 76,
    pricePerAcre: 14.0,
    totalPrice: 1064.0,
    rings: [[[-75.621255,38.230753], [-75.61546,38.233628], [-75.614491,38.231122], [-75.615677,38.230854], [-75.614495,38.229035], [-75.61663,38.22746], [-75.61758,38.22761], [-75.618764,38.226016], [-75.620907,38.226978], [-75.621596,38.228734], [-75.620497,38.230042], [-75.621255,38.230753]]],
  },
];

export const MARYLAND_HUNT_LOTTERY_ROADS: HuntLotteryRoad[] = [
  {
    id: 'lotr_1',
    complex: 'S13',
    roadType: '16.5\' ROW',
    lengthFt: 3771.3433,
    lengthMi: 0.7143,
    paths: [[[-75.619039,38.231905], [-75.618006,38.230802], [-75.614001,38.228032], [-75.611906,38.226336], [-75.611654,38.226011], [-75.611294,38.224014]]],
  },
  {
    id: 'lotr_2',
    complex: 'S13',
    roadType: 'Forest',
    lengthFt: 527.7568,
    lengthMi: 0.1,
    paths: [[[-75.618006,38.230802], [-75.617344,38.232151]]],
  },
  {
    id: 'lotr_3',
    lengthFt: 0.0,
    lengthMi: 0.387,
    paths: [[[-75.755381,38.356181], [-75.752295,38.351144]]],
  },
];
