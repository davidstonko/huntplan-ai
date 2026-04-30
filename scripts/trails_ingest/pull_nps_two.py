#!/usr/bin/env python3
"""
pull_nps_two.py — Pull polylines for the 2 trails OSM couldn't provide:
  - md-assateague-life-of-dunes (NPS ASIS)
  - md-catoctin-chimney-rock    (NPS CATO)

Uses the public NPS ArcGIS FeatureServer at services2.arcgis.com
(mapservices.nps.gov was 500-ing 2026-04-19).

Writes raw/nps_foot_trails.json with the same shape that emit_ts_osm.py
expects (id → { id, name, lengthMi, publishedMi, effectivePublishedMi,
confidence, isApproximate, source, sourceUrl, datePulled, coordinates }).
"""
from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR / 'raw'
OUT = RAW_DIR / 'nps_foot_trails.json'

NPS_FS = (
    'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/'
    'National_Park_Service_Trails/FeatureServer/0/query'
)

TARGETS = {
    'md-assateague-life-of-dunes': {
        'name': 'Life of the Dunes Trail',
        'where': "UNITCODE='ASIS' AND TRLNAME LIKE '%Life of the Dunes%'",
        # Stored trailhead was ~3.5mi off; NPS geometry puts the trail
        # start at 38.1904, -75.1594 (MD section, dune side of bay).
        'trailhead': (38.1904, -75.1594),
        'max_feature_midpoint_mi': 1.5,
        'type': 'loop',        # ship as one-way polyline; lengthMi = publishedMi
        'published_mi': 1.0,
    },
    'md-catoctin-chimney-rock': {
        'name': 'Chimney Rock & Wolf Rock Loop',
        # Only take features whose MAPLABEL is the Chimney Rock/Wolf Rock
        # loop label; TRLNAME alone matches the longer TR-1 system that
        # extends far from the visitor center.
        'where': ("UNITCODE='CATO' AND TRLNAME LIKE "
                  "'%Chimney Rock%Wolf Rock%'"),
        'trailhead': (39.64, -77.4481),
        'max_feature_midpoint_mi': 1.25,
        'type': 'loop',
        'published_mi': 3.5,
    },
}


def hav(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.7613
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    dlat = lat2r - lat1r
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def poly_len(coords: list[list[float]]) -> float:
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(coords, coords[1:]):
        total += hav(lat1, lon1, lat2, lon2)
    return total


def fetch_geojson(where: str) -> dict:
    params = {
        'where': where,
        'outFields': 'TRLNAME,TRLALTNAME,MAPLABEL,UNITCODE',
        'f': 'geojson',
        'returnGeometry': 'true',
        'outSR': '4326',
    }
    url = NPS_FS + '?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=45) as r:
        return json.loads(r.read())


def flatten_feature(feat: dict) -> list[list[list[float]]]:
    g = feat.get('geometry') or {}
    t = g.get('type')
    if t == 'LineString':
        return [g['coordinates']]
    if t == 'MultiLineString':
        return list(g['coordinates'])
    return []


def join_greedy(segments: list[list[list[float]]]) -> list[list[float]]:
    """Greedy nearest-endpoint join — same algorithm used by the OSM
    puller. Input: list of [ [lon,lat], ... ] segments. Output: one
    connected polyline."""
    if not segments:
        return []
    segs = [list(s) for s in segments if len(s) >= 2]
    if not segs:
        return []
    path = segs.pop(0)
    changed = True
    while segs and changed:
        changed = False
        best_i, best_dist, best_orient = None, float('inf'), None
        tail = path[-1]
        for i, s in enumerate(segs):
            d_head = hav(tail[1], tail[0], s[0][1], s[0][0])
            d_tail = hav(tail[1], tail[0], s[-1][1], s[-1][0])
            if d_head < best_dist:
                best_dist, best_i, best_orient = d_head, i, 'head'
            if d_tail < best_dist:
                best_dist, best_i, best_orient = d_tail, i, 'tail'
        if best_i is not None and best_dist < 0.1:  # < ~528 ft gap
            s = segs.pop(best_i)
            if best_orient == 'tail':
                s = list(reversed(s))
            # Dedupe shared endpoint
            if path[-1] == s[0]:
                path.extend(s[1:])
            else:
                path.extend(s)
            changed = True
    return path


def process(tid: str, cfg: dict) -> dict | None:
    print(f'\n--- {tid}: {cfg["name"]} ---')
    gj = fetch_geojson(cfg['where'])
    feats = gj.get('features', []) or []
    print(f'  API returned {len(feats)} features')
    # Filter by midpoint distance from trailhead
    keep: list[list[list[float]]] = []
    tlat, tlon = cfg['trailhead']
    for f in feats:
        for seg in flatten_feature(f):
            if len(seg) < 2:
                continue
            # mean point
            mlat = sum(p[1] for p in seg) / len(seg)
            mlon = sum(p[0] for p in seg) / len(seg)
            d = hav(mlat, mlon, tlat, tlon)
            if d <= cfg['max_feature_midpoint_mi']:
                keep.append(seg)
    print(f'  {len(keep)} segments within {cfg["max_feature_midpoint_mi"]}mi of trailhead')
    if not keep:
        print('  → no usable segments; skipping.')
        return None
    path = join_greedy(keep)
    if len(path) < 2:
        return None
    length = poly_len(path)
    pub = cfg['published_mi']
    # Length-sanity gate (same contract as OSM pipeline).
    # For 'loop' we compare polyline length vs published (should be ~1:1).
    ratio = length / pub if pub else 0.0
    if ratio < 0.25 or ratio > 4.0:
        print(f'  ✗ length {length:.2f}mi vs published {pub}mi '
              f'(ratio {ratio:.2f}) — OUT OF GATE, skip.')
        return None
    if 0.5 <= ratio <= 2.0:
        conf, approx = 'high', False
    else:
        conf, approx = 'medium', True
    print(f'  ✓ {length:.2f}mi vs pub {pub}mi (ratio {ratio:.2f}) '
          f'→ conf={conf} approx={approx} ({len(path)} pts)')
    return {
        'id': tid,
        'name': cfg['name'],
        'lengthMi': round(length, 3),
        'publishedMi': pub,
        'effectivePublishedMi': pub,  # loop: same as publishedMi
        'confidence': conf,
        'isApproximate': approx,
        'source': 'nps_arcgis',
        'sourceUrl': (
            'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/'
            'services/National_Park_Service_Trails/FeatureServer/0'),
        'datePulled': '2026-04-19',
        'coordinates': path,
    }


def main() -> None:
    results: dict[str, dict] = {}
    for tid, cfg in TARGETS.items():
        r = process(tid, cfg)
        if r:
            results[tid] = r
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'results': results}, indent=2))
    print(f'\nWrote {OUT}: {len(results)} trails')


if __name__ == '__main__':
    main()
