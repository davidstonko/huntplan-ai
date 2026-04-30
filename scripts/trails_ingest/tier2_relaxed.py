#!/usr/bin/env python3
"""
Tier-2 fallback: relaxed Overpass sweep for the 8 trails Tier-1 couldn't match.

When Tier-1 (name-gated Overpass + USGS Layer 37 + USGS National Trails)
returns no candidate, we fall back to OSM as a geometry-only source:

  - Query all paths/footways/tracks within a slightly wider bbox
  - Keep only ways whose length is within 0.5x-2.0x of the published length
  - If any untagged candidate overlaps with the trailhead within 500 m, pick
    the longest one that fits the length window
  - Anything found this way is marked:
      source: "osm_overpass_tier2_relaxed"
      confidence: "low"
      is_approximate: true

Does NOT fabricate geometry — if relaxed OSM still returns nothing, the trail
stays "none" and the TypeScript layer will render a trailhead pin only, with
the dashed-amber approximate-boundary UX contract.

Usage: `python3 tier2_relaxed.py` (resumable via per-trail result files).
"""
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT_DIR = Path(__file__).parent
RESULTS_DIR = OUT_DIR / "raw" / "results"
# Multiple mirrors — if one 504s or 429s, try the next. Sleep between calls to
# avoid rate-limit traps.
OVERPASS_MIRRORS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
UA = "mdhuntfish-trail-ingest-tier2/1.1 (contact: dstonko1@gmail.com)"

# The 8 Tier-1 gaps — pulled from the current ingested_trails.json state.
# (id, trailhead lat, trailhead lon, widened half-deg, published_mi)
# Wider half-deg (0.03-0.04°) than Tier-1 to catch trails whose trailhead is
# slightly offset from the OSM way start.
TIER2_SPECS = [
    ("md-cunningham-falls-loop", 39.5701, -77.4645, 0.035, 0.5),
    ("md-patapsco-mckeldin-switchback", 39.3618, -76.8876, 0.035, 3.8),
    ("md-patapsco-orange", 39.2310, -76.7487, 0.035, 3.1),
    ("md-rock-creek-valley", 39.1063, -77.1144, 0.045, 5.0),
    ("md-rocky-gap-ridge", 39.7050, -78.6600, 0.045, 7.0),
    ("md-deep-creek-lake-discovery", 39.5210, -79.3017, 0.030, 1.2),
    ("md-gambrill-rock-overlook", 39.4754, -77.4937, 0.030, 1.3),
    ("md-gambrill-lake", 39.4780, -77.4920, 0.030, 2.0),
]

MAX_PER_RUN = int(os.environ.get("MAX_PER_RUN", "8"))


def haversine_m(a, b):
    lon1, lat1 = a
    lon2, lat2 = b
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def polyline_length_m(coords):
    return sum(haversine_m(coords[i], coords[i + 1]) for i in range(len(coords) - 1))


def overpass_post(body, timeout=50):
    """Try each mirror in turn; one attempt each, long between-mirror wait."""
    last = None
    for mirror in OVERPASS_MIRRORS:
        try:
            req = urllib.request.Request(mirror, data=body, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                print(f"    overpass OK via {mirror.split('/')[2]}", flush=True)
                return r.read()
        except Exception as e:
            last = f"{mirror}: {e}"
            print(f"    overpass FAIL {mirror.split('/')[2]}: {e}", flush=True)
            time.sleep(6)  # polite pause between mirrors
    raise RuntimeError(f"All Overpass mirrors failed. Last: {last}")


def relaxed_overpass(lat, lon, half):
    """All path/footway/track ways in bbox, regardless of name."""
    s, n, w, e = lat - half, lat + half, lon - half, lon + half
    q = (
        f"[out:json][timeout:30];"
        f"(way[\"highway\"~\"path|footway|track\"]({s},{w},{n},{e});"
        f" way[\"foot\"=\"yes\"]({s},{w},{n},{e});"
        f");"
        f" out geom tags;"
    )
    body = urllib.parse.urlencode({"data": q}).encode()
    raw = overpass_post(body, timeout=60)
    data = json.loads(raw)
    ways = []
    for el in data.get("elements", []):
        if el.get("type") != "way":
            continue
        nds = el.get("geometry", [])
        if len(nds) < 2:
            continue
        poly = [[round(p["lon"], 6), round(p["lat"], 6)] for p in nds]
        ways.append({
            "osm_id": el.get("id"),
            "name": el.get("tags", {}).get("name"),
            "polyline": poly,
            "length_mi": polyline_length_m(poly) / 1609.344,
            "tags": el.get("tags", {}),
        })
    return ways


def tier2_for_spec(spec):
    tid, lat, lon, half, pub_mi = spec
    out_path = RESULTS_DIR / f"{tid}.json"
    if not out_path.exists():
        print(f"  [{tid}] Tier-1 result missing — skipping")
        return None
    with open(out_path) as f:
        existing = json.load(f)
    if existing.get("confidence") != "none":
        print(f"  [{tid}] Tier-1 confidence={existing.get('confidence')} — skipping")
        return existing

    print(f"  [{tid}] Tier-2 relaxed Overpass (bbox ±{half}°, pub {pub_mi}mi)")
    try:
        ways = relaxed_overpass(lat, lon, half)
    except Exception as e:
        existing["tier2_error"] = f"overpass: {e}"
        save(tid, existing)
        return existing

    print(f"    → {len(ways)} candidate ways returned")
    existing["tier2_source"] = "osm_overpass_relaxed"
    existing["tier2_candidates"] = len(ways)

    # Filter to length window 0.5-2.0x published
    lo, hi = 0.5 * pub_mi, 2.0 * pub_mi
    candidates = [w for w in ways if lo <= w["length_mi"] <= hi]
    print(f"    → {len(candidates)} fit length window {lo:.2f}-{hi:.2f} mi")

    # Require the way to come within 500 m of the trailhead
    near = []
    for w in candidates:
        best = min(haversine_m((lon, lat), v) for v in w["polyline"])
        if best <= 500:
            w["_nearest_m"] = round(best, 1)
            near.append(w)
    print(f"    → {len(near)} within 500m of trailhead")

    if not near:
        existing["tier2_chose"] = None
        existing["tier2_note"] = "no relaxed OSM candidate fit length+proximity"
        save(tid, existing)
        return existing

    # Prefer longest fitting way (more complete geometry)
    near.sort(key=lambda w: -w["length_mi"])
    best = near[0]
    existing["chosen"] = {
        "name": best.get("name") or f"approximate footpath @ trailhead (Tier-2)",
        "polyline": best["polyline"],
        "length_m": round(polyline_length_m(best["polyline"]), 1),
        "length_mi": round(best["length_mi"], 3),
        "published_mi": pub_mi,
        "source": "osm_overpass_tier2_relaxed",
        "source_osm_id": best.get("osm_id"),
        "source_tags": best.get("tags"),
        "trailhead_distance_m": best.get("_nearest_m"),
    }
    existing["confidence"] = "low"
    existing["is_approximate"] = True
    existing["error"] = None
    existing["tier2_chose"] = {
        "osm_id": best.get("osm_id"),
        "length_mi": round(best["length_mi"], 3),
        "trailhead_distance_m": best.get("_nearest_m"),
    }
    print(f"    → chose OSM id={best.get('osm_id')} length={best['length_mi']:.2f}mi dist={best.get('_nearest_m')}m")
    save(tid, existing)
    return existing


def save(tid, data):
    final = RESULTS_DIR / f"{tid}.json"
    tmp = RESULTS_DIR / f".{tid}.json.tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=1)
    os.replace(tmp, final)


def main():
    processed = 0
    updated = 0
    for spec in TIER2_SPECS:
        if processed >= MAX_PER_RUN:
            print(f"(stopping at MAX_PER_RUN={MAX_PER_RUN})")
            break
        r = tier2_for_spec(spec)
        processed += 1
        if r and r.get("chosen"):
            updated += 1
        time.sleep(3.0)  # be kind to Overpass mirrors
    print(f"\nTier-2 sweep: processed={processed}, found_geometry={updated}")


if __name__ == "__main__":
    main()
