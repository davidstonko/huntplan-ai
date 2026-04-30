#!/usr/bin/env python3
"""
emit_ts_footonly.py — Appends curated foot-only trailhead entries
(coordinates:null) into MARYLAND_STATE_PARK_TRAILS.

Reads raw/foot_only_trailheads.json and splices the entries between
idempotent sentinels, inserted *before* the closing `];`. Re-running
replaces the prior block rather than stacking duplicates.

These trails lack publishable polylines — USGS Layer 37 has gaps for
foot trails and OSM Overpass 504'd on our queries 2026-04-19 — so
users get a pin + metadata only. When reliable GeoJSON becomes
available we can replace these entries with polylined versions.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
FOOTONLY_PATH = SCRIPT_DIR / 'raw' / 'foot_only_trailheads.json'
TRAILS_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandStateParkTrails.ts'

BEGIN = '  // ── BEGIN FOOT-ONLY TRAILHEADS (2026-04-19) ──'
END   = '  // ── END FOOT-ONLY TRAILHEADS ──'


def q(s: str | None) -> str:
    """Emit a TS single-quoted string literal (or `null`)."""
    if s is None:
        return 'null'
    esc = s.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{esc}'"


def arr(xs: list[str] | None) -> str:
    if not xs:
        return '[]'
    return '[' + ', '.join(q(x) for x in xs) + ']'


def fmt_trail(t: dict) -> str:
    lines = []
    lines.append('  {')
    lines.append(f"    id: {q(t['id'])},")
    lines.append(f"    name: {q(t['name'])},")
    lines.append(f"    park: {q(t['park'])},")
    lines.append(f"    county: {q(t['county'])},")
    lines.append(f"    type: {q(t['type'])},")
    lines.append(f"    difficulty: {q(t['difficulty'])},")
    lines.append(f"    lengthMi: {t['lengthMi']},")
    lines.append(f"    elevationGainFt: {t['elevationGainFt']},")
    lines.append(f"    estDurationMin: {t['estDurationMin']},")
    lines.append(f"    dogFriendly: {'true' if t['dogFriendly'] else 'false'},")
    lines.append(f"    seasonOpenMonth: null,")
    lines.append(f"    seasonCloseMonth: null,")
    lines.append(f"    trailheadLat: {t['trailheadLat']},")
    lines.append(f"    trailheadLon: {t['trailheadLon']},")
    lines.append(f"    coordinates: null,")
    lines.append(f"    description: {q(t['description'])},")
    lines.append(f"    tags: {arr(t['tags'])},")
    lines.append(f"    highlights: {arr(t.get('highlights'))},")
    lines.append(f"    officialUrl: {q(t.get('officialUrl'))},")
    lines.append(f"    parkingNotes: {q(t.get('parkingNotes'))},")
    lines.append('  },')
    return '\n'.join(lines)


def main() -> None:
    data = json.loads(FOOTONLY_PATH.read_text())
    trails = data['trails']

    block_body = '\n'.join(fmt_trail(t) for t in trails)
    block = f"{BEGIN}\n{block_body}\n{END}\n"

    text = TRAILS_TS.read_text()
    if BEGIN in text and END in text:
        pattern = re.compile(
            re.escape(BEGIN) + r'.*?' + re.escape(END) + r'\n',
            re.DOTALL,
        )
        text = pattern.sub(block, text, count=1)
    else:
        # Insert before the LAST closing `];` (array terminator).
        idx = text.rfind('];')
        if idx == -1:
            raise RuntimeError('Could not find `];` in marylandStateParkTrails.ts')
        text = text[:idx] + block + text[idx:]

    TRAILS_TS.write_text(text)
    print(f'Wrote {TRAILS_TS} (appended {len(trails)} foot-only trailhead entries)')


if __name__ == '__main__':
    main()
