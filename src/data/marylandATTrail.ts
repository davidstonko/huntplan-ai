/**
 * Maryland Appalachian Trail — USGS National Trails polyline
 *
 * SOURCE: USGS National Map Transportation MapServer — Layer 11 (National
 * Trails System). Pulled 2026-04-18.
 *   https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/11/query
 *
 * PROCESSING (scripts/trails_ingest/ ↳ see at_md_simplified.json):
 *   1. Query Layer 11 for all AT polylines intersecting the MD/PA/WV region.
 *   2. Clip every returned polyline to MD's latitude band (39.315°N-39.7205°N)
 *      so only the Maryland section remains.
 *   3. Dedupe near-identical parallel segments (same start/end within 30 m).
 *   4. Chain segments south-to-north starting at the Goodloe Byron Memorial
 *      Footbridge (Harpers Ferry, 39.3239°N, -77.7276°W), greedy-nearest with
 *      a 200-m max gap tolerance; stop when no next segment is reachable.
 *   5. Ramer–Douglas–Peucker simplification at ε=15 m.
 *
 * RESULT: 422 vertices, 39.28 mi mapped length vs 40.9 mi ATC-published
 * (ratio 0.96 — within the IS_APPROXIMATE data-quality gate of 0.5-2.0x).
 *
 * USAGE CONTRACT (enforced in HikeMapScreen):
 *   • Map UI MUST display an "Approximate alignment — refer to official ATC
 *     maps for navigation" banner whenever this polyline is rendered.
 *   • This data is for planning/orientation ONLY. It is NOT the authoritative
 *     ATC alignment. Do not use for off-trail navigation or wayfinding.
 *
 * The 1.6-mi shortfall vs published length is largely attributable to
 * Harpers-Ferry town connectors that the USGS layer does not include, plus
 * minor simplification loss. AT_POLYLINE_IS_APPROXIMATE remains `true` until
 * an ATC-authoritative cross-audit is performed.
 *
 * PRIOR VERSION: 12 hand-verified Nominatim/Wikipedia waypoints (~31 mi
 * connect-the-dots). See git history before 2026-04-19 for the prior provenance
 * block. Landmarks/shelters/trailheads below are still from that verified set.
 */

import type { ATTrail } from '../types/hike';

/**
 * Maryland section of the Appalachian Trail.
 * LineString coordinates: [longitude, latitude], ordered south-to-north per
 * the ATTrail type contract (mile 0 at Harpers Ferry, mile 40.9 at PA border).
 */
export const MARYLAND_APPALACHIAN_TRAIL: ATTrail = {
  id: 'md-appalachian-trail',
  name: 'Maryland Appalachian Trail',
  totalLengthMi: 40.9,

  // south-to-north: Goodloe Byron Footbridge area → Mason-Dixon Line monument.
  // 422 vertices from USGS National Trails Layer 11, clipped to MD, chained
  // south→north, RDP ε=15 m. 39.28 mi mapped vs 40.9 mi published (ratio 0.96).
  coordinates: [
    [-77.726194, 39.324094], [-77.725006, 39.323488], [-77.724274, 39.323404], [-77.717204, 39.324146],
    [-77.714028, 39.324822], [-77.706088, 39.325696], [-77.701408, 39.325406], [-77.697863, 39.324557],
    [-77.695026, 39.323618], [-77.691409, 39.323968], [-77.690046, 39.324354], [-77.688437, 39.325155],
    [-77.683381, 39.32845], [-77.68145, 39.329229], [-77.681516, 39.329958], [-77.682243, 39.329708],
    [-77.683605, 39.329686], [-77.685412, 39.330752], [-77.685477, 39.331269], [-77.685192, 39.33163],
    [-77.683897, 39.332167], [-77.683231, 39.332909], [-77.681617, 39.332832], [-77.680573, 39.332469],
    [-77.680177, 39.333946], [-77.679665, 39.333641], [-77.679398, 39.333846], [-77.678685, 39.332451],
    [-77.678124, 39.332002], [-77.677854, 39.332182], [-77.678157, 39.332884], [-77.678133, 39.333823],
    [-77.677956, 39.333683], [-77.677855, 39.334162], [-77.677446, 39.33359], [-77.677328, 39.333772],
    [-77.6764, 39.333277], [-77.676497, 39.332012], [-77.6764, 39.333277], [-77.675917, 39.334332],
    [-77.676039, 39.335345], [-77.675756, 39.33576], [-77.675802, 39.336404], [-77.67383, 39.343252],
    [-77.672741, 39.344082], [-77.671973, 39.346072], [-77.670321, 39.347927], [-77.669851, 39.348892],
    [-77.667559, 39.351101], [-77.667037, 39.352603], [-77.664596, 39.357146], [-77.663986, 39.357845],
    [-77.663629, 39.359254], [-77.663195, 39.359371], [-77.66277, 39.359899], [-77.662379, 39.361309],
    [-77.661123, 39.363006], [-77.660555, 39.364229], [-77.658935, 39.365934], [-77.658246, 39.367297],
    [-77.657111, 39.368157], [-77.655993, 39.369553], [-77.655146, 39.371199], [-77.652494, 39.374954],
    [-77.651146, 39.380075], [-77.649091, 39.382487], [-77.648627, 39.383535], [-77.648772, 39.384324],
    [-77.647903, 39.386417], [-77.647887, 39.38842], [-77.645981, 39.391836], [-77.645681, 39.393059],
    [-77.645125, 39.393685], [-77.644228, 39.396268], [-77.640505, 39.402305], [-77.640321, 39.403549],
    [-77.639535, 39.404503], [-77.64019, 39.404768], [-77.640236, 39.405059], [-77.639612, 39.405842],
    [-77.639543, 39.40666], [-77.63911, 39.406878], [-77.63992, 39.407384], [-77.640199, 39.408051],
    [-77.64013, 39.410704], [-77.640843, 39.412589], [-77.640928, 39.41394], [-77.640729, 39.415893],
    [-77.640035, 39.417959], [-77.639934, 39.420058], [-77.638909, 39.422209], [-77.639028, 39.422731],
    [-77.63857, 39.424332], [-77.638633, 39.425695], [-77.639284, 39.427564], [-77.639465, 39.429216],
    [-77.639259, 39.430562], [-77.638751, 39.431562], [-77.638783, 39.432521], [-77.638111, 39.433454],
    [-77.638281, 39.434177], [-77.637921, 39.435544], [-77.638087, 39.435862], [-77.63751, 39.436858],
    [-77.637544, 39.437865], [-77.63481, 39.443004], [-77.632761, 39.444725], [-77.63385, 39.445171],
    [-77.634065, 39.446185], [-77.634625, 39.447078], [-77.634282, 39.447765], [-77.633379, 39.448071],
    [-77.632242, 39.447781], [-77.631637, 39.447223], [-77.630454, 39.447655], [-77.629896, 39.447024],
    [-77.628775, 39.447872], [-77.628256, 39.447949], [-77.625792, 39.447731], [-77.624233, 39.447355],
    [-77.624055, 39.446924], [-77.623642, 39.446963], [-77.622066, 39.450228], [-77.622306, 39.451313],
    [-77.622979, 39.451846], [-77.62259, 39.452838], [-77.622735, 39.453431], [-77.622969, 39.453706],
    [-77.62355, 39.453645], [-77.624906, 39.454133], [-77.624719, 39.454465], [-77.625039, 39.454601],
    [-77.625358, 39.456429], [-77.625911, 39.457239], [-77.626402, 39.45743], [-77.626263, 39.458321],
    [-77.627002, 39.459466], [-77.628004, 39.459956], [-77.62896, 39.462878], [-77.628314, 39.464007],
    [-77.627716, 39.46445], [-77.626241, 39.464388], [-77.624227, 39.465011], [-77.623999, 39.465779],
    [-77.624265, 39.466327], [-77.623868, 39.46732], [-77.623041, 39.468208], [-77.622935, 39.46889],
    [-77.622388, 39.469057], [-77.619452, 39.468975], [-77.617811, 39.470019], [-77.617526, 39.470615],
    [-77.618056, 39.472349], [-77.617648, 39.473264], [-77.618109, 39.473855], [-77.618315, 39.474947],
    [-77.619464, 39.477382], [-77.619608, 39.479596], [-77.619135, 39.480101], [-77.619253, 39.482107],
    [-77.618811, 39.483547], [-77.619686, 39.484314], [-77.619159, 39.484743], [-77.617694, 39.48524],
    [-77.617876, 39.485576], [-77.617683, 39.48598], [-77.617263, 39.486055], [-77.617329, 39.486697],
    [-77.615607, 39.487105], [-77.614957, 39.487006], [-77.615424, 39.487568], [-77.614358, 39.487842],
    [-77.614366, 39.488057], [-77.613466, 39.488267], [-77.613389, 39.48846], [-77.615878, 39.489834],
    [-77.616995, 39.49162], [-77.616796, 39.493174], [-77.617003, 39.493873], [-77.616409, 39.496389],
    [-77.617163, 39.497951], [-77.619172, 39.49849], [-77.620281, 39.497916], [-77.621538, 39.499026],
    [-77.622854, 39.498842], [-77.623559, 39.498987], [-77.622578, 39.500087], [-77.622601, 39.501415],
    [-77.62068, 39.504951], [-77.620492, 39.506993], [-77.621267, 39.507863], [-77.621402, 39.509106],
    [-77.620743, 39.510908], [-77.620154, 39.511422], [-77.619315, 39.513771], [-77.619436, 39.514203],
    [-77.619133, 39.515157], [-77.618239, 39.516042], [-77.618173, 39.517861], [-77.614914, 39.522052],
    [-77.61557, 39.52364], [-77.615474, 39.52447], [-77.61494, 39.525191], [-77.613386, 39.525405],
    [-77.612677, 39.527429], [-77.612861, 39.528349], [-77.612363, 39.529212], [-77.612277, 39.529995],
    [-77.611789, 39.530119], [-77.610619, 39.529901], [-77.609812, 39.530139], [-77.609639, 39.531079],
    [-77.610021, 39.531618], [-77.608622, 39.533509], [-77.608489, 39.53406], [-77.607167, 39.535026],
    [-77.605859, 39.535049], [-77.605852, 39.536402], [-77.605496, 39.537357], [-77.604457, 39.537363],
    [-77.604189, 39.537601], [-77.603368, 39.539665], [-77.602536, 39.540476], [-77.601404, 39.54065],
    [-77.600558, 39.539942], [-77.600005, 39.539788], [-77.598808, 39.540798], [-77.598629, 39.541791],
    [-77.598025, 39.542621], [-77.598025, 39.543223], [-77.596258, 39.545276], [-77.595823, 39.547449],
    [-77.593445, 39.550226], [-77.5918, 39.554124], [-77.593177, 39.555535], [-77.594483, 39.556394],
    [-77.594547, 39.557805], [-77.594945, 39.558993], [-77.596157, 39.560724], [-77.59809, 39.562493],
    [-77.598499, 39.563359], [-77.598223, 39.564504], [-77.597419, 39.565255], [-77.597564, 39.566139],
    [-77.597927, 39.566578], [-77.597961, 39.567596], [-77.597137, 39.569361], [-77.597285, 39.570007],
    [-77.596703, 39.571027], [-77.596818, 39.571829], [-77.596416, 39.572523], [-77.596484, 39.573112],
    [-77.595851, 39.573674], [-77.595133, 39.573839], [-77.592499, 39.57391], [-77.591842, 39.573656],
    [-77.591224, 39.573807], [-77.590239, 39.573185], [-77.589923, 39.573389], [-77.589447, 39.573841],
    [-77.589374, 39.575328], [-77.588732, 39.576492], [-77.588675, 39.578889], [-77.588157, 39.579038],
    [-77.586653, 39.58184], [-77.584915, 39.582523], [-77.584143, 39.584029], [-77.583151, 39.584498],
    [-77.582478, 39.585348], [-77.582147, 39.586589], [-77.581095, 39.587589], [-77.581616, 39.589908],
    [-77.580859, 39.591605], [-77.57995, 39.592543], [-77.579555, 39.593845], [-77.579009, 39.594494],
    [-77.578778, 39.596466], [-77.578135, 39.597302], [-77.578203, 39.598719], [-77.577515, 39.599581],
    [-77.577867, 39.60055], [-77.577827, 39.60238], [-77.577351, 39.603666], [-77.577325, 39.604632],
    [-77.575911, 39.60784], [-77.57673, 39.608519], [-77.576672, 39.60883], [-77.576176, 39.609472],
    [-77.575869, 39.610766], [-77.574691, 39.612538], [-77.573997, 39.613054], [-77.572694, 39.615211],
    [-77.570881, 39.619511], [-77.570166, 39.620075], [-77.56955, 39.621853], [-77.569456, 39.62316],
    [-77.566768, 39.627998], [-77.566377, 39.628055], [-77.566176, 39.627612], [-77.565408, 39.627891],
    [-77.56518, 39.627569], [-77.564573, 39.628345], [-77.562547, 39.629808], [-77.562306, 39.629771],
    [-77.561837, 39.628965], [-77.561473, 39.628896], [-77.560447, 39.629097], [-77.559972, 39.629573],
    [-77.558558, 39.630212], [-77.557992, 39.630123], [-77.557769, 39.629717], [-77.555825, 39.630695],
    [-77.556081, 39.629492], [-77.555333, 39.629788], [-77.553613, 39.629331], [-77.553039, 39.629427],
    [-77.552519, 39.629981], [-77.552594, 39.633275], [-77.550641, 39.634071], [-77.549713, 39.633812],
    [-77.548108, 39.632515], [-77.543791, 39.630839], [-77.543208, 39.630972], [-77.542355, 39.632051],
    [-77.541433, 39.634201], [-77.542002, 39.636079], [-77.541211, 39.639119], [-77.539602, 39.640973],
    [-77.538558, 39.641762], [-77.538162, 39.642624], [-77.538616, 39.647112], [-77.539573, 39.648767],
    [-77.543074, 39.651507], [-77.542997, 39.652238], [-77.540596, 39.654865], [-77.538631, 39.655307],
    [-77.538397, 39.655866], [-77.538679, 39.656313], [-77.538254, 39.657133], [-77.53844, 39.657582],
    [-77.537261, 39.658215], [-77.536845, 39.659279], [-77.535629, 39.659759], [-77.535553, 39.660648],
    [-77.535027, 39.660791], [-77.534751, 39.661798], [-77.534076, 39.661878], [-77.533782, 39.66229],
    [-77.533683, 39.662739], [-77.534504, 39.663257], [-77.534541, 39.663751], [-77.536009, 39.664452],
    [-77.535534, 39.66454], [-77.535613, 39.664812], [-77.535202, 39.664755], [-77.535344, 39.665134],
    [-77.533546, 39.664672], [-77.533561, 39.664881], [-77.533318, 39.664779], [-77.533014, 39.665304],
    [-77.533405, 39.666404], [-77.532697, 39.666651], [-77.533004, 39.667473], [-77.532346, 39.667934],
    [-77.532489, 39.668467], [-77.530741, 39.670949], [-77.528589, 39.672742], [-77.528258, 39.67381],
    [-77.527875, 39.674086], [-77.527718, 39.674751], [-77.527189, 39.675668], [-77.526625, 39.67608],
    [-77.525787, 39.677743], [-77.524816, 39.678276], [-77.524246, 39.679343], [-77.523898, 39.681341],
    [-77.523355, 39.682217], [-77.523533, 39.683703], [-77.522825, 39.685119], [-77.52086, 39.687515],
    [-77.51994, 39.68977], [-77.520145, 39.690433], [-77.519886, 39.691266], [-77.520478, 39.691736],
    [-77.521055, 39.692975], [-77.521921, 39.693773], [-77.52404, 39.693292], [-77.525236, 39.692139],
    [-77.525501, 39.691568], [-77.526046, 39.691711], [-77.527031, 39.690593], [-77.527785, 39.690958],
    [-77.52815, 39.692404], [-77.529291, 39.692707], [-77.528927, 39.694669], [-77.528473, 39.695126],
    [-77.528537, 39.69581], [-77.527928, 39.696055], [-77.52722, 39.697137], [-77.525575, 39.697927],
    [-77.524845, 39.698002], [-77.523323, 39.700395], [-77.52316, 39.701215], [-77.522061, 39.703116],
    [-77.520527, 39.704103], [-77.51952, 39.704202], [-77.51863, 39.704746], [-77.518447, 39.705572],
    [-77.516901, 39.70812], [-77.517004, 39.709376], [-77.516564, 39.709796], [-77.516541, 39.710637],
    [-77.515891, 39.711438], [-77.513303, 39.711994], [-77.510071, 39.713494], [-77.510156, 39.713814],
    [-77.509371, 39.714713], [-77.509273, 39.716795], [-77.508114, 39.717833], [-77.507082, 39.719375],
    [-77.507007, 39.719657], [-77.507637, 39.719919],
  ],

  /**
   * AT shelters in Maryland — only entries whose coordinates were
   * independently verified via OSM Nominatim (query returned a "shelter" type
   * on the Appalachian National Scenic Trail). Additional ATC shelters
   * (Dahlgren Backpack Campground, Pogo Memorial Campsite) exist but were
   * NOT individually verifiable at build time and are omitted rather than
   * approximated.
   *
   * mileFromSouth values are approximate (±0.5 mi) and taken from published
   * ATC distance tables; they do not correspond to our 12-point coordinate
   * polyline.
   */
  shelters: [
    {
      id: 'at-md-shelter-ed-garvey',
      name: 'Ed Garvey Shelter',
      lat: 39.3599,
      lon: -77.6620,
      mileFromSouth: 6.7,
      capacity: 12,
      hasPrivy: true,
      hasBearBox: false,
      waterSourceNotes: null,
      notes: 'Two-level shelter. Spring 0.4 mi downhill from shelter.',
    },
    {
      id: 'at-md-shelter-rocky-run',
      name: 'Rocky Run Shelter',
      lat: 39.4622,
      lon: -77.6308,
      mileFromSouth: 16.0,
      capacity: 16,
      hasPrivy: true,
      hasBearBox: false,
      waterSourceNotes: null,
      notes: 'Two shelters (old + new). Reliable spring nearby.',
    },
    {
      id: 'at-md-shelter-ensign-cowall',
      name: 'Ensign Cowall Shelter',
      lat: 39.6310,
      lon: -77.5560,
      mileFromSouth: 29.5,
      capacity: 6,
      hasPrivy: true,
      hasBearBox: false,
      waterSourceNotes: null,
      notes: 'Near Wolfsville Road crossing (MD 17).',
    },
    {
      id: 'at-md-shelter-raven-rock',
      name: 'Raven Rock Shelter',
      lat: 39.6734,
      lon: -77.5299,
      mileFromSouth: 34.5,
      capacity: 6,
      hasPrivy: true,
      hasBearBox: false,
      waterSourceNotes: null,
      notes: 'Stone-and-timber shelter. Water source below shelter.',
    },
  ],

  /**
   * AT trailheads in Maryland. Coordinates verified at the endpoint landmarks.
   */
  trailheads: [
    {
      id: 'at-md-th-harpers-ferry',
      name: 'Harpers Ferry (Goodloe Byron Footbridge)',
      lat: 39.3239,
      lon: -77.7276,
      mileFromSouth: 0.0,
      parkingCapacity: null,
      hasPrivy: true,
      access: 'public',
      parking: 'paved',
      notes: 'South terminus for Maryland AT. ATC headquarters nearby on WV side. Parking at Harpers Ferry NHP visitor center.',
    },
    {
      id: 'at-md-th-gathland',
      name: 'Gathland State Park (Crampton Gap)',
      lat: 39.4056,
      lon: -77.6394,
      mileFromSouth: 11.3,
      parkingCapacity: null,
      hasPrivy: true,
      access: 'public',
      parking: 'paved',
      notes: 'Mid-point parking. Gathland SP day-use area with War Correspondents Memorial.',
    },
    {
      id: 'at-md-th-washington-monument',
      name: 'Washington Monument State Park',
      lat: 39.5003,
      lon: -77.6228,
      mileFromSouth: 20.1,
      parkingCapacity: null,
      hasPrivy: true,
      access: 'public',
      parking: 'paved',
      notes: 'Historic stone tower (first monument to George Washington, 1827). Parking at park lot.',
    },
    {
      id: 'at-md-th-pen-mar',
      name: 'Pen Mar Park',
      lat: 39.7157,
      lon: -77.5090,
      mileFromSouth: 40.0,
      parkingCapacity: null,
      hasPrivy: true,
      access: 'public',
      parking: 'paved',
      notes: 'North trailhead pavilion. Seasonal park (open Apr–Oct); parking available off-season at PA-side Mason-Dixon lot.',
    },
  ],

  /**
   * Notable landmarks — only those whose coordinates were independently
   * verified. Intermediate ridge overlooks (Annapolis Rocks, Black Rock) are
   * omitted pending verification against authoritative sources.
   */
  landmarks: [
    {
      id: 'at-md-lm-weverton-cliffs',
      name: 'Weverton Cliffs',
      type: 'rock_formation',
      lat: 39.3320,
      lon: -77.6765,
      mileFromSouth: 1.3,
      description: 'Cliff overlook above the Potomac River. Short climb from the C&O Canal Towpath.',
    },
    {
      id: 'at-md-lm-turners-gap',
      name: 'Turners Gap (Dahlgren Chapel)',
      type: 'historic',
      lat: 39.4845,
      lon: -77.6189,
      mileFromSouth: 19.2,
      description: 'Civil War battlefield (South Mountain, 1862). Dahlgren Chapel and Old South Mountain Inn at US Alt 40.',
    },
    {
      id: 'at-md-lm-washington-monument',
      name: 'Washington Monument',
      type: 'historic',
      lat: 39.5003,
      lon: -77.6228,
      mileFromSouth: 20.1,
      description: 'First completed monument to George Washington (1827). Short spur from the AT.',
    },
    {
      id: 'at-md-lm-high-rock',
      name: 'High Rock',
      type: 'summit',
      lat: 39.6951,
      lon: -77.5225,
      mileFromSouth: 37.8,
      description: 'Ridge overlook near the PA border. Popular viewpoint but graffiti-prone; access via spur trail.',
    },
    {
      id: 'at-md-lm-mason-dixon',
      name: 'Mason-Dixon Line Monument',
      type: 'historic',
      lat: 39.7199,
      lon: -77.5077,
      mileFromSouth: 40.9,
      description: 'PA/MD state-line marker on the AT. North terminus of the Maryland section.',
    },
  ],

  /**
   * Water sources co-located with verified shelters/trailheads. We are NOT
   * including unverified creek crossings or springs — those need field
   * confirmation and ATC updates vary year to year.
   */
  waterSources: [
    {
      id: 'at-md-water-ed-garvey-spring',
      name: 'Ed Garvey Spring',
      lat: 39.3599,
      lon: -77.6620,
      mileFromSouth: 6.7,
      reliability: 'seasonal',
      notes: 'Spring 0.4 mi downhill from shelter. Often low in summer — carry extra capacity.',
    },
    {
      id: 'at-md-water-rocky-run-spring',
      name: 'Rocky Run Spring',
      lat: 39.4622,
      lon: -77.6308,
      mileFromSouth: 16.0,
      reliability: 'year-round',
      notes: 'Reliable spring at shelter complex.',
    },
    {
      id: 'at-md-water-washington-monument',
      name: 'Washington Monument SP Spigot',
      lat: 39.5003,
      lon: -77.6228,
      mileFromSouth: 20.1,
      reliability: 'seasonal',
      notes: 'Park water available in season (Apr–Oct).',
    },
    {
      id: 'at-md-water-raven-rock-spring',
      name: 'Raven Rock Spring',
      lat: 39.6734,
      lon: -77.5299,
      mileFromSouth: 34.5,
      reliability: 'seasonal',
      notes: 'Spring below shelter. Flow varies; check recent ATC reports.',
    },
  ],
};

export const AT_SHELTERS = MARYLAND_APPALACHIAN_TRAIL.shelters;
export const AT_TRAILHEADS = MARYLAND_APPALACHIAN_TRAIL.trailheads;
export const AT_LANDMARKS = MARYLAND_APPALACHIAN_TRAIL.landmarks;
export const AT_WATER_SOURCES = MARYLAND_APPALACHIAN_TRAIL.waterSources;
export const TOTAL_AT_MILES = MARYLAND_APPALACHIAN_TRAIL.totalLengthMi;

/**
 * UI flag — HikeMapScreen reads this to show the approximate-alignment banner.
 * Remove / set to false only when the polyline has been replaced with a
 * surveyed trace from ATC GIS or OSM Overpass.
 */
export const AT_POLYLINE_IS_APPROXIMATE = true;
