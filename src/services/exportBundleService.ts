/**
 * exportBundleService.ts — full personal-layer JSON backup ("Backup My Data").
 *
 * Phase A.12 of the V2.3 expansion. Produces a single self-contained JSON
 * document the user can email to themselves, save to iCloud Drive, attach
 * to a Notes entry, or move to a desktop for safekeeping. This is the
 * answer to the very common pre-investment anxiety: "what if my phone
 * breaks before I get the data out?"
 *
 * Design choices:
 *   - **One file, one shape.** Every personal-layer surface (Waypoints,
 *     Tracks, Markups, Journals, Checklists) flattened into one object
 *     under its own array key. Avoids users having to juggle 5 separate
 *     exports and avoids the edge case where one type silently fails.
 *   - **Versioned schema.** `schemaVersion: 1` so a future field
 *     addition or rename can opt-in to a clean migration path. Bump the
 *     constant when the *shape* changes (not when contents do).
 *   - **App identity included.** `app.{name,version,build}` so a future
 *     import path can warn "this file was made by a newer app version,
 *     fields may be unknown" before ingesting.
 *   - **Counts pre-computed.** Saves consumers a re-walk; also acts as
 *     a sanity check (if `counts.waypoints !== bundle.waypoints.length`
 *     we know the bundle is corrupted).
 *   - **Pure builder, async sharer.** `buildExportBundle` is sync +
 *     pure (testable in jest with no native bridge). `shareExportBundle`
 *     is the async wrapper that writes to RNFS and opens iOS Share —
 *     mocked in tests via the same pattern shareGPX/shareKML use.
 *   - **No PII filtering.** This is the user's own data going to the
 *     user's own destination. We do NOT redact lat/lng, photo URIs,
 *     notes, or anything else — losing fidelity would defeat the
 *     "backup" purpose. The user picks where the file goes via the
 *     iOS Share sheet, so privacy is enforced by destination choice.
 *
 * The bundle is also the foundation of the eventual *import* path
 * (Phase C+). Keeping the shape stable + versioned now means a future
 * `restoreFromBundle()` can land without churning data files in the
 * field. Don't break this shape lightly.
 */

import type { UserWaypoint } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { JournalEntry } from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';
import {
  APP_BUILD_NUMBER,
  APP_MARKETING_VERSION,
} from '../config';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

/**
 * Bump on any *shape* change to ExportBundle (rename, add required
 * field, drop field). Adding a NEW optional array key does NOT require
 * a bump because old consumers will simply ignore the new key.
 */
export const EXPORT_BUNDLE_SCHEMA_VERSION = 1;

/** Stable string the import path can grep for to refuse foreign files. */
export const EXPORT_BUNDLE_GENERATOR = 'mdhuntfishoutdoors-personal-layer';

/**
 * The 5 personal-layer surfaces that round-trip through a backup.
 *
 * Anything *not* in this bag is intentionally excluded:
 *   - DeerCamp / shared annotations → group resource, not personal.
 *   - HuntPlan / scout routes → already exported via plan-level GPX/KML.
 *   - Photos themselves → only URIs are referenced; the photo files live
 *     in the iOS app sandbox and get backed up via iCloud Photo Library.
 *     Stuffing base64'd JPEGs into the JSON would balloon the file by
 *     two-to-three orders of magnitude.
 */
export interface ExportBundleInputs {
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  journalEntries: JournalEntry[];
  checklists: GearChecklist[];
}

/**
 * Optional metadata override — primarily so tests can pin a deterministic
 * `exportedAt`. Production callers leave both undefined and let
 * `buildExportBundle` stamp `new Date().toISOString()`.
 */
export interface ExportBundleMeta {
  /** ISO 8601 UTC. Defaults to now. */
  exportedAt?: string;
  /** Optional human note attached to the bundle (e.g. "pre-trip backup"). */
  note?: string;
}

export interface ExportBundleAppInfo {
  name: string;
  marketingVersion: string;
  buildNumber: string;
  /** Same shape as APP_VERSION in config: "<marketing>+<build>". */
  versionString: string;
}

export interface ExportBundleCounts {
  waypoints: number;
  tracks: number;
  markups: number;
  journalEntries: number;
  checklists: number;
  /** Sum of all five layers. Convenience field for UI confirmation rows. */
  total: number;
}

export interface ExportBundle {
  schemaVersion: typeof EXPORT_BUNDLE_SCHEMA_VERSION;
  generator: typeof EXPORT_BUNDLE_GENERATOR;
  exportedAt: string;
  note?: string;
  app: ExportBundleAppInfo;
  counts: ExportBundleCounts;
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  journalEntries: JournalEntry[];
  checklists: GearChecklist[];
}

/**
 * Build a self-contained JSON-serializable bundle of every personal-layer
 * row passed in. Pure: input arrays are referenced by identity (no copy)
 * because the bundle is intended for immediate JSON.stringify — mutation
 * of the underlying contexts after bundle build is meaningless.
 *
 * @example
 *   const bundle = buildExportBundle({ waypoints, tracks, markups,
 *     journalEntries, checklists });
 *   const json = JSON.stringify(bundle, null, 2);
 *
 * @param inputs The 5 personal-layer arrays to include
 * @param meta   Optional `{exportedAt, note}` overrides
 */
export function buildExportBundle(
  inputs: ExportBundleInputs,
  meta?: ExportBundleMeta,
): ExportBundle {
  const exportedAt = meta?.exportedAt ?? new Date().toISOString();
  const counts: ExportBundleCounts = {
    waypoints: inputs.waypoints.length,
    tracks: inputs.tracks.length,
    markups: inputs.markups.length,
    journalEntries: inputs.journalEntries.length,
    checklists: inputs.checklists.length,
    total:
      inputs.waypoints.length +
      inputs.tracks.length +
      inputs.markups.length +
      inputs.journalEntries.length +
      inputs.checklists.length,
  };
  const versionString = `${APP_MARKETING_VERSION}+${APP_BUILD_NUMBER}`;

  // Construct the bundle. Insertion order matters only for human
  // readability — the JSON spec leaves it unordered, but stringify
  // preserves it on V8 / JavaScriptCore so the file reads top-down:
  // schema/identity → metadata → counts → arrays.
  const bundle: ExportBundle = {
    schemaVersion: EXPORT_BUNDLE_SCHEMA_VERSION,
    generator: EXPORT_BUNDLE_GENERATOR,
    exportedAt,
    ...(meta?.note ? { note: meta.note } : {}),
    app: {
      name: 'MDHuntFishOutdoors',
      marketingVersion: APP_MARKETING_VERSION,
      buildNumber: APP_BUILD_NUMBER,
      versionString,
    },
    counts,
    waypoints: inputs.waypoints,
    tracks: inputs.tracks,
    markups: inputs.markups,
    journalEntries: inputs.journalEntries,
    checklists: inputs.checklists,
  };

  return bundle;
}

/**
 * Default filename for a backup bundle. Uses the exportedAt date
 * (YYYY-MM-DD) so multiple backups in the same day end up sequential
 * if the user picks "Save to Files" repeatedly. Slug pattern matches
 * exportService.shareGPX/shareKML naming convention.
 *
 * Example: 'mdhuntfishoutdoors_backup_2026-04-24'
 */
export function defaultBundleFilename(bundle: ExportBundle): string {
  const day = bundle.exportedAt.slice(0, 10); // 'YYYY-MM-DD'
  return `mdhuntfishoutdoors_backup_${day}`;
}

/**
 * JSON.stringify a bundle with stable 2-space indentation. Extracted so
 * tests can grep the serialized output for shape stability and so the
 * shareExportBundle path uses the exact same encoding the user gets.
 */
export function bundleToJSON(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/**
 * Write the bundle to the iOS caches directory and open the system Share
 * sheet so the user can mail / AirDrop / save it. Mirrors shareGPX /
 * shareKML in `exportService.ts` for behavioral consistency — both go
 * through `RNFS.writeFile` then `Share.open` with the file's `file://`
 * URL and an explicit MIME type.
 *
 * Cache directory is intentional (not Documents): backup files are
 * disposable artifacts. If the user wants to keep one, they save it to
 * Files / iCloud / email from the Share sheet.
 *
 * Async because RNFS + Share both return promises. UI callers should
 * wrap in try/catch to handle Share-cancelled (user dismisses the sheet
 * → Share.open rejects with `User did not share`).
 */
export async function shareExportBundle(
  bundle: ExportBundle,
  filenameOverride?: string,
): Promise<void> {
  const filename = filenameOverride ?? defaultBundleFilename(bundle);
  const path = `${RNFS.CachesDirectoryPath}/${filename}.json`;
  const json = bundleToJSON(bundle);
  await RNFS.writeFile(path, json, 'utf8');
  await Share.open({
    url: `file://${path}`,
    type: 'application/json',
    filename: `${filename}.json`,
  });
}
