/**
 * MDHuntFishOutdoors AI Chat Knowledge Base — Hiking Module
 *
 * Provides context-aware responses for hiking queries, with focus on Maryland's
 * Appalachian Trail section (40.9 mi), Four States Challenge, and day hike destinations.
 *
 * Sources:
 * - Appalachian Trail Conservancy (ATC): appalachiantrail.org
 * - Potomac Appalachian Trail Club (PATC): patc.net
 * - NOAA Weather: weather.gov
 * - MD DNR: dnr.maryland.gov
 *
 * Updated: 2026-04-11
 */

import {
  servicesForRegion,
  servicesByCategory,
  type LocalService,
} from './marylandLocalServices';
import { CURATED_HIKING_GEAR } from './curatedHikingGear';

export interface ChatResponse {
  text: string;
  citations?: string[];
  followUpSuggestions?: string[];
}

// 2026-04-27: Hike-mode local-pros augmentation. Mirrors fishing + hunt
// pattern but joins on regions (counties / Baltimore metro / DMV) and
// surfaces hiking-shop / bike-shop / shoe-store / hiking-club services.
const HIKE_REGION_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['appalachian trail', 'Maryland'],
  ['at section', 'Maryland'],
  ['catoctin', 'Frederick County'],
  ['gunpowder', 'Baltimore County'],
  ['loch raven', 'Baltimore County'],
  ['prettyboy', 'Baltimore County'],
  ['baltimore', 'Baltimore Metro'],
  ['howard county', 'Howard County'],
  ['columbia', 'Howard County'],
  ['frederick', 'Frederick County'],
  ['rockville', 'Montgomery County'],
  ['bethesda', 'Montgomery County'],
  ['montgomery', 'Montgomery County'],
  ['western maryland', 'Western Maryland'],
  ['dmv', 'DMV'],
  ['dc area', 'DMV'],
  ['four states', 'Maryland'],
];

const HIKE_RELEVANT_CATEGORIES = new Set([
  'hiking-shop',
  'bike-shop',
  'shoe-store',
  'hiking-club',
  'biking-club',
  'trail-shuttle',
  'hostel',
]);

function detectHikeRegion(q: string): string | null {
  for (const [token, canonical] of HIKE_REGION_TOKENS) {
    if (q.includes(token)) return canonical;
  }
  return null;
}

function augmentHikeWithLocalPros(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const region = detectHikeRegion(userQuery.toLowerCase());
  if (!region) return response;
  const collected: LocalService[] = [];
  const seen = new Set<string>();
  for (const s of servicesForRegion(region)) {
    if (HIKE_RELEVANT_CATEGORIES.has(s.category) && !seen.has(s.id)) {
      seen.add(s.id);
      collected.push(s);
      if (collected.length >= 3) break;
    }
  }
  // If region match yields nothing hike-relevant, fall back to PATC + MCM
  // (statewide hiking clubs) so we still surface something actionable.
  if (collected.length === 0) {
    for (const s of servicesByCategory('hiking-club')) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        collected.push(s);
        if (collected.length >= 2) break;
      }
    }
  }
  if (collected.length === 0) return response;
  const footer =
    `\n\n**Local pros for ${region}:**\n` +
    collected
      .map((p) => {
        const phone = p.phone ? ` · ${p.phone}` : '';
        const url = p.website ? ` · ${p.website}` : '';
        return `• **${p.name}** (${p.category.replace('-', ' ')}, ${p.city})${phone}${url}`;
      })
      .join('\n');
  return {
    ...response,
    text: response.text + footer,
    citations: [
      ...(response.citations ?? []),
      'marylandLocalServices.ts (verified-2026 listings)',
    ],
  };
}

/**
 * AT Shelter definitions for MD section
 */
interface ATShelter {
  name: string;
  capacity: number;
  waterSource: string;
  milesFromStart: number;
  notes?: string;
}

const MD_AT_SHELTERS: ATShelter[] = [
  {
    name: 'Harpers Ferry KOA (Trail Town)',
    capacity: 25,
    waterSource: 'KOA facilities',
    milesFromStart: 0,
    notes: 'Trail town with resupply'
  },
  {
    name: 'Sandy Hook Bridge Shelter',
    capacity: 8,
    waterSource: 'Potomac River access',
    milesFromStart: 3.4,
  },
  {
    name: 'Ed Garvey Shelter',
    capacity: 6,
    waterSource: 'Spring (0.4 mi descent)',
    milesFromStart: 9.5,
    notes: 'Remote, water requires downhill trek'
  },
  {
    name: 'Weverton Shelter',
    capacity: 8,
    waterSource: 'Weverton Spring',
    milesFromStart: 14.8,
    notes: 'Popular, great viewpoint nearby'
  },
  {
    name: 'Annapolis Rock Camping Area',
    capacity: 30,
    waterSource: 'Annapolis Spring',
    milesFromStart: 19.7,
    notes: 'Rock climbing area, scenic overlook'
  },
  {
    name: 'Rocky Run Shelter',
    capacity: 8,
    waterSource: 'Rocky Run Spring',
    milesFromStart: 25.5,
    notes: 'Most reliable water source'
  },
  {
    name: 'Pogo Memorial Shelter',
    capacity: 6,
    waterSource: 'Pogo Spring',
    milesFromStart: 31.2,
    notes: 'Reliable water, quiet'
  },
  {
    name: 'Pine Grove Furnace Shelter',
    capacity: 10,
    waterSource: 'State park water',
    milesFromStart: 36.5,
    notes: 'Near PA border, historic furnace'
  },
  {
    name: 'Doll\'s Head Gap Shelter',
    capacity: 8,
    waterSource: 'Stream at shelter',
    milesFromStart: 40.9,
    notes: 'Final MD shelter, close to PA border'
  },
];

/**
 * 2026-04-29: AI gear-suggestion monetization for Hike mode.
 * Mirrors the fishing + hunt pattern. Token-match query to a hike gear
 * category, splice "What we use" footer with Amazon affiliate links
 * (mdoutdoors1-20 tag).
 */
const HIKE_GEAR_CATEGORY_TOKENS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['day hike', 'short hike', 'half day', 'half-day'], 'day_hike'],
  [['overnight', 'backpack', 'thru hike', 'thru-hike', 'AT through', 'multi-day', 'multi day', 'shelter'], 'overnight'],
  [['winter', 'snow', 'cold weather', 'sub-freezing', 'subfreezing'], 'cold_weather'],
  [['rain', 'wet', 'storm'], 'rain_gear'],
];

function detectHikeGearCategory(q: string): string | null {
  for (const [tokens, categoryId] of HIKE_GEAR_CATEGORY_TOKENS) {
    if (tokens.some((t) => q.includes(t))) return categoryId;
  }
  return null;
}

function augmentHikeWithGearSuggestions(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const categoryId = detectHikeGearCategory(userQuery.toLowerCase());
  if (!categoryId) return response;
  const category = CURATED_HIKING_GEAR.find((c) => c.id === categoryId);
  if (!category || category.items.length === 0) return response;
  const ranked = [...category.items].sort((a, b) => {
    const aScore = (a.essential ? 2 : 0) + (a.creatorPick ? 1 : 0);
    const bScore = (b.essential ? 2 : 0) + (b.creatorPick ? 1 : 0);
    return bScore - aScore;
  });
  const picks = ranked.slice(0, 3);
  const footer =
    `\n\n**What we use (${category.title}):**\n` +
    picks
      .map((g) => {
        const tag = g.creatorPick ? ' ⭐ By David' : '';
        return `• [${g.name}](${g.url})${tag} — ${g.description} (${g.price})`;
      })
      .join('\n') +
    `\n\n_Affiliate links — purchases support MDHuntFishOutdoors._`;
  return {
    ...response,
    text: response.text + footer,
    citations: [
      ...(response.citations ?? []),
      `curatedHikingGear.ts — ${category.title}`,
    ],
  };
}

/**
 * Smart response handler for hiking queries.
 * 2026-04-27: wraps the raw responder with local-pros augmentation.
 * 2026-04-29: chained with gear-suggestion monetization (Amazon affiliate).
 */
export function getHikingSmartResponse(userQuery: string): ChatResponse | null {
  const raw = getHikingSmartResponseRaw(userQuery);
  if (!raw) return raw;
  const withPros = augmentHikeWithLocalPros(raw, userQuery);
  return augmentHikeWithGearSuggestions(withPros, userQuery);
}

function getHikingSmartResponseRaw(userQuery: string): ChatResponse | null {
  const q = userQuery.toLowerCase().trim();

  // 1. AT General Info
  if (
    q.includes('appalachian trail') && (q.includes('maryland') || q.includes('md')) ||
    q.includes('at in maryland') ||
    q.includes('how long is the at') ||
    q.includes('at distance')
  ) {
    return {
      text: `The Appalachian Trail in Maryland spans 40.9 miles along the South Mountain ridgeline, from the Potomac River at Harpers Ferry to the Pennsylvania border near Pine Grove Furnace. The trail is moderate to strenuous with well-maintained footway and dramatic ridge views. Most hikers complete the section in 3-5 days of backpacking. Camping is permitted only at designated shelters and the Annapolis Rock camping area. Water sources are generally reliable at shelters, though some require short side trips.`,
      citations: [
        'https://www.appalachiantrail.org/explore/states-and-regions/maryland',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        'Tell me about the Four States Challenge',
        'Where are the best views on the AT?',
        'How do I do a day hike on the AT?',
      ],
    };
  }

  // 2. Four States Challenge
  if (
    q.includes('four states challenge') ||
    q.includes('four state hike') ||
    q.includes('death march') ||
    q.includes('four state ultra')
  ) {
    return {
      text: `The Four States Challenge is an ultra-distance hiking feat that covers 43.5 miles across Virginia (VA), West Virginia (WV), Maryland (MD), and Pennsylvania (PA) in a single push. Most commonly done in 24-30 hours, it combines:
• Virginia: ~15 mi (AT in VA + Blue Ridge)
• West Virginia: ~2.5 mi (Harpers Ferry area, ATC HQ)
• Maryland: 40.9 mi (full AT section)
• Pennsylvania: ~4 mi (AT into PA)

This is an ultra-strenuous challenge requiring excellent fitness, night hiking skills, and strategic water/food management. Most support comes from pre-positioned cache points and crew. Spring and fall are ideal seasons. Training typically requires 6-8 weeks of high-mileage hiking.`,
      citations: [
        'https://www.blueridgeoutdoors.com/hiking-travel/four-states-challenge/',
        'https://www.thetrek.co/appalachian-trail/four-states-challenge/',
      ],
      followUpSuggestions: [
        'What training do I need for the Four States?',
        'What\'s the fastest known time?',
        'Can I break it into sections?',
      ],
    };
  }

  // 3. AT Shelters & Camping
  if (q.includes('shelter') || q.includes('where can i sleep') || q.includes('camping on at')) {
    const shelterList = MD_AT_SHELTERS
      .map((s) => `• **${s.name}** (${s.milesFromStart}mi): ${s.capacity} capacity, water: ${s.waterSource}${s.notes ? ` — ${s.notes}` : ''}`)
      .join('\n');

    return {
      text: `Maryland AT has 9 shelter areas with 6-30 person capacity. All shelters are sheltered lean-tos with designated tent platforms or cleared areas. Water is available at most sites:\n\n${shelterList}\n\nReliable water sources: Rocky Run Spring (25.5 mi) and Pogo Spring (31.2 mi) are most dependable. Camping is permitted ONLY at these designated sites — no dispersed camping on the AT in Maryland.`,
      citations: [
        'https://www.patc.net/explore/trails/appalachian-trail',
        'https://www.whiteblaze.org/forum/forum/appalachian-trail/appalachian-trail-shelters',
      ],
      followUpSuggestions: [
        "What's the shelter spacing like?",
        'Do I need water treatment?',
        'Can I camp with my dog?',
      ],
    };
  }

  // 4. Water Sources
  if (q.includes('water') && (q.includes('at') || q.includes('hiking') || q.includes('trail'))) {
    return {
      text: `Water on Maryland's AT section is generally available at or near shelters, though quality varies:\n\n**Most Reliable**: Rocky Run Spring (25.5 mi) and Pogo Spring (31.2 mi) are spring-fed and dependable year-round.\n\n**Good Sources**: Weverton Spring, Annapolis Spring, and Sandy Hook (river access) are also reliable.\n\n**Caution**: Ed Garvey Shelter requires a 0.4-mile descent to its spring. During dry seasons, verify water availability before committing to a shelter.\n\n**Treatment**: Always treat or filter water from springs and streams. Carry a backup water treatment method (tablets, squeeze filter, or pump). Sections without reliable water may require carrying 2-3 liters.`,
      citations: [
        'https://www.whiteblaze.org/forum/forum/appalachian-trail-shelters/water-sources',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        'What water treatment should I bring?',
        'Which shelters have the most reliable water?',
      ],
    };
  }

  // 5. Trailheads & Parking
  if (q.includes('trailhead') || q.includes('parking') || q.includes('where to park') || q.includes('where to start')) {
    return {
      text: `Popular AT trailhead access points in/near Maryland:

• **Harpers Ferry KOA** (WV, mile 0): Gateway town with ample parking and supplies. ATC headquarters here.
• **Weverton Cliffs** (7 mi north): 10-car lot, scenic day hike access
• **South Mountain Picnic Area** (near Boonsboro): Day hike trailhead, 20+ spots
• **Gathland State Park** (MD): Historic monument area, 15-car lot
• **PA border (Doll's Head)**: Limited pulloff parking, used by section-enders

For backcountry parking, overnight parking is available at Harpers Ferry KOA and some PATC access areas. Always check current trailhead conditions and parking limits before heading out. Peak season (Oct) can fill quickly.`,
      citations: [
        'https://www.appalachiantrail.org',
        'https://www.patc.net',
      ],
      followUpSuggestions: [
        'How do I get to Weverton Cliffs?',
        "What's the best day hike?",
      ],
    };
  }

  // 6. Annapolis Rock
  if (q.includes('annapolis rock') || q.includes('annapolis')) {
    return {
      text: `Annapolis Rock is Maryland's most popular AT camping spot — a stunning exposed outcrop with 360-degree views at 19.7 miles into the trail. The rock is 100+ feet high with scrambling routes to the summit and a designated camping area below with 30+ capacity. Spring-fed water is reliable (Annapolis Spring). The site is famous for rock climbers in warmer months and offers some of the trail's most spectacular sunset/sunrise views. It's ideal as a 2-3 day base camp for day hikes to nearby viewpoints. No fires allowed on the rock itself; use established fire ring in the camping area.`,
      citations: [
        'https://www.alltrails.com/trail/maryland/frederick-county/appalachian-trail-to-annapolis-rock',
        'https://www.patc.net',
      ],
      followUpSuggestions: [
        'How far is Annapolis Rock from the start?',
        'Can I do a day hike to Annapolis Rock?',
        "What's nearby Annapolis Rock?",
      ],
    };
  }

  // 7. Best Viewpoints
  if (q.includes('viewpoint') || q.includes('overlook') || q.includes('scenic') || q.includes('best views')) {
    return {
      text: `Maryland AT's best viewpoints:

• **Weverton Cliffs** (14.8 mi): First major overlook, Potomac River view, water source nearby
• **Annapolis Rock** (19.7 mi): 360-degree ridge views, rock scrambling, camping area
• **Black Rock** (22 mi): Exposed outcrop with ridge vistas
• **High Rock** (32 mi): Panoramic Catoctin views, less crowded
• **Washington Monument** (near trail): Historic monument with views, day hike accessible
• **Bear Rock** (23 mi): Smaller viewpoint with good photo angles

Peak season (Oct) and clear days offer 50+ mile visibility. Early morning and late afternoon light are ideal for photos.`,
      citations: [
        'https://www.alltrails.com/trail/maryland',
        'https://www.appalachiantrail.org',
      ],
      followUpSuggestions: [
        'Which viewpoint is easiest to reach?',
        'Best time of year for views?',
      ],
    };
  }

  // 8. Washington Monument
  if (q.includes('washington monument') && q.includes('hike')) {
    return {
      text: `The Washington Monument in Boonsboro, Maryland is America's first monument dedicated to George Washington (built in 1827). It's a 34-foot stone tower accessible via a 3-mile round-trip day hike from South Mountain Picnic Area. The monument sits on a hilltop with 360-degree views of the Catoctin and Blue Ridge mountains. The hike is moderate with steady elevation gain. The monument is part of Washington Monument State Park and makes an excellent half-day outing. Parking at the picnic area ($5), seasonal hours 9am-sunset. Bring water as the trail has limited water sources.`,
      citations: [
        'https://www.dnr.maryland.gov/publiclands/Pages/central/washingtonmonument.aspx',
        'https://www.alltrails.com/trail/maryland/frederick-county/washington-monument-trail',
      ],
      followUpSuggestions: [
        'How far is this from the AT?',
        'Can I combine this with the AT?',
      ],
    };
  }

  // 9. Trail Difficulty
  if (q.includes('difficult') || q.includes('hard') || q.includes('easy section') || q.includes('elevation gain')) {
    return {
      text: `Maryland AT difficulty is **moderate to strenuous** by AT standards:

**Terrain**: Mostly ridgeline walking on well-maintained footway. Rocks and root-studded in sections. Generally stable footing.

**Elevation**: 5,000+ feet of total elevation gain/loss over 40.9 miles (mostly rolling hills, 200-400 ft per section, no massive climbs).

**Easiest section**: Weverton to Annapolis Rock (5 miles, gradual)
**Hardest section**: Ed Garvey to Weverton (5 miles, sustained elevation)
**Steepest**: Various 0.2-0.5 mile pitches on south-facing slopes

**Fitness Required**: Comfortable with 12-15 mile days with full backpack. Previous backpacking experience recommended. Fit day hikers can do 8-10 mile sections.

**Best Season**: Spring (April-May) and Fall (Sept-Oct) for comfortable temperatures. Summer is hot/humid. Winter possible but cold and exposed on ridgeline.`,
      citations: [
        'https://www.appalachiantrail.org/explore/states-and-regions/maryland',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        'What section is easiest?',
        'Best time to hike?',
        'What fitness level do I need?',
      ],
    };
  }

  // 10. Dogs on Trail
  if (q.includes('dog') || q.includes('pet') || q.includes('leash')) {
    return {
      text: `Dogs are **allowed on Maryland's AT section on a leash** (max 6 feet). However, some adjacent areas have restrictions:

• **AT in Maryland**: Dogs OK on leash
• **Gathland State Park**: Dogs on leash allowed
• **C&O Canal**: Dogs on leash allowed
• **Washington Monument State Park**: Dogs on leash allowed
• **Catoctin Mountain Park**: Dogs on leash, certain areas restricted

**Tips for hiking with dogs**:
- Carry extra water for your dog
- Dog booties help on rocky sections
- Paw balm for blister prevention
- Shelters are first-come, first-served — not all welcome dogs
- Pack out all waste (doggy bags required)
- Keep on leash at all times in designated areas

Most shelter areas can accommodate dogs if you're willing to camp with your pack. Plan for slower mileage (8-12 miles/day vs 12-15).`,
      citations: [
        'https://www.appalachiantrail.org/explore/states-and-regions/maryland',
        'https://www.nps.gov/choh/planyourvisit/pet-policy.htm',
      ],
      followUpSuggestions: [
        "What's a good day hike with my dog?",
        'How do I prepare my dog for backpacking?',
      ],
    };
  }

  // 11. Season & Weather
  if (q.includes('season') || q.includes('best time') || q.includes('when to hike') || q.includes('weather')) {
    return {
      text: `**Best Seasons for Maryland AT**:

**Spring (April-May)**: Ideal 70-75°F temps, wildflowers, reliable water. Crowded around Easter/May weekends. Bug season starts late May.

**Summer (June-Aug)**: Hot (80-90°F), humid, bug-infested. Not recommended for backpacking but doable for early morning start day hikes.

**Fall (Sept-Oct)**: Perfect 60-75°F, clear skies, fall colors (peak Oct 1-20). Most popular season — shelters fill quickly. Dry conditions, excellent views.

**Winter (Nov-March)**: Cold (30-45°F), exposed ridgeline, icy sections. Requires winter gear. Fewer shelters staffed, but solitude and winter beauty. Not for beginners.

**Avoid**: Mid-May to early Sept for bugs and heat. Mid-Oct holiday weekends (Labor Day, Columbus Day, Halloween).

**Rain**: Spring and late summer get most rain. Fall is generally drier. Bring rain gear year-round.`,
      citations: [
        'https://weather.gov/wrh/Climate',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        'What gear do I need?',
        'Which month has the best weather?',
      ],
    };
  }

  // 12. Trail Rules & Regulations
  if (q.includes('rule') || q.includes('regulation') || q.includes('fire') || q.includes('permit')) {
    return {
      text: `**Maryland AT Hiking Rules**:

**Camping**: Permitted ONLY at designated shelters and Annapolis Rock. Max group size 10 people. No dispersed camping.

**Fires**: Allowed in established fire rings at shelter areas and Annapolis Rock. Check for seasonal restrictions (often fire ban July-Sept). Use dead wood only, no live trees.

**Leave No Trace**: Pack out all trash. No soap in water sources. Use established tent platforms.

**Water**: Treat all water before drinking. Camping without water treatment is not recommended.

**Noise**: Quiet hours 8pm-7am. Music and loud voices disturb other hikers.

**Pets**: Leash required, pack out pet waste.

**Hunting**: Fall hunting season (Sept-Dec) overlaps AT. Wear blaze orange October-December. Hiking during firearms season (Nov 1-15) is not recommended.

**Permits**: No permits required for hiking or camping on the AT in Maryland.`,
      citations: [
        'https://www.appalachiantrail.org/explore/states-and-regions/maryland',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        'Can I have a fire?',
        "What's the group size limit?",
      ],
    };
  }

  // 13. Day Hikes
  if (q.includes('day hike') || q.includes('day trip') || q.includes('half day')) {
    return {
      text: `**Popular Day Hikes on Maryland AT**:

• **Weverton Cliffs** (2 miles RT): Easy, first overlook, Potomac views. Parking at Weverton Picnic Area.

• **Washington Monument** (3 miles RT): Moderate, historic monument, 360-degree views. South Mountain Picnic Area.

• **Annapolis Rock** (5 miles RT): Moderate, scrambling required, camping area visible. Annapolis Rock Parking.

• **Sandy Hook to Weverton** (4 miles): Easy ridgeline walk with river views. Loop option via C&O Canal (8 miles).

• **Black Rock Loop** (3 miles): Moderate, exposed overlook. Boonsboro area parking.

**Tips**: Start early (7am) to beat crowds on weekends. Bring 2L water min. No services on trail — bring snacks/lunch. Summer: start before 8am to avoid heat. Fall/winter: bring layers, sunset is 5:30pm October.`,
      citations: [
        'https://www.alltrails.com/trail/maryland',
        'https://www.patc.net/explore/trails/appalachian-trail',
      ],
      followUpSuggestions: [
        "What's the easiest day hike?",
        'Can I combine multiple day hikes?',
      ],
    };
  }

  // 14. Backpacking & Multi-Day Itineraries
  if (q.includes('backpack') || q.includes('overnight') || q.includes('multi-day') || q.includes('itinerary')) {
    return {
      text: `**Sample Backpacking Itineraries**:

**3-Day: Harpers Ferry to Annapolis Rock (19.7 mi)**
- Day 1: Harpers Ferry → Ed Garvey Shelter (9.5 mi)
- Day 2: Ed Garvey → Weverton Shelter (5.3 mi)
- Day 3: Weverton → Annapolis Rock (5 mi), return next day via day hike

**4-Day: Full Ridge (30 mi)**
- Day 1: Harpers Ferry → Ed Garvey (9.5 mi)
- Day 2: Ed Garvey → Annapolis Rock (10.2 mi)
- Day 3: Annapolis Rock → Rocky Run (5.8 mi)
- Day 4: Rocky Run → Pogo (5.7 mi), return next day

**5-Day: Entire Maryland Section (40.9 mi)**
- Day 1: Harpers Ferry → Ed Garvey (9.5 mi)
- Day 2: Ed Garvey → Weverton (5.3 mi)
- Day 3: Weverton → Annapolis Rock (5 mi)
- Day 4: Annapolis Rock → Pogo (11.5 mi)
- Day 5: Pogo → PA border (9.7 mi)

**Shelters are 5-7 miles apart**, so daily mileage is 8-12 miles with full pack. Carry water treatment, stove fuel, food for resupply at Harpers Ferry.`,
      citations: [
        'https://www.patc.net/explore/trails/appalachian-trail',
        'https://www.appalachiantrail.org',
      ],
      followUpSuggestions: [
        'What gear do I need to backpack?',
        'When should I start?',
      ],
    };
  }

  // 15. Side Trails & Extensions
  if (q.includes('side trail') || q.includes('catoctin') || q.includes('maryland heights') || q.includes('extension')) {
    return {
      text: `**Extensions & Side Trails Near Maryland AT**:

• **Catoctin Trail** (26 miles): Parallel ridge trail connecting AT at multiple points. Scenic, less crowded. Loop options with AT.

• **Maryland Heights Trail** (2 miles to overlook): Short scramble with panoramic Potomac views. Parking at Harpers Ferry.

• **South Mountain Trail**: Ridgeline trail north of AT, connects to Washington Monument. 8+ mile options.

• **C&O Canal Towpath** (184.5 miles): Adjacent to AT near Harpers Ferry. Easy, flat, great for extending a trip.

• **Bear Rock Trail**: 1.5-mile loop near mid-section of AT.

• **Blackrock Trail**: 2-mile roundtrip scramble with views.

These side trails allow for loop hikes, extended trips, or lower-mileage alternatives to the main AT ridge.`,
      citations: [
        'https://www.patc.net/explore/trails/appalachian-trail',
        'https://www.nps.gov/choh/planyourvisit/trails.htm',
      ],
      followUpSuggestions: [
        'Can I do a loop hike?',
        "What's the Catoctin Trail like?",
      ],
    };
  }

  // 16. Other Maryland Trails
  if (
    q.includes('billy goat') ||
    q.includes('catoctin mountain') ||
    q.includes('sugarloaf') ||
    q.includes('calvert cliffs') ||
    q.includes('soldiers delight') ||
    (q.includes('trail') && q.includes('maryland') && !q.includes('at'))
  ) {
    return {
      text: `**Popular Maryland Hiking Trails (Beyond the AT)**:

• **Billy Goat Trail** (1.7 miles): Near Washington DC, challenging scrambling on jagged river cliffs overlooking the Potomac River. Popular with intermediate to advanced hikers. Parking at Carderock Recreation Area (C&O Canal).

• **Cunningham Falls Loop (Catoctin Mountain Park)** (2.8 miles): Classic moderate loop with 78-foot waterfall at mid-point. Very popular, often crowded on weekends. Good fitness recommended. Parking at visitor center.

• **Wolf Rock Loop (Catoctin Mountain)**: Strenuous option in same park. Rocky terrain, ridge views. More challenging than Cunningham Falls.

• **Sugarloaf Mountain** (5.7 miles loop): Best rural hiking option near DC/Baltimore corridor. Pleasant rolling terrain with summit views. Less technical than AT. Good for day hikers.

• **Calvert Cliffs State Park** (3.8 miles to beach): Scenic hiking to fossil-bearing beach bluffs. Famous for finding Miocene fossils. Water access but cliff climbing NOT permitted. Beach is the destination.

• **Soldiers Delight** (7 miles): Unique serpentine grassland ecosystem (rare in MD). Muddy in wet conditions — waterproof boots recommended. Scenic and ecologically interesting.

• **Other Notable Trails**:
  - Rocks State Park (Deer Park Lake trail, 2 miles)
  - Gunpowder Falls State Park (multiple loops, 1-8 miles)
  - Loch Raven Reservoir trails (4-6 miles)

**Difficulty Comparison**: Billy Goat > Catoctin Wolf Rock > Cunningham Falls > Sugarloaf > Soldiers Delight > Calvert Cliffs`,
      citations: [
        'https://dnr.maryland.gov/publiclands/Pages/trails.aspx',
        'https://www.alltrails.com/trail/maryland',
      ],
      followUpSuggestions: [
        'Which trail is easiest?',
        'Can I bring my dog?',
        'Best time of year to hike?',
      ],
    };
  }

  // 17. Endangered Species & Wildlife
  if (
    q.includes('endangered') ||
    q.includes('endangered species') ||
    q.includes('bald eagle') ||
    q.includes('rare species') ||
    q.includes('wildlife')
  ) {
    return {
      text: `**Maryland Endangered & Rare Species**:

**Official List Status**:
• MD maintains an official endangered species list updated annually (last major update: November 2023)
• Species have been tracked since 1984

**Bald Eagle — Notable Recovery Success**:
• **Federal Status**: Removed from endangered list (2007)
• **Maryland Status**: Removed from state endangered list (2010)
• **Current Population**: 383+ nesting pairs statewide
• Once hunted to near extinction, now thriving in MD waterways
• Regularly seen along Potomac River, reservoirs, and Chesapeake Bay

**County-Specific Endangered Species Lists**:
Maryland tracks endangered species by county:
• Allegany County
• Baltimore County (including Baltimore City)
• Frederick County
• Garrett County
• Montgomery County
• Somerset County
• St. Mary's County
• Worcester County

**Why This Matters for Hikers**:
• Respect habitat closures during nesting/breeding seasons
• Observe wildlife from distance (100+ feet for eagles)
• Report sightings to DNR for conservation research
• Never disturb nests or dens

**Finding Species Info**:
Visit https://dnr.maryland.gov/wildlife/Pages/plants_wildlife/tes_list.aspx for the complete list by county and status.`,
      citations: [
        'https://dnr.maryland.gov/wildlife/Pages/plants_wildlife/tes_list.aspx',
      ],
      followUpSuggestions: [
        'Where can I see bald eagles?',
        'What other species are endangered in MD?',
        'Can I photograph wildlife?',
      ],
    };
  }

  // 18. Four States Challenge — Enhanced
  if (
    q.includes('four states challenge') ||
    q.includes('four state hike') ||
    q.includes('death march') ||
    q.includes('four state ultra') ||
    q.includes('fkt') ||
    q.includes('fastest known time')
  ) {
    return {
      text: `**The Four States Challenge — Ultra-Distance Hiking Feat**:

**Overview**:
The Four States Challenge is an extreme 43.5–45 mile hiking odyssey completed in a single push (typically 24-30 hours). It connects four states across the Appalachian region.

**Route Breakdown**:

**Virginia Segment** (~15 miles)
• AT in Virginia + Blue Ridge sections
• Climbs Blue Ridge mountains
• Well-established trail, good water sources

**West Virginia Segment** (~2.5 miles)
• Harpers Ferry area (Appalachian Trail Conservancy HQ)
• Brief pass-through (shortest state segment)
• Historic significance (AT birthplace)

**Maryland Segment** (40.9 miles — **The Backbone**)
• **Full Appalachian Trail across Maryland**
• South Mountain ridgeline from Potomac River to PA border
• Moderate-to-strenuous terrain, well-maintained
• 9 shelters for sleep breaks (most commonly used)

**Pennsylvania Segment** (~4 miles)
• Continuation into PA at Doll's Head Gap
• Brief push to official challenge endpoint
• Completion point varies (some stop at MD border)

**Pennsylvania Option** (Alternative longer version):
• Some challengers extend to 45+ miles into PA
• Adds Pine Grove Furnace area or beyond

**Challenge Difficulty** (Ultra-Strenuous):
• Requires excellent fitness: 20+ mile day hiking experience
• Night hiking: Headlamp required for darkness sections
• Mental toughness: Sleep deprivation during 24-30 hour push
• Strategic pacing and nutrition essential
• Support crew highly recommended

**Key Training Factors**:
• 6-8 weeks of high-mileage training (40-50 miles/week)
• Long runs: Build to 25-35 mile days
• Elevation: 5,000+ feet of gain/loss
• Sustained effort on tired legs

**Support Strategy**:
• Pre-positioned food/water caches (if permitted)
• Crew at shelter areas for resupply
• Pacer(s) recommended for night sections
• Contact rangers for any special route questions

**Fastest Known Time (FKT)**:
• FKT records tracked at https://www.fastestknowntime.com/
• Course: VA → WV → MD → PA (43.5–45 miles)
• Records held by ultramarathon athletes
• Current FKTs range 16-20 hours (elite athletes)

**Best Seasons**:
• Spring (April-May): Ideal 70-75°F, good water
• Fall (Sept-Oct): Perfect 60-75°F, clear skies, no insects
• Avoid: Summer (heat/humidity), winter (cold/exposure on ridge)

**Common Itinerary** (30-hour push):
- Start: 6:00 a.m. Day 1 (Virginia)
- Virginia section: Hours 0-8
- Maryland section: Hours 8-28 (overnight hiking)
- Pennsylvania/finish: Hours 28-30+
- Strategy: Sleep 2-3 hours at shelter, push through night

**Why Attempt It?**:
• Bucket-list ultramarathon for East Coast hikers
• Combines four states + iconic AT in one epic adventure
• Proves extreme endurance and mental fortitude
• Strong community of challengers (forums, tracking groups)

**Resources**:
• BlueRidge Outdoors: Detailed guide
• The Trek: Firsthand accounts and training tips
• FastestKnownTime.com: Current FKT database
• PATC/ATC: Trail conditions and water source updates`,
      citations: [
        'https://www.blueridgeoutdoors.com/hiking-travel/four-states-challenge/',
        'https://www.thetrek.co/appalachian-trail/four-states-challenge/',
        'https://www.fastestknowntime.com/',
      ],
      followUpSuggestions: [
        'What training do I need?',
        'Can I break it into sections?',
        'What is the record time?',
      ],
    };
  }

  // 19. Waterfall Hikes
  if (q.includes('waterfall') || q.includes('falls') || q.includes('muddy creek') || q.includes('cunningham falls hike') || q.includes('kilgore') || q.includes('cascade falls') || q.includes('swallow falls')) {
    return handleWaterfallHikesQuery();
  }

  // 20. Rock Climbing
  if (q.includes('rock climbing') || q.includes('bouldering') || q.includes('top rope') || q.includes('lead climbing') || q.includes('carderock') || q.includes('climbing')) {
    return handleRockClimbingQuery();
  }

  // 21. Scenic Overlooks
  if (q.includes('overlook') || q.includes('viewpoint') || q.includes('scenic view') || q.includes('best views') || q.includes('vista') || q.includes('panoramic')) {
    return handleScenicOverlooksQuery();
  }

  // 22. Mountain Biking
  if (q.includes('mountain bike') || q.includes('mtb') || q.includes('mountain biking') || q.includes('bike trail')) {
    return handleMountainBikingQuery();
  }

  // 23. Geocaching
  if (q.includes('geocach') || q.includes('geocache') || q.includes('cache') || q.includes('treasure hunt')) {
    return handleGeocachingQuery();
  }

  // No match found
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL QUERY HANDLERS (Extended Content)
// ─────────────────────────────────────────────────────────────────────────────

function handleWaterfallHikesQuery(): ChatResponse {
  return {
    text: `**Waterfall Hikes in Maryland**:

• **Muddy Creek Falls** (53 ft, highest free-falling waterfall in MD)
  - Location: Swallow Falls State Park
  - Hike: 0.5–1.25 miles roundtrip to base
  - Difficulty: Easy to moderate
  - Best season: Spring (water flow highest)

• **Cunningham Falls** (78 ft, largest waterfall in MD)
  - Location: Catoctin Mountain Park, Frederick County
  - Hike: 2.8-mile loop around falls
  - Difficulty: Moderate, steady elevation
  - Visitor center and parking available
  - Best time: Spring and early summer

• **Kilgore Falls** (17 ft, 2nd highest in MD)
  - Location: Rocks State Park
  - Difficulty: Easy
  - Part of larger Rocks State Park trail system

• **Cascade Falls**
  - Hike: 2.2 miles roundtrip
  - Difficulty: Moderate
  - Scenic cascade formations

• **Great Falls** (Potomac River)
  - Location: C&O Canal Mile 14.3
  - Spectacular Potomac River views
  - Hike: 2–4 miles roundtrip
  - Difficulty: Easy to moderate
  - Closest waterfall to DC area

• **Swallow Falls State Park**
  - Multiple waterfall options: 1.25–5.5 mile loops
  - Highest point elevation hikes
  - Forest scenery, mountain streams

**Best Months**: April–May (spring runoff, wildflowers), September–October (clear skies, fewer insects)

**Photography Tips**: Shoot early morning or late afternoon for best light. Use tripod for water flow motion blur effects.`,
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/trails.aspx',
      'https://www.alltrails.com/trail/maryland',
    ],
    followUpSuggestions: [
      'Which waterfall is closest to my location?',
      'When is the best time to visit?',
      'Can I bring my dog to waterfalls?',
    ],
  };
}

function handleRockClimbingQuery(): ChatResponse {
  return {
    text: `**Rock Climbing in Maryland**:

**Top Climbing Destinations**:

• **Annapolis Rock** (1,700 ft elevation)
  - Cliff height: 50–70 feet
  - Route options: Top-rope and lead climbing
  - Scenic overlook at summit
  - Located on Appalachian Trail
  - Popular for intermediate to advanced climbers

• **Carderock Recreation Area** (Great Falls area)
  - High-quality climbing routes
  - Very accessible location near Washington DC
  - Good for all skill levels
  - Day-use facility with parking

• **Sugarloaf Mountain**
  - Multiple rock formations
  - Scenic rural climbing

• **Rocks State Park**
  - Rock climbing areas available
  - Park facilities and amenities

• **Black Rocks**
  - Bouldering opportunities
  - Scenic views

**Rock Climbing Essentials**:
  - **Bring your own gear**: No rentals available at crags
  - Rope, harness, quickdraws, carabiners required
  - Helmets recommended for outdoor climbing
  - Crash pads for bouldering

**Professional Instruction**:
  - Instruction available at: Carderock, Great Falls, Annapolis Rock
  - Many climbers get certified locally before attempting advanced routes
  - Beginner courses recommended before outdoor climbing

**Best Seasons**: Spring (April–May) and Fall (Sept–Oct) for comfortable temperatures and dry rock.

**Safety**: Always climb with a partner. Check rock conditions before climbing. Wet rock is dangerous.`,
    citations: [
      'https://www.mountainproject.com/area/105885/maryland',
      'https://dnr.maryland.gov/publiclands/Pages/trails.aspx',
    ],
    followUpSuggestions: [
      'Do I need climbing certification?',
      'What gear do I need to bring?',
      'Are there beginner climbing areas?',
    ],
  };
}

function handleScenicOverlooksQuery(): ChatResponse {
  return {
    text: `**Scenic Overlooks & Best Views in Maryland**:

**Mountain Ridge Overlooks**:

• **Annapolis Rock** (AT Mile 19.7, 1,762 ft)
  - GPS: 39.5609°N / 77.5997°W
  - 360-degree ridge views
  - Westward vistas of Catoctin ridges
  - Popular camping area, rock scrambling

• **High Rock** (AT Mile 32, 1,824 ft)
  - GPS: 39.6950°N / 77.5224°W
  - Panoramic Pennsylvania views
  - Less crowded than Annapolis Rock
  - Great for sunrise/sunset hiking

• **Washington Monument** (1,600 ft, Boonsboro)
  - 360-degree views from historic tower
  - Easy half-day hike (3 miles roundtrip)
  - South Mountain Picnic Area parking

• **Catoctin Mountain Scenic Loop** (8 miles)
  - 6 designated vista points
  - Multiple overlooks along single loop
  - Mix of easy and moderate terrain
  - Frederick County location

• **Dans Mountain** (2,895 ft, highest point in MD near AT)
  - Sunrise and sunset views
  - Panoramic eastern vistas

• **Weverton Cliffs** (AT Mile 14.8)
  - Potomac River overlook
  - 2 miles from AT main trail
  - Popular day hike destination

**Best Times for Views**:
  - **October 1–20**: Fall foliage peak, 50+ mile visibility on clear days
  - **Early morning**: Golden light, atmospheric haze
  - **Late afternoon**: Sunset views, long shadows
  - **Clear days only**: Check weather forecast for visibility

**Photography**: Bring wide-angle lens. Best light is 1 hour after sunrise or 1 hour before sunset.`,
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/trails.aspx',
      'https://www.alltrails.com/trail/maryland',
    ],
    followUpSuggestions: [
      'Which overlook has the best sunset view?',
      'Can I reach these overlooks as day hikes?',
      'Best season for 50-mile visibility?',
    ],
  };
}

function handleMountainBikingQuery(): ChatResponse {
  return {
    text: `**Mountain Biking in Maryland**:

**Top MTB Destinations**:

• **Green Ridge State Forest** (Cumberland, Allegany County)
  - **100+ miles** of trail network
  - **12.5-mile main loop** (moderate-difficult)
  - Hosted state MTB championships
  - Scenic ridge and valley riding
  - Good water sources and camping
  - One of the best trail systems in region

• **Patapsco Valley State Park** (Baltimore area)
  - Popular trails near Baltimore metro
  - Easy to moderate options
  - Water access, picnic facilities
  - Well-maintained trails

• **Schaeffer Farms** (Germantown, Montgomery County)
  - Beginner-friendly terrain
  - Close to DC area
  - Good for learning bike skills
  - Scenic meadow and woodland riding

• **Gambrill State Park** (Frederick)
  - Technical trail options
  - Moderate to difficult terrain
  - Mountain scenery
  - Good for intermediate riders

• **Fair Hill NRMA** (Cecil County)
  - Well-maintained trail system
  - Beginner to intermediate trails
  - Historic equestrian facilities nearby
  - Good trail conditions year-round

**Trail Ratings**:
  - Green Ridge = **State-level championship-quality**
  - Fair Hill = **Well-groomed, beginner-friendly**
  - Patapsco = **Urban accessibility**
  - Schaeffer = **Skills park**

**IMBA-Rated Trails**: Multiple Maryland trails have IMBA (International Mountain Biking Association) ratings for quality.

**Best Seasons**: Spring (April-May) and Fall (Sept-Oct) for dry trails and comfortable temperatures.

**Skill Progression**:
  - Beginners: Schaeffer Farms, Fair Hill easy loops
  - Intermediate: Patapsco, Fair Hill advanced sections
  - Advanced: Green Ridge main loop and technical sections

**Rentals**: Many Baltimore/Frederick shops rent full-suspension bikes for state forest riding.`,
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/trails.aspx',
      'https://www.imba.com',
    ],
    followUpSuggestions: [
      'What skill level do I need for Green Ridge?',
      'Where can I rent a mountain bike?',
      'Which trail is best for beginners?',
    ],
  };
}

function handleGeocachingQuery(): ChatResponse {
  return {
    text: `**Geocaching in Maryland**:

**What is Geocaching?**:
Geocaching is a real-world treasure hunting sport using GPS coordinates. Find hidden containers (caches) and log your discovery.

**Finding Caches in Maryland**:
  - Primary resource: **geocaching.com** — Search "Maryland" for coordinates
  - Cache types: Micro (tiny), small, regular, large containers
  - Difficulty ratings: Easy (1.0) to impossible (5.0)
  - Terrain ratings: Accessible (1.0) to extreme (5.0)

**Featured Program: Cache Across Maryland**:
  - Annual state program highlighting signature caches
  - 2025 Featured Location: **Bohemia River State Park**
  - Encourages visitors to explore lesser-known parks
  - Prizes for completing program caches

**Important Restriction: Appalachian Trail**:
  - **GEOCACHING IS PROHIBITED on the Maryland AT section** (NPS restriction)
  - Reason: Trail preservation and hiker safety
  - Do not place or search for caches on AT
  - Respect NPS regulations

**Where to Cache**:
  - State nature preserves and parks (check rules)
  - County recreational areas
  - Nature Conservancy properties (vary by location)
  - Private land (owner permission required)
  - Most public lands allow geocaching

**Cache Etiquette (TNLN)**:
  - **TNLN** = "Take Nothing, Leave Nothing" (or "Trade if you must")
  - Log your find in the cache logbook
  - Return items to original position
  - Respect private property
  - Don't damage habitat searching for caches

**Difficulty Levels**:
  - Easy (1.5–2.5): Roadside containers, obvious hiding spots
  - Medium (2.5–3.5): Requires hiking, some searching skill
  - Hard (3.5–4.5): Remote locations, creative hiding, puzzles
  - Extreme (4.5–5.0): Multi-day expeditions, dangerous terrain

**Best Seasons**: Spring and Fall for weather and foliage. Avoid summer (insects, heat) and winter (snow, cold).

**Getting Started**:
1. Download Geocaching app or use geocaching.com
2. Search for nearby caches
3. Use GPS/phone to navigate to coordinates
4. Find cache container (could be any size)
5. Log your find in the logbook
6. Return cache exactly as found

**Pro Tips**: Bring a pen (logbook pen often doesn't work). Wear bug spray. Search systematically around coordinates (usually within 30 feet). Respect hiker traffic.`,
    citations: [
      'https://www.geocaching.com',
      'https://dnr.maryland.gov/publiclands/Pages/index.aspx',
    ],
    followUpSuggestions: [
      'Can I geocache on the Appalachian Trail?',
      'How do I get started with geocaching?',
      'What do I need to bring geocaching?',
    ],
  };
}
