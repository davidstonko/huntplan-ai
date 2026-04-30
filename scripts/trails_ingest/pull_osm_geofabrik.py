#!/usr/bin/env python3
"""
pull_osm_geofabrik.py — Extracts named foot-trail polylines from a
Geofabrik Maryland OSM PBF extract and length-gates them against our
published mile values.

Target trails are the 15 IDs in raw/foot_only_trailheads.json (plus any
that currently ship as HIKING_TRACE_GAPS without geometry). For each,
we search OSM for named highway=(path|footway|track) ways whose name
fuzz-matches the target and whose midpoint lies within a radius of the
trailhead. Accepted polylines are length-gated to the 0.25-4.0 mile
ratio contract we use elsewhere (high confidence on 0.5-2.0).

Outputs raw/osm_foot_trails.json with polylines, confidence, and the
OSM way IDs used (for auditability).

Usage:
    python3 pull_osm_geofabrik.py /path/to/maryland.osm.pbf
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
FOOTONLY_PATH = SCRIPT_DIR / 'raw' / 'foot_only_trailheads.json'
GAPS_PATH = SCRIPT_DIR / 'raw' / 'trace_gaps.json'  # optional supplemental
OUT_PATH = SCRIPT_DIR / 'raw' / 'osm_foot_trails.json'
DATE_PULLED = '2026-04-19'

# Radius for candidate ways whose midpoint must lie within this many
# miles of the trailhead.
SEARCH_RADIUS_MI = 5.0

# Length-sanity gate: published length / OSM-measured length must be
# within this ratio to ship.
LENGTH_GATE_MIN = 0.25
LENGTH_GATE_MAX = 4.0

# High-confidence band (within this ratio ships as 'high'; otherwise
# 'medium' with isApproximate flag).
HIGH_CONFIDENCE_MIN = 0.5
HIGH_CONFIDENCE_MAX = 2.0


def norm(s: str) -> str:
    """Normalize for fuzzy string comparison."""
    if not s:
        return ''
    # Fold accents + lowercase + collapse punctuation/whitespace
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r"[^a-z0-9]+", ' ', s.lower())
    return s.strip()


# Per-trail matcher config. For each trail we list:
#   - the normalized name tokens that must ALL appear in the OSM name/ref
#   - optional alias patterns that imply a positive match
#   - an optional ref tag match (e.g. "AT" for Appalachian Trail spurs)
# Trail-type -> the "effective" published length the polyline should match.
# Out-and-back polylines show the one-way route on the map, so compare
# to published/2. Loops and point-to-point compare directly.
TRAIL_TYPE: dict[str, str] = {
    'md-maryland-heights-trail': 'loop',
    'md-at-annapolis-rocks': 'out-and-back',
    'md-at-weverton-cliffs': 'out-and-back',
    'md-calvert-cliffs-red-trail': 'out-and-back',
    'md-rocks-king-queen-seat': 'out-and-back',
    'md-rocks-kilgore-falls': 'out-and-back',
    'md-soldiers-delight-choate': 'loop',
    'md-seneca-creek-greenway': 'point-to-point',
    'md-gunpowder-hereford-north': 'out-and-back',
    'md-susquehanna-mason-dixon': 'out-and-back',
    'md-assateague-life-of-dunes': 'loop',
    'md-assateague-life-of-marsh': 'loop',
    'md-sugarloaf-mountain-loop': 'loop',
    'md-catoctin-cat-rock': 'out-and-back',
    'md-catoctin-chimney-rock': 'loop',
    'md-patapsco-mckeldin-switchback': 'loop',
}

MATCHERS: dict[str, dict[str, Any]] = {
    # Maryland Heights: OSM has the network broken into blaze-labeled
    # segments. Match by any blazed-trail family name.
    'md-maryland-heights-trail': {
        'must_contain_any': [
            ['maryland', 'heights'],
            ['overlook', 'cliff'],
            ['stone', 'fort'],
            ['combined', 'trail'],
            ['potomac', 'cliff'],
            ['valley', 'view'],
            ['woodpecker'],
            ['jefferson', 'rock', 'connector'],
        ],
        # Tight bbox so we don't pick up Loudoun Heights across the river
        'max_candidate_radius_mi': 1.5,
        'published_mi': 4.5,
    },
    # Annapolis Rocks spur: the approach is the AT itself from US-40
    # north. Restrict AT match to tight bbox around US-40 trailhead.
    'md-at-annapolis-rocks': {
        'must_contain_any': [
            ['annapolis', 'rocks'],
            ['appalachian', 'trail'],
            ['appalachian', 'national', 'scenic', 'trail'],
        ],
        'ref_in': ['at'],
        'max_candidate_radius_mi': 3.0,
        'published_mi': 5.2,
    },
    # Weverton Cliffs spur: AT for ~0.7mi one-way from US-340. Tight bbox.
    'md-at-weverton-cliffs': {
        'must_contain_any': [
            ['weverton', 'cliffs'],
            ['weverton'],
            ['appalachian', 'trail'],
            ['appalachian', 'national', 'scenic', 'trail'],
        ],
        'ref_in': ['at'],
        # Very tight so we only catch the spur, not 10 miles of AT.
        'max_candidate_radius_mi': 0.8,
        'published_mi': 1.4,
    },
    'md-calvert-cliffs-red-trail': {
        'must_contain_any': [
            ['red', 'trail'],
            ['calvert', 'cliffs'],
        ],
        # Rocks SP also has a Red Trail — keep bbox tight around
        # Calvert Cliffs SP.
        'max_candidate_radius_mi': 2.0,
        'published_mi': 3.6,
    },
    # King and Queen Seat is the "Blue Trail" per park signage at Rocks SP.
    'md-rocks-king-queen-seat': {
        'must_contain_any': [
            ['king', 'queen', 'seat'],
            ['blue', 'trail'],
        ],
        # Tight so we don't grab unrelated "Blue Trail" elsewhere.
        'max_candidate_radius_mi': 1.5,
        'published_mi': 1.2,
    },
    'md-rocks-kilgore-falls': {
        'must_contain_any': [
            ['kilgore', 'falls'],
            ['falling', 'branch'],
        ],
        'max_candidate_radius_mi': 3.0,
        'published_mi': 0.6,
    },
    'md-soldiers-delight-choate': {
        'must_contain_any': [
            ['choate', 'mine'],
            ['serpentine', 'trail'],
            ['soldiers', 'delight'],
        ],
        'max_candidate_radius_mi': 2.0,
        'published_mi': 2.1,
    },
    'md-seneca-creek-greenway': {
        'must_contain_any': [
            ['seneca', 'creek', 'greenway'],
            ['seneca', 'greenway'],
        ],
        'max_candidate_radius_mi': 12.0,
        'published_mi': 16.5,
    },
    # Gunpowder Hereford North: use Big Gunpowder or Gunpowder North;
    # exclude 'gunpowder trail' which matches too broadly (hits
    # Gunpowder South Trail several miles away — hence our 11mi result).
    'md-gunpowder-hereford-north': {
        'must_contain_any': [
            ['gunpowder', 'north'],
            ['gunpowder', 'hereford'],
            ['big', 'gunpowder', 'north'],
        ],
        'max_candidate_radius_mi': 3.0,
        'published_mi': 5.2,
    },
    'md-susquehanna-mason-dixon': {
        'must_contain_any': [
            ['mason', 'dixon'],
        ],
        'max_candidate_radius_mi': 6.0,
        'published_mi': 8.0,
    },
    'md-assateague-life-of-dunes': {
        'must_contain_any': [
            ['life', 'dunes'],
            ['life', 'of', 'the', 'dunes'],
        ],
        'max_candidate_radius_mi': 3.0,
        'published_mi': 1.0,
    },
    'md-assateague-life-of-marsh': {
        'must_contain_any': [
            ['life', 'marsh'],
            ['life', 'of', 'the', 'marsh'],
        ],
        'max_candidate_radius_mi': 3.0,
        'published_mi': 0.5,
    },
    'md-sugarloaf-mountain-loop': {
        'must_contain_any': [
            ['blue', 'trail'],
            ['sugarloaf', 'mountain'],
            ['northern', 'peaks'],
        ],
        'max_candidate_radius_mi': 2.5,
        'published_mi': 5.5,
    },
    # Cat Rock: accept just "Cat Rock Trail" OSM way; length gate is
    # relaxed because the named way might be one segment of the
    # out-and-back approach.
    'md-catoctin-cat-rock': {
        'must_contain_any': [
            ['cat', 'rock'],
        ],
        'max_candidate_radius_mi': 2.0,
        'published_mi': 3.4,
    },
    # Chimney Rock / Wolf Rock: OSM has the surrounding trails unnamed
    # (just colored blazes). We cannot cleanly match by name, so leave
    # this as a trailhead-only entry; explicitly skip by setting an
    # empty matcher.
    'md-catoctin-chimney-rock': {
        'must_contain_any': [
            ['chimney', 'rock'],
            ['wolf', 'rock'],
        ],
        'max_candidate_radius_mi': 1.5,
        'published_mi': 3.5,
    },
    # Patapsco McKeldin area: the "Switchback Loop" published at ~2.8mi.
    # OSM labels it 'Switchback Trail' with surrounding named MTB segments.
    # Tight bbox so we don't cross the river into Plantation Trail mess.
    'md-patapsco-mckeldin-switchback': {
        'must_contain_any': [
            ['switchback', 'trail'],
            ['switchback'],
        ],
        'max_candidate_radius_mi': 1.0,
        'published_mi': 2.8,
    },
}


def haversine_mi(p1: tuple[float, float], p2: tuple[float, float]) -> float:
    R = 3958.7613  # miles
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


def matches_trail(trail_id: str, name: str | None, ref: str | None) -> bool:
    m = MATCHERS[trail_id]
    n_name = norm(name or '')
    n_ref = norm(ref or '')

    # If ref match is specified and present, use either name or ref logic.
    if 'ref_in' in m and n_ref and n_ref in m['ref_in']:
        # AT-refs match even if name doesn't include all tokens — the
        # bbox filter downstream will narrow to our 1.4mi / 5.2mi spans.
        return True

    if not n_name:
        return False

    for tokens in m['must_contain_any']:
        if all(tok in n_name for tok in tokens):
            return True
    return False


class WayCollector(osmium.SimpleHandler):
    """Two-pass approach: first collect candidate way node refs, then
    resolve nodes. osmium's SimpleHandler doesn't give us locations for
    ways unless we add a NodeLocationsForWays index — we do that via
    apply() in main()."""

    def __init__(self, matchers: dict[str, dict[str, Any]]) -> None:
        super().__init__()
        self.matchers = matchers
        # Per-trail: list of (way_id, name, ref, coords)
        self.candidates: dict[str, list[dict[str, Any]]] = {k: [] for k in matchers}

    def way(self, w: Any) -> None:
        tags = dict(w.tags)
        highway = tags.get('highway')
        if highway not in ('path', 'footway', 'track', 'pedestrian'):
            return
        name = tags.get('name')
        ref = tags.get('ref')
        if not name and not ref:
            return

        # Try each matcher. A way could match multiple trails; we keep
        # it under each.
        for trail_id in self.matchers:
            if matches_trail(trail_id, name, ref):
                # Build coord list from the way's locations.
                try:
                    coords = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
                except Exception:
                    continue
                if len(coords) < 2:
                    continue
                self.candidates[trail_id].append({
                    'way_id': w.id,
                    'name': name,
                    'ref': ref,
                    'coords': coords,
                })


def midpoint(coords: list[tuple[float, float]]) -> tuple[float, float]:
    lat = sum(c[1] for c in coords) / len(coords)
    lon = sum(c[0] for c in coords) / len(coords)
    return (lat, lon)


def join_ways(ways: list[dict[str, Any]]) -> list[tuple[float, float]]:
    """Greedy endpoint-join: start with longest way, append the
    nearest-endpoint neighbor until none are near enough. Used for
    multi-way trails (e.g., Seneca Creek Greenway = many segments).

    Returns [(lon, lat), ...] ordered end-to-end.
    """
    if not ways:
        return []
    if len(ways) == 1:
        return ways[0]['coords']

    # Sort by length desc
    ways = sorted(ways, key=lambda w: -polyline_length_mi([(c[1], c[0]) for c in w['coords']]))
    path = list(ways[0]['coords'])
    remaining = ways[1:]

    def dist(a: tuple[float, float], b: tuple[float, float]) -> float:
        # haversine_mi takes (lat, lon) but coords are (lon, lat) —
        # swap.
        return haversine_mi((a[1], a[0]), (b[1], b[0]))

    while remaining:
        best = None
        best_d = float('inf')
        best_flip = False
        best_prepend = False
        head, tail = path[0], path[-1]
        for i, w in enumerate(remaining):
            c = w['coords']
            # Try tail-to-head
            d1 = dist(tail, c[0])
            d2 = dist(tail, c[-1])
            d3 = dist(head, c[0])
            d4 = dist(head, c[-1])
            for d, flip, prep in [(d1, False, False), (d2, True, False),
                                   (d3, True, True), (d4, False, True)]:
                if d < best_d:
                    best_d = d
                    best = i
                    best_flip = flip
                    best_prepend = prep

        # Cap connector gap — if more than 0.25 mi, stop joining (we've
        # probably got disjoint segments).
        if best_d > 0.25 or best is None:
            break

        w = remaining.pop(best)
        c = list(w['coords'])
        if best_flip:
            c.reverse()
        if best_prepend:
            path = c + path
        else:
            path = path + c

    return path


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: pull_osm_geofabrik.py <maryland.osm.pbf>')
        sys.exit(1)
    pbf = sys.argv[1]

    footonly = json.loads(FOOTONLY_PATH.read_text())
    trails_by_id = {t['id']: t for t in footonly['trails']}

    print(f'Loading {pbf}...')
    collector = WayCollector(MATCHERS)
    # location_storage='flex_mem' stores node locations in memory as
    # we scan; required so way.nodes have valid locations.
    collector.apply_file(pbf, locations=True, idx='flex_mem')

    print('Scan complete.')
    for trail_id in MATCHERS:
        n = len(collector.candidates[trail_id])
        print(f'  {trail_id}: {n} candidate way(s)')

    # Now filter each candidate set by bbox around trailhead + length gate.
    results: dict[str, dict[str, Any]] = {}
    for trail_id, cand_list in collector.candidates.items():
        target = trails_by_id[trail_id]
        th_lat = target['trailheadLat']
        th_lon = target['trailheadLon']
        published = MATCHERS[trail_id]['published_mi']
        radius = MATCHERS[trail_id].get('max_candidate_radius_mi', SEARCH_RADIUS_MI)

        # Effective polyline length: one-way for out-and-back, full for
        # loops and point-to-point.
        trail_type = TRAIL_TYPE.get(trail_id, 'loop')
        effective_published = published / 2 if trail_type == 'out-and-back' else published

        # Filter by midpoint within per-trail search radius
        nearby = []
        for c in cand_list:
            mid = midpoint(c['coords'])  # returns (lat, lon)
            d = haversine_mi(mid, (th_lat, th_lon))
            if d <= radius:
                c['mid_dist_mi'] = d
                nearby.append(c)

        if not nearby:
            print(f'  [SKIP] {trail_id}: 0 candidates within {radius}mi of trailhead')
            continue

        # Join and measure
        joined = join_ways(nearby)
        # Convert (lon, lat) to (lat, lon) for haversine
        coords_ll = [(c[1], c[0]) for c in joined]
        measured_mi = polyline_length_mi(coords_ll)

        ratio = measured_mi / effective_published if effective_published > 0 else 0
        if not (LENGTH_GATE_MIN <= ratio <= LENGTH_GATE_MAX):
            print(f'  [SKIP] {trail_id}: length ratio {ratio:.2f} outside gate '
                  f'({measured_mi:.2f}mi measured vs {effective_published:.2f}mi '
                  f'effective ({trail_type}, published={published}mi))')
            continue

        if HIGH_CONFIDENCE_MIN <= ratio <= HIGH_CONFIDENCE_MAX:
            confidence = 'high'
            is_approx = False
        else:
            confidence = 'medium'
            is_approx = True

        way_ids = [c['way_id'] for c in nearby]
        results[trail_id] = {
            'id': trail_id,
            'name': target['name'],
            'coordinates': joined,
            'lengthMi': round(measured_mi, 2),
            'publishedMi': published,
            'effectivePublishedMi': round(effective_published, 2),
            'trailType': trail_type,
            'ratio': round(ratio, 2),
            'confidence': confidence,
            'isApproximate': is_approx,
            'source': 'OpenStreetMap (Geofabrik Maryland extract)',
            'sourceUrl': f'https://www.openstreetmap.org/way/{way_ids[0]}',
            'datePulled': DATE_PULLED,
            'wayIds': way_ids,
            'wayCount': len(nearby),
        }
        print(f'  [OK]   {trail_id}: {measured_mi:.2f}mi ({ratio:.2f}x of '
              f'{effective_published:.2f}mi {trail_type}) '
              f'via {len(nearby)} way(s), confidence={confidence}')

    # Write output
    OUT_PATH.write_text(json.dumps({'results': results}, indent=2))
    print(f'\nWrote {OUT_PATH}: {len(results)} / {len(MATCHERS)} trails')


if __name__ == '__main__':
    main()
