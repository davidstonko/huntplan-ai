"""
HuntPlan AI — Maryland Seed Data

Pre-extracted, manually verified Maryland hunting regulation data
for the 2025-2026 season. This serves as the initial data load
and as ground truth for the AI to reference.

Source: eRegulations.com/maryland/hunting (scraped March 2026)
Regulation year: 2025-2026

IMPORTANT: Always verify with MD DNR. This data is for planning purposes only.
"""

# =============================================================================
# STATE
# =============================================================================

MARYLAND_STATE = {
    "code": "MD",
    "name": "Maryland",
    "dnr_url": "https://dnr.maryland.gov/wildlife/Pages/hunt/default.aspx",
    "regulation_year": "2025-2026",
    "data_pack_version": "2026.1",
}

# =============================================================================
# REGIONS
# =============================================================================

REGIONS = {
    "A": {
        "name": "Region A",
        "description": "Allegany, Garrett, western Washington County",
        "counties": ["Allegany", "Garrett", "Washington (western)"],
    },
    "B": {
        "name": "Region B",
        "description": "All other Maryland counties",
        "counties": [
            "Anne Arundel", "Baltimore", "Baltimore City", "Calvert",
            "Caroline", "Carroll", "Cecil", "Charles", "Dorchester",
            "Frederick", "Harford", "Howard", "Kent", "Montgomery",
            "Prince George's", "Queen Anne's", "Somerset", "St. Mary's",
            "Talbot", "Washington (eastern)", "Wicomico", "Worcester",
        ],
    },
}

SUBURBAN_DEER_MANAGEMENT_ZONE = [
    "Anne Arundel", "Baltimore", "Howard", "Montgomery", "Prince George's",
]

# =============================================================================
# COUNTIES (all 23 counties + Baltimore City)
# =============================================================================

MARYLAND_COUNTIES = [
    {"name": "Allegany", "sunday_hunting_allowed": True, "sunday_notes": "Private land only for certain species"},
    {"name": "Anne Arundel", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Baltimore", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Baltimore City", "sunday_hunting_allowed": False, "sunday_notes": "No hunting"},
    {"name": "Calvert", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Caroline", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Carroll", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Cecil", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Charles", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Dorchester", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Frederick", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Garrett", "sunday_hunting_allowed": True, "sunday_notes": "Private land only for certain species"},
    {"name": "Harford", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Howard", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Kent", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Montgomery", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Prince George's", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Queen Anne's", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Somerset", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "St. Mary's", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Talbot", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Washington", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Wicomico", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
    {"name": "Worcester", "sunday_hunting_allowed": True, "sunday_notes": "Certain species on private and select public land"},
]

# =============================================================================
# SPECIES
# =============================================================================

MARYLAND_SPECIES = [
    {"name": "White-tailed Deer", "category": "big_game", "description": "Most popular game animal in Maryland. Found statewide."},
    {"name": "Sika Deer", "category": "big_game", "description": "Non-native elk species found primarily on Maryland's Lower Eastern Shore (Dorchester County)."},
    {"name": "Wild Turkey", "category": "turkey", "description": "Spring and fall seasons. Expanding population statewide."},
    {"name": "Canada Goose", "category": "waterfowl", "description": "Resident and migratory populations."},
    {"name": "Mallard", "category": "waterfowl", "description": "Most common duck species in Maryland."},
    {"name": "Wood Duck", "category": "waterfowl", "description": "Found in wooded swamps and streams."},
    {"name": "Eastern Cottontail", "category": "small_game", "description": "Rabbit. Found statewide."},
    {"name": "Gray Squirrel", "category": "small_game", "description": "Found statewide in hardwood forests."},
    {"name": "Mourning Dove", "category": "small_game", "description": "Migratory game bird with September opening."},
    {"name": "Woodcock", "category": "small_game", "description": "Migratory upland bird."},
    {"name": "Ruffed Grouse", "category": "small_game", "description": "Found in western Maryland mountains."},
    {"name": "Pheasant", "category": "small_game", "description": "Stocked on some public lands."},
    {"name": "Red Fox", "category": "furbearer", "description": "Found statewide."},
    {"name": "Gray Fox", "category": "furbearer", "description": "Found statewide."},
    {"name": "Raccoon", "category": "furbearer", "description": "Found statewide."},
    {"name": "Coyote", "category": "furbearer", "description": "Expanding range. Open year-round in Maryland."},
    {"name": "Black Bear", "category": "big_game", "description": "Limited season in Garrett and Allegany counties."},
]

# =============================================================================
# DEER SEASONS — 2025-2026
# =============================================================================

DEER_SEASONS = [
    # --- JUNIOR DEER HUNT DAYS ---
    {
        "name": "Junior Deer Hunt Days",
        "species": "White-tailed Deer",
        "weapon_type": "all_legal",
        "start_date": "2025-11-15",
        "end_date": "2025-11-16",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Hunters age 16 or younger only. Must be accompanied by licensed adult 21+, who must be unarmed. No antler point restriction for juniors.",
        "sunday_allowed": True,
        "sunday_notes": "Nov 16 in certain counties only",
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # --- ARCHERY DEER SEASON ---
    {
        "name": "Archery Deer Season (Early)",
        "species": "White-tailed Deer",
        "weapon_type": "bow",
        "start_date": "2025-09-05",
        "end_date": "2025-10-15",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long. One deer per year may not meet 3-point requirement.",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Archery stamp required. Longbows, recurve bows, compound bows, crossbows permitted. Min 30lb draw (vertical), 75lb draw (crossbow).",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "name": "Archery Deer Season (Sunday dates)",
        "species": "White-tailed Deer",
        "weapon_type": "bow",
        "start_date": "2025-10-19",
        "end_date": "2025-11-28",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Sundays only during this period. Archery stamp required.",
        "sunday_allowed": True,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "name": "Archery Deer Season (Late)",
        "species": "White-tailed Deer",
        "weapon_type": "bow",
        "start_date": "2025-12-15",
        "end_date": "2025-12-19",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Archery stamp required.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "name": "Archery Deer Season (January)",
        "species": "White-tailed Deer",
        "weapon_type": "bow",
        "start_date": "2026-01-12",
        "end_date": "2026-01-31",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Archery stamp required. Includes Sundays Jan 4-8 in certain counties.",
        "sunday_allowed": True,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # --- MUZZLELOADER DEER SEASON ---
    {
        "name": "Muzzleloader Deer Season (Early)",
        "species": "White-tailed Deer",
        "weapon_type": "muzzleloader",
        "start_date": "2025-10-16",
        "end_date": "2025-10-18",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Muzzleloader stamp required. Min .40 caliber, 60 grains black powder. Bonus stamp prohibited during this period. Fluorescent clothing required.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "name": "Muzzleloader Deer Season (Late)",
        "species": "White-tailed Deer",
        "weapon_type": "muzzleloader",
        "start_date": "2025-12-20",
        "end_date": "2026-01-03",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Muzzleloader stamp required. Min .40 caliber, 60 grains black powder. Fluorescent clothing required.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # --- FIREARMS DEER SEASON ---
    {
        "name": "Firearms Deer Season",
        "species": "White-tailed Deer",
        "weapon_type": "firearm",
        "start_date": "2025-11-29",
        "end_date": "2025-12-13",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Shotguns 28ga+, rifles 1200 ft-lbs muzzle energy, handguns 700 ft-lbs with 6in+ barrel, air guns .40cal+ at 400 ft-lbs. Fluorescent orange required.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "name": "Firearms Deer Season (January, Region B)",
        "species": "White-tailed Deer",
        "weapon_type": "firearm",
        "start_date": "2026-01-09",
        "end_date": "2026-01-11",
        "region": "Region B",
        "sex_restrictions": "either_sex",
        "antler_restrictions": "2+ points on one antler, or one antler 3+ inches long",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Region B only. Fluorescent orange required.",
        "sunday_allowed": True,
        "sunday_notes": "Jan 11 is Sunday",
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # --- PRIMITIVE DEER HUNT DAYS ---
    {
        "name": "Primitive Deer Hunt Days",
        "species": "White-tailed Deer",
        "weapon_type": "primitive",
        "start_date": "2026-02-02",
        "end_date": "2026-02-04",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Long bows, recurve bows, flintlock and sidelock percussion muzzleloaders only. No draw-locks, no telescopic/electronic sights. Fluorescent clothing required.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
]

# =============================================================================
# DEER BAG LIMITS
# =============================================================================

DEER_BAG_LIMITS = [
    # Antlered White-tailed Deer
    {
        "species": "White-tailed Deer",
        "season_type": "all",
        "region": "Statewide",
        "sex_specific": "antlered",
        "daily_limit": 1,
        "season_limit": 2,
        "notes": "Max 1 antlered per weapon season. Max 2 total antlered for all seasons combined. Region B hunters may take 3rd antlered with Bonus Antlered Deer Stamp.",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # Antlerless White-tailed Deer — Region A
    {
        "species": "White-tailed Deer",
        "season_type": "all",
        "region": "Region A",
        "sex_specific": "antlerless",
        "daily_limit": 1,
        "season_limit": 2,
        "notes": "Up to 2 antlerless per season. No more than 2 total for all seasons combined. 1 additional during Primitive Days (doesn't count toward regular limit).",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # Antlerless White-tailed Deer — Region B
    {
        "species": "White-tailed Deer",
        "season_type": "archery",
        "region": "Region B",
        "sex_specific": "antlerless",
        "daily_limit": None,
        "season_limit": 15,
        "notes": "15 deer limit. UNLIMITED in Suburban Deer Management Zone (Anne Arundel, Baltimore, Howard, Montgomery, Prince George's).",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "species": "White-tailed Deer",
        "season_type": "muzzleloader",
        "region": "Region B",
        "sex_specific": "antlerless",
        "daily_limit": None,
        "season_limit": 10,
        "notes": "10 antlerless deer during muzzleloader season in Region B.",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
    {
        "species": "White-tailed Deer",
        "season_type": "firearms",
        "region": "Region B",
        "sex_specific": "antlerless",
        "daily_limit": None,
        "season_limit": 10,
        "notes": "10 antlerless deer during firearms season in Region B.",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },

    # Sika Deer
    {
        "species": "Sika Deer",
        "season_type": "all",
        "region": "Statewide",
        "sex_specific": "either",
        "daily_limit": None,
        "season_limit": 3,
        "notes": "3 sika deer total, max 1 antlered. Annual Sika Stamp required. Bonus Antlered Deer Stamps may NOT be used for sika.",
        "source_url": "https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits",
    },
]

# =============================================================================
# TURKEY SEASONS — 2025-2026
# =============================================================================

TURKEY_SEASONS = [
    {
        "name": "Junior Turkey Hunt Days",
        "species": "Wild Turkey",
        "weapon_type": "shotgun",
        "start_date": "2026-04-11",
        "end_date": "2026-04-12",
        "region": "Statewide",
        "sex_restrictions": "bearded_only",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "sunset",
        "special_conditions": "Hunters 16 or younger only. Accompanied by licensed adult 21+, unarmed. Apr 12 in select counties only. Shotguns (#4 or smaller), crossbows, vertical bows, air guns.",
        "sunday_allowed": True,
        "sunday_notes": "Apr 12 (Sunday) in select counties only",
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
    {
        "name": "Spring Turkey Season",
        "species": "Wild Turkey",
        "weapon_type": "shotgun",
        "start_date": "2026-04-18",
        "end_date": "2026-05-23",
        "region": "Statewide",
        "sex_restrictions": "bearded_only",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "noon (Apr 18-May 9) / sunset (May 10-23)",
        "special_conditions": "Bearded turkeys only. Shotguns (#4 or smaller), crossbows, vertical bows, air guns. No bait. No electronic calls or decoys. Includes select Sundays.",
        "sunday_allowed": True,
        "sunday_notes": "Select Sundays during season",
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
    {
        "name": "Fall Turkey Season",
        "species": "Wild Turkey",
        "weapon_type": "all_legal",
        "start_date": "2025-11-01",
        "end_date": "2025-11-09",
        "region": "Allegany, Garrett, Washington counties",
        "sex_restrictions": "either_sex",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "Allegany, Garrett, Washington counties ONLY. Air guns, crossbows, handguns, shotguns (#4/single projectile), rifles, vertical bows. 1 turkey (either sex) combined with Winter season.",
        "sunday_allowed": True,
        "sunday_notes": "Select Sundays",
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
    {
        "name": "Winter Turkey Season",
        "species": "Wild Turkey",
        "weapon_type": "shotgun",
        "start_date": "2026-01-22",
        "end_date": "2026-01-24",
        "region": "Statewide",
        "sex_restrictions": "either_sex",
        "shooting_hours_start": "30 min before sunrise",
        "shooting_hours_end": "30 min after sunset",
        "special_conditions": "1 turkey (either sex) combined with Fall season bag limit. Shotguns (#4 or smaller), crossbows, vertical bows, air guns.",
        "sunday_allowed": False,
        "permit_required": False,
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
]

TURKEY_BAG_LIMITS = [
    {
        "species": "Wild Turkey",
        "season_type": "spring",
        "region": "Statewide",
        "sex_specific": "bearded",
        "daily_limit": 1,
        "season_limit": 2,
        "notes": "1 bearded turkey per day, 2 per spring season.",
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
    {
        "species": "Wild Turkey",
        "season_type": "fall_winter",
        "region": "Statewide",
        "sex_specific": "either",
        "daily_limit": 1,
        "season_limit": 1,
        "notes": "1 turkey (either sex) COMBINED for fall and winter seasons.",
        "source_url": "https://www.eregulations.com/maryland/hunting/turkey-seasons-limits",
    },
]

# =============================================================================
# WEAPON RESTRICTIONS
# =============================================================================

WEAPON_RESTRICTIONS = [
    # Archery
    {"weapon_type": "bow", "restriction": "Vertical bows: minimum 30 pounds draw weight. Longbows, recurve bows, compound bows permitted.", "species_category": "big_game"},
    {"weapon_type": "crossbow", "restriction": "Minimum 75 pounds draw weight. Permitted during all archery seasons.", "species_category": "big_game"},

    # Muzzleloader
    {"weapon_type": "muzzleloader", "restriction": "Minimum .40 caliber with 60 grains of black powder or equivalent. Handguns: .40 caliber, 40 grains black powder, 6-inch minimum barrel.", "species_category": "big_game"},

    # Firearms
    {"weapon_type": "firearm", "restriction": "Shotguns: 28 gauge or larger. Rifles: minimum 1,200 foot-pounds muzzle energy. Handguns: 700+ foot-pounds muzzle energy, 6+ inch barrel.", "species_category": "big_game"},
    {"weapon_type": "air_gun", "restriction": ".40 caliber or larger, minimum 400 foot-pounds energy for deer. Arrows/bolts for turkey.", "species_category": "big_game"},

    # Turkey-specific
    {"weapon_type": "shotgun", "restriction": "Turkey: #4 shot or smaller only. Maximum 3 shells in gun. No electronic calls or decoys.", "species_category": "turkey"},
]

# =============================================================================
# ALL SEASONS + BAG LIMITS (combined for easy import)
# =============================================================================

ALL_SEASONS = DEER_SEASONS + TURKEY_SEASONS
ALL_BAG_LIMITS = DEER_BAG_LIMITS + TURKEY_BAG_LIMITS
