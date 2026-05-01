#!/usr/bin/env python3
"""
Maryland hiking-trail ingestion — Tier-1 merged sweep (revised v2).

Problem with v1: naive fuzzy-name match accepted wrong polylines whenever *any*
candidate was within 3 km of the trailhead. That produced misleading "high"
confidence for the Billy Goat segments (matched to a 0.4-km Potomac Heritage
stub) and Greenbrier Big Red Trail (matched to the entire 57-km AT).

v2 strategy (per-trail):

  AT segments (ids starting md-at-*):
    - Fetch the whole AT Maryland polyline ONCE from USGS Layer 11 filtered by
      nationaltraildesignation LIKE '%Appalachian%'
    - For each segment, TRIM the AT polyline to the segment bbox.
    - This gives authoritative, continuous geometry keyed by trailhead.
    - Also pull OSM Overpass AT relation (name~Appalachian) for cross-audit.

  Named state-park / C&O trails:
    - Primary: OSM Overpass with a targeted name-regex query around the bbox.
    - Fallback: USGS Layer 37 with strict name-token overlap required.
    - Require ≥1 distinctive (non-stopword) token to match the target name.
    - If length mismatches published length by >5x in either direction, demote.
    - If no candidate clears the name gate, confidence = "none" (we write
      trailhead-only geometry and mark IS_APPROXIMATE).

Outputs:
  ingested_trails.json   — merged dataset with per-trail confidence + audit
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
RAW_DIR = OUT_DIR / "raw"
RESULTS_DIR = RAW_DIR / "results"
RAW_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)
AT_RAW_PATH = RAW_DIR / "at_md_raw.json"

# Slice control: process at most MAX_PER_RUN trails per invocation so a single
# Bash call stays well under the sandbox's 10-minute ceiling. Re-run the script
# to continue; completed trails are skipped via per-trail result files.
MAX_PER_RUN = int(os.environ.get("MAX_PER_RUN", "6"))

USGS_TRAILS_URL = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37/query"
USGS_NATIONAL_TRAILS_URL = "https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/11/query"
OVERPASS_URL = "https://z.overpass-api.de/api/interpreter"
UA = "mdhuntfish-trail-ingest/2.0 (contact: feedback.mdhuntfishoutdoors@gmail.com)"

# Trail specs: id, name, park, lat, lon, halfwidth (deg), published_mi, name_keywords (for Overpass name-match)
# name_keywords: core tokens that distinguish this trail. Used for both the
# candidate name-gate and the Overpass regex query.
TRAILS = [
    ("md-billy-goat-a", "Billy Goat Trail Section A", "C&O Canal NHP", 38.9968, -77.2489, 0.015, 1.7, ["billy goat", "section a"]),
    ("md-billy-goat-b", "Billy Goat Trail Section B", "C&O Canal NHP", 38.9920, -77.2430, 0.015, 1.4, ["billy goat", "section b"]),
    ("md-billy-goat-c", "Billy Goat Trail Section C", "C&O Canal NHP", 38.9810, -77.2313, 0.015, 1.6, ["billy goat", "section c"]),
    ("md-cunningham-falls-loop", "Cunningham Falls Trail", "Cunningham Falls SP", 39.5701, -77.4645, 0.025, 0.5, ["cunningham"]),
    ("md-cunningham-falls-manor", "Old Misery Trail", "Cunningham Falls SP Manor", 39.5801, -77.4523, 0.025, 1.0, ["misery", "manor"]),
    ("md-catoctin-hog-rock", "Hog Rock Nature Trail", "Catoctin Mountain Park", 39.6342, -77.4498, 0.020, 1.0, ["hog rock"]),
    ("md-catoctin-thurmont-vista", "Thurmont Vista Trail", "Catoctin Mountain Park", 39.6379, -77.4553, 0.020, 1.8, ["thurmont"]),
    ("md-catoctin-blue-ridge", "Blue Ridge Summit Overlook", "Catoctin Mountain Park", 39.6447, -77.4630, 0.020, 0.3, ["blue ridge"]),
    ("md-patapsco-mckeldin-switchback", "Switchback Trail", "Patapsco Valley SP McKeldin", 39.3618, -76.8876, 0.020, 3.8, ["switchback"]),
    ("md-patapsco-orange", "Orange Trail Loop", "Patapsco Valley SP Avalon", 39.2310, -76.7487, 0.020, 3.1, ["orange"]),
    ("md-rock-creek-valley", "Valley Trail", "Rock Creek Regional Park", 39.1063, -77.1144, 0.025, 5.0, ["valley trail", "rock creek"]),
    ("md-greenbrier-big-red", "Big Red Trail", "Greenbrier SP", 39.5366, -77.6213, 0.020, 2.4, ["big red", "red trail"]),
    ("md-sugarloaf-summit-loop", "Mountain Loop Trail", "Sugarloaf Mountain", 39.2717, -77.3901, 0.020, 2.5, ["mountain loop", "sugarloaf"]),
    ("md-rocky-gap-lake", "Lakeside Loop Trail", "Rocky Gap SP", 39.7015, -78.6553, 0.025, 5.0, ["lakeside"]),
    ("md-rocky-gap-ridge", "Evitts Ridge Trail", "Rocky Gap SP", 39.7050, -78.6600, 0.025, 7.0, ["evitts", "ridge"]),
    ("md-deep-creek-lake-discovery", "Discovery Trail", "Deep Creek Lake SP", 39.5210, -79.3017, 0.020, 1.2, ["discovery"]),
    ("md-swallow-falls-circuit", "Canyon Trail", "Swallow Falls SP", 39.4989, -79.4236, 0.015, 1.25, ["canyon", "falls"]),
    ("md-gambrill-rock-overlook", "Rock Run Overlook Trail", "Gambrill SP", 39.4754, -77.4937, 0.015, 1.3, ["rock run", "overlook"]),
    ("md-gambrill-lake", "Lake Trail", "Gambrill SP", 39.4780, -77.4920, 0.015, 2.0, ["lake"]),
    # Appalachian Trail Maryland — handled separately (AT-bbox trim). name_keywords unused.
    ("md-at-harpers-ferry", "Appalachian Trail (MD — Harpers Ferry)", "AT MD", 39.3276, -77.7376, 0.03, 3.0, ["appalachian"]),
    ("md-at-weverton", "Appalachian Trail (MD — Weverton Cliffs)", "AT MD", 39.3320, -77.6765, 0.03, 2.5, ["appalachian"]),
    ("md-at-gathland", "Appalachian Trail (MD — Gathland/Crampton)", "AT MD", 39.4056, -77.6394, 0.03, 3.5, ["appalachian"]),
    ("md-at-turners-gap", "Appalachian Trail (MD — Turners Gap)", "AT MD", 39.4845, -77.6189, 0.03, 2.5, ["appalachian"]),
    ("md-at-washington-monument", "Appalachian Trail (MD — Washington Mon.)", "AT MD", 39.5003, -77.6228, 0.03, 1.5, ["appalachian"]),
    ("md-at-ensign-cowall", "Appalachian Trail (MD — Ensign Cowall)", "AT MD", 39.6310, -77.5560, 0.03, 4.0, ["appalachian"]),
    ("md-at-raven-rock", "Appalachian Trail (MD — Raven Rock)", "AT MD", 39.6734, -77.5299, 0.03, 3.0, ["appalachian"]),
    ("md-at-pen-mar", "Appalachian Trail (MD — Pen Mar)", "AT MD", 39.7157, -77.5090, 0.03, 2.0, ["appalachian"]),
]

STOPWORDS = {
    "trail", "loop", "path", "area", "park", "state", "national",
    "scenic", "recreation", "recreational", "hike", "hiking", "the",
    "mountain", "mt", "forest", "nature", "historic", "and",
}


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
    t = 0.0
    for i in range(len(coords) - 1):
        t += haversine_m(coords[i], coords[i + 1])
    return t


def http_get(url, max_tries=3, timeout=30):
    last = None
    for attempt in range(max_tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2.5 * (attempt + 1))
    raise RuntimeError(f"HTTP GET failed {max_tries}x: {last}")


def http_post(url, body, max_tries=3, timeout=40):
    last = None
    for attempt in range(max_tries):
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2.5 * (attempt + 1))
    raise RuntimeError(f"HTTP POST failed {max_tries}x: {last}")


def bbox_envelope(lat, lon, half):
    return json.dumps({
        "xmin": lon - half, "ymin": lat - half,
        "xmax": lon + half, "ymax": lat + half,
        "spatialReference": {"wkid": 4326},
    })


def query_usgs(layer_url, lat, lon, half, label, where="1=1"):
    params = {
        "where": where,
        "geometry": bbox_envelope(lat, lon, half),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "outSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "name,maplabel,trailtype,lengthmiles,nationaltraildesignation",
        "returnGeometry": "true",
        "f": "json",
    }
    url = f"{layer_url}?{urllib.parse.urlencode(params)}"
    raw = http_get(url)
    data = json.loads(raw)
    out = []
    for feat in data.get("features", []):
        attrs = feat.get("attributes", {})
        geom = feat.get("geometry", {})
        for p in geom.get("paths", []):
            if len(p) < 2:
                continue
            out.append({
                "name": (attrs.get("name") or attrs.get("maplabel") or "").strip() or None,
                "polyline": [[round(c[0], 6), round(c[1], 6)] for c in p],
                "lengthmi_published": attrs.get("lengthmiles"),
                "trailtype": attrs.get("trailtype"),
                "national_designation": attrs.get("nationaltraildesignation"),
                "source_layer": label,
            })
    return out


def query_overpass_generic(lat, lon, half):
    s, n, w, e = lat - half, lat + half, lon - half, lon + half
    q = (
        f"[out:json][timeout:20];"
        f"(way[\"highway\"~\"path|footway|track\"]({s},{w},{n},{e});"
        f" way[\"foot\"=\"yes\"]({s},{w},{n},{e});"
        f");"
        f" out geom tags;"
    )
    return _overpass(q)


def query_overpass_named(lat, lon, half, keywords):
    """Use name~regex query for targeted matching."""
    if not keywords:
        return {"error": "no keywords", "ways": []}
    s, n, w, e = lat - half, lat + half, lon - half, lon + half
    # Build regex: case-insensitive OR of keywords (Overpass uses POSIX)
    regex = "|".join(re.escape(k) for k in keywords)
    q = (
        f"[out:json][timeout:25];"
        f"(way[\"name\"~\"{regex}\",i]({s},{w},{n},{e});"
        f" relation[\"name\"~\"{regex}\",i]({s},{w},{n},{e});"
        f");"
        f" out geom tags;"
    )
    return _overpass(q)


def _overpass(q):
    body = urllib.parse.urlencode({"data": q}).encode()
    try:
        raw = http_post(OVERPASS_URL, body, max_tries=2, timeout=30)
        data = json.loads(raw)
    except Exception as exc:
        return {"error": str(exc), "ways": []}
    ways = []
    for el in data.get("elements", []):
        t = el.get("type")
        if t == "way":
            nds = el.get("geometry", [])
            if len(nds) >= 2:
                ways.append({
                    "name": el.get("tags", {}).get("name"),
                    "polyline": [[round(p["lon"], 6), round(p["lat"], 6)] for p in nds],
                    "tags": el.get("tags", {}),
                    "element": "way",
                })
        elif t == "relation":
            # Relations contain member ways; the `out geom` form includes member geometry
            for m in el.get("members", []):
                if m.get("type") == "way" and m.get("geometry"):
                    nds = m["geometry"]
                    if len(nds) >= 2:
                        ways.append({
                            "name": el.get("tags", {}).get("name"),
                            "polyline": [[round(p["lon"], 6), round(p["lat"], 6)] for p in nds],
                            "tags": el.get("tags", {}),
                            "element": "relation_member",
                        })
    return {"error": None, "ways": ways}


def normalize_tokens(s):
    """Return set of non-stopword tokens from a name string."""
    if not s:
        return set()
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return {w for w in s.split() if len(w) > 2 and w not in STOPWORDS}


def keyword_tokens(keywords):
    """Flatten all keyword phrases into a set of content tokens."""
    out = set()
    for k in keywords:
        out |= normalize_tokens(k)
    return out


def bbox_contains(poly, lat, lon, half):
    """Return True if ANY polyline vertex lies within bbox."""
    s, n, w, e = lat - half, lat + half, lon - half, lon + half
    for p in poly:
        if w <= p[0] <= e and s <= p[1] <= n:
            return True
    return False


def trim_to_bbox(poly, lat, lon, half):
    """Return only vertices within bbox (preserves order). For AT: keep contiguous span."""
    s, n, w, e = lat - half, lat + half, lon - half, lon + half
    out = []
    for p in poly:
        if w <= p[0] <= e and s <= p[1] <= n:
            out.append(p)
    return out


def join_at_polyline(segs):
    """AT comes back as many small paths. Join into one longest continuous polyline."""
    if not segs:
        return []
    # Simple: return the path with the most points (AT in USGS tends to be one big path per feature)
    return max(segs, key=lambda p: len(p))


# ------- CORE INGESTION -------

def ingest_at_segment(spec, at_polylines):
    tid, name, park, lat, lon, half, pub_mi, _ = spec
    out = {
        "id": tid, "name": name, "park": park, "trailhead": [lon, lat],
        "sources_tried": ["usgs_national_trails"],
        "sources_returned": {}, "chosen": None, "cross_audit_m": None,
        "confidence": "none", "is_approximate": True, "error": None,
        "published_miles": pub_mi,
    }
    # Pull the pre-fetched AT polyline and trim to bbox.
    # CRITICAL: we trim each polyline separately and keep each contiguous span
    # within the bbox as its OWN candidate. Concatenating vertices across
    # disjoint polylines produced fake zigzag geometry (Harpers Ferry: 34 mi
    # vs. 3 mi published).
    candidate_spans = []
    for poly in at_polylines:
        current = []
        for p in poly:
            if (lat - half) <= p[1] <= (lat + half) and (lon - half) <= p[0] <= (lon + half):
                current.append(p)
            else:
                if len(current) >= 2:
                    candidate_spans.append(current)
                current = []
        if len(current) >= 2:
            candidate_spans.append(current)
    out["sources_returned"]["usgs_national_trails"] = len(candidate_spans)

    if not candidate_spans:
        out["error"] = "AT polyline did not intersect this bbox"
        return out

    # Choose the span whose length is closest to the published mileage (AT
    # segments are reasonably well-documented in nationaltraildesignation data).
    def span_score(span):
        miles = polyline_length_m(span) / 1609.344
        if not pub_mi or pub_mi <= 0:
            return -len(span)  # fall back to longest if no published reference
        return abs(miles - pub_mi)
    best_span = min(candidate_spans, key=span_score)
    # Dedup consecutive vertices
    cleaned = [best_span[0]]
    for p in best_span[1:]:
        if p != cleaned[-1]:
            cleaned.append(p)
    length_m = polyline_length_m(cleaned)

    # Also try Overpass relation name~Appalachian for cross-audit
    ovp = query_overpass_named(lat, lon, half, ["Appalachian"])
    out["sources_tried"].append("osm_overpass")
    if ovp["error"]:
        out["sources_returned"]["osm_overpass"] = f"error: {ovp['error']}"
        osm = []
    else:
        osm = ovp["ways"]
        out["sources_returned"]["osm_overpass"] = len(osm)

    chosen = {
        "name": "Appalachian National Scenic Trail",
        "polyline": cleaned,
        "length_m": round(length_m, 1),
        "length_mi": round(length_m / 1609.344, 3),
        "published_mi": pub_mi,
        "source": "usgs_national_trails",
        "national_designation": "NST - Appalachian",
    }
    out["chosen"] = chosen

    # Cross-audit against Overpass AT geometry
    if osm:
        ca = cross_audit_poly(cleaned, [w["polyline"] for w in osm])
        out["cross_audit_m"] = ca
        if ca:
            max_d = max(ca)
            if max_d < 50:
                out["confidence"] = "high"
                out["is_approximate"] = False
            elif max_d < 200:
                out["confidence"] = "medium"
            else:
                out["confidence"] = "low"
    else:
        # Only USGS. AT on USGS is authoritative — call this high with a note.
        out["confidence"] = "high"
        out["is_approximate"] = False
        out["cross_audit_m"] = None

    # Apply length-sanity gate to AT path too. (Bug fix 2026-04-19: independent
    # auditor caught 4 AT segments shipped as high/!approx despite ratio outside
    # 0.5-2.0x. The USGS bbox trim can capture more of the full AT than just the
    # named segment, so we must still downgrade when the resulting polyline is
    # too long/short versus the published segment mileage.)
    at_len_mi = chosen["length_mi"]
    if pub_mi and at_len_mi:
        ratio = at_len_mi / pub_mi
        if ratio < 0.25 or ratio > 4.0:
            out["confidence"] = "none"
            out["is_approximate"] = True
            out["error"] = f"length mismatch ratio={ratio:.2f} exceeds 0.25-4.0 gate"
        elif ratio < 0.5 or ratio > 2.0:
            if out["confidence"] in ("high", "medium"):
                out["confidence"] = "low"
                out["is_approximate"] = True

    return out


def cross_audit_poly(primary_poly, secondary_polys):
    if not primary_poly or not secondary_polys:
        return None
    if len(primary_poly) < 2:
        return None
    idxs = [int(i * (len(primary_poly) - 1) / 4) for i in range(5)]
    samples = [primary_poly[i] for i in idxs]
    res = []
    for s in samples:
        best = 1e9
        for poly in secondary_polys:
            for v in poly:
                d = haversine_m(s, v)
                if d < best:
                    best = d
        res.append(round(best, 1))
    return res


def rank_named_candidates(cands, target_tokens, trailhead, pub_mi):
    """Return sorted list of (name_overlap, length_ratio_score, distance_m, cand).

    Only include candidates that share ≥1 target token with their name.
    length_ratio_score: 1.0 if within 0.3x-3x of published length; lower outside.
    """
    ranked = []
    for c in cands:
        cname = c.get("name") or ""
        cand_tokens = normalize_tokens(cname)
        overlap = len(cand_tokens & target_tokens)
        if overlap == 0:
            continue
        center = [
            sum(p[0] for p in c["polyline"]) / len(c["polyline"]),
            sum(p[1] for p in c["polyline"]) / len(c["polyline"]),
        ]
        dist = haversine_m(center, [trailhead[1], trailhead[0]])
        if dist > 3000:
            continue
        length_mi = polyline_length_m(c["polyline"]) / 1609.344
        if pub_mi and length_mi > 0:
            ratio = length_mi / pub_mi
            # Hard reject: wildly different length means wrong trail even if
            # the name happened to overlap. 10x short or 5x long gets dropped.
            if ratio < 0.1 or ratio > 5.0:
                continue
            if 0.5 <= ratio <= 2.0:
                len_score = 1.0
            elif 0.3 <= ratio < 0.5 or 2.0 < ratio <= 3.0:
                len_score = 0.7
            else:
                len_score = 0.3
        else:
            len_score = 0.5
        ranked.append((overlap, len_score, dist, c, length_mi))
    ranked.sort(key=lambda r: (-r[0], -r[1], r[2]))
    return ranked


def ingest_park_trail(spec):
    tid, name, park, lat, lon, half, pub_mi, keywords = spec
    target_tokens = keyword_tokens(keywords)
    out = {
        "id": tid, "name": name, "park": park, "trailhead": [lon, lat],
        "sources_tried": [],
        "sources_returned": {}, "chosen": None, "cross_audit_m": None,
        "confidence": "none", "is_approximate": True, "error": None,
        "published_miles": pub_mi,
    }

    # 1. Overpass named (most likely to find the actual trail)
    ovp_named = query_overpass_named(lat, lon, half, keywords)
    out["sources_tried"].append("osm_overpass_named")
    if ovp_named["error"]:
        out["sources_returned"]["osm_overpass_named"] = f"error: {ovp_named['error']}"
        osm_named = []
    else:
        osm_named = ovp_named["ways"]
        out["sources_returned"]["osm_overpass_named"] = len(osm_named)

    # 2. USGS Layer 37 (trails, whole bbox)
    try:
        usgs = query_usgs(USGS_TRAILS_URL, lat, lon, half, "usgs_trails")
        out["sources_tried"].append("usgs_trails")
        out["sources_returned"]["usgs_trails"] = len(usgs)
    except Exception as e:
        usgs = []
        out["sources_returned"]["usgs_trails"] = f"error: {e}"

    # 3. Overpass generic (for audit only)
    ovp_gen = query_overpass_generic(lat, lon, half)
    out["sources_tried"].append("osm_overpass_generic")
    if ovp_gen["error"]:
        out["sources_returned"]["osm_overpass_generic"] = f"error: {ovp_gen['error']}"
        osm_gen = []
    else:
        osm_gen = ovp_gen["ways"]
        out["sources_returned"]["osm_overpass_generic"] = len(osm_gen)

    # Rank candidates with name-gate
    ranked_osm = rank_named_candidates(osm_named, target_tokens, (lat, lon), pub_mi)
    ranked_usgs = rank_named_candidates(usgs, target_tokens, (lat, lon), pub_mi)

    # Prefer Overpass named (has real trail names), then USGS
    chosen_source = None
    best = None
    best_length_mi = None
    if ranked_osm:
        _, _, _, best, best_length_mi = ranked_osm[0]
        chosen_source = "osm_overpass"
    elif ranked_usgs:
        _, _, _, best, best_length_mi = ranked_usgs[0]
        chosen_source = "usgs_trails"

    if not best:
        out["error"] = "no candidate with matching name within 3km of trailhead"
        return out

    length_m = polyline_length_m(best["polyline"])
    chosen = {
        "name": best.get("name"),
        "polyline": best["polyline"],
        "length_m": round(length_m, 1),
        "length_mi": round(length_m / 1609.344, 3),
        "published_mi": pub_mi,
        "source": chosen_source,
        "source_tags": best.get("tags"),
    }
    out["chosen"] = chosen

    # Cross-audit against the other source sets (filter to name-matching only)
    alt_sources = []
    if chosen_source != "osm_overpass":
        alt_sources += [c[3]["polyline"] for c in ranked_osm]
    if chosen_source != "usgs_trails":
        alt_sources += [c[3]["polyline"] for c in ranked_usgs]

    if alt_sources:
        ca = cross_audit_poly(best["polyline"], alt_sources)
        out["cross_audit_m"] = ca
        if ca:
            max_d = max(ca)
            if max_d < 50:
                out["confidence"] = "high"
                out["is_approximate"] = False
            elif max_d < 200:
                out["confidence"] = "medium"
            else:
                out["confidence"] = "low"
    else:
        # Single source with name match — medium confidence (name gate passed but not cross-verified)
        out["confidence"] = "medium"
        out["is_approximate"] = True

    # Length sanity downgrade — tighter gates now that hard-reject is in rank.
    # Ordered most-extreme first so tighter branches fire before looser ones.
    if pub_mi and best_length_mi:
        ratio = best_length_mi / pub_mi
        if ratio < 0.25 or ratio > 4.0:
            out["confidence"] = "none"
            out["is_approximate"] = True
            out["error"] = f"length mismatch ratio={ratio:.2f} exceeds 0.25-4.0 gate"
        elif ratio < 0.5 or ratio > 2.0:
            if out["confidence"] in ("high", "medium"):
                out["confidence"] = "low"
                out["is_approximate"] = True

    return out


def prefetch_at():
    """Pull the Maryland AT polyline once from USGS Layer 11. Cached on disk."""
    if AT_RAW_PATH.exists():
        with open(AT_RAW_PATH) as f:
            cached = json.load(f)
        polys = cached.get("polylines", [])
        if polys:
            print(f"  AT prefetch (cached): {len(polys)} polylines, total vertices={sum(len(p) for p in polys)}")
            return polys
    # Wider bbox covering all of MD's AT corridor
    lat, lon = 39.52, -77.60
    half_lat = 0.25
    half_lon = 0.20
    params = {
        "where": "nationaltraildesignation LIKE '%Appalachian%'",
        "geometry": bbox_envelope(lat, lon, max(half_lat, half_lon)),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "outSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "name,nationaltraildesignation,lengthmiles",
        "returnGeometry": "true",
        "f": "json",
    }
    url = f"{USGS_NATIONAL_TRAILS_URL}?{urllib.parse.urlencode(params)}"
    raw = http_get(url)
    data = json.loads(raw)
    polys = []
    for feat in data.get("features", []):
        for path in feat.get("geometry", {}).get("paths", []):
            if len(path) >= 2:
                polys.append([[round(c[0], 6), round(c[1], 6)] for c in path])
    print(f"  AT prefetch: {len(polys)} polylines, total vertices={sum(len(p) for p in polys)}")
    # Save raw for audit trail
    with open(AT_RAW_PATH, "w") as f:
        json.dump({"count": len(polys), "polylines": polys}, f)
    return polys


def load_existing_results():
    """Rebuild results list from per-trail JSON files in RESULTS_DIR."""
    done = {}
    for p in RESULTS_DIR.glob("*.json"):
        try:
            with open(p) as f:
                r = json.load(f)
            done[r["id"]] = r
        except Exception:
            pass
    return done


def save_trail_result(r):
    """Write one trail's result to its own file (atomic, resumable)."""
    tid = r.get("id")
    if not tid:
        return
    tmp = RESULTS_DIR / f".{tid}.json.tmp"
    final = RESULTS_DIR / f"{tid}.json"
    with open(tmp, "w") as f:
        json.dump(r, f, indent=1)
    os.replace(tmp, final)


def write_aggregate(results, done_count, total, finalized=False):
    """Refresh the aggregate ingested_trails.json."""
    by_conf = {"high": 0, "medium": 0, "low": 0, "none": 0}
    by_source = {}
    for r in results:
        by_conf[r.get("confidence", "none")] = by_conf.get(r.get("confidence", "none"), 0) + 1
        src = (r.get("chosen") or {}).get("source", "none")
        by_source[src] = by_source.get(src, 0) + 1
    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "in_progress": not finalized,
        "done": done_count,
        "total": total,
        "by_confidence": by_conf,
        "by_primary_source": by_source,
        "sources": {
            "usgs_national_trails": USGS_NATIONAL_TRAILS_URL,
            "usgs_trails": USGS_TRAILS_URL,
            "osm_overpass": OVERPASS_URL,
        },
    }
    out_path = OUT_DIR / "ingested_trails.json"
    tmp = OUT_DIR / ".ingested_trails.json.tmp"
    with open(tmp, "w") as f:
        json.dump({"summary": summary, "trails": results}, f, indent=1)
    os.replace(tmp, out_path)
    return summary


def main():
    done_map = load_existing_results()
    remaining = [s for s in TRAILS if s[0] not in done_map]
    print(f"Ingest state: {len(done_map)}/{len(TRAILS)} already done, {len(remaining)} remaining, processing up to {MAX_PER_RUN} this run.", flush=True)

    if remaining:
        print("→ Prefetching Maryland AT polyline from USGS Layer 11…", flush=True)
        at_polys = prefetch_at()
    else:
        at_polys = []

    # Ordered results matching TRAILS order — fill in as we go
    processed_this_run = 0
    for idx, spec in enumerate(TRAILS, 1):
        tid = spec[0]
        if tid in done_map:
            continue
        if processed_this_run >= MAX_PER_RUN:
            print(f"  (stopping at slice limit MAX_PER_RUN={MAX_PER_RUN}; re-run to continue)", flush=True)
            break
        print(f"[{idx}/{len(TRAILS)}] {tid} — {spec[1]}", flush=True)
        try:
            if tid.startswith("md-at-"):
                r = ingest_at_segment(spec, at_polys)
            else:
                r = ingest_park_trail(spec)
        except Exception as e:
            r = {"id": tid, "name": spec[1], "error": str(e), "confidence": "none", "is_approximate": True}
        c = (r.get("chosen") or {})
        print(f"    → {r.get('confidence', 'none')} | {(c.get('name') or '—')[:48]} | {c.get('length_mi', 0)} mi | src={c.get('source','—')}", flush=True)
        save_trail_result(r)
        done_map[tid] = r
        processed_this_run += 1
        # Refresh aggregate every trail so a kill mid-loop still leaves a readable file
        ordered = [done_map[s[0]] for s in TRAILS if s[0] in done_map]
        write_aggregate(ordered, len(done_map), len(TRAILS), finalized=False)
        time.sleep(0.6)

    ordered = [done_map[s[0]] for s in TRAILS if s[0] in done_map]
    finalized = len(done_map) == len(TRAILS)
    summary = write_aggregate(ordered, len(done_map), len(TRAILS), finalized=finalized)
    status = "FINAL" if finalized else "PARTIAL"
    print(f"\n{status} summary:", json.dumps(summary, indent=2), flush=True)
    print(f"Wrote {OUT_DIR / 'ingested_trails.json'}", flush=True)


if __name__ == "__main__":
    main()
