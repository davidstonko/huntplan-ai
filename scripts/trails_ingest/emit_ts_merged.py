#!/usr/bin/env python3
"""
emit_ts_merged.py — Appends merged ArcGIS trails into the TS data files.

Reads raw/merged_trails.json (from merge_arcgis_trails.py) and:
  1. Appends Trail records to MARYLAND_STATE_PARK_TRAILS (before the closing ']').
  2. Adds HikingTrace entries to HIKING_TRACES (before the closing '};').
  3. Updates HIKING_TRACE_SUMMARY counts.

Idempotent via marker sentinels — re-running replaces the prior merged block
rather than stacking duplicates.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
MERGED_PATH = SCRIPT_DIR / 'raw' / 'merged_trails.json'
TRAILS_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandStateParkTrails.ts'
TRACES_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandHikingTraces.ts'

BEGIN_TRAILS = '  // ── BEGIN ARCGIS MERGED TRAILS (2026-04-19) ──'
END_TRAILS   = '  // ── END ARCGIS MERGED TRAILS ──'
BEGIN_TRACES = '  // ── BEGIN ARCGIS MERGED TRACES (2026-04-19) ──'
END_TRACES   = '  // ── END ARCGIS MERGED TRACES ──'


def format_string_literal(s: str | None) -> str:
    if s is None:
        return 'null'
    # Escape backslashes and single quotes
    esc = s.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{esc}'"


def format_string_array(arr: list[str] | None) -> str:
    if not arr:
        return '[]'
    return '[' + ', '.join(format_string_literal(x) for x in arr) + ']'


def format_coords(coords: list[list[float]]) -> str:
    lines = []
    for pt in coords:
        lines.append(f'      [{pt[0]},{pt[1]}],')
    return '\n'.join(lines)


def format_trail(t: dict) -> str:
    """Emit a single Trail TS object literal."""
    lines = []
    lines.append('  {')
    lines.append(f"    id: {format_string_literal(t['id'])},")
    lines.append(f"    name: {format_string_literal(t['name'])},")
    lines.append(f"    park: {format_string_literal(t['park'])},")
    lines.append(f"    county: {format_string_literal(t['county'])},")
    lines.append(f"    type: {format_string_literal(t['type'])},")
    lines.append(f"    difficulty: {format_string_literal(t['difficulty'])},")
    lines.append(f"    lengthMi: {t['lengthMi']},")
    lines.append(f"    elevationGainFt: {t['elevationGainFt']},")
    lines.append(f"    estDurationMin: {t['estDurationMin']},")
    lines.append(f"    dogFriendly: {'true' if t['dogFriendly'] else 'false'},")
    lines.append(f"    seasonOpenMonth: null,")
    lines.append(f"    seasonCloseMonth: null,")
    lines.append(f"    trailheadLat: {t['trailheadLat']},")
    lines.append(f"    trailheadLon: {t['trailheadLon']},")
    # Coordinates: null (map polyline lives in HIKING_TRACES, not Trail)
    lines.append(f"    coordinates: null,")
    lines.append(f"    description: {format_string_literal(t['description'])},")
    lines.append(f"    tags: {format_string_array(t['tags'])},")
    lines.append(f"    highlights: {format_string_array(t['highlights'])},")
    lines.append(f"    officialUrl: {format_string_literal(t['officialUrl'])},")
    lines.append(f"    parkingNotes: {format_string_literal(t.get('parkingNotes'))},")
    lines.append('  },')
    return '\n'.join(lines)


def format_trace(t: dict) -> str:
    lines = []
    lines.append(f"  {format_string_literal(t['id'])}: {{")
    lines.append(f"    id: {format_string_literal(t['id'])},")
    lines.append(f"    name: {format_string_literal(t['name'])},")
    lines.append(f"    lengthMi: {t['lengthMi']},")
    lines.append(f"    publishedMi: {t['publishedMi']},")
    lines.append(f"    confidence: {format_string_literal(t['confidence'])},")
    lines.append(f"    isApproximate: {'true' if t['isApproximate'] else 'false'},")
    lines.append(f"    source: {format_string_literal(t['source'])},")
    lines.append(f"    sourceUrl: {format_string_literal(t['sourceUrl'])},")
    lines.append(f"    datePulled: {format_string_literal(t['datePulled'])},")
    lines.append(f"    coordinates: [")
    lines.append(format_coords(t['coordinates']))
    lines.append(f"    ],")
    lines.append(f"  }},")
    return '\n'.join(lines)


def splice_into_file(path: Path, begin: str, end: str, content: str, insert_before: str) -> None:
    text = path.read_text()

    block = f"{begin}\n{content}\n{end}\n"
    if begin in text and end in text:
        # Replace existing block
        pattern = re.compile(
            re.escape(begin) + r'.*?' + re.escape(end) + r'\n',
            re.DOTALL,
        )
        text = pattern.sub(block, text, count=1)
    else:
        # Insert before the given marker line (first occurrence)
        idx = text.rfind(insert_before)
        if idx == -1:
            raise RuntimeError(f'{path}: insert marker {insert_before!r} not found')
        text = text[:idx] + block + text[idx:]

    path.write_text(text)


def main() -> None:
    data = json.loads(MERGED_PATH.read_text())
    trails = data['trails']
    traces = data['traces']

    # Build trail block
    trail_chunks = [format_trail(t) for t in trails]
    trail_block = '\n'.join(trail_chunks)

    # Append into MARYLAND_STATE_PARK_TRAILS before the closing `];`
    splice_into_file(TRAILS_TS, BEGIN_TRAILS, END_TRAILS, trail_block, '];')

    # Build trace block
    trace_chunks = [format_trace(t) for t in traces]
    trace_block = '\n'.join(trace_chunks)

    # Insert into HIKING_TRACES record — find the closing brace of HIKING_TRACES
    # The file has `export const HIKING_TRACES: Record<string, HikingTrace> = { ... };`
    # followed by `export const AT_SEGMENT_TRACES ...`. Insert before the `};`
    # that precedes AT_SEGMENT_TRACES.
    text = TRACES_TS.read_text()
    idx_at = text.find('export const AT_SEGMENT_TRACES')
    if idx_at == -1:
        raise RuntimeError('AT_SEGMENT_TRACES anchor missing')
    # Find the `};` before AT_SEGMENT_TRACES
    before = text[:idx_at]
    close_idx = before.rfind('};')
    if close_idx == -1:
        raise RuntimeError("Closing '};' for HIKING_TRACES missing")

    # Replace existing merged block if present
    if BEGIN_TRACES in text and END_TRACES in text:
        pattern = re.compile(
            re.escape(BEGIN_TRACES) + r'.*?' + re.escape(END_TRACES) + r'\n',
            re.DOTALL,
        )
        text = pattern.sub(f"{BEGIN_TRACES}\n{trace_block}\n{END_TRACES}\n", text, count=1)
    else:
        # Insert just before `};`
        insert_at = close_idx
        text = (
            text[:insert_at]
            + f"{BEGIN_TRACES}\n{trace_block}\n{END_TRACES}\n"
            + text[insert_at:]
        )

    # Update HIKING_TRACE_SUMMARY
    # Count HIKING_TRACES entries — scope to just the HIKING_TRACES record body.
    hiking_traces_body = re.search(
        r'export const HIKING_TRACES:.*?\{(.*?)\n\};',
        text,
        flags=re.DOTALL,
    )
    hiking_traces_count = 0
    if hiking_traces_body:
        hiking_traces_count = len(
            re.findall(r"(?:^|\n)\s*'[^']+': \{", hiking_traces_body.group(1))
        )
    at_segment_count = count_at_segments(text)
    gaps_count = count_gaps(text)

    # Count by confidence — walk all trace blocks in HIKING_TRACES + AT_SEGMENT_TRACES
    conf_counts = count_confidences(text)
    by_conf_json = '{' + ', '.join(
        f'"{k}": {v}' for k, v in sorted(conf_counts.items())
    ) + '} as const'

    # Recompute summary
    total_geom = hiking_traces_count + at_segment_count
    new_summary = (
        'export const HIKING_TRACE_SUMMARY = {\n'
        f'  totalTrails: {total_geom + gaps_count},\n'
        f'  withGeometry: {total_geom},\n'
        f'  withoutGeometry: {gaps_count},\n'
        f'  byConfidence: {by_conf_json},\n'
        '} as const;\n'
    )
    text = re.sub(
        r'export const HIKING_TRACE_SUMMARY = \{.*?\} as const;\s*',
        new_summary,
        text,
        count=1,
        flags=re.DOTALL,
    )

    TRACES_TS.write_text(text)
    print(f'Wrote {TRAILS_TS} (appended {len(trails)} trails)')
    print(f'Wrote {TRACES_TS} (appended {len(traces)} traces)')
    print(f'Summary: {total_geom} w/ geom ({hiking_traces_count} HIKING_TRACES + '
          f'{at_segment_count} AT), {gaps_count} gaps, by confidence: {conf_counts}')


def count_at_segments(text: str) -> int:
    # Find AT_SEGMENT_TRACES record and count `'...at...': {` entries inside it.
    m = re.search(
        r'export const AT_SEGMENT_TRACES:.*?\{\s*(.*?)\n\};',
        text,
        flags=re.DOTALL,
    )
    if not m:
        return 0
    body = m.group(1)
    return len(re.findall(r"(?:^|\n)\s*'[^']+': \{", body))


def count_gaps(text: str) -> int:
    m = re.search(
        r'HIKING_TRACE_GAPS[^=]*=\s*\[(.*?)\];',
        text,
        flags=re.DOTALL,
    )
    if not m:
        return 0
    body = m.group(1)
    return len(re.findall(r"\{\s*id:", body))


def count_confidences(text: str) -> dict[str, int]:
    """Count `confidence: 'high'|'medium'|'low'` occurrences inside HIKING_TRACES
    + AT_SEGMENT_TRACES. Both records together is what we need."""
    # Find body from `HIKING_TRACES ... = {` through `};` then from `AT_SEGMENT_TRACES ... = {`
    # through `};`.
    counts = {'high': 0, 'medium': 0, 'low': 0}

    for rx in [
        r'export const HIKING_TRACES:.*?\{(.*?)\n\};',
        r'export const AT_SEGMENT_TRACES:.*?\{(.*?)\n\};',
    ]:
        m = re.search(rx, text, flags=re.DOTALL)
        if not m:
            continue
        body = m.group(1)
        for mm in re.finditer(r"confidence:\s*'(high|medium|low)'", body):
            counts[mm.group(1)] += 1

    # Drop zero entries
    return {k: v for k, v in counts.items() if v > 0}


if __name__ == '__main__':
    main()
