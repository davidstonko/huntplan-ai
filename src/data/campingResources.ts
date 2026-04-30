/**
 * @file data/campingResources.ts
 * @description Curated Maryland camping resources — reservations, regulations, maps, weather, gear, and out-of-state links.
 * Organized by category for quick reference and external navigation.
 * Sources: MD DNR, Recreation.gov, NOAA, REI, AllTrails
 * Last updated: 2026-04-08
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CAMPING RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Curated camping resources organized by category.
 * Each link includes a title, URL, description, and emoji icon for visual scanning.
 */
export const CAMPING_RESOURCES: ResourceSection[] = [
  {
    title: 'Reservations & Booking',
    emoji: '📅',
    links: [
      {
        title: 'Maryland Park Reservations',
        url: 'https://parkreservations.maryland.gov/',
        description: 'Official MD state park campsites — tents, RVs, cabins, yurts',
        emoji: '🏕️',
      },
      {
        title: 'Call Center: 1-888-432-2267',
        url: 'tel:+18884322267',
        description: 'Phone booking for state parks (outside US: 301-687-8160)',
        emoji: '☎️',
      },
      {
        title: 'Recreation.gov',
        url: 'https://www.recreation.gov/',
        description: 'Federal campgrounds — national parks, forests, Corps of Engineers',
        emoji: '🇺🇸',
      },
      {
        title: 'Hipcamp',
        url: 'https://www.hipcamp.com/en-US/d/united-states/maryland/camping/all',
        description: 'Private land camping — unique spots across Maryland',
        emoji: '🌲',
      },
      {
        title: 'Green Ridge State Forest (Primitive)',
        url: 'https://dnr.maryland.gov/forests/Pages/publiclands/Greenridge/Recreation-Camping.aspx',
        description: '100 dispersed campsites — $10/night, first-come/first-served',
        emoji: '⛺',
      },
    ],
  },

  {
    title: 'Rules & Regulations',
    emoji: '⚖️',
    links: [
      {
        title: 'MD DNR Camping & Cabins Info',
        url: 'https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx',
        description: 'Official camping rules, policies, and regulations',
        emoji: '📋',
      },
      {
        title: 'Fire Regulations & Burn Bans',
        url: 'https://dnr.maryland.gov/forests/pages/fire/firenotes.aspx',
        description: 'Campfire rules, burn ban status, fire safety',
        emoji: '🔥',
      },
      {
        title: 'Pet Policy in State Parks',
        url: 'https://dnr.maryland.gov/publiclands/pages/pets.aspx',
        description: 'Dog leash requirements, pet camping areas, restrictions',
        emoji: '🐕',
      },
      {
        title: 'Maryland State Park Rules (COMAR)',
        url: 'https://www.law.cornell.edu/regulations/maryland/COMAR-08-07-06-02',
        description: 'Official state regulations for park use and camping',
        emoji: '📜',
      },
      {
        title: 'Assateague Island Pet Camping Rules',
        url: 'https://dnr.maryland.gov/publiclands/Documents/Assateague/Assateague-SP-Rules-for-Pet-Camping.pdf',
        description: 'Island-specific pet camping guidelines (PDF)',
        emoji: '🐴',
      },
    ],
  },

  {
    title: 'Maps & Trail Info',
    emoji: '🗺️',
    links: [
      {
        title: 'AllTrails — Maryland Hiking',
        url: 'https://www.alltrails.com/us/maryland/hiking',
        description: 'Trail maps, reviews, difficulty ratings for camping areas',
        emoji: '🥾',
      },
      {
        title: 'MD DNR Park Finder',
        url: 'https://dnr.maryland.gov/publiclands/pages/index.aspx',
        description: 'All state parks, forests, and recreational areas',
        emoji: '🏞️',
      },
      {
        title: 'Park Trail Maps & Amenities',
        url: 'https://dnr.maryland.gov/publiclands/pages/oc.aspx',
        description: 'Individual park pages with maps, facilities, contact info',
        emoji: '📍',
      },
      {
        title: 'Deep Creek Lake State Park Trail Map',
        url: 'https://dnr.maryland.gov/publiclands/pages/deepcreeklake.aspx',
        description: 'Western Maryland flagship park — 68+ miles of hiking',
        emoji: '🏔️',
      },
      {
        title: 'Assateague Island Maps',
        url: 'https://www.nps.gov/asis/planyourvisit/marylandcamping.htm',
        description: 'National Seashore camping and beach access',
        emoji: '🏖️',
      },
    ],
  },

  {
    title: 'Weather & Conditions',
    emoji: '⛅',
    links: [
      {
        title: 'NOAA Weather Forecast',
        url: 'https://www.weather.gov/lgk/',
        description: 'National weather service — hourly forecasts, radar, alerts',
        emoji: '🌤️',
      },
      {
        title: 'Maryland DNR Alerts & Closures',
        url: 'https://dnr.maryland.gov/publiclands/pages/index.aspx',
        description: 'Park closures, trail conditions, weather impacts',
        emoji: '⚠️',
      },
      {
        title: 'Fire Danger Index',
        url: 'https://dnr.maryland.gov/forests/pages/fire/firenotes.aspx',
        description: 'Daily fire risk — burn ban status and restrictions',
        emoji: '🚫🔥',
      },
      {
        title: 'Weather Underground — Maryland',
        url: 'https://www.wunderground.com/weather/us/maryland',
        description: 'Detailed forecasts with wind, UV index, pollen',
        emoji: '💨',
      },
    ],
  },

  {
    title: 'Gear & Preparation',
    emoji: '🎒',
    links: [
      {
        title: 'REI Camping Checklist',
        url: 'https://www.rei.com/learn/expert-advice/backpacking-checklist.html',
        description: 'Essential gear checklist for camping trips',
        emoji: '✅',
      },
      {
        title: 'Leave No Trace Principles',
        url: 'https://lnt.org/why/7-principles/',
        description: 'Responsible camping ethics and environmental stewardship',
        emoji: '♻️',
      },
      {
        title: 'American Red Cross First Aid',
        url: 'https://www.redcross.org/take-a-class/first-aid',
        description: 'Wilderness first aid training and resources',
        emoji: '🏥',
      },
      {
        title: 'REI Tent Selection Guide',
        url: 'https://www.rei.com/learn/expert-advice/backpacking-tents.html',
        description: 'How to choose the right tent for Maryland seasons',
        emoji: '⛺',
      },
      {
        title: 'Sleeping Bag Temperature Guide',
        url: 'https://www.rei.com/learn/expert-advice/sleeping-bags.html',
        description: 'Select the right bag for spring, summer, fall, winter',
        emoji: '🛏️',
      },
      {
        title: 'Campstove & Fuel Safety',
        url: 'https://www.rei.com/learn/expert-advice/camp-stoves.html',
        description: 'Safe campfire and stove cooking techniques',
        emoji: '🍳',
      },
    ],
  },

  {
    title: 'Out of State Camping',
    emoji: '🚗',
    links: [
      {
        title: 'Virginia State Parks Camping',
        url: 'https://www.deq.virginia.gov/air/state-parks-recreation',
        description: '36 state parks — Shenandoah valley, mountains, coastal',
        emoji: '🏔️',
      },
      {
        title: 'Pennsylvania State Parks Camping',
        url: 'https://www.dcnr.pa.gov/Pages/default.aspx',
        description: '67 state parks — Pocono Mountains, lakes, forests',
        emoji: '🏕️',
      },
      {
        title: 'West Virginia State Parks',
        url: 'https://www.wvstateparks.com/camping',
        description: 'Rugged mountain camping — New River Gorge, Kanawha',
        emoji: '⛰️',
      },
      {
        title: 'Delaware Seashore State Park',
        url: 'https://dnrec.delaware.gov/parks/seashore/',
        description: '1.5 hours east — beach camping, surf access',
        emoji: '🌊',
      },
      {
        title: 'Shenandoah National Park (VA)',
        url: 'https://www.nps.gov/shen/index.htm',
        description: 'World-class hiking, scenic Skyline Drive, multiple campgrounds',
        emoji: '🥾',
      },
      {
        title: 'Recreation.gov Federal Camping',
        url: 'https://www.recreation.gov/',
        description: 'National parks, forests, & Corps campgrounds (all US)',
        emoji: '🇺🇸',
      },
    ],
  },

  {
    title: 'Community & Tips',
    emoji: '👥',
    links: [
      {
        title: 'Maryland Outdoor Groups',
        url: 'https://www.meetup.com/search/?keywords=camping&location=Maryland%2C+USA',
        description: 'Local meetup groups for camping, hiking, outdoor adventures',
        emoji: '👫',
      },
      {
        title: 'Hipcamp — Maryland Reviews',
        url: 'https://www.hipcamp.com/en-US/d/united-states/maryland/camping/all',
        description: 'Real camper reviews and photos of MD camping spots',
        emoji: '⭐',
      },
      {
        title: 'Maryland Tourism — Outdoor Activities',
        url: 'https://www.visitmaryland.org/what-do/outdoor-adventure',
        description: 'Curated list of outdoor recreation across Maryland',
        emoji: '📍',
      },
      {
        title: 'Maryland DNR News & Updates',
        url: 'https://news.maryland.gov/dnr/',
        description: 'Latest park updates, seasonal closures, new amenities',
        emoji: '📰',
      },
    ],
  },
];
