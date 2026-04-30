/**
 * recentActivityService.ts — pure functions to summarize the user's most
 * recent personal-layer activity per mode.
 *
 * Used by ModePickerScreen to render a one-line "where were we" hook
 * underneath each mode card. Pure local data — no network. Touches:
 *  - UserWaypoint (createdAt + title)
 *  - RecordedTrack (startedAt + name + distance)
 *  - UserMarkup (createdAt + title)
 *  - JournalEntry (entryDate + title + outcome)
 *  - GearChecklist (updatedAt + name + tripDate)
 *
 * The service ranks by the most-recent timestamp, picks ONE row, and
 * returns a short human label + a relative time-ago. Callers receive
 * `null` when the user has no activity in a given mode (clean empty
 * state, no awkward "0 entries" filler text).
 *
 * Phase A.7 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { JournalEntry } from '../types/journalEntry';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';
import { countItems } from '../types/gearChecklist';

export type RecentActivityKind =
  | 'waypoint'
  | 'track'
  | 'markup'
  | 'journal'
  | 'checklist';

export interface RecentActivitySummary {
  kind: RecentActivityKind;
  /** Letter-code chip ("WP", "TR", "MK", "JR", "GC") for the badge. */
  code: string;
  /** Headline label, e.g. "Last sit at Cedar Hill" */
  label: string;
  /** Secondary detail, e.g. "Sighting · 6 days ago" */
  detail: string;
  /** ISO timestamp for sorting / "X days ago" calculation. */
  timestamp: string;
}

export interface RecentActivityInputs {
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  journalEntries: JournalEntry[];
  checklists: GearChecklist[];
}

/**
 * Format a "time ago" label from an ISO timestamp.
 *  - <60s  → "just now"
 *  - <60m  → "Nm ago"
 *  - <24h  → "Nh ago"
 *  - <7d   → "Nd ago"
 *  - else  → "Apr 18" / "Mar 30, 2025" if cross-year
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return 'in the future';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  // Same year → "Apr 18"; cross year → "Mar 30, 2025"
  if (then.getFullYear() === now.getFullYear()) {
    return then.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ifMode<T extends { mode: WaypointMode }>(
  rows: T[],
  mode: WaypointMode,
): T[] {
  return rows.filter((r) => r.mode === mode);
}

function pickLatest<T>(
  rows: T[],
  ts: (r: T) => string,
): T | null {
  let best: T | null = null;
  let bestTs = '';
  for (const r of rows) {
    const t = ts(r);
    if (!t) continue;
    if (!best || t > bestTs) {
      best = r;
      bestTs = t;
    }
  }
  return best;
}

function metersToMilesLabel(m: number): string {
  if (m <= 0) return '0 mi';
  const mi = m / 1609.344;
  if (mi < 0.1) return `${Math.round(m)}m`;
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/**
 * Summarize the most recent personal-layer activity for one mode.
 * Returns null when the user has nothing for that mode yet.
 */
export function summarizeRecentForMode(
  mode: WaypointMode,
  inputs: RecentActivityInputs,
  now: Date = new Date(),
): RecentActivitySummary | null {
  const w = pickLatest(ifMode(inputs.waypoints, mode), (r) => r.updatedAt);
  const t = pickLatest(ifMode(inputs.tracks, mode), (r) => r.startedAt);
  const m = pickLatest(ifMode(inputs.markups, mode), (r) => r.updatedAt);
  const j = pickLatest(ifMode(inputs.journalEntries, mode), (r) => r.entryDate);
  const c = pickLatest(ifMode(inputs.checklists, mode), (r) => r.updatedAt);

  type Candidate = { ts: string; build: () => RecentActivitySummary };
  const candidates: Candidate[] = [];

  if (w) {
    candidates.push({
      ts: w.updatedAt,
      build: () => ({
        kind: 'waypoint',
        code: 'WP',
        label: `Saved "${w.title || 'Waypoint'}"`,
        detail: timeAgo(w.updatedAt, now),
        timestamp: w.updatedAt,
      }),
    });
  }

  if (t) {
    candidates.push({
      ts: t.startedAt,
      build: () => ({
        kind: 'track',
        code: 'TR',
        label: `Recorded "${t.name || 'Track'}"`,
        detail: `${metersToMilesLabel(t.distanceM)}  ·  ${timeAgo(t.startedAt, now)}`,
        timestamp: t.startedAt,
      }),
    });
  }

  if (m) {
    candidates.push({
      ts: m.updatedAt,
      build: () => ({
        kind: 'markup',
        code: 'MK',
        label: `Drew "${m.title || (m.shapeType === 'Polygon' ? 'Area' : 'Line')}"`,
        detail: `${m.shapeType === 'Polygon' ? 'Area' : 'Line'}  ·  ${timeAgo(m.updatedAt, now)}`,
        timestamp: m.updatedAt,
      }),
    });
  }

  if (j) {
    // entryDate is YYYY-MM-DD (no time). Treat as local noon for sort purity.
    const journalIso = `${j.entryDate}T12:00:00.000Z`;
    const meta = JOURNAL_OUTCOME_META[j.outcome];
    const outcomeLabel = meta ? meta.label : j.outcome;
    candidates.push({
      ts: journalIso,
      build: () => ({
        kind: 'journal',
        code: 'JR',
        label: `Logged "${j.title || 'Untitled entry'}"`,
        detail: `${outcomeLabel}  ·  ${timeAgo(journalIso, now)}`,
        timestamp: journalIso,
      }),
    });
  }

  if (c) {
    const counts = countItems(c.items);
    candidates.push({
      ts: c.updatedAt,
      build: () => ({
        kind: 'checklist',
        code: 'GC',
        label: `Pack list "${c.name}"`,
        detail: `${counts.checked}/${counts.total} packed  ·  ${timeAgo(c.updatedAt, now)}`,
        timestamp: c.updatedAt,
      }),
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return candidates[0].build();
}
