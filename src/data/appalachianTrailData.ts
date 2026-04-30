/**
 * appalachianTrailData.ts
 *
 * Comprehensive Appalachian Trail (AT) Maryland data for hiking and camping.
 * Covers the 40.9-mile Maryland section from Harpers Ferry (VA-WV border)
 * to Pen Mar Park (PA-MD border). Includes shelters, trailheads, landmarks,
 * side trails, resources, and the Four States Challenge route.
 *
 * Data sources:
 * - Appalachian Trail Conservancy (ATC)
 * - Potomac Appalachian Trail Club (PATC)
 * - Maryland DNR
 * - USGS and topographic surveys
 * - Community trail databases (AllTrails, FarOut, SectionHiker)
 *
 * Last updated: 2026-04-11
 */

import type { GeoJSON } from 'geojson';

/**
 * Represents a shelter or campsite on the Appalachian Trail.
 */
export interface ATShelter {
  /** Unique identifier for the shelter */
  id: string;
  /** Official shelter name */
  name: string;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Elevation above sea level in feet */
  elevation: number;
  /** Approximate sleeping capacity */
  capacity: number;
  /** Description of water source (e.g., "Spring 0.4 mi down") */
  waterSource: string;
  /** Whether water source is reliable year-round */
  waterReliable: boolean;
  /** Distance from previous shelter in miles */
  distanceFromPrevious: number;
  /** Year shelter was built or rebuilt */
  yearBuilt?: number;
  /** Detailed description of shelter features and condition */
  description: string;
  /** Whether shelter has an outhouse */
  hasPrivy: boolean;
  /** Whether nearby tent sites are available */
  hasTentSites: boolean;
}

/**
 * Represents a trailhead or parking area for AT access.
 */
export interface ATTrailhead {
  /** Unique identifier for the trailhead */
  id: string;
  /** Official trailhead name */
  name: string;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Approximate parking capacity in vehicles */
  parkingCapacity: number;
  /** Available facilities (e.g., restrooms, picnic areas) */
  facilities: string[];
  /** Detailed description of access and amenities */
  description: string;
  /** Type of use this trailhead supports */
  accessType: 'day_hike' | 'backpacking' | 'both';
}

/**
 * Represents a notable landmark, overlook, or point of interest on the AT.
 */
export interface ATLandmark {
  /** Unique identifier for the landmark */
  id: string;
  /** Official landmark name */
  name: string;
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Elevation above sea level in feet */
  elevation: number;
  /** Type of landmark */
  type: 'scenic_overlook' | 'historic_monument' | 'geological' | 'summit' | 'waterway' | 'park';
  /** Detailed description of the landmark */
  description: string;
  /** Historical significance if applicable */
  historicalSignificance?: string;
}

/**
 * Represents a side trail or connector trail near the AT.
 */
export interface ATSideTrail {
  /** Unique identifier for the side trail */
  id: string;
  /** Official trail name */
  name: string;
  /** Latitude where trail connects to AT */
  connectionLat: number;
  /** Longitude where trail connects to AT */
  connectionLng: number;
  /** Total distance of the side trail in miles */
  totalDistance: number;
  /** Relative difficulty rating */
  difficulty: 'easy' | 'moderate' | 'strenuous';
  /** Description of the trail and its features */
  description: string;
  /** Optional URL to trail information or map */
  websiteUrl?: string;
}

/**
 * Represents a resource (guide, map, forum, etc.) related to AT hiking.
 */
export interface ATResource {
  /** Unique identifier for the resource */
  id: string;
  /** Title of the resource */
  title: string;
  /** URL to the resource */
  url: string;
  /** Category of resource */
  category: 'official' | 'map' | 'guide' | 'blog' | 'community' | 'challenge';
  /** Brief description of what the resource provides */
  description: string;
}

/**
 * Summary information about the Maryland AT section.
 */
export interface ATRouteInfo {
  /** Total distance of Maryland section in miles */
  totalMiles: number;
  /** Lowest elevation in feet (Potomac River) */
  elevationLow: number;
  /** Highest elevation in feet (High Rock) */
  elevationHigh: number;
  /** Total elevation gain in feet */
  totalElevationGain: number;
  /** Overall difficulty description */
  difficulty: string;
  /** Typical duration for completion */
  typicalDays: string;
  /** Starting point with coordinates */
  entryPoint: { name: string; lat: number; lng: number };
  /** Ending point with coordinates */
  exitPoint: { name: string; lat: number; lng: number };
  /** Detailed description of the route */
  description: string;
}

/**
 * Represents the Four States Challenge hiking route.
 */
export interface FourStatesChallenge {
  /** Name of the challenge */
  name: string;
  /** Total distance in miles */
  totalMiles: number;
  /** States included in the challenge */
  states: string[];
  /** Starting point with coordinates */
  startPoint: { name: string; lat: number; lng: number; state: string };
  /** Ending point with coordinates */
  endPoint: { name: string; lat: number; lng: number; state: string };
  /** Description of the challenge */
  description: string;
  /** Difficulty rating */
  difficulty: string;
  /** Typical time to complete */
  typicalTime: string;
  /** Related resources for the challenge */
  resources: ATResource[];
}

/**
 * Waypoint along the AT route for drawing the trail polyline on maps.
 */
export interface ATRouteWaypoint {
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Approximate AT mile marker (0.0 = Harpers Ferry) */
  mile: number;
  /** Optional label for key points */
  label?: string;
}

// ============================================================================
// ROUTE INFORMATION
// ============================================================================

/**
 * Summary information about the Maryland AT section.
 * 40.9 miles from Potomac River (Harpers Ferry) to Pen Mar Park (PA border).
 */
export const AT_ROUTE_INFO: ATRouteInfo = {
  totalMiles: 40.9,
  elevationLow: 261,
  elevationHigh: 1905,
  totalElevationGain: 6791,
  difficulty:
    'Moderate — one of the easier AT sections, mostly ridgeline hiking along South Mountain',
  typicalDays: '3-5 days backpacking, or 18-20 hours for experienced thru-hikers',
  entryPoint: {
    name: 'Potomac River / Harpers Ferry',
    lat: 39.325,
    lng: -77.7286,
  },
  exitPoint: {
    name: 'Pen Mar Park (PA Border)',
    lat: 39.7178,
    lng: -77.5072,
  },
  description:
    'The AT follows the ridgeline of South Mountain through Maryland, offering scenic overlooks, Civil War history, and well-maintained trail. Camping restricted to designated sites only. The section transitions from river valley to high ridges, with some of the most iconic viewpoints on the entire AT corridor.',
};

// ============================================================================
// ROUTE WAYPOINTS
// ============================================================================

/**
 * Waypoints along the AT route for drawing the trail polyline.
 * Approximately 25 key points from south (Harpers Ferry) to north (Pen Mar).
 */
export const AT_ROUTE_WAYPOINTS: ATRouteWaypoint[] = [
  { lat: 39.325, lng: -77.7286, mile: 0, label: 'Potomac River Crossing' },
  { lat: 39.3411, lng: -77.6858, mile: 1.2, label: 'Weverton Cliffs' },
  { lat: 39.3667, lng: -77.675, mile: 3.5 },
  { lat: 39.385, lng: -77.6636, mile: 5.2, label: 'Ed Garvey Shelter' },
  { lat: 39.4033, lng: -77.65, mile: 7.0 },
  { lat: 39.4167, lng: -77.6389, mile: 8.5, label: 'Crampton Gap' },
  { lat: 39.435, lng: -77.6333, mile: 10.2, label: 'Gathland State Park' },
  { lat: 39.4556, lng: -77.6222, mile: 12.5 },
  { lat: 39.4722, lng: -77.6139, mile: 14.0, label: 'Rocky Run Shelter' },
  { lat: 39.49, lng: -77.6056, mile: 16.0, label: 'Turner\'s Gap / South Mountain' },
  { lat: 39.5044, lng: -77.6028, mile: 17.5, label: 'Washington Monument' },
  { lat: 39.52, lng: -77.5972, mile: 19.0 },
  { lat: 39.5356, lng: -77.6042, mile: 20.5, label: 'Pine Knob Shelter' },
  { lat: 39.5439, lng: -77.6056, mile: 21.8, label: 'I-70 Crossing' },
  { lat: 39.5583, lng: -77.6028, mile: 23.0, label: 'US 40 Crossing' },
  { lat: 39.5722, lng: -77.5917, mile: 25.0, label: 'Annapolis Rock' },
  { lat: 39.5867, lng: -77.5861, mile: 26.5, label: 'Black Rock Cliffs' },
  { lat: 39.605, lng: -77.575, mile: 28.5, label: 'Pogo Memorial Campsite' },
  { lat: 39.6233, lng: -77.5639, mile: 30.5, label: 'Raven Rock Shelter' },
  { lat: 39.6417, lng: -77.5528, mile: 32.5, label: 'Ensign Cowall Shelter' },
  { lat: 39.66, lng: -77.5417, mile: 34.5 },
  { lat: 39.6783, lng: -77.5306, mile: 36.5, label: 'Wolfsville Road' },
  { lat: 39.695, lng: -77.5194, mile: 38.5, label: 'Devil\'s Racecourse' },
  { lat: 39.7044, lng: -77.5139, mile: 39.5, label: 'High Rock' },
  { lat: 39.7178, lng: -77.5072, mile: 40.9, label: 'Pen Mar Park' },
];

// ============================================================================
// SHELTERS & CAMPSITES
// ============================================================================

/**
 * Array of AT shelters and campsites in Maryland, ordered south to north.
 */
export const AT_SHELTERS: ATShelter[] = [
  {
    id: 'ed-garvey',
    name: 'Ed Garvey Shelter',
    lat: 39.385,
    lng: -77.6636,
    elevation: 890,
    capacity: 12,
    waterSource: 'Spring 0.4 mi down (380 ft descent)',
    waterReliable: true,
    distanceFromPrevious: 0,
    yearBuilt: 2005,
    description:
      'Two-story shelter near Harpers Ferry entry. Tiered bunks, gear hooks, tent sites nearby. Recently maintained. Popular first night for southbound hikers.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'crampton-gap',
    name: 'Crampton Gap Shelter',
    lat: 39.4167,
    lng: -77.6389,
    elevation: 750,
    capacity: 6,
    waterSource: 'Frost-free spigot at Gathland SP',
    waterReliable: true,
    distanceFromPrevious: 5.7,
    yearBuilt: 1941,
    description:
      'Historic 1941 shelter near Gathland State Park. Water from park spigot. Small lean-to, intimate setting. Good for small groups.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'rocky-run',
    name: 'Rocky Run Shelter',
    lat: 39.4722,
    lng: -77.6139,
    elevation: 800,
    capacity: 16,
    waterSource: 'Spring adjacent to shelter',
    waterReliable: true,
    distanceFromPrevious: 5.8,
    yearBuilt: 2008,
    description:
      'Recently rebuilt shelter with sleeping loft, pine floor. Popular mid-section camping spot. Ample tent sites available. Well-maintained by PATC.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'pine-knob',
    name: 'Pine Knob Shelter',
    lat: 39.5356,
    lng: -77.6042,
    elevation: 1100,
    capacity: 8,
    waterSource: 'Spring nearby',
    waterReliable: true,
    distanceFromPrevious: 5.5,
    yearBuilt: 1939,
    description:
      'Historic CCC-built shelter (1939). Small lean-to with utility table and tent spaces nearby. One of the oldest shelters on Maryland AT.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'annapolis-rock',
    name: 'Annapolis Rock Campsite',
    lat: 39.5722,
    lng: -77.5917,
    elevation: 1200,
    capacity: 30,
    waterSource: 'Spring nearby (slow but reliable)',
    waterReliable: true,
    distanceFromPrevious: 6.5,
    description:
      'Large group camping area at iconic rock formation. Multiple tent and hammock sites. Spectacular views of Maryland valleys. Most popular Maryland campsite.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'pogo-memorial',
    name: 'Pogo Memorial Campsite',
    lat: 39.605,
    lng: -77.575,
    elevation: 1350,
    capacity: 25,
    waterSource: 'Robust spring — one of best in Maryland section',
    waterReliable: true,
    distanceFromPrevious: 4.5,
    description:
      'Large campsite at Thurston Griggs trail junction. Strong spring, ample tent sites. Less crowded alternative to Annapolis Rock.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'raven-rock',
    name: 'Raven Rock Shelter',
    lat: 39.6233,
    lng: -77.5639,
    elevation: 1400,
    capacity: 16,
    waterSource: 'Spring nearby',
    waterReliable: true,
    distanceFromPrevious: 5.0,
    yearBuilt: 2010,
    description:
      'Recently rebuilt shelter with sleeping loft. Many tent and hammock sites available. Excellent condition, good water source.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'ensign-cowall',
    name: 'Ensign Phillip Cowall Memorial Shelter',
    lat: 39.6417,
    lng: -77.5528,
    elevation: 1450,
    capacity: 10,
    waterSource: 'Spring nearby',
    waterReliable: true,
    distanceFromPrevious: 6.0,
    yearBuilt: 1999,
    description:
      'Taller than standard AT shelters with tiered bunks. Ample tent space for groups. Honors Ensign Phillip Cowall.',
    hasPrivy: true,
    hasTentSites: true,
  },
  {
    id: 'high-rock',
    name: 'High Rock',
    lat: 39.7044,
    lng: -77.5139,
    elevation: 1905,
    capacity: 5,
    waterSource: 'Springs in area',
    waterReliable: false,
    distanceFromPrevious: 5.5,
    description:
      'Highest point of Maryland AT section. Parking for 15 cars, panoramic overlook. No formal shelter, but day-use area.',
    hasPrivy: false,
    hasTentSites: false,
  },
];

// ============================================================================
// TRAILHEADS
// ============================================================================

/**
 * Array of trailheads and parking areas for AT access in Maryland.
 */
export const AT_TRAILHEADS: ATTrailhead[] = [
  {
    id: 'harpers-ferry',
    name: 'Harpers Ferry / Potomac River',
    lat: 39.325,
    lng: -77.7286,
    parkingCapacity: 20,
    facilities: ['visitor_center'],
    description:
      'Southern entry point. Gateway to Maryland AT section from historic Harpers Ferry. Access via US Route 340.',
    accessType: 'both',
  },
  {
    id: 'weverton-cliffs',
    name: 'Weverton Cliffs Trailhead',
    lat: 39.3411,
    lng: -77.6858,
    parkingCapacity: 20,
    facilities: ['restrooms'],
    description:
      'Popular day-hike access to Weverton Cliffs overlook. 2 mi round trip. Scenic viewpoint above Potomac.',
    accessType: 'both',
  },
  {
    id: 'gathland-sp',
    name: 'Gathland State Park',
    lat: 39.435,
    lng: -77.6333,
    parkingCapacity: 30,
    facilities: ['restrooms', 'picnic_area', 'water'],
    description:
      'War Correspondents Arch historic monument. Day hike and shelter access at Crampton Gap. Civil War history.',
    accessType: 'both',
  },
  {
    id: 'turners-gap',
    name: 'Turner\'s Gap / South Mountain',
    lat: 39.49,
    lng: -77.6056,
    parkingCapacity: 30,
    facilities: ['restrooms', 'picnic_area'],
    description:
      'Historic Civil War battlefield access. Multiple trail connections. Summit parking with views.',
    accessType: 'both',
  },
  {
    id: 'washington-monument',
    name: 'Washington Monument State Park',
    lat: 39.5044,
    lng: -77.6028,
    parkingCapacity: 50,
    facilities: ['restrooms', 'picnic_area', 'water'],
    description:
      'Most popular access point. First monument to George Washington (1827). Fee station. Panoramic overlook.',
    accessType: 'both',
  },
  {
    id: 'us-40-greenbrier',
    name: 'US Route 40 / Greenbrier',
    lat: 39.5583,
    lng: -77.6028,
    parkingCapacity: 50,
    facilities: ['restrooms', 'picnic_area'],
    description:
      'Major road crossing. Annapolis Rock approach via blue-blazed connector. Large parking area.',
    accessType: 'both',
  },
  {
    id: 'annapolis-rock-parking',
    name: 'Annapolis Rock Parking',
    lat: 39.565,
    lng: -77.6,
    parkingCapacity: 50,
    facilities: ['restrooms'],
    description:
      'Most popular camping trailhead. Fills early on weekends. Direct access to iconic Annapolis Rock campsite.',
    accessType: 'both',
  },
  {
    id: 'wolfsville-road',
    name: 'Wolfsville Road Crossing',
    lat: 39.6783,
    lng: -77.5306,
    parkingCapacity: 10,
    facilities: [],
    description:
      'Road crossing with small pull-off. Access to Ensign Cowall Shelter area. Limited facilities.',
    accessType: 'both',
  },
  {
    id: 'high-rock-overlook',
    name: 'High Rock Overlook',
    lat: 39.7044,
    lng: -77.5139,
    parkingCapacity: 15,
    facilities: ['scenic_overlook'],
    description:
      'Highest point parking. Panoramic views of Maryland and Pennsylvania. Short walk from AT.',
    accessType: 'day_hike',
  },
  {
    id: 'pen-mar-park',
    name: 'Pen Mar Park',
    lat: 39.7178,
    lng: -77.5072,
    parkingCapacity: 40,
    facilities: ['restrooms', 'picnic_area', 'scenic_overlook'],
    description:
      'Northern terminus at PA-MD border. Historic park, ample parking. Mason-Dixon Line marker.',
    accessType: 'both',
  },
];

// ============================================================================
// LANDMARKS
// ============================================================================

/**
 * Array of notable landmarks and points of interest along the AT in Maryland.
 */
export const AT_LANDMARKS: ATLandmark[] = [
  {
    id: 'weverton-cliffs',
    name: 'Weverton Cliffs',
    lat: 39.3411,
    lng: -77.6858,
    elevation: 1000,
    type: 'scenic_overlook',
    description:
      '500-ft cliffs above Potomac River with views of Buzzard Rock, Short Hill Mountain, and Shenandoah confluence. Dramatic rock formations.',
    historicalSignificance: 'Key viewpoint at MD-WV-VA convergence',
  },
  {
    id: 'maryland-heights',
    name: 'Maryland Heights',
    lat: 39.3289,
    lng: -77.735,
    elevation: 900,
    type: 'scenic_overlook',
    description:
      'Dramatic overlook above Harpers Ferry. Views of Potomac and Shenandoah River confluence. Historic vantage point.',
    historicalSignificance: 'Strategic Civil War position above Harpers Ferry',
  },
  {
    id: 'gathland-arch',
    name: 'War Correspondents Memorial Arch',
    lat: 39.435,
    lng: -77.6333,
    elevation: 800,
    type: 'historic_monument',
    description:
      'First monument dedicated to war correspondents. Stone arch at Crampton Gap. Unique historical artifact.',
    historicalSignificance: 'Built 1896 by George Alfred Townsend. Civil War battlefield.',
  },
  {
    id: 'washington-monument',
    name: 'Washington Monument',
    lat: 39.5044,
    lng: -77.6028,
    elevation: 1880,
    type: 'historic_monument',
    description:
      'Stone tower — oldest monument to George Washington in the United States. Iconic 40-ft structure.',
    historicalSignificance:
      'Built 1827 by citizens of Boonsboro. Predates DC monument by 57 years.',
  },
  {
    id: 'annapolis-rock',
    name: 'Annapolis Rock',
    lat: 39.5722,
    lng: -77.5917,
    elevation: 1200,
    type: 'geological',
    description:
      'Large rock outcrop with panoramic valley views. Popular climbing and camping destination. Stunning sunset views.',
    historicalSignificance: 'One of Maryland\'s most photographed natural features',
  },
  {
    id: 'black-rock-cliffs',
    name: 'Black Rock Cliffs',
    lat: 39.5867,
    lng: -77.5861,
    elevation: 1300,
    type: 'scenic_overlook',
    description:
      'Dramatic cliff formations with sweeping views of Maryland valleys. Exposed rock faces.',
    historicalSignificance: undefined,
  },
  {
    id: 'reno-monument',
    name: 'Reno Monument',
    lat: 39.4944,
    lng: -77.6067,
    elevation: 1100,
    type: 'historic_monument',
    description:
      'Civil War monument at South Mountain battlefield. Stone marker and historical plaque.',
    historicalSignificance: 'Marks site of Battle of South Mountain (1862)',
  },
  {
    id: 'devils-racecourse',
    name: 'Devil\'s Racecourse',
    lat: 39.695,
    lng: -77.5194,
    elevation: 1850,
    type: 'geological',
    description:
      'Massive boulder field with underground creek flowing beneath rocks. Unique geological formation. Water audible beneath boulders.',
    historicalSignificance: 'Unusual natural feature — water audible beneath boulders',
  },
  {
    id: 'high-rock-summit',
    name: 'High Rock',
    lat: 39.7044,
    lng: -77.5139,
    elevation: 1905,
    type: 'summit',
    description:
      'Highest point on Maryland AT section. Spectacular 360-degree panoramic overlook. Views to Pennsylvania.',
    historicalSignificance: 'Historic fire lookout location',
  },
  {
    id: 'pen-mar-park',
    name: 'Pen Mar Park',
    lat: 39.7178,
    lng: -77.5072,
    elevation: 1880,
    type: 'park',
    description:
      'Historic park at Mason-Dixon Line (PA-MD border). Northern AT terminus in Maryland. Historic vacation resort grounds.',
    historicalSignificance:
      'Historic vacation resort (late 1800s), Mason-Dixon Line marker',
  },
  {
    id: 'potomac-river',
    name: 'Potomac River Crossing',
    lat: 39.325,
    lng: -77.7286,
    elevation: 261,
    type: 'waterway',
    description:
      'Lowest point of Maryland AT section. River crossing between WV and MD. Gateway between states.',
    historicalSignificance: 'Gateway between states, near historic Harpers Ferry',
  },
  {
    id: 'south-mountain',
    name: 'South Mountain Ridgeline',
    lat: 39.49,
    lng: -77.6056,
    elevation: 1800,
    type: 'scenic_overlook',
    description:
      'The spine of Maryland\'s AT section. Continuous ridgeline hiking with mountain views. 20+ mile ridge walk.',
    historicalSignificance: 'Site of multiple Civil War engagements (1862)',
  },
];

// ============================================================================
// SIDE TRAILS
// ============================================================================

/**
 * Array of side trails and connector trails near the AT in Maryland.
 */
export const AT_SIDE_TRAILS: ATSideTrail[] = [
  {
    id: 'catoctin-trail',
    name: 'Catoctin Trail',
    connectionLat: 39.67,
    connectionLng: -77.535,
    totalDistance: 26,
    difficulty: 'moderate',
    description:
      'National Recreation Trail through Catoctin Mountain. 1930s WPA/CCC construction. Access via Mt. Zion Road. Waterfall and scenic vistas.',
    websiteUrl: 'https://www.hikingupward.com/OMH/CatoctinTrail/',
  },
  {
    id: 'maryland-heights-trail',
    name: 'Maryland Heights Trail',
    connectionLat: 39.3289,
    connectionLng: -77.735,
    totalDistance: 4,
    difficulty: 'strenuous',
    description:
      'Steep trail to Maryland Heights overlook above Harpers Ferry. Across Potomac from AT. Historic fortification views.',
    websiteUrl: 'https://www.nps.gov/hafe/planyourvisit/maryland-heights-trail.htm',
  },
  {
    id: 'catoctin-np-trails',
    name: 'Catoctin Mountain Park Trails',
    connectionLat: 39.65,
    connectionLng: -77.45,
    totalDistance: 25,
    difficulty: 'moderate',
    description:
      'Loop trail system within Catoctin Mountain National Park. Waterfalls, scenic drives, camping. Presidential retreat nearby.',
    websiteUrl: 'https://www.nps.gov/cato/planyourvisit/hiking.htm',
  },
  {
    id: 'thurston-griggs',
    name: 'Thurston Griggs Trail',
    connectionLat: 39.605,
    connectionLng: -77.575,
    totalDistance: 1.5,
    difficulty: 'easy',
    description:
      'Blue-blazed connector to Pogo Memorial Campsite from AT. Short connector from main trail.',
    websiteUrl: undefined,
  },
  {
    id: 'south-mountain-trails',
    name: 'South Mountain State Park Trails',
    connectionLat: 39.49,
    connectionLng: -77.6056,
    totalDistance: 15,
    difficulty: 'moderate',
    description:
      'Network of trails paralleling AT along South Mountain ridgeline. Multiple access points. Scenic alternatives.',
    websiteUrl: 'https://dnr.maryland.gov/publiclands/Pages/western/southmountain.aspx',
  },
];

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Array of resources (guides, maps, forums, etc.) for AT hiking in Maryland.
 */
export const AT_RESOURCES: ATResource[] = [
  // Official Resources
  {
    id: 'atc-maryland',
    title: 'Appalachian Trail Conservancy — Maryland',
    url: 'https://appalachiantrail.org/experience/hike-the-trail/explore-by-state/maryland/',
    category: 'official',
    description:
      'Official ATC page for Maryland section. Trail conditions, shelter status, management information.',
  },
  {
    id: 'patc',
    title: 'Potomac Appalachian Trail Club',
    url: 'https://www.patc.net/',
    category: 'official',
    description:
      'PATC maintains Maryland section. Trail reports, volunteer opportunities, guidebooks, maps.',
  },
  {
    id: 'mddnr-at',
    title: 'Maryland DNR — Appalachian Trail',
    url: 'https://dnr.maryland.gov/publiclands/pages/at.aspx',
    category: 'official',
    description: 'Maryland state park information for AT corridor lands.',
  },
  {
    id: 'nps-maps',
    title: 'NPS — Appalachian Trail Maps',
    url: 'https://www.nps.gov/appa/planyourvisit/maps.htm',
    category: 'official',
    description: 'Official National Park Service AT maps and resources.',
  },
  {
    id: 'wm-state-park',
    title: 'Washington Monument State Park',
    url: 'https://dnr.maryland.gov/publiclands/Pages/western/washington.aspx',
    category: 'official',
    description: 'Maryland state park with iconic Washington Monument and AT access.',
  },
  {
    id: 'sm-state-park',
    title: 'South Mountain State Park',
    url: 'https://dnr.maryland.gov/publiclands/Pages/western/southmountain.aspx',
    category: 'official',
    description:
      'Maryland state park encompassing much of the AT ridge corridor in Maryland.',
  },

  // Maps
  {
    id: 'farout-map',
    title: 'FarOut AT Map (Interactive)',
    url: 'https://faroutguides.com/appalachian-trail-map/',
    category: 'map',
    description:
      'Interactive AT map with crowdsourced shelter conditions, water sources, and user reviews.',
  },
  {
    id: 'trek-map',
    title: 'The Trek — AT Interactive Map',
    url: 'https://thetrek.co/thru-hiker-resources/appalachian-trail-interactive-map/',
    category: 'map',
    description: 'Interactive trail map with mileage, shelter locations, and hiking data.',
  },
  {
    id: 'alltrails-md',
    title: 'AllTrails — AT Maryland',
    url: 'https://www.alltrails.com/trail/us/maryland/appalachian-trail-maryland-2',
    category: 'map',
    description: 'Maryland AT section on AllTrails with reviews, photos, difficulty ratings.',
  },
  {
    id: 'alltrails-annapolis',
    title: 'AllTrails — Annapolis Rock',
    url: 'https://www.alltrails.com/trail/us/maryland/annapolis-rock-via-appalachian-trail',
    category: 'map',
    description: 'Popular Annapolis Rock section on AllTrails with trail photos and stats.',
  },

  // Guides
  {
    id: 'cny-guide',
    title: 'CNY Hiking — Complete AT Maryland Guide',
    url: 'https://cnyhiking.com/ATinMaryland.htm',
    category: 'guide',
    description:
      'Comprehensive guide to AT through Maryland with detailed shelter and water information.',
  },
  {
    id: 'sectionhiker-md',
    title: 'SectionHiker — AT Through Maryland',
    url: 'https://sectionhiker.com/section-hiking-the-appalachian-trail-through-maryland/',
    category: 'guide',
    description: 'Detailed guide for section hiking the Maryland AT corridor.',
  },
  {
    id: 'patc-guides',
    title: 'PATC Trail Guides & Books',
    url: 'https://www.patc.net/books',
    category: 'guide',
    description:
      'Official PATC trail guides and maps for Maryland AT section. Highly detailed.',
  },
  {
    id: 'atc-store',
    title: 'ATC Trail Store — MD/NoVA Guide Set 6',
    url: 'https://www.atctrailstore.org/',
    category: 'guide',
    description: 'Official ATC maps and guidebooks for Maryland AT section.',
  },

  // Blogs & Trip Reports
  {
    id: 'llh-weverton',
    title: 'Live and Let Hike — Weverton Cliffs',
    url: 'https://liveandlethike.com/2016/09/10/appalachian-trail-to-weverton-cliffs-south-mountain-state-park-md/',
    category: 'blog',
    description: 'Detailed trip report for Weverton Cliffs hike with photos and insights.',
  },
  {
    id: 'ttr-weverton',
    title: 'Trails That Rock — Weverton Cliffs',
    url: 'https://trailsthatrock.com/weverton-cliffs-hike-in-maryland/',
    category: 'blog',
    description: 'Scenic hike guide for Weverton Cliffs overlook with practical tips.',
  },
  {
    id: 'ttr-washington',
    title: 'Trails That Rock — Washington Monument',
    url: 'https://trailsthatrock.com/washington-monument-state-park/',
    category: 'blog',
    description:
      'Guide to Washington Monument State Park and AT section with photo gallery.',
  },
  {
    id: 'mbc-annapolis',
    title: 'Melanin Base Camp — Annapolis Rock',
    url: 'https://www.melaninbasecamp.com/trip-reports/2021/4/16/annapolis-rock-md-appalachian-trail',
    category: 'blog',
    description: 'Trip report for Annapolis Rock camping with community perspective.',
  },

  // Community
  {
    id: 'whiteblaze-water',
    title: 'WhiteBlaze — Water Through Maryland',
    url: 'https://www.whiteblaze.net/forum/showthread.php/38354-Water-through-Maryland',
    category: 'community',
    description:
      'Active forum discussion about water sources and trail conditions in Maryland.',
  },
  {
    id: 'patc-meetup',
    title: 'PATC Meetup Hiking Group',
    url: 'https://www.meetup.com/patchikes/',
    category: 'community',
    description:
      'Local hiking meetup group organized by PATC. Find group hikes and social events.',
  },

  // Challenge-Related
  {
    id: 'bro-four-state',
    title: 'Blue Ridge Outdoors — Four State Challenge',
    url: 'https://www.blueridgeoutdoors.com/hiking/24-hours-in-maryland-the-four-state-challenge/',
    category: 'challenge',
    description: 'Guide to the Four State Challenge 24-hour hiking challenge.',
  },
  {
    id: 'trek-fsc',
    title: 'The Trek — Four State Challenge',
    url: 'https://thetrek.co/appalachian-trail/the-four-state-challenge/',
    category: 'challenge',
    description: 'Overview and experience reports for the Four State Challenge.',
  },
  {
    id: 'fkt-fsc',
    title: 'Fastest Known Time — Four State Challenge',
    url: 'https://fastestknowntime.com/route/four-state-challenge-pa-md-wv-va',
    category: 'challenge',
    description:
      'Fastest known times and records for the Four State Challenge ultra-distance hike.',
  },
  {
    id: 'gc-fsc',
    title: 'Grayson Cobb — Maryland Challenge Guide',
    url: 'https://graysoncobb.com/maryland-challenge/',
    category: 'challenge',
    description: 'Detailed guide for the Four State Challenge with training tips.',
  },
  {
    id: 'btl-fsc',
    title: 'Bernie\'s Trail Life — Four State Challenge',
    url: 'https://berniestraillife.com/four-state-challenge/',
    category: 'challenge',
    description: 'Four State Challenge experience and recommendations from trail veterans.',
  },
];

// ============================================================================
// FOUR STATES CHALLENGE
// ============================================================================

/**
 * The Four States Challenge — legendary 24-hour (or 2-day) AT hiking challenge
 * covering Virginia, West Virginia, Maryland, and Pennsylvania.
 */
export const FOUR_STATES_CHALLENGE: FourStatesChallenge = {
  name: 'Four States Challenge',
  totalMiles: 43.5,
  states: ['Virginia', 'West Virginia', 'Maryland', 'Pennsylvania'],
  startPoint: {
    name: 'VA/WV Border near Harpers Ferry',
    lat: 39.2456,
    lng: -77.7833,
    state: 'Virginia',
  },
  endPoint: {
    name: 'Pen Mar Park (PA Border)',
    lat: 39.7178,
    lng: -77.5072,
    state: 'Pennsylvania',
  },
  description:
    'The legendary "Death March" — hiking through 4 states in 24 hours along the AT. Covers Virginia, West Virginia, Maryland, and Pennsylvania. Most hikers tackle it as a weekend trip with overnight camping. Requires excellent fitness, navigation skills, and planning.',
  difficulty:
    'Very Strenuous — requires excellent fitness and planning. 43.5 miles with 6,000+ ft elevation gain.',
  typicalTime: '18-24 hours (ultra-hikers), 2 days (weekend warriors)',
  resources: AT_RESOURCES.filter((r) => r.category === 'challenge'),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retrieve a specific shelter by its ID.
 *
 * @param id - The shelter ID
 * @returns The shelter object, or undefined if not found
 */
export function getATShelterById(id: string): ATShelter | undefined {
  return AT_SHELTERS.find((shelter) => shelter.id === id);
}

/**
 * Retrieve a specific trailhead by its ID.
 *
 * @param id - The trailhead ID
 * @returns The trailhead object, or undefined if not found
 */
export function getATTrailheadById(id: string): ATTrailhead | undefined {
  return AT_TRAILHEADS.find((trailhead) => trailhead.id === id);
}

/**
 * Get all landmarks of a specific type.
 *
 * @param type - The landmark type to filter by
 * @returns Array of landmarks matching the type
 */
export function getATLandmarksByType(type: ATLandmark['type']): ATLandmark[] {
  return AT_LANDMARKS.filter((landmark) => landmark.type === type);
}

/**
 * Get all resources of a specific category.
 *
 * @param category - The resource category to filter by
 * @returns Array of resources matching the category
 */
export function getATResourcesByCategory(category: ATResource['category']): ATResource[] {
  return AT_RESOURCES.filter((resource) => resource.category === category);
}

/**
 * Convert the AT route waypoints to GeoJSON LineString format for map rendering.
 * Useful for drawing the trail polyline on Mapbox or similar.
 *
 * @returns GeoJSON Feature with LineString geometry
 */
export function getATRouteAsGeoJSON(): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {
      name: 'Appalachian Trail — Maryland Section',
      totalMiles: AT_ROUTE_INFO.totalMiles,
      difficulty: AT_ROUTE_INFO.difficulty,
    },
    geometry: {
      type: 'LineString',
      coordinates: AT_ROUTE_WAYPOINTS.map((wp) => [wp.lng, wp.lat]),
    },
  };
}

/**
 * Get a summary of all AT data including counts and key information.
 *
 * @returns Summary object with counts and route info
 */
export function getATSummary(): {
  shelterCount: number;
  trailheadCount: number;
  landmarkCount: number;
  sideTrailCount: number;
  resourceCount: number;
  routeInfo: ATRouteInfo;
} {
  return {
    shelterCount: AT_SHELTERS.length,
    trailheadCount: AT_TRAILHEADS.length,
    landmarkCount: AT_LANDMARKS.length,
    sideTrailCount: AT_SIDE_TRAILS.length,
    resourceCount: AT_RESOURCES.length,
    routeInfo: AT_ROUTE_INFO,
  };
}
