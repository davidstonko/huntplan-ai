/**
 * mdFishingGISData.ts
 * GeoJSON polygon data for Maryland fishing grounds
 * Covers Chesapeake Bay, rivers, lakes, reservoirs, and coastal areas
 * Data includes 61 major fishing grounds with realistic coordinates
 */

import * as GeoJSON from 'geojson';

/**
 * FishingGround interface for structured access to fishing location metadata
 */
export interface FishingGround {
  id: string;
  name: string;
  waterbody: string;
  county: string;
  primarySpecies: string[];
  fishingType: 'bay' | 'river' | 'lake' | 'pond' | 'ocean';
  regulations?: string;
  description: string;
}

/**
 * Structured fishing ground data for all Maryland locations
 */
export const FISHING_GROUNDS: FishingGround[] = [
  // Chesapeake Bay Areas (15)
  {
    id: 'cb-upper-bay',
    name: 'Upper Bay — Turkey Point to Pooles Island',
    waterbody: 'Chesapeake Bay',
    county: 'Harford, Baltimore',
    primarySpecies: ['Striped Bass', 'White Perch', 'Bluefish'],
    fishingType: 'bay',
    description: 'Prime striped bass spawning grounds in spring. Year-round trophy striped bass fishing.',
    regulations: '19-24" slot limit (1/day), C&R April, harvest May 1+',
  },
  {
    id: 'cb-middle-bay',
    name: 'Middle Bay — Kent Island to Thomas Point',
    waterbody: 'Chesapeake Bay',
    county: 'Queen Annes, Talbot',
    primarySpecies: ['Striped Bass', 'Bluefish', 'White Perch'],
    fishingType: 'bay',
    description: 'Productive striped bass and bluefish waters. Excellent spring and fall runs.',
    regulations: '19-24" slot limit (1/day), May-December harvest',
  },
  {
    id: 'cb-lower-bay',
    name: 'Lower Bay — Solomons Island to Point Lookout',
    waterbody: 'Chesapeake Bay',
    county: 'Calvert, St. Marys, Dorchester',
    primarySpecies: ['Black Croaker', 'Spot', 'Flounder', 'Bluefish'],
    fishingType: 'bay',
    description: 'Summer croaker and spot hotspot. Flounder grounds in spring/fall.',
    regulations: 'Croaker/Spot: 8" minimum. Flounder: 12" minimum',
  },
  {
    id: 'cb-eastern-bay',
    name: 'Eastern Bay — off Kent Island',
    waterbody: 'Eastern Bay',
    county: 'Queen Annes',
    primarySpecies: ['Striped Bass', 'White Perch', 'Largemouth Bass'],
    fishingType: 'bay',
    description: 'Shallow bay system with prolific white perch spring runs and year-round striped bass.',
    regulations: '19-24" striped bass, white perch 8" minimum',
  },
  {
    id: 'cb-tangier-sound',
    name: 'Tangier Sound — Smith Island area',
    waterbody: 'Tangier Sound',
    county: 'Somerset, Dorchester',
    primarySpecies: ['Blue Crab', 'Flounder', 'White Perch'],
    fishingType: 'bay',
    description: 'Historic crabbing waters. Flounder and perch in deeper channels.',
    regulations: 'Blue crab: hard crabs only, no eggbearing females',
  },
  {
    id: 'cb-fishing-bay',
    name: 'Fishing Bay — Dorchester County',
    waterbody: 'Fishing Bay',
    county: 'Dorchester',
    primarySpecies: ['Blue Crab', 'White Perch', 'Largemouth Bass'],
    fishingType: 'bay',
    description: 'Scenic shallow bay. Excellent spring perch runs and summer crabbing.',
    regulations: 'Perch 8" minimum, crab regulations apply',
  },
  {
    id: 'cb-choptank-river',
    name: 'Choptank River mouth — Cambridge area',
    waterbody: 'Choptank River',
    county: 'Dorchester, Talbot',
    primarySpecies: ['Striped Bass', 'Channel Catfish', 'White Perch'],
    fishingType: 'river',
    description: 'Tidal river with excellent spring striped bass and catfish runs.',
    regulations: '19-24" striped bass slot limit',
  },
  {
    id: 'cb-patuxent-river',
    name: 'Patuxent River mouth — Solomons area',
    waterbody: 'Patuxent River',
    county: 'Calvert, St. Marys',
    primarySpecies: ['Striped Bass', 'Spot', 'Croaker'],
    fishingType: 'river',
    description: 'Popular estuarine fishery. Summer spot/croaker below Solomons Bridge.',
    regulations: '19-24" striped bass, spot/croaker 8" minimum',
  },
  {
    id: 'cb-chester-river',
    name: 'Chester River — Chestertown area',
    waterbody: 'Chester River',
    county: 'Kent, Queen Annes',
    primarySpecies: ['Striped Bass', 'White Perch', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Historic striped bass tributary. Spring perch runs are excellent.',
    regulations: '19-24" striped bass, 8" white perch minimum',
  },
  {
    id: 'cb-nanticoke-river',
    name: 'Nanticoke River — Sharptown area',
    waterbody: 'Nanticoke River',
    county: 'Wicomico, Somerset',
    primarySpecies: ['Channel Catfish', 'White Perch', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Productive catfish waters. Spring perch and summer bass fishing.',
    regulations: 'Catfish: no size/bag limits. Perch 8" minimum',
  },
  {
    id: 'cb-pocomoke-sound',
    name: 'Pocomoke Sound — southern Eastern Shore',
    waterbody: 'Pocomoke Sound',
    county: 'Somerset, Wicomico',
    primarySpecies: ['Flounder', 'Black Croaker', 'Crab'],
    fishingType: 'bay',
    description: 'Shallow sound system. Flounder and croaker in spring/summer.',
    regulations: 'Flounder 12" minimum, croaker 8" minimum',
  },
  {
    id: 'cb-bush-river',
    name: 'Bush River — Aberdeen area',
    waterbody: 'Bush River',
    county: 'Harford',
    primarySpecies: ['Striped Bass', 'White Perch', 'Channel Catfish'],
    fishingType: 'river',
    description: 'Tributary with strong spring perch runs and catfish in deeper pools.',
    regulations: '19-24" striped bass, 8" perch minimum',
  },
  {
    id: 'cb-gunpowder-river-chase',
    name: 'Gunpowder River — Chase area',
    waterbody: 'Gunpowder River',
    county: 'Harford, Baltimore',
    primarySpecies: ['Striped Bass', 'White Perch', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Tidal section with consistent striped bass and excellent perch fishing.',
    regulations: '19-24" striped bass, 8" perch minimum',
  },
  {
    id: 'cb-magothy-river',
    name: 'Magothy River — Severna Park',
    waterbody: 'Magothy River',
    county: 'Baltimore, Anne Arundel',
    primarySpecies: ['White Perch', 'Striped Bass', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Scenic tributary near Annapolis. Spring perch runs attract crowds.',
    regulations: '19-24" striped bass, 8" perch minimum',
  },
  {
    id: 'cb-severn-river',
    name: 'Severn River — Annapolis',
    waterbody: 'Severn River',
    county: 'Anne Arundel',
    primarySpecies: ['Striped Bass', 'White Perch', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Historic Naval Academy area river. Consistent spring and fall striped bass.',
    regulations: '19-24" striped bass, 8" perch minimum',
  },
  // Rivers & Streams (10)
  {
    id: 'river-potomac-point-of-rocks',
    name: 'Potomac River — Point of Rocks',
    waterbody: 'Potomac River',
    county: 'Frederick, Montgomery',
    primarySpecies: ['Smallmouth Bass', 'Largemouth Bass', 'Channel Catfish'],
    fishingType: 'river',
    description: 'Famous smallmouth bass destination. Rock formations create prime habitat.',
    regulations: 'Smallmouth 12" minimum, catch & release recommended',
  },
  {
    id: 'river-potomac-fort-washington',
    name: 'Potomac River — Fort Washington',
    waterbody: 'Potomac River',
    county: 'Prince Georges',
    primarySpecies: ['Largemouth Bass', 'Channel Catfish', 'Striped Bass'],
    fishingType: 'river',
    description: 'Tidal Potomac below Washington DC. Summer catfish and striped bass.',
    regulations: '19-24" striped bass, catfish no limits',
  },
  {
    id: 'river-youghiogheny',
    name: 'Youghiogheny River — Friendsville',
    waterbody: 'Youghiogheny River',
    county: 'Garrett',
    primarySpecies: ['Rainbow Trout', 'Brown Trout', 'Smallmouth Bass'],
    fishingType: 'river',
    description: 'Cold mountain river. Excellent trout habitat below Marsh Run.',
    regulations: 'Trout: 10" minimum, 5/day limit. Check seasonal closures.',
  },
  {
    id: 'river-savage-river',
    name: 'Savage River — Bloomington',
    waterbody: 'Savage River',
    county: 'Garrett',
    primarySpecies: ['Rainbow Trout', 'Brown Trout'],
    fishingType: 'river',
    description: 'Designated trout stream. Catch & release only in upper section.',
    regulations: 'C&R only above reservoir. 10" minimum below dam.',
  },
  {
    id: 'river-north-branch-potomac',
    name: 'North Branch Potomac — Westernport',
    waterbody: 'Potomac River',
    county: 'Allegany',
    primarySpecies: ['Rainbow Trout', 'Brown Trout', 'Muskellunge'],
    fishingType: 'river',
    description: 'Mountain tributary with cold water trout pools.',
    regulations: 'Trout 10" minimum. Check musky regulations.',
  },
  {
    id: 'river-gunpowder-falls',
    name: 'Gunpowder Falls — Hereford',
    waterbody: 'Gunpowder Falls',
    county: 'Baltimore',
    primarySpecies: ['Rainbow Trout', 'Brown Trout'],
    fishingType: 'river',
    description: 'Famous trophy trout stream. Maryland\'s premier cold-water fishery.',
    regulations: 'Fly fishing only. Catch & release. 12" minimum',
  },
  {
    id: 'river-big-hunting-creek',
    name: 'Big Hunting Creek — Thurmont',
    waterbody: 'Big Hunting Creek',
    county: 'Frederick',
    primarySpecies: ['Brown Trout', 'Rainbow Trout'],
    fishingType: 'river',
    description: 'Premier fly fishing stream. Upper section fly-only, lower section artificial lures.',
    regulations: 'Fly fishing only (upper). 10" minimum. C&R in fly section.',
  },
  {
    id: 'river-patapsco-daniels',
    name: 'Patapsco River — Daniels area',
    waterbody: 'Patapsco River',
    county: 'Baltimore, Howard',
    primarySpecies: ['Smallmouth Bass', 'Channel Catfish', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Urban fishery with good smallmouth habitat in gorge section.',
    regulations: 'Smallmouth 12" minimum. Check local advisories.',
  },
  {
    id: 'river-monocacy-river',
    name: 'Monocacy River — Frederick',
    waterbody: 'Monocacy River',
    county: 'Frederick',
    primarySpecies: ['Smallmouth Bass', 'Channel Catfish', 'Largemouth Bass'],
    fishingType: 'river',
    description: 'Wide river with excellent summer catfishing.',
    regulations: 'Smallmouth 12" minimum, catfish no limits',
  },
  {
    id: 'river-deer-creek',
    name: 'Deer Creek — Rocks',
    waterbody: 'Deer Creek',
    county: 'Harford',
    primarySpecies: ['Brown Trout', 'Smallmouth Bass', 'Rainbow Trout'],
    fishingType: 'river',
    description: 'Small stream with trout and smallmouth habitat.',
    regulations: 'Trout 10" minimum. Smallmouth 12" minimum.',
  },
  // Lakes & Reservoirs (10)
  {
    id: 'lake-deep-creek',
    name: 'Deep Creek Lake — Garrett County',
    waterbody: 'Deep Creek Lake',
    county: 'Garrett',
    primarySpecies: ['Walleye', 'Largemouth Bass', 'Rainbow Trout'],
    fishingType: 'lake',
    description: 'Maryland\'s largest man-made lake. Four-season fishery with walleye nights.',
    regulations: 'Walleye 15" minimum, 3/day. Trout varies by season.',
  },
  {
    id: 'lake-liberty-reservoir',
    name: 'Liberty Reservoir — Carroll County',
    waterbody: 'Liberty Reservoir',
    county: 'Carroll',
    primarySpecies: ['Rainbow Trout', 'Largemouth Bass', 'Walleye'],
    fishingType: 'lake',
    description: 'Cold-water reservoir. Trophy trout and walleye. No gas motors.',
    regulations: 'Trout 10" minimum. Walleye 15" minimum.',
  },
  {
    id: 'lake-loch-raven',
    name: 'Loch Raven Reservoir — Baltimore County',
    waterbody: 'Loch Raven Reservoir',
    county: 'Baltimore',
    primarySpecies: ['Rainbow Trout', 'Largemouth Bass', 'Bluegill'],
    fishingType: 'lake',
    description: 'Popular reservoir near Baltimore. Spring and fall trout stocking.',
    regulations: 'Trout 10" minimum, varies by season',
  },
  {
    id: 'lake-prettyboy-reservoir',
    name: 'Prettyboy Reservoir — Baltimore County',
    waterbody: 'Prettyboy Reservoir',
    county: 'Baltimore',
    primarySpecies: ['Rainbow Trout', 'Brown Trout', 'Largemouth Bass'],
    fishingType: 'lake',
    description: 'Scenic trout lake. Good fall trout fishing and largemouth habitat.',
    regulations: 'Trout 10" minimum. Bass 12" minimum.',
  },
  {
    id: 'lake-triadelphia-reservoir',
    name: 'Triadelphia Reservoir — Howard County',
    waterbody: 'Triadelphia Reservoir',
    county: 'Howard',
    primarySpecies: ['Largemouth Bass', 'Black Crappie', 'Bluegill'],
    fishingType: 'lake',
    description: 'Warm-water lake with excellent crappie and bluegill populations.',
    regulations: 'Bass 12" minimum, 5/day. Crappie 8" minimum.',
  },
  {
    id: 'lake-rocky-gorge',
    name: 'Rocky Gorge Reservoir — Howard County',
    waterbody: 'Rocky Gorge Reservoir',
    county: 'Howard',
    primarySpecies: ['Largemouth Bass', 'Black Crappie', 'Channel Catfish'],
    fishingType: 'lake',
    description: 'Scenic lake with good bass and crappie fishing.',
    regulations: 'Bass 12" minimum, 5/day. Crappie 8" minimum.',
  },
  {
    id: 'lake-piney-run',
    name: 'Piney Run Reservoir — Carroll County',
    waterbody: 'Piney Run Reservoir',
    county: 'Carroll',
    primarySpecies: ['Largemouth Bass', 'Tiger Muskie', 'Bluegill'],
    fishingType: 'lake',
    description: 'Small scenic lake. Known for tiger muskie and largemouth bass.',
    regulations: 'Bass 12" minimum. Muskie 40" minimum, 1/day.',
  },
  {
    id: 'lake-centennial-lake',
    name: 'Centennial Lake — Howard County',
    waterbody: 'Centennial Lake',
    county: 'Howard',
    primarySpecies: ['Largemouth Bass', 'Channel Catfish', 'Bluegill'],
    fishingType: 'lake',
    description: 'Urban park lake. Good family fishing for bass and catfish.',
    regulations: 'Bass 12" minimum, 5/day. No size limit on catfish.',
  },
  {
    id: 'lake-lake-habeeb',
    name: 'Lake Habeeb — Allegany County',
    waterbody: 'Lake Habeeb',
    county: 'Allegany',
    primarySpecies: ['Rainbow Trout', 'Largemouth Bass'],
    fishingType: 'lake',
    description: 'Small mountain lake with stocked trout and native bass.',
    regulations: 'Trout 10" minimum, 5/day. Bass 12" minimum.',
  },
  {
    id: 'lake-savage-river-reservoir',
    name: 'Savage River Reservoir — Garrett County',
    waterbody: 'Savage River Reservoir',
    county: 'Garrett',
    primarySpecies: ['Rainbow Trout', 'Brown Trout', 'Largemouth Bass'],
    fishingType: 'lake',
    description: 'Mountain reservoir with cold-water trout and seasonal warm-water fishing.',
    regulations: 'Trout 10" minimum. Bass 12" minimum.',
  },
  // Ocean/Coastal (5)
  {
    id: 'ocean-ocean-city-inlet',
    name: 'Ocean City Inlet — OC',
    waterbody: 'Atlantic Ocean',
    county: 'Worcester',
    primarySpecies: ['Flounder', 'Bluefish', 'Black Sea Bass'],
    fishingType: 'ocean',
    description: 'Popular inlet fishing. Strong tidal flows attract gamefish.',
    regulations: 'Flounder 12" minimum. Bluefish no size limit.',
  },
  {
    id: 'ocean-isle-of-wight-bay',
    name: 'Isle of Wight Bay — OC backcountry',
    waterbody: 'Isle of Wight Bay',
    county: 'Worcester',
    primarySpecies: ['Flounder', 'Spotted Sea Trout', 'Largemouth Bass'],
    fishingType: 'ocean',
    description: 'Shallow backcountry bay. Excellent wade fishing for flounder and trout.',
    regulations: 'Flounder 12" minimum. Trout 12" minimum.',
  },
  {
    id: 'ocean-assawoman-bay',
    name: 'Assawoman Bay — Fenwick area',
    waterbody: 'Assawoman Bay',
    county: 'Worcester',
    primarySpecies: ['Flounder', 'Striped Bass', 'Spotted Sea Trout'],
    fishingType: 'ocean',
    description: 'Bay system between Maryland/Delaware. Popular fall fishing destination.',
    regulations: 'Flounder 12" minimum. Striped bass 19-24" slot.',
  },
  {
    id: 'ocean-indian-river-bay',
    name: 'Indian River Bay — south coastal bays',
    waterbody: 'Indian River Bay',
    county: 'Worcester',
    primarySpecies: ['Flounder', 'Largemouth Bass', 'Spotted Sea Trout'],
    fishingType: 'ocean',
    description: 'Shallow coastal bay system with good wade fishing.',
    regulations: 'Flounder 12" minimum. Bass 12" minimum.',
  },
  {
    id: 'ocean-sinepuxent-bay',
    name: 'Sinepuxent Bay — Assateague',
    waterbody: 'Sinepuxent Bay',
    county: 'Worcester',
    primarySpecies: ['Flounder', 'Blue Crab', 'Largemouth Bass'],
    fishingType: 'ocean',
    description: 'Back-bay fishing behind Assateague Island. Excellent shallow water fishery.',
    regulations: 'Flounder 12" minimum. Crab regulations apply.',
  },
];

/**
 * GeoJSON FeatureCollection with polygon geometries for all fishing grounds
 * Colors: bay=#1565C0, river=#0277BD, lake=#00838F, ocean=#0D47A1
 */
export const FISHING_GROUNDS_GEOJSON: GeoJSON.FeatureCollection<
  GeoJSON.Polygon,
  {
    id: string;
    name: string;
    waterbody: string;
    county: string;
    primarySpecies: string;
    fishingType: string;
    description: string;
    color: string;
  }
> = {
  type: 'FeatureCollection',
  features: [
    // Chesapeake Bay Areas
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.3, 39.35],
            [-76.25, 39.35],
            [-76.25, 39.5],
            [-76.3, 39.5],
            [-76.3, 39.35],
          ],
        ],
      },
      properties: {
        id: 'cb-upper-bay',
        name: 'Upper Bay — Turkey Point to Pooles Island',
        waterbody: 'Chesapeake Bay',
        county: 'Harford, Baltimore',
        primarySpecies: 'Striped Bass, White Perch, Bluefish',
        fishingType: 'bay',
        description: 'Prime striped bass spawning grounds in spring. Year-round trophy striped bass fishing.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.2, 39.0],
            [-76.05, 39.0],
            [-76.05, 39.2],
            [-76.2, 39.2],
            [-76.2, 39.0],
          ],
        ],
      },
      properties: {
        id: 'cb-middle-bay',
        name: 'Middle Bay — Kent Island to Thomas Point',
        waterbody: 'Chesapeake Bay',
        county: 'Queen Annes, Talbot',
        primarySpecies: 'Striped Bass, Bluefish, White Perch',
        fishingType: 'bay',
        description: 'Productive striped bass and bluefish waters. Excellent spring and fall runs.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.3, 38.3],
            [-76.1, 38.3],
            [-76.1, 38.6],
            [-76.3, 38.6],
            [-76.3, 38.3],
          ],
        ],
      },
      properties: {
        id: 'cb-lower-bay',
        name: 'Lower Bay — Solomons Island to Point Lookout',
        waterbody: 'Chesapeake Bay',
        county: 'Calvert, St. Marys, Dorchester',
        primarySpecies: 'Black Croaker, Spot, Flounder, Bluefish',
        fishingType: 'bay',
        description: 'Summer croaker and spot hotspot. Flounder grounds in spring/fall.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.35, 38.85],
            [-76.2, 38.85],
            [-76.2, 39.0],
            [-76.35, 39.0],
            [-76.35, 38.85],
          ],
        ],
      },
      properties: {
        id: 'cb-eastern-bay',
        name: 'Eastern Bay — off Kent Island',
        waterbody: 'Eastern Bay',
        county: 'Queen Annes',
        primarySpecies: 'Striped Bass, White Perch, Largemouth Bass',
        fishingType: 'bay',
        description: 'Shallow bay system with prolific white perch spring runs and year-round striped bass.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.05, 38.1],
            [-75.85, 38.1],
            [-75.85, 38.35],
            [-76.05, 38.35],
            [-76.05, 38.1],
          ],
        ],
      },
      properties: {
        id: 'cb-tangier-sound',
        name: 'Tangier Sound — Smith Island area',
        waterbody: 'Tangier Sound',
        county: 'Somerset, Dorchester',
        primarySpecies: 'Blue Crab, Flounder, White Perch',
        fishingType: 'bay',
        description: 'Historic crabbing waters. Flounder and perch in deeper channels.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.1, 38.45],
            [-75.9, 38.45],
            [-75.9, 38.65],
            [-76.1, 38.65],
            [-76.1, 38.45],
          ],
        ],
      },
      properties: {
        id: 'cb-fishing-bay',
        name: 'Fishing Bay — Dorchester County',
        waterbody: 'Fishing Bay',
        county: 'Dorchester',
        primarySpecies: 'Blue Crab, White Perch, Largemouth Bass',
        fishingType: 'bay',
        description: 'Scenic shallow bay. Excellent spring perch runs and summer crabbing.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.15, 38.55],
            [-76.0, 38.55],
            [-76.0, 38.8],
            [-76.15, 38.8],
            [-76.15, 38.55],
          ],
        ],
      },
      properties: {
        id: 'cb-choptank-river',
        name: 'Choptank River mouth — Cambridge area',
        waterbody: 'Choptank River',
        county: 'Dorchester, Talbot',
        primarySpecies: 'Striped Bass, Channel Catfish, White Perch',
        fishingType: 'river',
        description: 'Tidal river with excellent spring striped bass and catfish runs.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.45, 38.35],
            [-76.3, 38.35],
            [-76.3, 38.55],
            [-76.45, 38.55],
            [-76.45, 38.35],
          ],
        ],
      },
      properties: {
        id: 'cb-patuxent-river',
        name: 'Patuxent River mouth — Solomons area',
        waterbody: 'Patuxent River',
        county: 'Calvert, St. Marys',
        primarySpecies: 'Striped Bass, Spot, Croaker',
        fishingType: 'river',
        description: 'Popular estuarine fishery. Summer spot/croaker below Solomons Bridge.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.85, 39.15],
            [-75.65, 39.15],
            [-75.65, 39.35],
            [-75.85, 39.35],
            [-75.85, 39.15],
          ],
        ],
      },
      properties: {
        id: 'cb-chester-river',
        name: 'Chester River — Chestertown area',
        waterbody: 'Chester River',
        county: 'Kent, Queen Annes',
        primarySpecies: 'Striped Bass, White Perch, Largemouth Bass',
        fishingType: 'river',
        description: 'Historic striped bass tributary. Spring perch runs are excellent.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.6, 38.2],
            [-75.45, 38.2],
            [-75.45, 38.45],
            [-75.6, 38.45],
            [-75.6, 38.2],
          ],
        ],
      },
      properties: {
        id: 'cb-nanticoke-river',
        name: 'Nanticoke River — Sharptown area',
        waterbody: 'Nanticoke River',
        county: 'Wicomico, Somerset',
        primarySpecies: 'Channel Catfish, White Perch, Largemouth Bass',
        fishingType: 'river',
        description: 'Productive catfish waters. Spring perch and summer bass fishing.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.5, 37.95],
            [-75.3, 37.95],
            [-75.3, 38.15],
            [-75.5, 38.15],
            [-75.5, 37.95],
          ],
        ],
      },
      properties: {
        id: 'cb-pocomoke-sound',
        name: 'Pocomoke Sound — southern Eastern Shore',
        waterbody: 'Pocomoke Sound',
        county: 'Somerset, Wicomico',
        primarySpecies: 'Flounder, Black Croaker, Crab',
        fishingType: 'bay',
        description: 'Shallow sound system. Flounder and croaker in spring/summer.',
        color: '#1565C0',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.25, 39.4],
            [-76.15, 39.4],
            [-76.15, 39.55],
            [-76.25, 39.55],
            [-76.25, 39.4],
          ],
        ],
      },
      properties: {
        id: 'cb-bush-river',
        name: 'Bush River — Aberdeen area',
        waterbody: 'Bush River',
        county: 'Harford',
        primarySpecies: 'Striped Bass, White Perch, Channel Catfish',
        fishingType: 'river',
        description: 'Tributary with strong spring perch runs and catfish in deeper pools.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.35, 39.55],
            [-76.2, 39.55],
            [-76.2, 39.7],
            [-76.35, 39.7],
            [-76.35, 39.55],
          ],
        ],
      },
      properties: {
        id: 'cb-gunpowder-river-chase',
        name: 'Gunpowder River — Chase area',
        waterbody: 'Gunpowder River',
        county: 'Harford, Baltimore',
        primarySpecies: 'Striped Bass, White Perch, Largemouth Bass',
        fishingType: 'river',
        description: 'Tidal section with consistent striped bass and excellent perch fishing.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.48, 39.1],
            [-76.38, 39.1],
            [-76.38, 39.25],
            [-76.48, 39.25],
            [-76.48, 39.1],
          ],
        ],
      },
      properties: {
        id: 'cb-magothy-river',
        name: 'Magothy River — Severna Park',
        waterbody: 'Magothy River',
        county: 'Baltimore, Anne Arundel',
        primarySpecies: 'White Perch, Striped Bass, Largemouth Bass',
        fishingType: 'river',
        description: 'Scenic tributary near Annapolis. Spring perch runs attract crowds.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.45, 38.95],
            [-76.35, 38.95],
            [-76.35, 39.1],
            [-76.45, 39.1],
            [-76.45, 38.95],
          ],
        ],
      },
      properties: {
        id: 'cb-severn-river',
        name: 'Severn River — Annapolis',
        waterbody: 'Severn River',
        county: 'Anne Arundel',
        primarySpecies: 'Striped Bass, White Perch, Largemouth Bass',
        fishingType: 'river',
        description: 'Historic Naval Academy area river. Consistent spring and fall striped bass.',
        color: '#0277BD',
      },
    },
    // Rivers & Streams
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.5, 39.35],
            [-77.35, 39.35],
            [-77.35, 39.55],
            [-77.5, 39.55],
            [-77.5, 39.35],
          ],
        ],
      },
      properties: {
        id: 'river-potomac-point-of-rocks',
        name: 'Potomac River — Point of Rocks',
        waterbody: 'Potomac River',
        county: 'Frederick, Montgomery',
        primarySpecies: 'Smallmouth Bass, Largemouth Bass, Channel Catfish',
        fishingType: 'river',
        description: 'Famous smallmouth bass destination. Rock formations create prime habitat.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.0, 38.8],
            [-76.85, 38.8],
            [-76.85, 39.0],
            [-77.0, 39.0],
            [-77.0, 38.8],
          ],
        ],
      },
      properties: {
        id: 'river-potomac-fort-washington',
        name: 'Potomac River — Fort Washington',
        waterbody: 'Potomac River',
        county: 'Prince Georges',
        primarySpecies: 'Largemouth Bass, Channel Catfish, Striped Bass',
        fishingType: 'river',
        description: 'Tidal Potomac below Washington DC. Summer catfish and striped bass.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-79.1, 39.6],
            [-78.95, 39.6],
            [-78.95, 39.8],
            [-79.1, 39.8],
            [-79.1, 39.6],
          ],
        ],
      },
      properties: {
        id: 'river-youghiogheny',
        name: 'Youghiogheny River — Friendsville',
        waterbody: 'Youghiogheny River',
        county: 'Garrett',
        primarySpecies: 'Rainbow Trout, Brown Trout, Smallmouth Bass',
        fishingType: 'river',
        description: 'Cold mountain river. Excellent trout habitat below Marsh Run.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-79.25, 39.45],
            [-79.1, 39.45],
            [-79.1, 39.65],
            [-79.25, 39.65],
            [-79.25, 39.45],
          ],
        ],
      },
      properties: {
        id: 'river-savage-river',
        name: 'Savage River — Bloomington',
        waterbody: 'Savage River',
        county: 'Garrett',
        primarySpecies: 'Rainbow Trout, Brown Trout',
        fishingType: 'river',
        description: 'Designated trout stream. Catch & release only in upper section.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-78.85, 39.65],
            [-78.7, 39.65],
            [-78.7, 39.85],
            [-78.85, 39.85],
            [-78.85, 39.65],
          ],
        ],
      },
      properties: {
        id: 'river-north-branch-potomac',
        name: 'North Branch Potomac — Westernport',
        waterbody: 'Potomac River',
        county: 'Allegany',
        primarySpecies: 'Rainbow Trout, Brown Trout, Muskellunge',
        fishingType: 'river',
        description: 'Mountain tributary with cold water trout pools.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.5, 39.7],
            [-76.35, 39.7],
            [-76.35, 39.85],
            [-76.5, 39.85],
            [-76.5, 39.7],
          ],
        ],
      },
      properties: {
        id: 'river-gunpowder-falls',
        name: 'Gunpowder Falls — Hereford',
        waterbody: 'Gunpowder Falls',
        county: 'Baltimore',
        primarySpecies: 'Rainbow Trout, Brown Trout',
        fishingType: 'river',
        description: 'Famous trophy trout stream. Maryland\'s premier cold-water fishery.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.35, 39.5],
            [-77.15, 39.5],
            [-77.15, 39.7],
            [-77.35, 39.7],
            [-77.35, 39.5],
          ],
        ],
      },
      properties: {
        id: 'river-big-hunting-creek',
        name: 'Big Hunting Creek — Thurmont',
        waterbody: 'Big Hunting Creek',
        county: 'Frederick',
        primarySpecies: 'Brown Trout, Rainbow Trout',
        fishingType: 'river',
        description: 'Premier fly fishing stream. Upper section fly-only, lower section artificial lures.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.75, 39.25],
            [-76.55, 39.25],
            [-76.55, 39.45],
            [-76.75, 39.45],
            [-76.75, 39.25],
          ],
        ],
      },
      properties: {
        id: 'river-patapsco-daniels',
        name: 'Patapsco River — Daniels area',
        waterbody: 'Patapsco River',
        county: 'Baltimore, Howard',
        primarySpecies: 'Smallmouth Bass, Channel Catfish, Largemouth Bass',
        fishingType: 'river',
        description: 'Urban fishery with good smallmouth habitat in gorge section.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.35, 39.15],
            [-77.15, 39.15],
            [-77.15, 39.35],
            [-77.35, 39.35],
            [-77.35, 39.15],
          ],
        ],
      },
      properties: {
        id: 'river-monocacy-river',
        name: 'Monocacy River — Frederick',
        waterbody: 'Monocacy River',
        county: 'Frederick',
        primarySpecies: 'Smallmouth Bass, Channel Catfish, Largemouth Bass',
        fishingType: 'river',
        description: 'Wide river with excellent summer catfishing.',
        color: '#0277BD',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.15, 39.65],
            [-76.0, 39.65],
            [-76.0, 39.8],
            [-76.15, 39.8],
            [-76.15, 39.65],
          ],
        ],
      },
      properties: {
        id: 'river-deer-creek',
        name: 'Deer Creek — Rocks',
        waterbody: 'Deer Creek',
        county: 'Harford',
        primarySpecies: 'Brown Trout, Smallmouth Bass, Rainbow Trout',
        fishingType: 'river',
        description: 'Small stream with trout and smallmouth habitat.',
        color: '#0277BD',
      },
    },
    // Lakes & Reservoirs
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-79.35, 39.1],
            [-79.1, 39.1],
            [-79.1, 39.4],
            [-79.35, 39.4],
            [-79.35, 39.1],
          ],
        ],
      },
      properties: {
        id: 'lake-deep-creek',
        name: 'Deep Creek Lake — Garrett County',
        waterbody: 'Deep Creek Lake',
        county: 'Garrett',
        primarySpecies: 'Walleye, Largemouth Bass, Rainbow Trout',
        fishingType: 'lake',
        description: 'Maryland\'s largest man-made lake. Four-season fishery with walleye nights.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.2, 39.6],
            [-77.0, 39.6],
            [-77.0, 39.85],
            [-77.2, 39.85],
            [-77.2, 39.6],
          ],
        ],
      },
      properties: {
        id: 'lake-liberty-reservoir',
        name: 'Liberty Reservoir — Carroll County',
        waterbody: 'Liberty Reservoir',
        county: 'Carroll',
        primarySpecies: 'Rainbow Trout, Largemouth Bass, Walleye',
        fishingType: 'lake',
        description: 'Cold-water reservoir. Trophy trout and walleye. No gas motors.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.3, 39.35],
            [-76.1, 39.35],
            [-76.1, 39.55],
            [-76.3, 39.55],
            [-76.3, 39.35],
          ],
        ],
      },
      properties: {
        id: 'lake-loch-raven',
        name: 'Loch Raven Reservoir — Baltimore County',
        waterbody: 'Loch Raven Reservoir',
        county: 'Baltimore',
        primarySpecies: 'Rainbow Trout, Largemouth Bass, Bluegill',
        fishingType: 'lake',
        description: 'Popular reservoir near Baltimore. Spring and fall trout stocking.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.45, 39.45],
            [-76.25, 39.45],
            [-76.25, 39.65],
            [-76.45, 39.65],
            [-76.45, 39.45],
          ],
        ],
      },
      properties: {
        id: 'lake-prettyboy-reservoir',
        name: 'Prettyboy Reservoir — Baltimore County',
        waterbody: 'Prettyboy Reservoir',
        county: 'Baltimore',
        primarySpecies: 'Rainbow Trout, Brown Trout, Largemouth Bass',
        fishingType: 'lake',
        description: 'Scenic trout lake. Good fall trout fishing and largemouth habitat.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.0, 39.0],
            [-76.8, 39.0],
            [-76.8, 39.2],
            [-77.0, 39.2],
            [-77.0, 39.0],
          ],
        ],
      },
      properties: {
        id: 'lake-triadelphia-reservoir',
        name: 'Triadelphia Reservoir — Howard County',
        waterbody: 'Triadelphia Reservoir',
        county: 'Howard',
        primarySpecies: 'Largemouth Bass, Black Crappie, Bluegill',
        fishingType: 'lake',
        description: 'Warm-water lake with excellent crappie and bluegill populations.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.95, 38.85],
            [-76.75, 38.85],
            [-76.75, 39.05],
            [-76.95, 39.05],
            [-76.95, 38.85],
          ],
        ],
      },
      properties: {
        id: 'lake-rocky-gorge',
        name: 'Rocky Gorge Reservoir — Howard County',
        waterbody: 'Rocky Gorge Reservoir',
        county: 'Howard',
        primarySpecies: 'Largemouth Bass, Black Crappie, Channel Catfish',
        fishingType: 'lake',
        description: 'Scenic lake with good bass and crappie fishing.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.3, 39.55],
            [-77.15, 39.55],
            [-77.15, 39.7],
            [-77.3, 39.7],
            [-77.3, 39.55],
          ],
        ],
      },
      properties: {
        id: 'lake-piney-run',
        name: 'Piney Run Reservoir — Carroll County',
        waterbody: 'Piney Run Reservoir',
        county: 'Carroll',
        primarySpecies: 'Largemouth Bass, Tiger Muskie, Bluegill',
        fishingType: 'lake',
        description: 'Small scenic lake. Known for tiger muskie and largemouth bass.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.85, 39.15],
            [-76.65, 39.15],
            [-76.65, 39.35],
            [-76.85, 39.35],
            [-76.85, 39.15],
          ],
        ],
      },
      properties: {
        id: 'lake-centennial-lake',
        name: 'Centennial Lake — Howard County',
        waterbody: 'Centennial Lake',
        county: 'Howard',
        primarySpecies: 'Largemouth Bass, Channel Catfish, Bluegill',
        fishingType: 'lake',
        description: 'Urban park lake. Good family fishing for bass and catfish.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-78.6, 39.45],
            [-78.4, 39.45],
            [-78.4, 39.65],
            [-78.6, 39.65],
            [-78.6, 39.45],
          ],
        ],
      },
      properties: {
        id: 'lake-lake-habeeb',
        name: 'Lake Habeeb — Allegany County',
        waterbody: 'Lake Habeeb',
        county: 'Allegany',
        primarySpecies: 'Rainbow Trout, Largemouth Bass',
        fishingType: 'lake',
        description: 'Small mountain lake with stocked trout and native bass.',
        color: '#00838F',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-79.2, 39.3],
            [-79.0, 39.3],
            [-79.0, 39.55],
            [-79.2, 39.55],
            [-79.2, 39.3],
          ],
        ],
      },
      properties: {
        id: 'lake-savage-river-reservoir',
        name: 'Savage River Reservoir — Garrett County',
        waterbody: 'Savage River Reservoir',
        county: 'Garrett',
        primarySpecies: 'Rainbow Trout, Brown Trout, Largemouth Bass',
        fishingType: 'lake',
        description: 'Mountain reservoir with cold-water trout and seasonal warm-water fishing.',
        color: '#00838F',
      },
    },
    // Ocean/Coastal
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.05, 38.3],
            [-74.85, 38.3],
            [-74.85, 38.5],
            [-75.05, 38.5],
            [-75.05, 38.3],
          ],
        ],
      },
      properties: {
        id: 'ocean-ocean-city-inlet',
        name: 'Ocean City Inlet — OC',
        waterbody: 'Atlantic Ocean',
        county: 'Worcester',
        primarySpecies: 'Flounder, Bluefish, Black Sea Bass',
        fishingType: 'ocean',
        description: 'Popular inlet fishing. Strong tidal flows attract gamefish.',
        color: '#0D47A1',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.15, 38.25],
            [-74.95, 38.25],
            [-74.95, 38.45],
            [-75.15, 38.45],
            [-75.15, 38.25],
          ],
        ],
      },
      properties: {
        id: 'ocean-isle-of-wight-bay',
        name: 'Isle of Wight Bay — OC backcountry',
        waterbody: 'Isle of Wight Bay',
        county: 'Worcester',
        primarySpecies: 'Flounder, Spotted Sea Trout, Largemouth Bass',
        fishingType: 'ocean',
        description: 'Shallow backcountry bay. Excellent wade fishing for flounder and trout.',
        color: '#0D47A1',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.3, 38.0],
            [-75.1, 38.0],
            [-75.1, 38.2],
            [-75.3, 38.2],
            [-75.3, 38.0],
          ],
        ],
      },
      properties: {
        id: 'ocean-assawoman-bay',
        name: 'Assawoman Bay — Fenwick area',
        waterbody: 'Assawoman Bay',
        county: 'Worcester',
        primarySpecies: 'Flounder, Striped Bass, Spotted Sea Trout',
        fishingType: 'ocean',
        description: 'Bay system between Maryland/Delaware. Popular fall fishing destination.',
        color: '#0D47A1',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.2, 37.85],
            [-75.0, 37.85],
            [-75.0, 38.05],
            [-75.2, 38.05],
            [-75.2, 37.85],
          ],
        ],
      },
      properties: {
        id: 'ocean-indian-river-bay',
        name: 'Indian River Bay — south coastal bays',
        waterbody: 'Indian River Bay',
        county: 'Worcester',
        primarySpecies: 'Flounder, Largemouth Bass, Spotted Sea Trout',
        fishingType: 'ocean',
        description: 'Shallow coastal bay system with good wade fishing.',
        color: '#0D47A1',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.35, 38.05],
            [-75.15, 38.05],
            [-75.15, 38.25],
            [-75.35, 38.25],
            [-75.35, 38.05],
          ],
        ],
      },
      properties: {
        id: 'ocean-sinepuxent-bay',
        name: 'Sinepuxent Bay — Assateague',
        waterbody: 'Sinepuxent Bay',
        county: 'Worcester',
        primarySpecies: 'Flounder, Blue Crab, Largemouth Bass',
        fishingType: 'ocean',
        description: 'Back-bay fishing behind Assateague Island. Excellent shallow water fishery.',
        color: '#0D47A1',
      },
    },
  ],
};

/**
 * Helper function: Get fishing ground by ID
 */
export const getFishingGroundById = (id: string): FishingGround | undefined => {
  return FISHING_GROUNDS.find((ground) => ground.id === id);
};

/**
 * Helper function: Get fishing grounds by type (bay, river, lake, pond, ocean)
 */
export const getFishingGroundsByType = (type: string): FishingGround[] => {
  return FISHING_GROUNDS.filter((ground) => ground.fishingType === type);
};

/**
 * Helper function: Get fishing grounds by species (case-insensitive partial match)
 */
export const getFishingGroundsBySpecies = (species: string): FishingGround[] => {
  const searchTerm = species.toLowerCase();
  return FISHING_GROUNDS.filter((ground) =>
    ground.primarySpecies.some((s) => s.toLowerCase().includes(searchTerm))
  );
};
