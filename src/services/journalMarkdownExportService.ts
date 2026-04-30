/**
 * @file journalMarkdownExportService.ts
 * @description Phase A.49 — pure serializer + thin async share wrapper
 * that turns a JournalEntry into a portable markdown document the user
 * can email, drop into Notes, or paste into a research log.
 *
 * Why markdown vs JSON:
 *   - JSON is for backups (A.12 bundle export already covers that).
 *   - Markdown is for HUMAN reading. The user wants to share their
 *     hunt notes with a buddy, paste a trip writeup into Bear/Notion,
 *     or print a retrospective for a research notebook.
 *   - Plain text + headers + bullets travels everywhere — no format
 *     drift, no rendering surprises.
 *
 * Design choices:
 *   - **Pure serializer.** `journalEntryToMarkdown(entry)` returns
 *     a string. No file IO, no Share. Trivial to unit-test.
 *   - **Async share wrapper.** `shareJournalEntryAsMarkdown(entry)`
 *     mirrors the A.12 / GPX / KML pattern: write to RNFS tmp,
 *     hand the URL to react-native-share. Mocked in tests via the
 *     same convention used by exportBundleService.test.ts.
 *   - **Stable layout.** The markdown structure is locked: title h1,
 *     metadata block, body, optional weather block, optional tags
 *     block, optional location block, photos as link list. Future
 *     adds should APPEND new sections, not reorder existing ones,
 *     so users grepping their archive can rely on positions.
 *   - **Front-matter free.** Pure markdown, no YAML/TOML front
 *     matter. The metadata is rendered as bold-key lists for
 *     readability rather than parser-friendliness — this is for
 *     humans, not pipelines.
 *
 * @module Services
 * @version 2.3.0
 */

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import type { JournalEntry } from '../types/journalEntry';
import {
  JOURNAL_OUTCOME_META,
} from '../types/journalEntry';
import {
  APP_BUILD_NUMBER,
  APP_MARKETING_VERSION,
} from '../config';

const MODE_LABEL: Record<JournalEntry['mode'], string> = {
  hunt: 'Hunt',
  fish: 'Fish',
  camp: 'Camp',
  hike: 'Hike',
};

/**
 * Make a string safe to drop into a markdown filename. Strips
 * filesystem-hostile chars, collapses whitespace to dashes, and
 * caps length so the share sheet doesn't truncate awkwardly.
 */
export function journalMarkdownFileName(entry: JournalEntry): string {
  const dateSlug = entry.entryDate.replace(/[^0-9-]/g, '');
  const titleSlug = (entry.title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const base = titleSlug ? `${dateSlug}-${titleSlug}` : dateSlug;
  return `journal-${base || 'entry'}.md`;
}

/**
 * Serialize a JournalEntry to a markdown document.
 *
 * Layout (lock — append future sections at the end):
 *   # {title}
 *
 *   - **Date:** {entryDate}
 *   - **Mode:** {mode}
 *   - **Outcome:** {outcomeLabel}
 *
 *   ## Notes
 *   {body — verbatim}
 *
 *   ## Weather  (only when present)
 *   - **Temp:** N °F
 *   - **Wind:** N mph from NW
 *   - **Conditions:** clear
 *
 *   ## Location  (only when locationLabel or coords present)
 *   - **Place:** Cunningham Falls SP
 *   - **Coords:** 39.6234, -77.4456
 *
 *   ## Tags  (only when non-empty)
 *   `tag1` · `tag2` · `tag3`
 *
 *   ## Photos  (only when non-empty)
 *   - photo:///abs/path/01.jpg
 *   - photo:///abs/path/02.jpg
 *
 *   ---
 *   _Exported from MDHuntFishOutdoors {version} (build {build}) on {today}._
 */
export function journalEntryToMarkdown(
  entry: JournalEntry,
  now: Date = new Date(),
): string {
  const lines: string[] = [];
  const titleClean = (entry.title || 'Untitled entry').trim();
  lines.push(`# ${titleClean}`);
  lines.push('');

  const outcomeLabel = JOURNAL_OUTCOME_META[entry.outcome]?.label ?? entry.outcome;
  lines.push(`- **Date:** ${entry.entryDate}`);
  lines.push(`- **Mode:** ${MODE_LABEL[entry.mode] ?? entry.mode}`);
  lines.push(`- **Outcome:** ${outcomeLabel}`);
  lines.push('');

  // Notes — always present (may be empty body, in which case we still
  // print the header so the layout stays stable across entries).
  lines.push('## Notes');
  const body = (entry.body ?? '').trim();
  lines.push(body.length > 0 ? body : '_No notes recorded._');
  lines.push('');

  // Weather (optional) — render only when at least one weather field
  // is set so a user who skipped weather doesn't see an empty card.
  if (entry.weather) {
    const w = entry.weather;
    const hasAny =
      typeof w.temperatureF === 'number' ||
      typeof w.windMph === 'number' ||
      (w.windDirection && w.windDirection.trim().length > 0) ||
      (w.conditions && w.conditions.trim().length > 0);
    if (hasAny) {
      lines.push('## Weather');
      if (typeof w.temperatureF === 'number') {
        lines.push(`- **Temp:** ${w.temperatureF} °F`);
      }
      if (typeof w.windMph === 'number') {
        const dir =
          w.windDirection && w.windDirection.trim().length > 0
            ? ` from ${w.windDirection.trim()}`
            : '';
        lines.push(`- **Wind:** ${w.windMph} mph${dir}`);
      } else if (w.windDirection && w.windDirection.trim().length > 0) {
        // wind dir but no speed — still worth recording.
        lines.push(`- **Wind:** from ${w.windDirection.trim()}`);
      }
      if (w.conditions && w.conditions.trim().length > 0) {
        lines.push(`- **Conditions:** ${w.conditions.trim()}`);
      }
      lines.push('');
    }
  }

  // Location (optional)
  if (
    (entry.locationLabel && entry.locationLabel.trim().length > 0) ||
    typeof entry.lat === 'number' ||
    typeof entry.lng === 'number'
  ) {
    lines.push('## Location');
    if (entry.locationLabel && entry.locationLabel.trim().length > 0) {
      lines.push(`- **Place:** ${entry.locationLabel.trim()}`);
    }
    if (typeof entry.lat === 'number' && typeof entry.lng === 'number') {
      lines.push(
        `- **Coords:** ${entry.lat.toFixed(5)}, ${entry.lng.toFixed(5)}`,
      );
    }
    lines.push('');
  }

  // Tags (optional)
  if (entry.tags.length > 0) {
    lines.push('## Tags');
    lines.push(entry.tags.map((t) => `\`${t}\``).join(' · '));
    lines.push('');
  }

  // Photos (optional) — surface URIs verbatim. Markdown viewers won't
  // load file:// images, but the URI is what the user needs if they
  // want to include them in another doc.
  if (entry.photoUris.length > 0) {
    lines.push('## Photos');
    for (const uri of entry.photoUris) {
      lines.push(`- ${uri}`);
    }
    lines.push('');
  }

  // Footer — provenance line so the user knows what app+version made
  // the file. Useful when revisiting an old export.
  lines.push('---');
  const ymd =
    now.toISOString().slice(0, 10);
  lines.push(
    `_Exported from MDHuntFishOutdoors ${APP_MARKETING_VERSION} (build ${APP_BUILD_NUMBER}) on ${ymd}._`,
  );

  return lines.join('\n');
}

/**
 * Write the markdown to a tmp file and open the iOS Share sheet so
 * the user can email it / drop it into Notes / save to Files.
 *
 * Mirrors the GPX / KML / A.12 bundle pattern. Returns true on user
 * completion, false on user-cancel; throws on filesystem errors.
 */
export async function shareJournalEntryAsMarkdown(
  entry: JournalEntry,
): Promise<boolean> {
  const md = journalEntryToMarkdown(entry);
  const fileName = journalMarkdownFileName(entry);
  const path = `${RNFS.TemporaryDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, md, 'utf8');
  try {
    await Share.open({
      url: `file://${path}`,
      type: 'text/markdown',
      filename: fileName,
      failOnCancel: false,
    });
    return true;
  } catch (e: any) {
    // react-native-share resolves with `dismissedAction` on iOS cancel.
    if (e && e.message && /User did not share/i.test(e.message)) {
      return false;
    }
    throw e;
  }
}
