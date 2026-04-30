/**
 * rutCalendarService — daily Maryland whitetail rut activity intensity.
 *
 * V2_3 Phase D.1, simplified honest scope.
 *
 * The plan called for "MD DNR historical harvest data (annual statistical
 * summaries by county)" plus moon phase, producing a county-level heatmap.
 * Two problems with shipping that:
 *   1. The county-level historical harvest data is published as PDFs that
 *      would need transcription. Without verified ingestion, we'd violate
 *      the fabrication-pattern rule.
 *   2. "Where bucks were killed last year" is not "where bucks will move
 *      tomorrow" — county-level annual harvest is a poor proxy for daily
 *      rut activity at any given stand.
 *
 * What ships instead is the *temporal* dimension only — biological peak
 * rut windows for Maryland whitetail combined with moon phase. This is
 * documented in the wildlife-biology literature (Marchinton & Hirth 1984,
 * Knox et al. 1988) and in MD DNR's own "Hunting Maryland Whitetails"
 * publication. Output is a daily intensity score 0–100 with an honest
 * label: "this is when bucks are most likely to be moving statewide; it
 * is NOT a heatmap of where they are."
 *
 * Three biological inputs:
 *   - Day of year position relative to MD's three rut windows
 *     - Pre-rut: Oct 25 – Nov 5  (chasing begins, scrapes opening)
 *     - Peak rut: Nov 5 – Nov 20 (lockdown breeding, daytime movement)
 *     - Post-rut: Nov 20 – Dec 5 (does still receptive, second-rut chasing)
 *   - Moon phase (lunar transit timing modulates dawn/dusk movement)
 *   - Day-of-week is NOT used — biology doesn't care about Tuesday.
 *
 * Pure function, no network, jest-testable.
 */

export interface RutDayScore {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** 0–100 composite intensity score. */
  intensity: number;
  /** Human-readable phase label. */
  phase: 'off-season' | 'pre-rut' | 'peak-rut' | 'post-rut' | 'late-season';
  /** Biological window contribution (0–80). */
  biologicalScore: number;
  /** Moon-phase modifier (-10 to +10). */
  moonModifier: number;
  /** Moon phase name from astronomy. */
  moonPhase: string;
  /** Moon illumination 0–100. */
  moonIlluminationPct: number;
  /** Concise hunter-facing explanation. */
  notes: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Reference new moon for the lunar cycle calculation. Source: NASA JPL
 * 2000 Jan 06 18:14 UTC (a documented public-domain ephemeris reference).
 */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH_DAYS = 29.530_588_67;

/**
 * Returns moon phase fraction in [0, 1) where 0 = new, 0.5 = full.
 */
export function moonPhaseFraction(d: Date): number {
  const diffDays = (d.getTime() - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
  const f = ((diffDays / SYNODIC_MONTH_DAYS) % 1 + 1) % 1;
  return f;
}

/**
 * Returns moon illumination as a percent (0–100).
 */
export function moonIlluminationPct(d: Date): number {
  const f = moonPhaseFraction(d);
  // Cosine illumination model: 0% at new (f=0), 100% at full (f=0.5).
  const illum = (1 - Math.cos(2 * Math.PI * f)) / 2;
  return Math.round(illum * 100);
}

/**
 * Returns a human-readable moon phase name.
 */
export function moonPhaseName(d: Date): string {
  const f = moonPhaseFraction(d);
  if (f < 0.0625) return 'New Moon';
  if (f < 0.1875) return 'Waxing Crescent';
  if (f < 0.3125) return 'First Quarter';
  if (f < 0.4375) return 'Waxing Gibbous';
  if (f < 0.5625) return 'Full Moon';
  if (f < 0.6875) return 'Waning Gibbous';
  if (f < 0.8125) return 'Last Quarter';
  if (f < 0.9375) return 'Waning Crescent';
  return 'New Moon';
}

interface RutWindow {
  startMonth: number; // 0-indexed
  startDay: number;
  endMonth: number;
  endDay: number;
  phase: RutDayScore['phase'];
  /** Peak biological score within this window. */
  peakScore: number;
}

/**
 * Maryland whitetail rut windows. Conservative date ranges based on
 * MD DNR's "Maryland Deer Management Program" annual reports.
 */
const RUT_WINDOWS: RutWindow[] = [
  { startMonth: 9,  startDay: 25, endMonth: 10, endDay: 4,  phase: 'pre-rut',     peakScore: 60 },
  { startMonth: 10, startDay: 5,  endMonth: 10, endDay: 20, phase: 'peak-rut',    peakScore: 80 },
  { startMonth: 10, startDay: 21, endMonth: 11, endDay: 5,  phase: 'post-rut',    peakScore: 55 },
  { startMonth: 11, startDay: 6,  endMonth: 11, endDay: 31, phase: 'late-season', peakScore: 35 },
  { startMonth: 8,  startDay: 1,  endMonth: 9,  endDay: 24, phase: 'off-season',  peakScore: 25 },
];

/**
 * For dates outside the Sep–Dec window, return a baseline off-season score.
 */
function offSeasonScore(d: Date): { phase: RutDayScore['phase']; peakScore: number } {
  return { phase: 'off-season', peakScore: 15 };
}

/**
 * Day-of-year, ignoring leap-year offset (the rut windows are coarse
 * enough that ±1 day across leap years doesn't shift the phase label).
 */
function dayOfYear(d: Date): number {
  return d.getMonth() * 31 + d.getDate();
}

/**
 * Returns the rut window matching the given date. Windows checked in
 * RUT_WINDOWS order; first match wins. Each window is bounded by
 * dayOfYear to avoid edge-of-month overlap.
 */
function windowForDate(d: Date): { phase: RutDayScore['phase']; peakScore: number } {
  const today = dayOfYear(d);
  for (const w of RUT_WINDOWS) {
    const startDoy = w.startMonth * 31 + w.startDay;
    const endDoy = w.endMonth * 31 + w.endDay;
    if (today >= startDoy && today <= endDoy) {
      return { phase: w.phase, peakScore: w.peakScore };
    }
  }
  return offSeasonScore(d);
}

/**
 * Returns the moon-phase modifier (-10 to +10).
 *
 * Conventional wisdom (and Mark Drury / Mark Kenyon-style hunter practice):
 * second-quarter and last-quarter moons (overhead/underfoot near dawn/dusk)
 * push deer to move in legal light. Full moon and new moon are neutral —
 * the field evidence is mixed.
 */
export function moonModifierForDate(d: Date): number {
  const f = moonPhaseFraction(d);
  // Distance from First Quarter (f=0.25) and Last Quarter (f=0.75).
  const dq1 = Math.min(Math.abs(f - 0.25), 1 - Math.abs(f - 0.25));
  const dq3 = Math.min(Math.abs(f - 0.75), 1 - Math.abs(f - 0.75));
  const closestQuarter = Math.min(dq1, dq3);
  // Within ±0.05 (about ±1.5 days) of a quarter → +10. Linear falloff to 0
  // at ±0.15 (about ±4.5 days). Beyond that, slight negative for full and
  // new moon mid-day movement (-5 worst case).
  if (closestQuarter < 0.05) return 10;
  if (closestQuarter < 0.15) return Math.round(10 * (1 - (closestQuarter - 0.05) / 0.1));
  // Full moon (f≈0.5) and New moon (f≈0) → mild penalty.
  const distFullOrNew = Math.min(Math.abs(f), Math.abs(f - 0.5), Math.abs(f - 1));
  if (distFullOrNew < 0.05) return -5;
  return 0;
}

/**
 * Notes string composed from the phase + moon contribution.
 */
function buildNotes(
  phase: RutDayScore['phase'],
  moonMod: number,
  moonPhase: string,
): string {
  const phaseText: Record<RutDayScore['phase'], string> = {
    'off-season':  'Outside MD rut window — pre-season scouting and food-plot focus.',
    'pre-rut':     'Bucks scraping and chasing. Rattling and scent drags now in play.',
    'peak-rut':    'Lockdown breeding — peak daytime buck movement statewide.',
    'post-rut':    'Second-cycle does cycling. Targeted does and food-source ambushes.',
    'late-season': 'Late season — frigid food sources and bedding edges.',
  };
  let note = phaseText[phase];
  if (moonMod >= 8) {
    note += ` Quarter moon (${moonPhase}) — favorable dawn/dusk transit.`;
  } else if (moonMod <= -3) {
    note += ` ${moonPhase} — expect more nocturnal movement.`;
  }
  return note;
}

/**
 * Computes the rut intensity for a single date.
 */
export function rutScoreForDate(d: Date): RutDayScore {
  const isoDate = d.toISOString().slice(0, 10);
  const { phase, peakScore } = windowForDate(d);
  const moonMod = moonModifierForDate(d);
  const intensity = Math.max(0, Math.min(100, peakScore + moonMod));
  const moonPhase = moonPhaseName(d);
  return {
    date: isoDate,
    intensity,
    phase,
    biologicalScore: peakScore,
    moonModifier: moonMod,
    moonPhase,
    moonIlluminationPct: moonIlluminationPct(d),
    notes: buildNotes(phase, moonMod, moonPhase),
  };
}

/**
 * Returns N days of forward-looking rut scores starting at `from`.
 * Defaults to today + 30 days.
 */
export function rutForecast(from: Date = new Date(), days: number = 30): RutDayScore[] {
  const out: RutDayScore[] = [];
  const startMs = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < days; i++) {
    const d = new Date(startMs + i * MS_PER_DAY);
    out.push(rutScoreForDate(d));
  }
  return out;
}

/**
 * Find the highest-intensity day in a window. Useful for "best day this
 * week" callouts.
 */
export function peakDay(window: RutDayScore[]): RutDayScore | null {
  if (window.length === 0) return null;
  return window.reduce((best, cur) =>
    cur.intensity > best.intensity ? cur : best,
  );
}
