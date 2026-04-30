/**
 * MDHuntFishOutdoors Hiking Module — Curated Resource Links
 *
 * Organized hiking resource sections covering AT, day hikes, guides,
 * camping, and community forums. Follows the same structure as campingResources.ts.
 *
 * Updated: 2026-04-11
 */

export interface ResourceLink {
  title: string;
  url: string;
  description: string;
  emoji: string;
}

export interface ResourceSection {
  title: string;
  emoji: string;
  links: ResourceLink[];
}

export const HIKING_RESOURCES: ResourceSection[] = [
  {
    title: 'Official Trail Organizations',
    emoji: '🏛️',
    links: [
      {
        title: 'Appalachian Trail Conservancy (ATC)',
        url: 'https://www.appalachiantrail.org/explore/states-and-regions/maryland',
        description: 'Official AT organization with Maryland section info, shelters, water sources, and official trail data.',
        emoji: '🥾',
      },
      {
        title: 'Potomac Appalachian Trail Club (PATC)',
        url: 'https://www.patc.net/explore/trails/appalachian-trail',
        description: 'PATC maintains the AT in Maryland. Trail reports, guided hikes, shelter maintenance updates.',
        emoji: '👥',
      },
      {
        title: 'Maryland DNR Hiking & Trails',
        url: 'https://dnr.maryland.gov/publiclands/pages/index.aspx',
        description: 'Maryland state parks and public lands with hiking trails and facilities.',
        emoji: '🏞️',
      },
      {
        title: 'National Park Service — Appalachian Trail',
        url: 'https://www.nps.gov/appa/index.htm',
        description: 'NPS oversight of the AT, history, planning resources, and visitor information.',
        emoji: '🏕️',
      },
      {
        title: 'Washington Monument State Park',
        url: 'https://dnr.maryland.gov/publiclands/Pages/central/washingtonmonument.aspx',
        description: 'First Washington Monument historic site with hiking trails and visitor facilities.',
        emoji: '🗿',
      },
      {
        title: 'South Mountain State Park',
        url: 'https://dnr.maryland.gov/publiclands/Pages/western/southmountain.aspx',
        description: 'AT section access, picnic areas, trail information near Boonsboro.',
        emoji: '⛰️',
      },
    ],
  },
  {
    title: 'Maps & Navigation',
    emoji: '🗺️',
    links: [
      {
        title: 'FarOut AT Map',
        url: 'https://www.faroutapp.com',
        description: 'Premium offline AT map app with shelter info, water sources, elevation profiles. Mobile-first.',
        emoji: '📱',
      },
      {
        title: 'AllTrails — Maryland AT',
        url: 'https://www.alltrails.com/trail/maryland',
        description: 'Crowdsourced trail database with elevation, user reviews, and GPS tracking.',
        emoji: '📍',
      },
      {
        title: 'The Trek Interactive AT Map',
        url: 'https://www.thetrek.co/appalachian-trail-map/',
        description: 'Interactive trail map with shelter locations, mileage markers, and resource database.',
        emoji: '🗺️',
      },
      {
        title: 'PATC Map & Guide Set 6 (MD AT)',
        url: 'https://www.patc.net/shop/products/map_guide_sets',
        description: 'Official PATC map set for Maryland AT section with detailed trail info and contours.',
        emoji: '📄',
      },
      {
        title: 'Google Maps — MD AT',
        url: 'https://maps.google.com',
        description: 'Use for general orientation, parking access, nearby towns. Not optimal for trail detail.',
        emoji: '🔍',
      },
    ],
  },
  {
    title: 'Four States Challenge',
    emoji: '🏃',
    links: [
      {
        title: 'Blue Ridge Outdoors — Four States Challenge',
        url: 'https://www.blueridgeoutdoors.com/hiking-travel/four-states-challenge/',
        description: 'Comprehensive guide to the 43.5-mile ultra-challenge with training tips and route breakdown.',
        emoji: '📘',
      },
      {
        title: 'The Trek — Four States Challenge Guide',
        url: 'https://www.thetrek.co/appalachian-trail/four-states-challenge/',
        description: 'In-depth walkthrough with pacing strategies, support crew logistics, and nutrition planning.',
        emoji: '🧭',
      },
      {
        title: 'Fastest Known Time (FKT) — Four States',
        url: 'https://www.fastestknowntime.com/route/four-states-challenge-va-wv-md-pa',
        description: 'FKT records, times, and route variations for the Four States Challenge.',
        emoji: '⚡',
      },
      {
        title: 'Grayson Cobb — Four States Ultra Guide',
        url: 'https://www.graysoncobbtraining.com/four-states',
        description: 'Training plan and video guide for the 30-hour ultra challenge.',
        emoji: '📹',
      },
      {
        title: 'Bernie\'s Trail Life — Ultra Challenge Updates',
        url: 'https://www.bernies-trail-life.com/four-states',
        description: 'Recent challenge reports, weather patterns, and community tips.',
        emoji: '💬',
      },
    ],
  },
  {
    title: 'Trail Guides & Planning',
    emoji: '📖',
    links: [
      {
        title: 'CNY Hiking — Appalachian Trail Maryland',
        url: 'https://www.cnytrails.org/appalachian-trail-maryland',
        description: 'Detailed section-by-section guide with mileage, terrain, water, and shelter info.',
        emoji: '📋',
      },
      {
        title: 'SectionHiker — AT Maryland Reports',
        url: 'https://sectionhiker.com',
        description: 'Trail condition reports, gear reviews, and hiking narratives from AT section hikers.',
        emoji: '📝',
      },
      {
        title: 'PATC Trail Guides & Guidebooks',
        url: 'https://www.patc.net/shop/books',
        description: 'Official PATC guidebooks with detailed route descriptions, history, and access info.',
        emoji: '📚',
      },
      {
        title: 'ATC Trail Store — Official Resources',
        url: 'https://www.appalachiantrail.org/shop',
        description: 'Official ATC guidebooks, maps, and merchandise.',
        emoji: '🛍️',
      },
      {
        title: 'Appalachian Trail Histories',
        url: 'https://www.appalachiantrailhistories.org',
        description: 'Historical information about trail development, shelters, and cultural heritage.',
        emoji: '📜',
      },
    ],
  },
  {
    title: 'Shelter & Water Information',
    emoji: '💧',
    links: [
      {
        title: 'WhiteBlaze — Water Sources & Shelters',
        url: 'https://www.whiteblaze.org/forum/forum/appalachian-trail-shelters',
        description: 'Community forum with detailed water source reports and shelter maintenance updates.',
        emoji: '💬',
      },
      {
        title: 'PATC Shelter Maintenance Info',
        url: 'https://www.patc.net/explore/trails/appalachian-trail',
        description: 'Official shelter conditions, maintenance schedules, and capacity information.',
        emoji: '🏠',
      },
      {
        title: 'WhiteBlaze — Water Thread',
        url: 'https://www.whiteblaze.org/forum/forum/appalachian-trail-shelters/water-sources',
        description: 'Crowdsourced water source reliability and treatment recommendations.',
        emoji: '🚰',
      },
      {
        title: 'FarOut App — Live Shelter Updates',
        url: 'https://www.faroutapp.com',
        description: 'Real-time hiker updates on shelter conditions and water availability.',
        emoji: '📲',
      },
    ],
  },
  {
    title: 'Day Hike Guides',
    emoji: '🌄',
    links: [
      {
        title: 'Trails That Rock — Weverton Cliffs',
        url: 'https://www.trailsthatrock.com/route/weverton-cliffs',
        description: '2-mile day hike to the first major AT overlook with Potomac River views.',
        emoji: '🥾',
      },
      {
        title: 'Trails That Rock — Washington Monument',
        url: 'https://www.trailsthatrock.com/route/washington-monument-trail',
        description: '3-mile moderate day hike to historic monument with 360-degree views.',
        emoji: '🗿',
      },
      {
        title: 'AllTrails — Annapolis Rock Day Hike',
        url: 'https://www.alltrails.com/trail/maryland/frederick-county/appalachian-trail-to-annapolis-rock',
        description: 'Popular 5-mile day hike to Maryland\'s premier camping/climbing site.',
        emoji: '🧗',
      },
      {
        title: 'Melanin Base Camp — Annapolis Rock Guide',
        url: 'https://www.melaninbasecamp.com/annapolis-rock',
        description: 'Inclusive day hike guide with accessibility notes and diverse hiking perspectives.',
        emoji: '🏔️',
      },
      {
        title: 'AllTrails — Best MD Day Hikes',
        url: 'https://www.alltrails.com/trail/maryland',
        description: 'Curated list of best day hikes in Maryland with ratings and photos.',
        emoji: '⭐',
      },
    ],
  },
  {
    title: 'Community & Forums',
    emoji: '👥',
    links: [
      {
        title: 'WhiteBlaze Forum',
        url: 'https://www.whiteblaze.org/forum',
        description: 'The largest AT hiker community with real-time trail conditions, gear advice, and trail names.',
        emoji: '💬',
      },
      {
        title: 'PATC Events & Meetups',
        url: 'https://www.patc.net/get-involved',
        description: 'Join PATC guided hikes, work trips, and community events on the MD AT.',
        emoji: '👥',
      },
      {
        title: 'Reddit — r/AppalachianTrail',
        url: 'https://www.reddit.com/r/AppalachianTrail',
        description: 'Active hiking community with trip planning advice, gear reviews, and trail stories.',
        emoji: '🤖',
      },
      {
        title: 'FarOut App Community',
        url: 'https://www.faroutapp.com',
        description: 'In-app community features with hiker interactions, condition updates, and peer support.',
        emoji: '📱',
      },
      {
        title: 'Hiking Project — Local Community',
        url: 'https://www.hikingproject.com/activities/hiking/maryland',
        description: 'Community-driven trail database with user comments and recent conditions.',
        emoji: '🌲',
      },
    ],
  },
  {
    title: 'Other Maryland Trails',
    emoji: '🥾',
    links: [
      {
        title: 'Billy Goat Trail — C&O Canal',
        url: 'https://www.nps.gov/choh/planyourvisit/billy-goat-trail.htm',
        description: '1.7-mile challenging scramble with jagged cliffs and Potomac River views near DC.',
        emoji: '🧗',
      },
      {
        title: 'Catoctin Mountain Park — Cunningham Falls',
        url: 'https://www.nps.gov/cato/planyourvisit/trails.htm',
        description: '2.8-mile loop to Maryland\'s tallest waterfall (78 ft). Wolf Rock & Chimney Rock formations.',
        emoji: '💧',
      },
      {
        title: 'Sugarloaf Mountain',
        url: 'https://www.sugarloafmd.com',
        description: '5.7-mile loop with quartzite cliffs — best rural hiking near DC/Baltimore.',
        emoji: '⛰️',
      },
      {
        title: 'Calvert Cliffs State Park',
        url: 'https://dnr.maryland.gov/publiclands/Pages/southern/calvertcliffs.aspx',
        description: '3.8-mile trail to fossil beach. No cliff climbing — erosion danger.',
        emoji: '🦴',
      },
      {
        title: 'Soldiers Delight NEA',
        url: 'https://dnr.maryland.gov/publiclands/Pages/central/soldiersdelight.aspx',
        description: '7 miles of trails in rare serpentine grassland ecosystem. Bring waterproof boots.',
        emoji: '🌿',
      },
      {
        title: 'Gunpowder Falls State Park',
        url: 'https://dnr.maryland.gov/publiclands/Pages/central/gunpowder.aspx',
        description: 'Extensive trail network along scenic river valley near Baltimore.',
        emoji: '🏞️',
      },
    ],
  },
  {
    title: 'Trail Races & Challenges',
    emoji: '🏃',
    links: [
      {
        title: 'JFK 50 Mile — Nov 21, 2026',
        url: 'https://jfk50mile.org',
        description: 'Oldest US ultramarathon (64th edition). Western MD mountain trails. Registration opens March 1.',
        emoji: '🏅',
      },
      {
        title: 'Catoctin 50K — June 20, 2026',
        url: 'https://www.catoctin50k.com',
        description: '50K and 25K "Half Cat" options on rocky Catoctin Blue Trail. Out-and-back format.',
        emoji: '🏔️',
      },
      {
        title: 'Fastest Known Time — Four States',
        url: 'https://www.fastestknowntime.com/route/four-states-challenge-va-wv-md-pa',
        description: 'FKT records and route variations for the 43.5-mile Four States Challenge.',
        emoji: '⚡',
      },
    ],
  },
  {
    title: 'Camping Along the AT',
    emoji: '⛺',
    links: [
      {
        title: 'NPS — C&O Canal Campgrounds',
        url: 'https://www.nps.gov/choh/planyourvisit/camping.htm',
        description: 'Adjacent canal trail camping near Harpers Ferry with full amenities.',
        emoji: '🏕️',
      },
      {
        title: 'Catoctin Mountain Park — Owens Creek Campground',
        url: 'https://www.nps.gov/cato/planyourvisit/camping.htm',
        description: 'Full-service campground near AT with water and facilities. Reserve ahead.',
        emoji: '🏞️',
      },
      {
        title: 'Greenbrier State Park — Campground',
        url: 'https://dnr.maryland.gov/publiclands/Pages/central/greenbrier.aspx',
        description: 'Full-service camping with lake access near central MD AT section.',
        emoji: '🏕️',
      },
      {
        title: 'Harpers Ferry KOA — Trail Town Lodging',
        url: 'https://koa.com/campgrounds/harpers-ferry',
        description: 'Hiker-friendly KOA with bunkhouse, camping, and proximity to AT trailhead.',
        emoji: '🏨',
      },
      {
        title: 'Maryland State Parks — Camping',
        url: 'https://dnr.maryland.gov/publiclands/pages/index.aspx',
        description: 'Directory of state park campgrounds throughout Maryland for basecamp or pre/post-hike stays.',
        emoji: '🏕️',
      },
    ],
  },
  {
    title: 'Waterfall Hikes',
    emoji: '💧',
    links: [
      {
        title: 'Cunningham Falls — Catoctin Mountain',
        url: 'https://dnr.maryland.gov/publiclands/Pages/western/cunningham.aspx',
        description: 'Maryland\'s largest cascading waterfall (78 ft). Easy 2.8-mile loop trail.',
        emoji: '💦',
      },
      {
        title: 'Muddy Creek Falls — Swallow Falls',
        url: 'https://dnr.maryland.gov/publiclands/Pages/western/swallowfalls.aspx',
        description: 'Highest free-falling waterfall in MD (53 ft). Short trail from parking.',
        emoji: '🏔️',
      },
      {
        title: 'Kilgore Falls — Rocks State Park',
        url: 'https://dnr.maryland.gov/publiclands/Pages/central/rocks.aspx',
        description: '17-ft falls, second highest in MD. Swimming hole below (seasonal).',
        emoji: '🏊',
      },
      {
        title: 'Great Falls — C&O Canal',
        url: 'https://www.nps.gov/choh/planyourvisit/greatfallstavern.htm',
        description: 'Spectacular Potomac River cascades at Mile 14.3. Billy Goat Trail access.',
        emoji: '🌊',
      },
    ],
  },
];

/**
 * Export for easy access in ResourcesHubScreen
 */
export const HIKING_SECTIONS_BY_ACTIVITY = {
  hiking: HIKING_RESOURCES,
};
