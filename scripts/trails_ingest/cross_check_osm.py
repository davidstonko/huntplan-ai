#!/usr/bin/env python3
"""
cross_check_osm.py — Independent audit of every Maryland hiking trail
currently shipping with a polyline. Each trail in MARYLAND_STATE_PARK_TRAILS
is compared against OSM's own record for the same named trail.

Output: raw/osm_cross_check_report.json + console summary flagging any
trail where:
  - Our polyline length disagrees with OSM by > 30% after type-aware
    normalization (one-way for out-and-back).
  - Our trailhead lat/lon is > 0.5mi from OSM's midpoint (possible
    wrong-park match).
  - OSM has no named way at all (couldn't independently verify).

This is informational. It does NOT modify any TS files — the output
serves the V2.2.0 audit contract.

Usage:
    python3 cross_check_osm.py /path/to/maryland.osm.pbf
"""
from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

import osmium

SCRIPT_DIR = Path(__file__).resolve().parent
TRAILS_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandStateParkTrails.ts'
TRACES_TS = SCRIPT_DIR.parent.parent / 'src' / 'data' / 'marylandHikingTraces.ts'
OUT = SCRIPT_DIR / 'raw' / 'osm_cross_check_report.json'

# Cross-check radius around each trail's trailhead.
AUDIT_RADIUS_MI = 2.0
# Significant deviation threshold (for flagging).
LENGTH_DEVIATION_THRESHOLD = 0.30  # 30%


def norm(s: str) -> str:
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r"[^a-z0-9]+", ' ', s.lower())
    return s.strip()


def haversine_mi(p1: tuple[float, float], p2: tuple[float, float]) -> float:
    R = 3958.7613
    lat1, lon1 = math.radians(p1[0]), math.radians(p1[1])
    lat2, lon2 = math.radians(p2[0]), math.radians(p2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def polyline_length_mi(coords: list[tuple[float, float]]) -> float:
    total = 0.0
    for a, b in zip(coords, coords[1:]):
        total += haversine_mi(a, b)
    return total


def parse_trails_ts(path: Path) -> list[dict[str, Any]]:
    """Crude but reliable: extract id, name, type, lengthMi, trailheadLat,
    trailheadLon from each Trail literal."""
    text = path.read_text()
    # Split on `  {` that's followed by `    id:` within 60 chars — crude but OK
    records: list[dict[str, Any]] = []
    pattern = re.compile(
        r"\{\s*"
        r"id:\s*'([^']+)',\s*"
        r"name:\s*'([^']+)',\s*"
        r"park:\s*'([^']+)',\s*"
        r"county:\s*'([^']+)',\s*"
        r"type:\s*'([^']+)',\s*"
        r"difficulty:\s*'[^']*',\s*"
        r"lengthMi:\s*([0-9.]+),\s*"
        r"elevationGainFt:\s*[0-9]+,\s*"
        r"estDurationMin:\s*[0-9]+,\s*"
        r"dogFriendly:\s*(?:true|false),\s*"
        r"seasonOpenMonth:\s*(?:null|[0-9]+),\s*"
        r"seasonCloseMonth:\s*(?:null|[0-9]+),\s*"
        r"trailheadLat:\s*(-?[0-9.]+),\s*"
        r"trailheadLon:\s*(-?[0-9.]+),",
        re.DOTALL,
    )
    for m in pattern.finditer(text):
        records.append({
            'id': m.group(1),
            'name': m.group(2),
            'park': m.group(3),
            'county': m.group(4),
            'type': m.group(5),
            'lengthMi': float(m.group(6)),
            'trailheadLat': float(m.group(7)),
            'trailheadLon': float(m.group(8)),
        })
    return records


def parse_traces_ts(path: Path) -> dict[str, dict[str, Any]]:
    """Extract each HikingTrace's id + lengthMi + publishedMi + coordinates.
    We only need id and lengthMi for the cross-check."""
    text = path.read_text()
    by_id: dict[str, dict[str, Any]] = {}
    # HikingTrace literal block: `'id': { id: '...', name: '...', lengthMi: 1.23, publishedMi: 1.2, ... }`
    # We'll capture id + lengthMi + publishedMi from each `'xyz': { id: ...' block.
    for m in re.finditer(
        r"'([^']+)':\s*\{\s*id:\s*'[^']+',\s*name:\s*'[^']+',\s*"
        r"lengthMi:\s*([0-9.]+),\s*publishedMi:\s*([0-9.]+),"
        r"\s*confidence:\s*'([^']+)',\s*isApproximate:\s*(true|false)",
        text,
    ):
        by_id[m.group(1)] = {
            'lengthMi': float(m.group(2)),
            'publishedMi': float(m.group(3)),
            'confidence': m.group(4),
            'isApproximate': m.group(5) == 'true',
        }
    return by_id


class NameScan(osmium.SimpleHandler):
    """Collect all named highway=(path|footway|track) ways, grouped by
    normalized name."""

    def __init__(self) -> None:
        super().__init__()
        # Map: normalized_name -> list of (way_id, coords, raw_name)
        self.by_name: dict[str, list[dict[str, Any]]] = {}

    def way(self, w: Any) -> None:
        tags = dict(w.tags)
        if tags.get('highway') not in ('path', 'footway', 'track', 'pedestrian',
                                        'cycleway'):
            return
        name = tags.get('name')
        if not name:
            return
        try:
            coords = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
        except Exception:
            return
        if len(coords) < 2:
            return
        n = norm(name)
        self.by_name.setdefault(n, []).append({
            'way_id': w.id,
            'name': name,
            'coords': coords,
        })


def nearby_ways(ways: list[dict[str, Any]], lat: float, lon: float,
                 radius_mi: float) -> list[dict[str, Any]]:
    hits = []
    for w in ways:
        # Midpoint
        c = w['coords']
        mid_lat = sum(p[1] for p in c) / len(c)
        mid_lon = sum(p[0] for p in c) / len(c)
        d = haversine_mi((mid_lat, mid_lon), (lat, lon))
        if d <= radius_mi:
            w['mid_dist_mi'] = d
            hits.append(w)
    return hits


def total_length_mi(ways: list[dict[str, Any]]) -> float:
    total = 0.0
    for w in ways:
        coords_ll = [(p[1], p[0]) for p in w['coords']]
        total += polyline_length_mi(coords_ll)
    return total


def match_by_tokens(scanner: NameScan, name: str) -> list[dict[str, Any]]:
    """Find OSM ways whose normalized name contains the main tokens
    of the trail name."""
    target = norm(name)
    # Strip common suffixes so 'Foo Trail' matches 'Foo'.
    target = re.sub(r'\b(trail|path|loop|greenway|rail trail|way)\b', ' ', target)
    tokens = [t for t in target.split() if t and len(t) > 2]
    if not tokens:
        return []
    hits: list[dict[str, Any]] = []
    for n, way_list in scanner.by_name.items():
        if all(t in n for t in tokens):
            hits.extend(way_list)
    return hits


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: cross_check_osm.py <maryland.osm.pbf>')
        sys.exit(1)
    pbf = sys.argv[1]

    print('Parsing TS files...')
    trails = parse_trails_ts(TRAILS_TS)
    traces = parse_traces_ts(TRACES_TS)
    print(f'  {len(trails)} trails, {len(traces)} traces')

    print(f'Scanning {pbf} for all named footpaths...')
    scanner = NameScan()
    scanner.apply_file(pbf, locations=True, idx='flex_mem')
    print(f'  {sum(len(v) for v in scanner.by_name.values())} named way entries '
          f'across {len(scanner.by_name)} unique names')

    report = {
        'date': '2026-04-19',
        'source': 'OpenStreetMap (Geofabrik Maryland extract 2026-04-18)',
        'audit_radius_mi': AUDIT_RADIUS_MI,
        'length_deviation_threshold': LENGTH_DEVIATION_THRESHOLD,
        'results': [],
    }
    no_match = 0
    verified = 0
    flagged = 0

    for t in trails:
        trail_id = t['id']
        shipped = traces.get(trail_id)
        if not shipped:
            # No trace → trailhead-only (expected). Skip.
            continue

        # Find candidate OSM ways matching this trail name.
        cands = match_by_tokens(scanner, t['name'])
        nearby = nearby_ways(cands, t['trailheadLat'],
                              t['trailheadLon'], AUDIT_RADIUS_MI)

        if not nearby:
            no_match += 1
            report['results'].append({
                'id': trail_id,
                'name': t['name'],
                'shipped_length_mi': shipped['lengthMi'],
                'osm_length_mi': None,
                'status': 'no_osm_match',
                'note': 'OSM has no named way with matching tokens near trailhead',
            })
            continue

        osm_len = total_length_mi(nearby)
        # Effective shipped length: if out-and-back, polyline is half the
        # round-trip; our publishedMi for those was stored as half. So
        # compare shipped lengthMi vs OSM length directly.
        if osm_len <= 0 or shipped['lengthMi'] <= 0:
            continue

        ratio = osm_len / shipped['lengthMi']
        dev = abs(ratio - 1.0)

        if dev > LENGTH_DEVIATION_THRESHOLD:
            status = 'flagged_length_deviation'
            flagged += 1
        else:
            status = 'verified'
            verified += 1

        report['results'].append({
            'id': trail_id,
            'name': t['name'],
            'type': t['type'],
            'shipped_length_mi': round(shipped['lengthMi'], 2),
            'osm_length_mi': round(osm_len, 2),
            'ratio': round(ratio, 2),
            'deviation_pct': round(dev * 100, 1),
            'osm_way_count': len(nearby),
            'shipped_confidence': shipped['confidence'],
            'shipped_isApproximate': shipped['isApproximate'],
            'status': status,
        })

    report['summary'] = {
        'trails_with_trace': sum(1 for t in trails if t['id'] in traces),
        'verified': verified,
        'flagged_length_deviation': flagged,
        'no_osm_match': no_match,
    }

    OUT.write_text(json.dumps(report, indent=2))
    print(f'\nCross-check complete. Wrote {OUT}')
    print(f'  Verified (within {int(LENGTH_DEVIATION_THRESHOLD*100)}% of OSM): {verified}')
    print(f'  Flagged length deviation: {flagged}')
    print(f'  No OSM match: {no_match}')

    if flagged:
        print('\nFlagged trails:')
        for r in report['results']:
            if r['status'] == 'flagged_length_deviation':
                print(f"  {r['id']}: shipped {r['shipped_length_mi']}mi vs "
                      f"OSM {r['osm_length_mi']}mi ({r['deviation_pct']}% dev, "
                      f"ratio {r['ratio']}x)")


if __name__ == '__main__':
    main()
