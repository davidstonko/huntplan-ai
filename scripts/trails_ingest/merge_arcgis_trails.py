#!/usr/bin/env python3
"""
merge_arcgis_trails.py — Transform raw ArcGIS trail pulls into Trail + HikingTrace records.

Reads the 7 JSON files in raw/mdot/ that were pulled on 2026-04-19:
  - mdot_statewide_trails.json (2,014 MDOT Maryland Transportation Trails — statewide)
  - nps_trails_md.json          (6 NPS trails — C&O, AT, GAP, Potomac Heritage, etc.)
  - howard_trails.json          (750 Howard County trail segments)
  - baltimore_city_trails.json  (230 Baltimore City trail segments)
  - aa_county_trails.json       (28 Anne Arundel County trail segments)
  - tuckahoe_trails.json        (42 Tuckahoe State Park foot-trail segments)
  - sha_recreation_trails.json  (79 SHA linear trail features)

Strategy:
  1. Curated whitelist — we target ~40-60 named trails that David's users will recognize
     (Gwynns Falls, NCR / Torrey C. Brown Rail Trail, Jones Falls, Patapsco foot trails,
      C&O Canal Towpath, B&A Trail, WB&A, Tuckahoe Valley, Inner Harbor Promenade, etc.).
  2. For each whitelist row: group matching source features, order by endpoint
     proximity, emit a single Trail record (trailheadLat/Lon = first coord of joined
     polyline, lengthMi = summed computed length) and one HikingTrace.
  3. Source attribution — every polyline carries its source layer URL in `source` /
     `sourceUrl`. No polyline is hand-drawn.
  4. MD bbox (-79.6, 37.7, -74.9, 39.9) hard-fail guards + length-sanity gate (0.25-4.0
     ratio rejects; 0.5-2.0 required for confidence='high').

Writes a single JSON blob to raw/merged_trails.json for the TS-emitter step.
"""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR / 'raw' / 'mdot'
OUT_PATH = SCRIPT_DIR / 'raw' / 'merged_trails.json'

MD_BBOX = (-79.6, 37.7, -74.9, 39.9)  # lon_min, lat_min, lon_max, lat_max

DATE_PULLED = '2026-04-19'

SOURCE_URLS = {
    'mdot': 'https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services/Maryland_Transportation_Trails_View/FeatureServer/0',
    'nps':  'https://mapservices.nps.gov/arcgis/rest/services/nationalparkservice/NPS_NationalMap_Transportation/MapServer',
    'howard': 'https://opendata.howardcountymd.gov — Howard County Trails',
    'baltimore_city': 'https://gis-baltimore.opendata.arcgis.com — Baltimore City Trails',
    'aa_county': 'https://data.aacounty.org — Anne Arundel County Trails',
    'tuckahoe': 'https://services.arcgis.com — Tuckahoe State Park Trail Inventory',
}


# ────────────────────────────────────────────────────────────────────────────
# Geometry helpers
# ────────────────────────────────────────────────────────────────────────────

def haversine_mi(a: tuple[float, float], b: tuple[float, float]) -> float:
    R = 6371000.0
    lon1, lat1 = a
    lon2, lat2 = b
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return (2 * R * math.asin(math.sqrt(x))) / 1609.344


def polyline_length_mi(coords: list[list[float]]) -> float:
    total = 0.0
    for i in range(1, len(coords)):
        total += haversine_mi(tuple(coords[i - 1]), tuple(coords[i]))
    return total


def count_phantom_jumps(coords: list[list[float]], threshold_mi: float = 0.1) -> int:
    """
    Count segment jumps longer than threshold (in miles). Useful as a signal
    for "this polyline was joined from disjoint source segments" — i.e. the
    join_paths_nearest call left phantom straight-line connectors.
    """
    jumps = 0
    for i in range(1, len(coords)):
        if haversine_mi(tuple(coords[i - 1]), tuple(coords[i])) > threshold_mi:
            jumps += 1
    return jumps


def all_coords_in_md(coords: list[list[float]]) -> bool:
    lon_min, lat_min, lon_max, lat_max = MD_BBOX
    for lon, lat in coords:
        if lon < lon_min or lon > lon_max or lat < lat_min or lat > lat_max:
            return False
    return True


def round_coords(coords: list[list[float]], decimals: int = 6) -> list[list[float]]:
    """Round coords to 6 decimals (~11 cm precision) to keep the TS file small."""
    return [[round(c[0], decimals), round(c[1], decimals)] for c in coords]


def join_paths_nearest(paths: list[list[list[float]]]) -> list[list[float]]:
    """
    Greedy concatenation — given a list of path segments, chain them by joining at
    whichever end of the next segment is closest to the current tail. Prevents
    the "spiderweb" artifact you get from just concatenating paths in storage order.
    Handles cases where a path needs to be reversed to fit.
    """
    if not paths:
        return []
    if len(paths) == 1:
        return list(paths[0])

    remaining = [list(p) for p in paths if p and len(p) >= 2]
    if not remaining:
        return []

    # Start with the longest path (highest vertex count) — it's usually the spine.
    remaining.sort(key=lambda p: -len(p))
    chain = list(remaining.pop(0))

    while remaining:
        tail = tuple(chain[-1])
        head = tuple(chain[0])
        best_i = 0
        best_dist = float('inf')
        best_action: Optional[str] = None  # 'append', 'append_reversed', 'prepend', 'prepend_reversed'
        for i, p in enumerate(remaining):
            p_start = tuple(p[0])
            p_end = tuple(p[-1])
            d_te = haversine_mi(tail, p_start)  # append p normally
            d_tr = haversine_mi(tail, p_end)    # append p reversed
            d_he = haversine_mi(head, p_end)    # prepend p normally
            d_hr = haversine_mi(head, p_start)  # prepend p reversed
            for dist, action in [
                (d_te, 'append'),
                (d_tr, 'append_reversed'),
                (d_he, 'prepend'),
                (d_hr, 'prepend_reversed'),
            ]:
                if dist < best_dist:
                    best_dist = dist
                    best_i = i
                    best_action = action

        next_path = remaining.pop(best_i)
        if best_action == 'append':
            chain.extend(next_path)
        elif best_action == 'append_reversed':
            chain.extend(reversed(next_path))
        elif best_action == 'prepend':
            chain = list(next_path) + chain
        else:  # prepend_reversed
            chain = list(reversed(next_path)) + chain

    return chain


# ────────────────────────────────────────────────────────────────────────────
# ArcGIS loaders
# ────────────────────────────────────────────────────────────────────────────

def load_raw(name: str) -> dict:
    p = RAW_DIR / name
    with p.open() as f:
        return json.load(f)


def feature_paths(feat: dict) -> list[list[list[float]]]:
    g = feat.get('geometry', {}) or {}
    return g.get('paths', []) or []


def feature_flat_coords(feat: dict) -> list[list[float]]:
    paths = feature_paths(feat)
    return [pt for path in paths for pt in path]


# ────────────────────────────────────────────────────────────────────────────
# Whitelist — curated trail definitions
# ────────────────────────────────────────────────────────────────────────────
#
# Each entry is (id, name, park, county, type, difficulty, tags, description,
#                highlights, official_url, published_mi_override, source_key,
#                matcher).
#
# `matcher` is a predicate over a feature's attribute dict — returns True if the
# feature belongs to this whitelist row. This lets us collect multi-segment
# trails from sources that store them as 20+ separate polylines.
#
# `published_mi_override` is the "book" length we'll display as `publishedMi`.
# If None, we use the summed computed length, which trivially passes the
# length-sanity gate (ratio 1.0). When we DO have a book figure, we use it and
# let the gate do its job.
# ────────────────────────────────────────────────────────────────────────────

def mname(attrs: dict, source: str) -> str:
    if source == 'mdot':
        return (attrs.get('Name') or '').strip()
    if source == 'nps':
        return (attrs.get('Name') or '').strip()
    if source == 'howard':
        return (attrs.get('trail_name') or '').strip()
    if source == 'baltimore_city':
        return (attrs.get('Trail') or '').strip()
    if source == 'aa_county':
        # AA schema: TRAIL='existing'/'proposed', NAME='B & A Trail'
        return (attrs.get('NAME') or '').strip()
    if source == 'tuckahoe':
        return (attrs.get('Trail_Name') or '').strip()
    return ''


@dataclass
class Whitelist:
    id: str
    name: str
    park: str
    county: str
    trail_type: str  # 'loop' | 'out-and-back' | 'point-to-point'
    difficulty: str  # 'easy' | 'moderate' | 'strenuous'
    tags: list[str]
    description: str
    highlights: list[str]
    official_url: Optional[str]
    published_mi: Optional[float]
    source_key: str
    matcher_name: str        # name in source layer (exact match on normalized name)
    name_aliases: list[str] = field(default_factory=list)   # alt names to try
    status_existing_only: bool = True     # MDOT/AA: only ship "Existing" / "existing"
    parking_notes: Optional[str] = None
    dog_friendly: bool = True


def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', (s or '').strip().lower())


def matches_wl(attrs: dict, wl: Whitelist) -> bool:
    n = norm(mname(attrs, wl.source_key))
    if not n:
        return False
    names = [norm(wl.matcher_name)] + [norm(a) for a in wl.name_aliases]
    if n not in names:
        return False
    # Status gating
    if wl.status_existing_only:
        if wl.source_key == 'mdot':
            if attrs.get('Status') != 'Existing':
                return False
        elif wl.source_key == 'aa_county':
            if (attrs.get('STATUS') or '').lower() != 'existing trail':
                return False
    return True


WHITELIST: list[Whitelist] = [
    # ── Baltimore City greenways ──
    Whitelist(
        id='md-gwynns-falls-trail',
        name='Gwynns Falls Trail',
        park='Gwynns Falls Leakin Park',
        county='Baltimore City',
        trail_type='point-to-point',
        difficulty='moderate',
        tags=['greenway', 'urban', 'rail-trail', 'paved'],
        description='15+ mile urban greenway from Leakin Park through west Baltimore '
                    'to Middle Branch Park on the harbor. Paved multi-use path with '
                    'frequent access points.',
        highlights=[
            'Leakin Park old-growth forest',
            'Gwynns Falls stream views',
            'Carrie Murray Nature Center connection',
            'Middle Branch / harbor terminus',
        ],
        official_url='https://bcrp.baltimorecity.gov/parks/gwynns-falls-trail',
        published_mi=15.0,
        source_key='baltimore_city',
        matcher_name='Gwynns Falls',
        name_aliases=['Gwynns Falls Ext.-Old Rd'],
    ),
    Whitelist(
        id='md-jones-falls-trail',
        name='Jones Falls Trail',
        park='Baltimore City Parks',
        county='Baltimore City',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['greenway', 'urban', 'paved'],
        description='Paved trail following the Jones Falls stream valley from Mount Washington '
                    'through Druid Hill Park to the Inner Harbor.',
        highlights=['Cylburn Arboretum access', 'Druid Hill Park lake', 'Jones Falls stream views'],
        official_url='https://bcrp.baltimorecity.gov/parks/jones-falls-trail',
        published_mi=10.0,
        source_key='baltimore_city',
        matcher_name='Jones Falls',
    ),
    Whitelist(
        id='md-herring-run-trail',
        name='Herring Run Trail',
        park='Herring Run Park',
        county='Baltimore City',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['greenway', 'urban', 'paved'],
        description='Paved path following Herring Run through Lake Montebello and '
                    'northeast Baltimore parks.',
        highlights=['Lake Montebello loop', 'Herring Run stream valley'],
        official_url='https://bcrp.baltimorecity.gov/parks/herring-run-park',
        published_mi=5.5,
        source_key='baltimore_city',
        matcher_name='Herring Run',
        name_aliases=['Herring Run Extension-N', 'Herring Run Extension S.', 'Herring Run Ext.-MSU'],
    ),
    Whitelist(
        id='md-inner-harbor-promenade',
        name='Inner Harbor Promenade',
        park='Inner Harbor',
        county='Baltimore City',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['waterfront', 'urban', 'paved', 'ada-accessible'],
        description='Waterfront promenade circling Baltimore\'s Inner Harbor, '
                    'Federal Hill, Canton, and Fells Point.',
        highlights=['Federal Hill harbor views', 'Fells Point cobblestones', 'Canton waterfront'],
        official_url='https://bcrp.baltimorecity.gov',
        published_mi=7.0,
        source_key='baltimore_city',
        matcher_name='Inner Harbor Promenade',
    ),
    Whitelist(
        id='md-patapsco-rail-trail-baltimore',
        name='Patapsco Rail-Trail (Baltimore)',
        park='Patapsco Regional',
        county='Baltimore City',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved'],
        description='Rail-trail segment along the Patapsco River corridor in southwest '
                    'Baltimore.',
        highlights=['Patapsco River corridor', 'Rail-trail grade'],
        official_url='https://bcrp.baltimorecity.gov',
        published_mi=None,  # short segment — use computed
        source_key='baltimore_city',
        matcher_name='Patapsco Rail-Trail',
    ),
    Whitelist(
        id='md-patapsco-river-trail-baltimore',
        name='Patapsco River Trail',
        park='Patapsco Regional',
        county='Baltimore City',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['river', 'urban', 'paved'],
        description='Paved path along the Patapsco River in southwest Baltimore.',
        highlights=['Patapsco River', 'Accessible grade'],
        official_url='https://bcrp.baltimorecity.gov',
        published_mi=None,
        source_key='baltimore_city',
        matcher_name='Patapsco River Trail',
    ),

    # ── Patapsco Valley SP — Howard county foot trails ──
    Whitelist(
        id='md-patapsco-cascade-falls',
        name='Cascade Falls Trail',
        park='Patapsco Valley State Park — Orange Grove',
        county='Howard',
        trail_type='loop',
        difficulty='moderate',
        tags=['waterfall', 'stream', 'forest'],
        description='Popular loop past the 20-ft Cascade Falls in the Orange Grove area of '
                    'Patapsco Valley State Park. Rocky footing, multiple stream crossings.',
        highlights=['20-ft Cascade Falls', 'Orange Grove swinging bridge', 'Stream crossings'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=2.1,
        source_key='howard',
        matcher_name='Cascade Falls Trail',
        parking_notes='Service fee per vehicle at the Orange Grove entrance. Lot fills by 10 AM on weekends.',
    ),
    Whitelist(
        id='md-patapsco-morning-choice',
        name='Morning Choice Trail',
        park='Patapsco Valley State Park — McKeldin',
        county='Howard',
        trail_type='out-and-back',
        difficulty='moderate',
        tags=['ridge', 'forest'],
        description='Ridge-spine footpath in the McKeldin area of Patapsco Valley.',
        highlights=['Ridge-spine footpath', 'Mixed hardwood forest'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Morning Choice Trail',
        name_aliases=['X Morning Choice Land'],
    ),
    Whitelist(
        id='md-patapsco-ridge',
        name='Ridge Trail — Patapsco',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='out-and-back',
        difficulty='moderate',
        tags=['ridge', 'overlook'],
        description='Ridgetop footpath with river-valley overlooks.',
        highlights=['River-valley overlooks', 'Ridgetop grade'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Ridge Trail',
        name_aliases=['Rigde Trail'],
    ),
    Whitelist(
        id='md-patapsco-ole-ranger',
        name='Ole Ranger Trail',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='loop',
        difficulty='moderate',
        tags=['forest', 'loop'],
        description='Forested loop in Patapsco Valley — rolling mixed hardwood terrain.',
        highlights=['Forest loop', 'Historic rangers cabin area'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Ole Ranger Trail',
    ),
    Whitelist(
        id='md-patapsco-tulip-poplar',
        name='Tulip Poplar Trail',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['forest', 'family-friendly'],
        description='Gentle forested footpath — good for families and casual walks.',
        highlights=['Mature tulip poplars', 'Gentle grade'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Tulip Poplar Trail',
    ),
    Whitelist(
        id='md-patapsco-rockburn-branch',
        name='Rockburn Branch Trail',
        park='Rockburn Branch Park / Patapsco Regional',
        county='Howard',
        trail_type='loop',
        difficulty='easy',
        tags=['stream', 'forest'],
        description='Loop footpath through Rockburn Branch Park, connecting to the Patapsco corridor.',
        highlights=['Rockburn stream valley', 'Park pavilion access'],
        official_url='https://www.howardcountymd.gov/recreation-parks',
        published_mi=None,
        source_key='howard',
        matcher_name='Rockburn Branch Trail',
    ),
    Whitelist(
        id='md-patapsco-east-branch',
        name='East Branch Trail — Patapsco',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='out-and-back',
        difficulty='moderate',
        tags=['stream', 'forest'],
        description='Stream-corridor footpath along the East Branch of the Patapsco.',
        highlights=['Stream crossings', 'Forested corridor'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='East Branch Trail',
    ),
    Whitelist(
        id='md-patapsco-alberton-spring',
        name='Alberton Spring Trail',
        park='Patapsco Valley State Park — Daniels',
        county='Howard',
        trail_type='out-and-back',
        difficulty='moderate',
        tags=['historic', 'stream'],
        description='Footpath through the former Alberton / Daniels mill town, with a spring crossing.',
        highlights=['Daniels mill-town ruins', 'Alberton Spring crossing'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Alberton Spring Trail',
    ),
    Whitelist(
        id='md-patapsco-peaceful-pond',
        name='Peaceful Pond Trail',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='loop',
        difficulty='easy',
        tags=['pond', 'family-friendly'],
        description='Short loop to a quiet pond inside Patapsco Valley SP.',
        highlights=['Pond wildlife viewing', 'Short loop'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Peaceful Pond Trail',
    ),
    Whitelist(
        id='md-patapsco-old-main-line',
        name='Old Main Line Trail',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['rail-trail', 'historic'],
        description='Grade of the original B&O Old Main Line railbed, now a hiking corridor.',
        highlights=['Historic B&O railbed', 'Easy rail-grade footing'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Old Main Line',
        name_aliases=['Old Main Line Trail'],
    ),
    Whitelist(
        id='md-patapsco-union-dam',
        name='Union Dam Trail',
        park='Patapsco Valley State Park',
        county='Howard',
        trail_type='out-and-back',
        difficulty='moderate',
        tags=['historic', 'river'],
        description='Footpath to the historic Union Dam site along the Patapsco River.',
        highlights=['Union Dam ruins', 'River views'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Patapsco.aspx',
        published_mi=None,
        source_key='howard',
        matcher_name='Union Dam Trail',
    ),

    # ── Anne Arundel County rail-trails ──
    Whitelist(
        id='md-ba-trail',
        name='Baltimore & Annapolis (B&A) Trail',
        park='B&A Trail Park',
        county='Anne Arundel',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'family-friendly', 'ada-accessible'],
        description='13-mile paved rail-trail from Glen Burnie to Annapolis, one of the most '
                    'popular family trails in Maryland.',
        highlights=['Severna Park trail center', 'Planetary walk sculpture series', 'Parole terminus'],
        official_url='https://www.aacounty.org/departments/recreation-parks/parks/ba-trail',
        published_mi=13.0,
        source_key='aa_county',
        matcher_name='B & A Trail',
        name_aliases=['B&A Trail', 'BA Trail'],
    ),
    Whitelist(
        id='md-south-shore-trail-aa',
        name='South Shore Trail',
        park='South Shore Trail',
        county='Anne Arundel',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail'],
        description='Short rail-trail segment along the former South Shore Line corridor.',
        highlights=['Rail-trail grade'],
        official_url='https://www.aacounty.org/departments/recreation-parks',
        published_mi=None,
        source_key='aa_county',
        matcher_name='South Shore Trail',
    ),
    Whitelist(
        id='md-colonial-annapolis-trail',
        name='Colonial Annapolis Trail',
        park='Colonial Annapolis Maritime Trail',
        county='Anne Arundel',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['historic', 'urban', 'waterfront'],
        description='Maritime-heritage walking route through downtown Annapolis and surrounds.',
        highlights=['USNA seawall', 'Historic downtown Annapolis', 'Spa Creek waterfront'],
        official_url='https://www.annapolis.gov',
        published_mi=12.5,
        source_key='aa_county',
        matcher_name='Colonial Annapolis Trail',
    ),

    # ── MDOT statewide rail-trails & greenways ──
    # NCR / Torrey C. Brown
    Whitelist(
        id='md-ncr-torrey-brown',
        name='Torrey C. Brown (NCR) Rail Trail',
        park='Gunpowder Falls State Park',
        county='Baltimore',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'crushed-stone', 'family-friendly'],
        description='The legendary "NCR" — 20-mile crushed-stone rail-trail from Ashland '
                    'to the PA state line, continuing as the York County Heritage Rail Trail '
                    'to York, PA.',
        highlights=[
            'Gunpowder River valley',
            'Monkton Station visitor center',
            'PA state line marker',
            'Crushed-stone surface (running/biking friendly)',
        ],
        official_url='https://dnr.maryland.gov/publiclands/Pages/central/Gunpowder.aspx',
        published_mi=19.9,
        source_key='mdot',
        matcher_name='Torrey C. Brown Rail Trail',
        name_aliases=['Torrey C Brown Rail Trail', 'NCR Trail'],
    ),
    # Capital Crescent
    Whitelist(
        id='md-capital-crescent-trail',
        name='Capital Crescent Trail',
        park='Capital Crescent Trail',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'urban', 'ada-accessible'],
        description='Paved rail-trail from Georgetown (DC) through Bethesda to Silver Spring. '
                    'MD portion runs from the DC line to the Rock Creek Trestle.',
        highlights=['Bethesda trailhead', 'Dalecarlia Tunnel', 'Potomac river views'],
        official_url='https://www.cctrail.org',
        published_mi=7.8,
        source_key='mdot',
        matcher_name='Capital Crescent Trail',
    ),
    # Metropolitan Branch
    Whitelist(
        id='md-metropolitan-branch-trail',
        name='Metropolitan Branch Trail',
        park='Metropolitan Branch Trail',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'urban'],
        description='Paved rail-trail extension running the PG-County side of the Red Line corridor.',
        highlights=['Metro stop access', 'Paved urban grade'],
        official_url='https://www.waba.org',
        published_mi=8.0,
        source_key='mdot',
        matcher_name='Metropolitan Branch Trail',
    ),
    # Rock Creek (MDOT)
    Whitelist(
        id='md-rock-creek-trail-montgomery',
        name='Rock Creek Trail',
        park='Rock Creek Regional Park',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['stream', 'paved', 'rail-trail'],
        description='Paved stream-valley trail from Lake Needwood through Rock Creek Regional '
                    'Park to the DC line.',
        highlights=['Lake Needwood', 'Rock Creek stream valley', 'Meadowbrook stable'],
        official_url='https://www.montgomeryparks.org',
        published_mi=19.9,
        source_key='mdot',
        matcher_name='Rock Creek Trail',
    ),
    # Sligo Creek
    Whitelist(
        id='md-sligo-creek-trail',
        name='Sligo Creek Trail',
        park='Sligo-Dennis Avenue Local Park',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['stream', 'paved', 'urban'],
        description='Paved stream-valley trail from Wheaton through Takoma Park to the Anacostia.',
        highlights=['Stream corridor', 'Connects to Anacostia trail system'],
        official_url='https://www.montgomeryparks.org',
        published_mi=11.3,
        source_key='mdot',
        matcher_name='Sligo Creek Trail',
    ),
    # Northwest Branch
    Whitelist(
        id='md-northwest-branch-trail',
        name='Northwest Branch Trail',
        park='Northwest Branch Stream Valley Park',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='moderate',
        tags=['stream', 'forest', 'rocky'],
        description='Stream-valley hike along the Northwest Branch with rocky, rooty terrain '
                    'and the Kensington / Wheaton stretch\'s scenic gorge.',
        highlights=['Northwest Branch gorge', 'Rocky stream-valley footing', 'Burnt Mills dam'],
        official_url='https://www.montgomeryparks.org',
        published_mi=9.3,
        source_key='mdot',
        matcher_name='Northwest Branch Trail',
    ),
    # Matthew Henson
    Whitelist(
        id='md-matthew-henson-trail',
        name='Matthew Henson Trail',
        park='Matthew Henson Stream Valley Park',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['paved', 'urban', 'ada-accessible'],
        description='Named for Arctic explorer Matthew Henson — paved stream-valley connector '
                    'between Rock Creek and Wheaton.',
        highlights=['Matthew Henson historical signage', 'Paved stream corridor'],
        official_url='https://www.montgomeryparks.org',
        published_mi=4.2,
        source_key='mdot',
        matcher_name='Matthew Henson Trail',
    ),
    # Western Maryland Rail Trail
    Whitelist(
        id='md-western-md-rail-trail',
        name='Western Maryland Rail Trail',
        park='Western Maryland Rail Trail',
        county='Washington',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'family-friendly', 'ada-accessible'],
        description='28-mile paved rail-trail paralleling the C&O Canal Towpath from '
                    'Big Pool through Hancock to Little Orleans.',
        highlights=['Hancock trail town', 'C&O Canal proximity', 'Paved rail-grade'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/western/WesternMDRailTrail.aspx',
        published_mi=27.7,
        source_key='mdot',
        matcher_name='Western Maryland Rail Trail',
    ),
    # Great Allegheny Passage (MD portion)
    Whitelist(
        id='md-great-allegheny-passage',
        name='Great Allegheny Passage (MD)',
        park='Great Allegheny Passage',
        county='Allegany',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'crushed-stone', 'long-distance'],
        description='Maryland section of the 150-mile GAP connecting Pittsburgh to Cumberland, '
                    'where it meets the C&O Canal Towpath for a continuous DC-to-Pittsburgh route.',
        highlights=[
            'Big Savage Tunnel',
            'Eastern Continental Divide marker',
            'Cumberland terminus / C&O junction',
        ],
        official_url='https://gaptrail.org',
        published_mi=20.6,
        source_key='mdot',
        matcher_name='Great Allegheny Passage',
    ),
    # Three Notch Trail (Southern MD)
    Whitelist(
        id='md-three-notch-trail',
        name='Three Notch Trail',
        park='Three Notch Trail',
        county='St. Marys',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved'],
        description='Southern Maryland rail-trail following the Patuxent Railroad '
                    'corridor through St. Mary\'s County.',
        highlights=['Southern MD rural corridor', 'Rail-trail grade'],
        official_url='https://www.stmarysmd.com/recreate/trails',
        published_mi=11.6,
        source_key='mdot',
        matcher_name='Three Notch Trail - Phase III',
    ),
    # Woodrow Wilson Bridge Trail
    Whitelist(
        id='md-woodrow-wilson-bridge-trail',
        name='Woodrow Wilson Bridge Trail',
        park='Woodrow Wilson Bridge',
        county='Prince Georges',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['bridge', 'waterfront', 'paved'],
        description='Pedestrian/bike lane across the Woodrow Wilson Bridge over the Potomac '
                    'River, linking Maryland to Alexandria, VA.',
        highlights=['Potomac River bridge crossing', 'Alexandria connection'],
        official_url='https://www.nps.gov/nace',
        published_mi=3.0,
        source_key='mdot',
        matcher_name='Woodrow Wilson Bridge Trail',
    ),
    # MacArthur Boulevard Bike Path
    Whitelist(
        id='md-macarthur-blvd-trail',
        name='MacArthur Boulevard Bike Path',
        park='MacArthur Boulevard',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['paved', 'bike-path'],
        description='Paved bike/pedestrian path paralleling MacArthur Blvd from Cabin John '
                    'to Great Falls.',
        highlights=['Great Falls terminus', 'Clara Barton House'],
        official_url='https://www.montgomeryparks.org',
        published_mi=7.9,
        source_key='mdot',
        matcher_name='MacArthur Boulevard Bike Path',
    ),
    # Historic Annapolis Trail
    Whitelist(
        id='md-historic-annapolis-trail',
        name='Historic Annapolis Trail',
        park='Historic Annapolis',
        county='Anne Arundel',
        trail_type='loop',
        difficulty='easy',
        tags=['historic', 'urban', 'waterfront'],
        description='Walking circuit through the historic district of Annapolis.',
        highlights=['State House', 'City Dock', 'USNA gate'],
        official_url='https://www.annapolis.gov',
        published_mi=None,  # short — 0.69mi total
        source_key='mdot',
        matcher_name='Historic Annapolis Trail',
    ),
    # Northeast Branch Trail
    Whitelist(
        id='md-northeast-branch-trail',
        name='Northeast Branch Trail',
        park='Northeast Branch Anacostia',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['stream', 'paved'],
        description='Paved trail along the Northeast Branch of the Anacostia River.',
        highlights=['Anacostia tributary', 'Connects to Paint Branch'],
        official_url='https://www.pgparks.com',
        published_mi=4.5,
        source_key='mdot',
        matcher_name='Northeast Branch Trail',
    ),
    # Paint Branch Trail
    Whitelist(
        id='md-paint-branch-trail-pg',
        name="Paint Branch Trail (Prince George's)",
        park='Paint Branch Stream Valley Park',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['stream', 'paved'],
        description='Paved stream-valley trail in PG County connecting College Park to Hyattsville.',
        highlights=['Paint Branch stream', 'College Park trail network'],
        official_url='https://www.pgparks.com',
        published_mi=4.4,
        source_key='mdot',
        matcher_name="Paint Branch Trail Prince George's",
    ),
    # Rhode Island Ave Trolley Trail
    Whitelist(
        id='md-rhode-island-trolley-trail',
        name='Rhode Island Avenue Trolley Trail',
        park='Rhode Island Ave Trolley Trail',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'urban'],
        description='Paved former-trolley right-of-way through PG County.',
        highlights=['Former trolley corridor', 'Urban paved path'],
        official_url='https://www.pgparks.com',
        published_mi=3.9,
        source_key='mdot',
        matcher_name='Rhode Island Avenue Trolley Trail',
    ),
    # Little Paint Branch
    Whitelist(
        id='md-little-paint-branch-trail',
        name='Little Paint Branch Trail',
        park='Little Paint Branch Stream Valley Park',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['stream', 'paved'],
        description='Paved stream-valley trail connecting Beltsville to College Park.',
        highlights=['Stream corridor', 'Beltsville-College Park connector'],
        official_url='https://www.pgparks.com',
        published_mi=4.8,
        source_key='mdot',
        matcher_name='Little Paint Branch Trail "North"',
    ),
    # Intercounty Connector Trail
    Whitelist(
        id='md-icc-trail',
        name='Intercounty Connector Trail',
        park='MD-200 ICC Trail',
        county='Montgomery',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['paved', 'bike-path'],
        description='Paved bike/ped trail paralleling the MD-200 Intercounty Connector.',
        highlights=['MD-200 corridor', 'PG/Montgomery connector'],
        official_url='https://www.mdot.maryland.gov',
        published_mi=8.1,
        source_key='mdot',
        matcher_name='Intercounty Connector Trail',
    ),
    # WB&A Trail (MDOT full entry — supersedes AA fragment)
    Whitelist(
        id='md-wba-trail-full',
        name='WB&A Trail (Full Corridor)',
        park='WB&A Trail',
        county='Prince Georges',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['rail-trail', 'paved', 'long-distance'],
        description='Paved rail-trail along the old Washington-Baltimore & Annapolis corridor, '
                    'spanning PG, AA, and Howard Counties with an active extension project.',
        highlights=['Patuxent River bridge', 'Rail-trail grade through three counties'],
        official_url='https://www.pgparks.com',
        published_mi=12.9,
        source_key='mdot',
        matcher_name='WB&A Trail',
    ),

    # ── NPS trails — the long ones ──
    Whitelist(
        id='md-co-canal-towpath',
        name='C&O Canal Towpath',
        park='Chesapeake & Ohio Canal National Historical Park',
        county='Multi-county',
        trail_type='point-to-point',
        difficulty='easy',
        tags=['long-distance', 'canal', 'historic', 'river', 'crushed-stone'],
        description='184.5-mile crushed-stone towpath from Georgetown (DC) to Cumberland, MD '
                    'following the historic C&O Canal along the Potomac River. Maryland section '
                    'covers roughly 180 miles — the signature long-distance trail of the state.',
        highlights=[
            'Great Falls Tavern visitor center',
            'Paw Paw Tunnel (3,118 ft)',
            'Harpers Ferry access (WV side)',
            'Antietam Creek aqueduct',
            'Cumberland terminus / GAP junction',
            '75+ campsites (Hiker-Biker sites)',
        ],
        official_url='https://www.nps.gov/choh',
        published_mi=184.5,
        source_key='nps',
        matcher_name='Chesapeake & Ohio Canal Towpath',
        parking_notes='Multiple access points with paved parking: Great Falls, Carderock, '
                      'Violette\'s Lock, Brunswick, Harpers Ferry, Williamsport, Hancock, Paw Paw, Cumberland.',
    ),

    # ── Tuckahoe State Park foot trails ──
    Whitelist(
        id='md-tuckahoe-valley-trail',
        name='Tuckahoe Valley Trail',
        park='Tuckahoe State Park',
        county='Queen Anne\'s',
        trail_type='out-and-back',
        difficulty='easy',
        tags=['forest', 'stream', 'family-friendly'],
        description='Signature footpath through Tuckahoe State Park\'s valley forest.',
        highlights=['Tuckahoe Creek stream valley', 'Forested bottomland'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/eastern/Tuckahoe.aspx',
        published_mi=None,  # compute from merged segments
        source_key='tuckahoe',
        matcher_name='Tuckahoe Valley Trail',
    ),
    Whitelist(
        id='md-tuckahoe-creekside-cliff',
        name='Creekside Cliff Trail',
        park='Tuckahoe State Park',
        county='Queen Anne\'s',
        trail_type='loop',
        difficulty='moderate',
        tags=['cliff', 'overlook', 'creek'],
        description='Footpath along the Tuckahoe Creek with small cliff-top overlook points.',
        highlights=['Creekside overlook', 'Hardwood cliff rim'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/eastern/Tuckahoe.aspx',
        published_mi=None,
        source_key='tuckahoe',
        matcher_name='Creekside Cliff Trail',
    ),
    Whitelist(
        id='md-tuckahoe-huckleberry',
        name='Huckleberry Trail',
        park='Tuckahoe State Park',
        county='Queen Anne\'s',
        trail_type='loop',
        difficulty='easy',
        tags=['forest', 'family-friendly'],
        description='Short huckleberry-patch loop in Tuckahoe State Park.',
        highlights=['Huckleberry patches in season', 'Mixed forest'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/eastern/Tuckahoe.aspx',
        published_mi=None,
        source_key='tuckahoe',
        matcher_name='Huckleberry Trail',
    ),
    Whitelist(
        id='md-tuckahoe-lake-trail',
        name='Tuckahoe Lake Trail',
        park='Tuckahoe State Park',
        county='Queen Anne\'s',
        trail_type='loop',
        difficulty='easy',
        tags=['lake', 'family-friendly', 'ada-accessible'],
        description='Loop around the Tuckahoe Lake dam pond.',
        highlights=['Lake shoreline', 'Dam overlook', 'Picnic access'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/eastern/Tuckahoe.aspx',
        published_mi=None,
        source_key='tuckahoe',
        matcher_name='Lake Trail',
    ),
    Whitelist(
        id='md-tuckahoe-piney-branch-loop',
        name='Piney Branch Loop Trail',
        park='Tuckahoe State Park',
        county='Queen Anne\'s',
        trail_type='loop',
        difficulty='moderate',
        tags=['forest', 'stream'],
        description='Longer forest loop through the Piney Branch watershed.',
        highlights=['Piney Branch stream', 'Forested ridge'],
        official_url='https://dnr.maryland.gov/publiclands/Pages/eastern/Tuckahoe.aspx',
        published_mi=None,
        source_key='tuckahoe',
        matcher_name='Piney Branch Loop Trail',
    ),
]


# ────────────────────────────────────────────────────────────────────────────
# Main merger
# ────────────────────────────────────────────────────────────────────────────

def merge_wl(wl: Whitelist, all_layers: dict[str, dict]) -> Optional[dict]:
    layer = all_layers[wl.source_key]
    features = layer.get('features', [])
    matched = [f for f in features if matches_wl(f.get('attributes', {}), wl)]
    if not matched:
        return None

    # Concatenate paths from all matched features. When a single feature has
    # multiple paths, those are already positioned relative to each other — we
    # still feed them through join_paths_nearest since ArcGIS doesn't guarantee
    # path order is geometric order.
    all_paths = []
    for f in matched:
        all_paths.extend(feature_paths(f))

    coords = join_paths_nearest(all_paths)
    if len(coords) < 2:
        return None

    # Guard: bbox
    if not all_coords_in_md(coords):
        return None

    computed_mi = polyline_length_mi(coords)
    # Reject coords that result in absurdly long polylines (possible path-join artifact)
    if computed_mi > 300:
        return None

    published = wl.published_mi if wl.published_mi is not None else computed_mi
    # Length-sanity gate: reject outright if ratio is absurd
    if published > 0:
        ratio = computed_mi / published
        if ratio < 0.25 or ratio > 4.0:
            return None
        confidence = 'high' if (0.5 <= ratio <= 2.0) else 'medium'
        is_approx = not (0.5 <= ratio <= 2.0)
    else:
        confidence = 'high'
        is_approx = False

    # Phantom-jump heuristic: if the joined polyline has many long straight-line
    # jumps between source segments, flag as approximate regardless of length ratio.
    # Threshold: >5 jumps of >0.25mi indicates disjoint source data.
    big_jumps = count_phantom_jumps(coords, threshold_mi=0.25)
    if big_jumps > 5:
        confidence = 'medium'
        is_approx = True

    rounded = round_coords(coords)
    first_pt = rounded[0]

    trail_record = {
        'id': wl.id,
        'name': wl.name,
        'park': wl.park,
        'county': wl.county,
        'type': wl.trail_type,
        'difficulty': wl.difficulty,
        'lengthMi': round(published, 2),
        'elevationGainFt': 0,  # not available in source — HikeTrailBrowser shows "—" when 0
        'estDurationMin': int(published * 25) if published > 0 else 30,  # ~25 min/mi
        'dogFriendly': wl.dog_friendly,
        'seasonOpenMonth': None,
        'seasonCloseMonth': None,
        'trailheadLat': round(first_pt[1], 5),
        'trailheadLon': round(first_pt[0], 5),
        'coordinates': rounded,
        'description': wl.description,
        'tags': wl.tags,
        'highlights': wl.highlights,
        'officialUrl': wl.official_url,
        'parkingNotes': wl.parking_notes,
    }
    trace_record = {
        'id': wl.id,
        'name': wl.name,
        'coordinates': rounded,
        'lengthMi': round(computed_mi, 3),
        'publishedMi': round(published, 2),
        'confidence': confidence,
        'isApproximate': is_approx,
        'source': f'arcgis_{wl.source_key}',
        'sourceUrl': SOURCE_URLS[wl.source_key],
        'datePulled': DATE_PULLED,
    }
    return {'trail': trail_record, 'trace': trace_record, 'n_features': len(matched)}


def main() -> None:
    all_layers = {
        'mdot': load_raw('mdot_statewide_trails.json'),
        'nps': load_raw('nps_trails_md.json'),
        'howard': load_raw('howard_trails.json'),
        'baltimore_city': load_raw('baltimore_city_trails.json'),
        'aa_county': load_raw('aa_county_trails.json'),
        'tuckahoe': load_raw('tuckahoe_trails.json'),
    }

    out_trails = []
    out_traces = []
    out_skipped = []

    for wl in WHITELIST:
        result = merge_wl(wl, all_layers)
        if not result:
            out_skipped.append({'id': wl.id, 'name': wl.name, 'reason': 'no matched features or failed gates'})
            continue
        out_trails.append(result['trail'])
        out_traces.append(result['trace'])
        print(
            f"  ✓ {wl.id:48s} {result['trace']['lengthMi']:6.2f}mi  "
            f"(pub {result['trace']['publishedMi']:6.2f}mi, conf={result['trace']['confidence']}, "
            f"feats={result['n_features']})"
        )

    print()
    print(f'MERGED: {len(out_trails)} trails  (skipped {len(out_skipped)})')
    if out_skipped:
        for s in out_skipped:
            print(f'  ✗ {s["id"]}: {s["reason"]}')

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps({'trails': out_trails, 'traces': out_traces,
                                     'skipped': out_skipped}, indent=2))
    print(f'\nwrote {OUT_PATH}')


if __name__ == '__main__':
    main()
