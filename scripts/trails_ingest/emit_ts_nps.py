#!/usr/bin/env python3
"""
emit_ts_nps.py — Splice NPS-sourced polylines (raw/nps_foot_trails.json)
into HIKING_TRACES, remove matched IDs from HIKING_TRACE_GAPS, and
recompute HIKING_TRACE_SUMMARY.

Idempotent via BEGIN/END sentinels — same pattern as emit_ts_osm.py.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
NPS_PATH = SCRIPT_DIR / 'raw' / 'nps_foot_trails.json'
TRACES_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandHikingTraces.ts'

BEGIN = '  // ── BEGIN NPS FOOT TRAILS (2026-04-19) ──'
END   = '  // ── END NPS FOOT TRAILS ──'


def q(s: str | None) -> str:
    if s is None:
        return 'null'
    esc = s.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{esc}'"


def fmt_coords(coords: list[list[float]]) -> str:
    lines = []
    for pt in coords:
        lines.append(f'      [{pt[0]},{pt[1]}],')
    return '\n'.join(lines)


def fmt_trace(r: dict) -> str:
    lines = []
    lines.append(f"  {q(r['id'])}: {{")
    lines.append(f"    id: {q(r['id'])},")
    lines.append(f"    name: {q(r['name'])},")
    lines.append(f"    lengthMi: {r['lengthMi']},")
    lines.append(f"    publishedMi: {r['effectivePublishedMi']},")
    lines.append(f"    confidence: {q(r['confidence'])},")
    lines.append(f"    isApproximate: {'true' if r['isApproximate'] else 'false'},")
    lines.append(f"    source: {q(r['source'])},")
    lines.append(f"    sourceUrl: {q(r['sourceUrl'])},")
    lines.append(f"    datePulled: {q(r['datePulled'])},")
    lines.append(f"    coordinates: [")
    lines.append(fmt_coords(r['coordinates']))
    lines.append(f"    ],")
    lines.append(f"  }},")
    return '\n'.join(lines)


def count_re(text: str, body_rx: str, item_rx: str) -> int:
    m = re.search(body_rx, text, flags=re.DOTALL)
    if not m:
        return 0
    return len(re.findall(item_rx, m.group(1)))


def main() -> None:
    data = json.loads(NPS_PATH.read_text())
    results = data['results']

    trace_chunks = [fmt_trace(r) for r in results.values()]
    trace_body = '\n'.join(trace_chunks)
    new_block = f"{BEGIN}\n{trace_body}\n{END}\n"

    text = TRACES_TS.read_text()

    # Splice between BEGIN/END; insert just before the `};` that closes
    # HIKING_TRACES (i.e., just before AT_SEGMENT_TRACES starts).
    idx_at = text.find('export const AT_SEGMENT_TRACES')
    if idx_at == -1:
        raise RuntimeError('AT_SEGMENT_TRACES anchor missing')
    before_at = text[:idx_at]
    close_idx = before_at.rfind('};')
    if close_idx == -1:
        raise RuntimeError("Closing '};' for HIKING_TRACES missing")

    if BEGIN in text and END in text:
        pattern = re.compile(
            re.escape(BEGIN) + r'.*?' + re.escape(END) + r'\n',
            re.DOTALL,
        )
        text = pattern.sub(new_block, text, count=1)
    else:
        text = text[:close_idx] + new_block + text[close_idx:]

    # Remove IDs from HIKING_TRACE_GAPS (they now have geometry).
    new_ids = set(results.keys())
    text = re.sub(
        r"^  \{ id: '([^']+)', reason: [^}]+\},\n",
        lambda m: '' if m.group(1) in new_ids else m.group(0),
        text,
        flags=re.MULTILINE,
    )

    # Recompute HIKING_TRACE_SUMMARY.
    hiking_count = count_re(
        text,
        r'export const HIKING_TRACES:.*?\{(.*?)\n\};',
        r"(?:^|\n)\s*'[^']+': \{",
    )
    at_count = count_re(
        text,
        r'export const AT_SEGMENT_TRACES:.*?\{(.*?)\n\};',
        r"(?:^|\n)\s*'[^']+': \{",
    )
    gap_count = count_re(
        text,
        r'HIKING_TRACE_GAPS[^=]*=\s*\[(.*?)\];',
        r"\{\s*id:",
    )

    conf = {'high': 0, 'medium': 0, 'low': 0}
    for rx in [
        r'export const HIKING_TRACES:.*?\{(.*?)\n\};',
        r'export const AT_SEGMENT_TRACES:.*?\{(.*?)\n\};',
    ]:
        m = re.search(rx, text, flags=re.DOTALL)
        if not m:
            continue
        body = m.group(1)
        for mm in re.finditer(r"confidence:\s*'(high|medium|low)'", body):
            conf[mm.group(1)] += 1
    conf = {k: v for k, v in conf.items() if v > 0}

    geom = hiking_count + at_count
    by_conf_json = ('{'
                    + ', '.join(f'"{k}": {v}' for k, v in sorted(conf.items()))
                    + '} as const')
    new_summary = (
        'export const HIKING_TRACE_SUMMARY = {\n'
        f'  totalTrails: {geom + gap_count},\n'
        f'  withGeometry: {geom},\n'
        f'  withoutGeometry: {gap_count},\n'
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
    print(f'Wrote {TRACES_TS}:')
    print(f'  {len(results)} NPS traces spliced')
    print(f'  HIKING_TRACES: {hiking_count}, AT_SEGMENT_TRACES: {at_count}')
    print(f'  HIKING_TRACE_GAPS: {gap_count}')
    print(f'  Total with geometry: {geom}')
    print(f'  By confidence: {conf}')


if __name__ == '__main__':
    main()
