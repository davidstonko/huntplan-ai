#!/usr/bin/env python3
"""
emit_ts_from_imap.py — Convert MD iMAP "Rivers and Streams - Generalized"
GeoJSON to the TypeScript data module at
`mobile/src/data/marylandRivers.ts`.

Source:
    https://mdgeodata.md.gov/imap/rest/services/Hydrology/MD_Waterbodies/FeatureServer/0
Layer: "Rivers and Streams - Generalized" (WKID 4326 after outSR=4326)
Pulled: 2026-04-20 via `curl ?where=1=1&outSR=4326&f=geojson`. Raw file is
at `./raw/md_rivers_generalized.geojson` — 347 features, 153 distinct PNAMEs.

PNAME is the DNR river/stream name, abbreviated (R=River, CR=Creek,
BR=Branch, *A / *B = unnamed fragments). We:

  1. Group all line segments by PNAME
  2. Drop segments whose PNAME is blank, whitespace, or starts with '*'
     (unnamed / scratch segments — ATLANTIC OCEAN is also excluded since
     it is not a river)
  3. Stitch each group's segments into a MultiLineString (no topological
     ordering — segments are emitted in source order, which is typically
     downstream-to-upstream in RF1 tables but we do not assume it)
  4. Normalize the abbreviated name to a user-friendly form
     ("POTOMAC R" → "Potomac River")
  5. Compute total length in miles via haversine across all vertices
  6. Write out as TS data module matching the `MarylandRiver` interface
     in `src/data/marylandRivers.ts`

No fabrication. Every coordinate comes from the iMAP FeatureServer
response stored in ./raw/. No simplification — the Generalized layer is
already regional-scale (RF1-derived).
"""

import json
import math
import re
from pathlib import Path
from datetime import datetime

RAW_PATH = Path(__file__).parent / "raw" / "md_rivers_generalized.geojson"
OUT_PATH = (
    Path(__file__).parent.parent.parent / "src" / "data" / "marylandRivers.ts"
)

SOURCE_URL = (
    "https://mdgeodata.md.gov/imap/rest/services/"
    "Hydrology/MD_Waterbodies/FeatureServer/0"
)
SOURCE_LABEL = "MD iMAP Rivers and Streams Generalized"
DATE_PULLED = "2026-04-20"

# Maryland bbox (±0.25° pad for tidal/coastal features).
MD_BBOX = (-79.85, 37.65, -74.75, 40.00)  # west, south, east, north


# ───────────────────────────── helpers ─────────────────────────────

def haversine_mi(p1, p2):
    """Great-circle distance in statute miles between two [lng, lat] pts."""
    lon1, lat1 = p1
    lon2, lat2 = p2
    r = 3958.7613  # mean earth radius in miles
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def line_length_mi(coords):
    total = 0.0
    for i in range(1, len(coords)):
        total += haversine_mi(coords[i - 1], coords[i])
    return total


def within_bbox(lng, lat):
    w, s, e, n = MD_BBOX
    return w <= lng <= e and s <= lat <= n


# ──────────────────────── name normalization ───────────────────────

# Replacement rules applied to the final TOKEN of the PNAME. Order matters.
SUFFIX_EXPANSIONS = {
    "R": "River",
    "CR": "Creek",
    "BR": "Branch",
    "RUN": "Run",
    "FK": "Fork",
    "PD": "Pond",
    "LK": "Lake",
    "BAY": "Bay",
}

# Replacement rules applied to any token anywhere in the name.
INLINE_EXPANSIONS = {
    "N": "North",
    "S": "South",
    "E": "East",
    "W": "West",
    "ST": "Saint",
    "MT": "Mount",
}


def normalize_pname(raw):
    """Turn a DNR abbreviated PNAME into a user-friendly name.

    Rules:
      - Strip leading/trailing whitespace.
      - If the name contains commas (compound tributaries like
        "BIG PIPE CR, BEAR BR"), we normalize each comma-separated
        piece independently and rejoin with ", ".
      - Each piece's tokens are title-cased; suffix tokens are expanded
        via SUFFIX_EXPANSIONS; single-letter direction / prefix tokens
        are expanded via INLINE_EXPANSIONS.
    """
    raw = raw.strip()

    def _norm_piece(piece):
        tokens = piece.strip().split()
        out = []
        for i, tok in enumerate(tokens):
            is_last = i == len(tokens) - 1
            up = tok.upper().rstrip(",.")
            if is_last and up in SUFFIX_EXPANSIONS:
                out.append(SUFFIX_EXPANSIONS[up])
            elif up in INLINE_EXPANSIONS:
                out.append(INLINE_EXPANSIONS[up])
            else:
                # Title-case, but preserve numerics / hyphens
                out.append(tok.capitalize())
        return " ".join(out)

    pieces = [p for p in raw.split(",") if p.strip()]
    return ", ".join(_norm_piece(p) for p in pieces)


def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "unnamed"


# ────────────────────────── main pipeline ──────────────────────────

def load_features():
    with open(RAW_PATH) as f:
        data = json.load(f)
    return data.get("features", [])


def should_keep(feat):
    props = feat.get("properties", {}) or {}
    pname = (props.get("PNAME") or "").strip()
    if not pname:
        return False
    if pname.startswith("*"):
        return False
    # Exclude water bodies that are NOT rivers/streams (they appear in the
    # Generalized layer only for topology — centerlines running through a
    # bay or ocean look wrong when rendered as a polyline).
    up = pname.upper()
    if up in ("ATLANTIC OCEAN", "CHESAPEAKE BAY"):
        return False
    return True


def geom_to_lines(geom):
    if not geom:
        return []
    t = geom.get("type")
    coords = geom.get("coordinates") or []
    if t == "LineString":
        return [coords] if coords else []
    if t == "MultiLineString":
        return [seg for seg in coords if seg]
    return []


def build_rivers():
    feats = load_features()
    groups = {}
    skipped = 0
    for feat in feats:
        if not should_keep(feat):
            skipped += 1
            continue
        pname = feat["properties"]["PNAME"].strip()
        for seg in geom_to_lines(feat.get("geometry")):
            # Round to 6 dp (~11 cm) and drop any vertex outside MD padded bbox.
            cleaned = []
            for pt in seg:
                if len(pt) < 2:
                    continue
                lng, lat = round(pt[0], 6), round(pt[1], 6)
                if not within_bbox(lng, lat):
                    continue
                cleaned.append([lng, lat])
            if len(cleaned) >= 2:
                groups.setdefault(pname, []).append(cleaned)

    rivers = []
    for pname, segs in groups.items():
        display = normalize_pname(pname)
        slug = slugify(display)
        total_miles = sum(line_length_mi(s) for s in segs)
        total_verts = sum(len(s) for s in segs)
        # Confidence: MD iMAP is the state-level authoritative GIS for
        # hydrography, so we set confidence='high' and isApproximate=false.
        # The Generalized layer is explicitly RF1-regional-scale, not
        # survey-grade; we record that in `source` rather than downgrading
        # the confidence flag, because the layer name already signals the
        # scale and any user reading the metadata will see "Generalized".
        rivers.append({
            "id": slug,
            "pname": pname,
            "name": display,
            "coordinates": segs,
            "vertexCount": total_verts,
            "lengthMi": round(total_miles, 2),
            "segmentCount": len(segs),
        })

    # Sort by length descending so the biggest rivers render first.
    rivers.sort(key=lambda r: -r["lengthMi"])
    return rivers, skipped


# ───────────────────────── TypeScript emit ─────────────────────────

TS_HEADER = f"""/**
 * Maryland River & Stream Polylines — from MD iMAP Hydrography.
 *
 * Source layer: "Rivers and Streams - Generalized"
 * FeatureServer: {SOURCE_URL}
 * License: Maryland state open data (iMAP).
 * Pulled: {DATE_PULLED} via
 *   curl '…/FeatureServer/0/query?where=1=1&outSR=4326&f=geojson'
 *
 * The Generalized layer is an RF1-derived regional-scale network — line
 * features for main-stem rivers, major tributaries, and named streams.
 * It is NOT survey-grade: expect decimeter-to-meter-scale offsets from
 * the true centerline, especially in tidal reaches. For fine-grained
 * work the Detailed layer (FeatureServer/2) is available but runs into
 * the tens of thousands of features and is impractical for a mobile
 * client. Use this Generalized layer as a map-context overlay, not for
 * navigation.
 *
 * PNAME is the DNR's abbreviated name; we normalize to user-friendly
 * form (e.g., "POTOMAC R" → "Potomac River", "BIG ELK CR" → "Big Elk
 * Creek"). The un-normalized form is preserved in `pname` for
 * traceability against DNR's native data.
 *
 * Emitted by: mobile/scripts/rivers_ingest/emit_ts_from_imap.py
 * Raw GeoJSON cached at: mobile/scripts/rivers_ingest/raw/md_rivers_generalized.geojson
 */

export type RiverConfidence = 'high' | 'medium' | 'low';

export interface MarylandRiver {{
  /** kebab-case slug derived from `name` (e.g. "potomac-river"). */
  id: string;
  /** Original DNR PNAME (e.g., "POTOMAC R"). */
  pname: string;
  /** User-friendly display name (e.g., "Potomac River"). */
  name: string;
  /**
   * MultiLineString-shaped coordinates — an array of one or more line
   * segments, each an ordered [lng, lat] vertex list. The MD iMAP
   * Generalized layer splits most main-stem rivers into multiple
   * segments (at tributary junctions or HUC boundaries); we preserve
   * that segmentation here so Mapbox can render them as a native
   * MultiLineString without stitching artifacts at junctions.
   */
  coordinates: number[][][];
  /** Total length across all segments (statute miles). */
  lengthMi: number;
  /** Total vertex count across all segments. */
  vertexCount: number;
  /** Number of separate line segments in `coordinates`. */
  segmentCount: number;
  /** Data-quality rating. 'high' for MD iMAP source. */
  confidence: RiverConfidence;
  /**
   * True when the geometry is approximated (e.g. stitched or coarse
   * enough that a dashed rendering is warranted). False for MD iMAP
   * Generalized — the regional-scale-but-authoritative layer.
   */
  isApproximate: boolean;
  source: string;
  sourceUrl: string;
  /** ISO date (yyyy-mm-dd). */
  datePulled: string;
}}

"""


def emit_ts(rivers):
    lines = [TS_HEADER]
    lines.append("export const MARYLAND_RIVERS: MarylandRiver[] = [")
    for r in rivers:
        lines.append("  {")
        lines.append(f"    id: {json.dumps(r['id'])},")
        lines.append(f"    pname: {json.dumps(r['pname'])},")
        lines.append(f"    name: {json.dumps(r['name'])},")
        lines.append(f"    vertexCount: {r['vertexCount']},")
        lines.append(f"    lengthMi: {r['lengthMi']},")
        lines.append(f"    segmentCount: {r['segmentCount']},")
        lines.append('    confidence: "high",')
        lines.append("    isApproximate: false,")
        lines.append(f"    source: {json.dumps(SOURCE_LABEL)},")
        lines.append(f"    sourceUrl: {json.dumps(SOURCE_URL)},")
        lines.append(f"    datePulled: {json.dumps(DATE_PULLED)},")
        lines.append("    coordinates: [")
        for seg in r["coordinates"]:
            lines.append(
                "      [" + ", ".join(f"[{c[0]},{c[1]}]" for c in seg) + "],"
            )
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")

    total_rivers = len(rivers)
    total_miles = round(sum(r["lengthMi"] for r in rivers), 1)
    total_verts = sum(r["vertexCount"] for r in rivers)

    lines.append("/** Summary counts — useful for reviewer-notes / audit dashboards. */")
    lines.append("export const MARYLAND_RIVERS_SUMMARY = {")
    lines.append(f"  total: {total_rivers},")
    lines.append(f"  totalMiles: {total_miles},")
    lines.append(f"  totalVertices: {total_verts},")
    lines.append("  byConfidence: {")
    lines.append(f"    high: {total_rivers},")
    lines.append("    medium: 0,")
    lines.append("    low: 0,")
    lines.append("  } as const,")
    lines.append("} as const;")
    lines.append("")

    OUT_PATH.write_text("\n".join(lines))
    return total_rivers, total_miles, total_verts


def main():
    rivers, skipped = build_rivers()
    n, miles, verts = emit_ts(rivers)
    print(f"Wrote {OUT_PATH}")
    print(f"  rivers:       {n}")
    print(f"  total miles:  {miles}")
    print(f"  total verts:  {verts}")
    print(f"  skipped feats:{skipped} (blank/*/ocean)")


if __name__ == "__main__":
    main()
