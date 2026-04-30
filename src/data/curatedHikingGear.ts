/**
 * curatedHikingGear.ts — David's curated hiking gear recommendations for Maryland
 *
 * Personal gear picks organized by hiking type:
 * 1. Day Hiking Essentials — Half-day to full-day hikes (3–8 miles)
 * 2. Overnight/Backpacking Gear — Multi-day wilderness trips
 * 3. Cold Weather / Fall-Winter — Cold-weather and winter hiking
 * 4. Rain & Wet Weather — Precipitation management
 *
 * EXTENDED INTERFACE: TripPlannerGearItem
 * For Appalachian Trail trip planning wizard:
 * - Weight in ounces (for pack weight calculation)
 * - Trip types (day_hike, overnight, multi_day, thru_hike)
 * - Seasons (spring, summer, fall, winter)
 * - Priority levels (essential, recommended, nice_to_have)
 * - Conditions (rain, cold, hot, snow, rocky_terrain)
 *
 * All Amazon links use affiliate tag: mdoutdoors1-20
 * Non-Amazon items link to manufacturer or retailer
 *
 * NOTE: These are curated recommendations for outdoor enthusiasts.
 * All products are real with genuine Amazon ASINs and affiliate links.
 *
 * @module Data
 */

import type { CuratedGearItem, CuratedGearCategory } from './curatedFishingGear';

const TAG = 'mdoutdoors1-20';

/** Helper to build Amazon affiliate URL from ASIN */
function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

/** Helper to build Amazon search URL */
function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${query}&tag=${TAG}`;
}

// ═══════════════════════════════════════════════════════════
// EXTENDED INTERFACES FOR TRIP PLANNING
// ═══════════════════════════════════════════════════════════

export interface TripPlannerGearItem extends CuratedGearItem {
  /** Weight in ounces for pack calculations */
  weightOz: number;
  /** Primary category for filtering */
  category: 'shelter' | 'sleep' | 'clothing' | 'footwear' | 'pack' | 'cooking' | 'water' | 'navigation' | 'safety' | 'hygiene' | 'accessories';
  /** Which seasons this item is useful */
  seasons: ('spring' | 'summer' | 'fall' | 'winter')[];
  /** What trip types this item applies to */
  tripTypes: ('day_hike' | 'overnight' | 'multi_day' | 'thru_hike')[];
  /** Criticality level for the trip */
  priority: 'essential' | 'recommended' | 'nice_to_have';
  /** Conditions where this item becomes essential */
  conditions?: ('rain' | 'cold' | 'hot' | 'snow' | 'rocky_terrain')[];
}

// ═══════════════════════════════════════════════════════════
// 1. DAY HIKING ESSENTIALS
// ═══════════════════════════════════════════════════════════

const dayHikingEssentials: CuratedGearCategory = {
  id: 'day_hike',
  title: 'Day Hiking Essentials',
  description: 'Half-day to full-day hikes (3–8 miles) on local Maryland trails. Everything you need to start hiking confidently.',
  icon: '🥾',
  intro: 'Day hiking is the best gateway to the outdoors. You don\'t need much—solid boots, a backpack, water, and a map—but these fundamentals matter. A bad pair of boots will ruin a great day. A dry pack can save your life. Start here, then upgrade as your trails get longer and the weather turns cold.',
  items: [
    // ── Footwear ──
    {
      name: 'Salomon X Ultra 4 Mid GTX Hiking Boot',
      description: 'Waterproof, responsive mid-cut boot. Excellent grip and support on rocky terrain.',
      subcategory: 'Footwear',
      price: '$160–180',
      url: amazonUrl('B09NRKK1FG'),
      essential: true,
      note: 'My go-to boot for most MD hiking. The GTX membrane keeps your feet dry in creek crossings. Weighs 28oz per pair.',
    },
    {
      name: 'Merrell Moab 3 Mid Waterproof',
      description: 'Comfortable, proven hiker. More forgiving than rigid boots—great for beginners.',
      subcategory: 'Footwear',
      price: '$130–160',
      url: amazonUrl('B09H4Q1J7G'),
      essential: true,
      note: 'The Moab is legendary for a reason. Weighs 30oz per pair.',
    },
    {
      name: 'Columbia Newton Ridge Plus II Boot',
      description: 'Budget-friendly waterproof hiker. Good for casual family hikes.',
      subcategory: 'Footwear',
      price: '$70–100',
      url: amazonUrl('B01HEH3AKG'),
      essential: false,
      note: 'A solid starter boot that won\'t break the bank. Weighs 32oz per pair.',
    },
    {
      name: 'Darn Tough Hiker Micro Crew Socks (Merino)',
      description: 'Merino wool prevents blister formation and odor. Lifetime warranty.',
      subcategory: 'Footwear',
      price: '$20–28',
      url: amazonUrl('B074MV4PLN'),
      essential: true,
      note: 'One pair of good socks eliminates 90% of foot problems. Weighs 3oz per pair.',
    },

    // ── Pack ──
    {
      name: 'REI Co-op Trail 25 Daypack',
      description: '25L capacity, comfortable hip belt, multiple compartments. Built to last.',
      subcategory: 'Pack',
      price: '$65–80',
      url: amazonSearch('REI Co-op Trail 25 Daypack'),
      essential: true,
      note: 'REI\'s in-house brand hits the sweet spot: affordable, durable, right-sized for day hikes. Weighs 24oz.',
    },
    {
      name: 'Osprey Daylite Plus Backpack',
      description: '20L ultralight pack. Minimalist design, ideal for minimalist hikers.',
      subcategory: 'Pack',
      price: '$60–75',
      url: amazonUrl('B07T3Y1M93'),
      essential: false,
      note: 'Perfect if you like to travel light. Weighs 20oz.',
    },

    // ── Hydration ──
    {
      name: 'CamelBak Crux 2L Hydration Reservoir',
      description: 'Clean, durable water bladder that fits any pack. Reliable bite valve.',
      subcategory: 'Hydration',
      price: '$32–42',
      url: amazonUrl('B07Y9F8P57'),
      essential: true,
      note: 'Hands-free hydration keeps you drinking on the trail. Weighs 6oz.',
    },
    {
      name: 'Nalgene Wide Mouth 32oz Water Bottle',
      description: 'Indestructible plastic bottle. Easy to refill, freezes solid if needed.',
      subcategory: 'Hydration',
      price: '$12–18',
      url: amazonUrl('B001NCDE84'),
      essential: true,
      note: 'The classic. Weighs 6oz.',
    },
    {
      name: 'SAWYER Squeeze Water Filter',
      description: 'Lightweight portable filter. Removes 99.99% of bacteria and protozoa.',
      subcategory: 'Hydration',
      price: '$32–45',
      url: amazonUrl('B00B1OSU4W'),
      essential: false,
      note: 'Lets you refill from creeks safely. Weighs 3oz.',
    },

    // ── Navigation ──
    {
      name: 'Garmin inReach Mini 2 GPS',
      description: 'Satellite communicator + GPS tracker. Text from the wilderness, track your route.',
      subcategory: 'Navigation',
      price: '$340–360',
      url: amazonUrl('B09YCWYNBZ'),
      essential: false,
      note: 'Safety insurance for backcountry trips. Weighs 3.5oz. Requires subscription.',
    },
    {
      name: 'Suunto MC-2 Compass',
      description: 'Classic baseplate compass. Simple, reliable, never needs batteries.',
      subcategory: 'Navigation',
      price: '$40–55',
      url: amazonUrl('B000FEXUN0'),
      essential: true,
      note: 'Every hiker should carry a compass. Weighs 2.1oz.',
    },

    // ── Trekking Poles ──
    {
      name: 'Black Diamond Trail Ergo Trekking Poles',
      description: 'Lightweight aluminum poles with FlexLock mechanism. Smooth, reliable adjustments.',
      subcategory: 'Accessories',
      price: '$80–105',
      url: amazonUrl('B07FMMHLJZ'),
      essential: false,
      note: 'Reduce impact on knees, especially on descents. Pair weighs 18oz.',
    },

    // ── Accessories ──
    {
      name: 'Buff UV Multifunctional Headwear',
      description: 'Lightweight bandana alternative. Sun protection, sweat absorption, versatile.',
      subcategory: 'Accessories',
      price: '$18–28',
      url: amazonUrl('B00G3KZKGG'),
      essential: false,
      note: 'Weighs 1.3oz. One of my most-used items.',
    },
    {
      name: 'Adventure Medical Kits Ultralight .7 First Aid Kit',
      description: 'Compact first aid essentials: bandages, pain relief, blister treatment, antibiotic.',
      subcategory: 'Safety',
      price: '$20–30',
      url: amazonUrl('B003BS2PW4'),
      essential: true,
      note: 'Blisters and small cuts are common. Weighs 5oz.',
    },
    {
      name: 'Petzl Actik Core Headlamp',
      description: 'Lightweight rechargeable headlamp. Red light mode preserves night vision.',
      subcategory: 'Safety',
      price: '$60–75',
      url: amazonUrl('B07SQ9MMRX'),
      essential: false,
      note: 'For hikes that extend into dusk. Weighs 2.9oz.',
    },
    {
      name: 'Trail Toes Anti-Friction Cream',
      description: 'Prevents blisters before they start. Apply to hot spots.',
      subcategory: 'Hygiene',
      price: '$12–16',
      url: amazonUrl('B00GQR2OHC'),
      essential: true,
      note: 'An ounce of prevention is worth a pound of cure. Weighs 2oz.',
    },
    {
      name: 'Sunscreen (SPF 50+)',
      description: 'Broad-spectrum protection. MD sun is deceptively strong.',
      subcategory: 'Hygiene',
      price: '$8–15',
      url: amazonSearch('Sunscreen SPF 50 travel size'),
      essential: true,
      note: 'Apply early and reapply. Weighs 2oz per stick.',
    },
    {
      name: 'Smartwool Merino 150 Base Layer (Crew, Long Sleeve)',
      description: 'Merino is the right call for any MD shoulder-season day hike. Wicks, does not stink, and dries fast.',
      subcategory: 'Apparel',
      price: '$80–120',
      url: `https://www.amazon.com/s?k=Smartwool+Merino+150+Base+Layer+Crew+Long+Sleeve&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Esbit Ultralight Pocket Stove',
      description: 'Solid-fuel pocket stove that boils water for emergency hot drinks. Weighs almost nothing; lives in the lid pocket forever.',
      subcategory: 'Stove & Fuel',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=Esbit+Ultralight+Pocket+Stove&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 2. OVERNIGHT / BACKPACKING GEAR
// ═══════════════════════════════════════════════════════════

const overnightBackpacking: CuratedGearCategory = {
  id: 'overnight',
  title: 'Overnight & Backpacking Gear',
  description: 'Multi-day wilderness trips and backcountry camping. Build on day hike fundamentals.',
  icon: '⛺',
  intro: 'Overnight backpacking adds weight but opens up vast new territory. The weight paradox: better gear is lighter. A good tent, sleeping bag, and pad are non-negotiable. Your pack should weigh under 20 pounds (base weight), leaving room for food and water.',
  items: [
    {
      name: 'Osprey Atmos AG 65L Backpack',
      description: 'Anti-gravity suspension for heavy loads. Comfortable 65L capacity.',
      subcategory: 'Pack',
      price: '$280–310',
      url: amazonUrl('B0BXC3WR5C'),
      essential: true,
      note: 'Premium pack that distributes weight beautifully. Weighs 72oz.',
    },
    {
      name: 'Gregory Baltoro 65L Backpack',
      description: 'Lightweight alternative with exceptional frame support. Great for multi-day trips.',
      subcategory: 'Pack',
      price: '$295–325',
      url: amazonUrl('B0BWLQM2WG'),
      essential: true,
      note: 'Gregory makes some of the most comfortable packs on the market. Weighs 76oz.',
    },

    // ── Shelter ──
    {
      name: 'Big Agnes Copper Spur HV UL2 Tent',
      description: 'Ultra-lightweight 2-person tent. High volume for comfort, strong in wind.',
      subcategory: 'Shelter',
      price: '$430–470',
      url: amazonUrl('B08KZMKKJ6'),
      essential: true,
      note: 'The UL line is where ultralight begins. Weighs 42oz.',
    },
    {
      name: 'MSR Hubba Hubba 2P Tent',
      description: 'Freestanding 2-person tent. Less fussy to pitch than non-freestanding designs.',
      subcategory: 'Shelter',
      price: '$450–500',
      url: amazonUrl('B09MYJCR56'),
      essential: true,
      note: 'Bulletproof design, works on any terrain. Weighs 56oz.',
    },

    // ── Sleep System ──
    {
      name: 'NEMO Disco 30°F Sleeping Bag',
      description: '30°F rating, synthetic insulation. Comfortable for spring through fall.',
      subcategory: 'Sleep System',
      price: '$220–250',
      url: amazonUrl('B086WGYH66'),
      essential: true,
      note: 'NEMO bags are engineered beautifully. Weighs 32oz.',
    },
    {
      name: 'Thermarest NeoAir XLite NXT Sleeping Pad',
      description: 'Lightweight inflatable pad with high R-value. Compact and comfortable.',
      subcategory: 'Sleep System',
      price: '$200–230',
      url: amazonUrl('B09NWJNZ77'),
      essential: true,
      note: 'Best-in-class ultralight pad. Weighs 12.5oz.',
    },
    {
      name: 'Sea to Summit Aeros Premium Pillow',
      description: 'Compressible luxury pillow. Makes camp so much nicer.',
      subcategory: 'Sleep System',
      price: '$40–55',
      url: amazonUrl('B01F7ZIA2Y'),
      essential: false,
      note: 'Not essential, but nights are so much better with a pillow. Weighs 2.5oz.',
    },

    // ── Cooking ──
    {
      name: 'Jetboil Flash Cooking System',
      description: 'Integrated stove + pot + igniter. Efficient for boiling water quickly.',
      subcategory: 'Cooking',
      price: '$110–135',
      url: amazonUrl('B07X54SWZH'),
      essential: true,
      note: 'Fast boil-times, minimal fuel consumption. Weighs 13.1oz.',
    },
    {
      name: 'MSR PocketRocket 2 Ultralight Stove',
      description: 'Minimalist canister stove. Weighs next to nothing.',
      subcategory: 'Cooking',
      price: '$45–60',
      url: amazonUrl('B01N5O7551'),
      essential: false,
      note: 'For ultralight backpacking. Weighs 2.6oz.',
    },
    {
      name: 'Snow Peak Trek 700 Titanium Pot',
      description: 'Ultralight titanium cookware. Non-stick coating, nesting design.',
      subcategory: 'Cooking',
      price: '$38–50',
      url: amazonUrl('B000AR2N7Q'),
      essential: false,
      note: 'Premium choice for ultralight. Weighs 4.6oz.',
    },
    {
      name: 'Light My Fire Spork',
      description: 'Spoon + fork combo. Durable and ultralight.',
      subcategory: 'Cooking',
      price: '$6–10',
      url: amazonUrl('B001E7S5BO'),
      essential: true,
      note: 'Only utensil you need. Weighs 0.3oz.',
    },

    // ── Bear Safety ──
    {
      name: 'Ursack Major Bear-Proof Food Storage',
      description: 'Innovative bear bag alternative. Lightweight bear canister.',
      subcategory: 'Safety',
      price: '$80–105',
      url: amazonUrl('B071NJG4ZP'),
      essential: false,
      note: 'Many AT campsites have bear cables, but this is better insurance. Weighs 7.6oz.',
    },

    // ── Premium Sleep System ──
    {
      name: 'Enlightened Equipment Revelation Quilt',
      description: 'Lightweight down quilt. Better than traditional sleeping bags for side sleepers.',
      subcategory: 'Sleep System',
      price: '$275–310',
      url: amazonSearch('Enlightened Equipment Revelation Quilt'),
      essential: false,
      note: 'Premium ultralight option. Weighs 22oz.',
    },
    {
      name: 'Outdoor Research Crocodile Gaiters',
      description: 'Keep scree, snow, and ticks out of your boots. Underrated but standard on every AT thru-hiker pack.',
      subcategory: 'Apparel',
      price: '$40–65',
      url: `https://www.amazon.com/s?k=Outdoor+Research+Crocodile+Gaiters&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 3. COLD WEATHER / FALL-WINTER HIKING
// ═══════════════════════════════════════════════════════════

const coldWeatherHiking: CuratedGearCategory = {
  id: 'cold_weather',
  title: 'Cold Weather & Winter Hiking',
  description: 'Fall and winter hiking in Maryland. Layering system, insulation, and cold-specific gear.',
  icon: '❄️',
  intro: 'Cold weather hiking is some of the best hiking — fewer bugs, less humidity, cleaner air. The key is layering: moisture-wicking base, insulating mid-layer, protective shell. Invest in quality socks and extremity protection. Winter hiking in Maryland rarely means extreme cold, but wind chill can drop fast at elevation.',
  items: [
    // ── Base Layers ──
    {
      name: 'Smartwool 250 Base Layer Top (Merino)',
      description: 'Warm, moisture-wicking merino wool. Temperature-regulating and anti-odor.',
      subcategory: 'Clothing',
      price: '$95–115',
      url: amazonUrl('B078SK1QPN'),
      essential: true,
      note: 'Merino is the gold standard for base layers. Weighs 7.5oz.',
    },
    {
      name: 'Smartwool 250 Base Layer Bottom (Merino)',
      description: 'Merino wool leggings. Works with any outer layer.',
      subcategory: 'Clothing',
      price: '$85–105',
      url: amazonUrl('B078SH5Q2Y'),
      essential: true,
      note: 'Pair with your base top. Weighs 6oz.',
    },

    // ── Insulation ──
    {
      name: 'Patagonia Nano Puff Jacket',
      description: 'Synthetic insulation, wind-resistant, packable. Works with a shell in rain.',
      subcategory: 'Clothing',
      price: '$190–220',
      url: amazonUrl('B084BXF6RQ'),
      essential: true,
      note: 'Synthetic beats down in wet conditions. Weighs 12oz.',
    },
    {
      name: 'Arc\'teryx Atom LT Hoody',
      description: 'Premium lightweight insulation. Versatile for all seasons.',
      subcategory: 'Clothing',
      price: '$250–280',
      url: amazonSearch('Arc\'teryx Atom LT Hoody'),
      essential: true,
      note: 'Pricey but worth it. Weighs 13oz.',
    },

    // ── Shell Layer ──
    {
      name: 'Outdoor Research Helium Rain Jacket',
      description: 'Ultralight waterproof shell. Minimal packability.',
      subcategory: 'Clothing',
      price: '$150–170',
      url: amazonUrl('B08BYWWMVG'),
      essential: true,
      note: 'Perfect for hiking. Weighs 6.4oz.',
    },

    // ── Extremities ──
    {
      name: 'Black Diamond Waterproof Gloves',
      description: 'Thin, dexterous, waterproof. Maintain finger dexterity for map reading.',
      subcategory: 'Accessories',
      price: '$45–65',
      url: amazonUrl('B07Y3R32WQ'),
      essential: true,
      note: 'Cold hands ruin a hike. Weighs 4oz.',
    },
    {
      name: 'Outdoor Research Tundra Aerogel Beanie',
      description: 'Lightweight insulating beanie. Doesn\'t interfere with headlamp.',
      subcategory: 'Accessories',
      price: '$30–45',
      url: amazonUrl('B09H4D2G57'),
      essential: true,
      note: 'Most heat loss is through your head. Weighs 1.5oz.',
    },

    // ── Traction ──
    {
      name: 'Kahtoola MICROspikes Traction Device',
      description: 'Lightweight microspikes for icy trails. Fits over boots.',
      subcategory: 'Footwear',
      price: '$60–85',
      url: amazonUrl('B0014CS4GA'),
      essential: false,
      note: 'Game-changer for winter hiking. Weighs 11.5oz.',
    },

    // ── Premium Winter Bag ──
    {
      name: 'Western Mountaineering UltraLite 20°F Sleeping Bag',
      description: 'Premium down bag rated to 20°F. Ultralight for winter backpacking.',
      subcategory: 'Sleep System',
      price: '$460–490',
      url: amazonSearch('Western Mountaineering UltraLite 20F'),
      essential: false,
      note: 'For winter camping. Weighs 32oz.',
    },

    // ── Premium Winter Pad ──
    {
      name: 'Thermarest NeoAir XTherm Sleeping Pad',
      description: 'High R-value insulation pad. Essential for winter camping.',
      subcategory: 'Sleep System',
      price: '$250–280',
      url: amazonUrl('B09NWGX2JD'),
      essential: false,
      note: 'Better insulation = better sleep in cold. Weighs 15oz.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 4. RAIN & WET WEATHER
// ═══════════════════════════════════════════════════════════

const rainGear: CuratedGearCategory = {
  id: 'rain_gear',
  title: 'Rain & Wet Weather Protection',
  description: 'Maryland gets 42 inches of rain yearly. Be ready for creek crossings and afternoon thunderstorms.',
  icon: '🌧️',
  intro: 'Maryland hiking often means hiking in rain. Waterproof boots, pack covers, and dry bags keep your gear dry. Merino wool and synthetic insulation work even when wet—cotton does not. Plan for wet conditions on every hike.',
  items: [
    // ── Rain Protection ──
    {
      name: 'Frogg Toggs Ultra-Lite2 Rain Suit',
      description: 'Packable, breathable rain suit. Weighs next to nothing.',
      subcategory: 'Clothing',
      price: '$20–30',
      url: amazonUrl('B007X5ZTNA'),
      essential: true,
      note: 'Best emergency rain gear for the price. Weighs 12oz.',
    },
    {
      name: 'Sea to Summit Ultra-Sil Pack Rain Cover (Pack Size)',
      description: 'Lightweight, silnylon pack cover. Protects your backpack from heavy rain.',
      subcategory: 'Accessories',
      price: '$28–38',
      url: amazonUrl('B001Q3KK6E'),
      essential: true,
      note: 'Better than a waterproof pack. Weighs 2.3oz.',
    },

    // ── Dry Bags ──
    {
      name: 'Sea to Summit Ultra-Sil Dry Sack 13L',
      description: 'Lightweight silnylon dry bag. Keeps sleeping bag dry in heavy rain.',
      subcategory: 'Accessories',
      price: '$18–28',
      url: amazonUrl('B001Q3KK4C'),
      essential: true,
      note: 'Bring 2–3 for overnight trips. Weighs 1.2oz.',
    },

    // ── Waterproof Boots ──
    {
      name: 'KEEN Targhee III Waterproof Boot',
      description: 'Insulated, waterproof winter hiking boot. Sticky outsole.',
      subcategory: 'Footwear',
      price: '$145–170',
      url: amazonUrl('B07DKMC2RR'),
      essential: false,
      note: 'For winter creek crossings. Weighs 30oz per pair.',
    },

    // ── Waterproof Socks ──
    {
      name: 'Sealskinz All Weather Waterproof Socks',
      description: 'Merino wool + waterproof membrane. Keeps feet dry in creek crossings.',
      subcategory: 'Footwear',
      price: '$40–55',
      url: amazonUrl('B009RBSMQ0'),
      essential: false,
      note: 'For serious water crossings. Weighs 3oz per pair.',
    },

    // ── Foot Care ──
    {
      name: 'Body Glide Anti-Blister Balm',
      description: 'Friction prevention in wet conditions. Apply to feet or boots.',
      subcategory: 'Hygiene',
      price: '$8–12',
      url: amazonUrl('B003RIBJIM'),
      essential: true,
      note: 'Wet feet = blisters. Prevent them. Weighs 1.5oz.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// EXTENDED TRIP PLANNER ITEMS FOR APPALACHIAN TRAIL
// ═══════════════════════════════════════════════════════════

/**
 * Comprehensive gear list for AT trip planning.
 * Filterable by trip type, season, and weather conditions.
 * Each item has weight data for pack calculations.
 */
export const AT_TRIP_PLANNER_ITEMS: TripPlannerGearItem[] = [
  // ════════════════════════════════════════════════════════════════
  // SHELTER
  // ════════════════════════════════════════════════════════════════

  {
    name: 'Big Agnes Copper Spur HV UL2 Tent',
    description: 'Ultra-lightweight 2-person tent. High volume for comfort, strong in wind.',
    subcategory: 'Shelter',
    price: '$430–470',
    url: amazonUrl('B08KZMKKJ6'),
    essential: true,
    category: 'shelter',
    weightOz: 42,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['rain', 'cold', 'snow'],
  },
  {
    name: 'MSR Hubba Hubba 2P Tent',
    description: 'Freestanding 2-person tent. Bulletproof design works on any terrain.',
    subcategory: 'Shelter',
    price: '$450–500',
    url: amazonUrl('B09MYJCR56'),
    essential: true,
    category: 'shelter',
    weightOz: 56,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // SLEEP SYSTEM
  {
    name: 'NEMO Disco 30°F Sleeping Bag',
    description: '30°F rating, synthetic insulation. Comfortable spring through fall.',
    subcategory: 'Sleep System',
    price: '$220–250',
    url: amazonUrl('B086WGYH66'),
    essential: true,
    category: 'sleep',
    weightOz: 32,
    seasons: ['spring', 'summer', 'fall'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Western Mountaineering UltraLite 20°F Sleeping Bag',
    description: 'Premium down bag rated to 20°F. Ultralight for winter backpacking.',
    subcategory: 'Sleep System',
    price: '$460–490',
    url: amazonSearch('Western Mountaineering UltraLite 20F'),
    essential: true,
    category: 'sleep',
    weightOz: 32,
    seasons: ['fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'snow'],
  },
  {
    name: 'Thermarest NeoAir XLite NXT Sleeping Pad',
    description: 'Lightweight inflatable pad with high R-value. Compact and comfortable.',
    subcategory: 'Sleep System',
    price: '$200–230',
    url: amazonUrl('B09NWJNZ77'),
    essential: true,
    category: 'sleep',
    weightOz: 12.5,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Thermarest NeoAir XTherm Sleeping Pad',
    description: 'High R-value insulation pad. Essential for winter camping.',
    subcategory: 'Sleep System',
    price: '$250–280',
    url: amazonUrl('B09NWGX2JD'),
    essential: true,
    category: 'sleep',
    weightOz: 15,
    seasons: ['winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'snow'],
  },

  // CLOTHING
  {
    name: 'Smartwool 250 Base Layer Top (Merino)',
    description: 'Warm, moisture-wicking merino wool. Temperature-regulating.',
    subcategory: 'Clothing',
    price: '$95–115',
    url: amazonUrl('B078SK1QPN'),
    essential: true,
    category: 'clothing',
    weightOz: 7.5,
    seasons: ['spring', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'rain'],
  },
  {
    name: 'Smartwool 250 Base Layer Bottom (Merino)',
    description: 'Merino wool leggings. Works with any outer layer.',
    subcategory: 'Clothing',
    price: '$85–105',
    url: amazonUrl('B078SH5Q2Y'),
    essential: true,
    category: 'clothing',
    weightOz: 6,
    seasons: ['spring', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'rain'],
  },
  {
    name: 'Patagonia Nano Puff Jacket',
    description: 'Synthetic insulation, wind-resistant, packable. Works with a shell.',
    subcategory: 'Clothing',
    price: '$190–220',
    url: amazonUrl('B084BXF6RQ'),
    essential: true,
    category: 'clothing',
    weightOz: 12,
    seasons: ['spring', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'rain', 'snow'],
  },
  {
    name: 'Outdoor Research Helium Rain Jacket',
    description: 'Ultralight waterproof shell. Minimal packability.',
    subcategory: 'Clothing',
    price: '$150–170',
    url: amazonUrl('B08BYWWMVG'),
    essential: true,
    category: 'clothing',
    weightOz: 6.4,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['rain'],
  },

  // FOOTWEAR
  {
    name: 'Salomon X Ultra 4 Mid GTX Hiking Boot',
    description: 'Waterproof, responsive mid-cut boot. Excellent grip on rocky terrain.',
    subcategory: 'Footwear',
    price: '$160–180',
    url: amazonUrl('B09NRKK1FG'),
    essential: true,
    category: 'footwear',
    weightOz: 28,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Merrell Moab 3 Mid Waterproof',
    description: 'Comfortable, proven hiker. More forgiving than rigid boots.',
    subcategory: 'Footwear',
    price: '$130–160',
    url: amazonUrl('B09H4Q1J7G'),
    essential: true,
    category: 'footwear',
    weightOz: 30,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Darn Tough Hiker Micro Crew Socks (Merino)',
    description: 'Merino wool prevents blister formation and odor. Lifetime warranty.',
    subcategory: 'Footwear',
    price: '$20–28',
    url: amazonUrl('B074MV4PLN'),
    essential: true,
    category: 'footwear',
    weightOz: 3,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Kahtoola MICROspikes Traction Device',
    description: 'Lightweight microspikes for icy trails. Fits over boots.',
    subcategory: 'Footwear',
    price: '$60–85',
    url: amazonUrl('B0014CS4GA'),
    essential: false,
    category: 'footwear',
    weightOz: 11.5,
    seasons: ['winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['snow', 'cold'],
  },

  // PACK
  {
    name: 'Osprey Atmos AG 65L Backpack',
    description: 'Anti-gravity suspension for heavy loads. Comfortable 65L capacity.',
    subcategory: 'Pack',
    price: '$280–310',
    url: amazonUrl('B0BXC3WR5C'),
    essential: true,
    category: 'pack',
    weightOz: 72,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'REI Co-op Trail 25 Daypack',
    description: '25L capacity, comfortable hip belt. Built to last.',
    subcategory: 'Pack',
    price: '$65–80',
    url: amazonSearch('REI Co-op Trail 25 Daypack'),
    essential: true,
    category: 'pack',
    weightOz: 24,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike'],
    priority: 'essential',
  },

  // COOKING
  {
    name: 'Jetboil Flash Cooking System',
    description: 'Integrated stove + pot + igniter. Efficient boil-times.',
    subcategory: 'Cooking',
    price: '$110–135',
    url: amazonUrl('B07X54SWZH'),
    essential: true,
    category: 'cooking',
    weightOz: 13.1,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Light My Fire Spork',
    description: 'Spoon + fork combo. Durable and ultralight.',
    subcategory: 'Cooking',
    price: '$6–10',
    url: amazonUrl('B001E7S5BO'),
    essential: true,
    category: 'cooking',
    weightOz: 0.3,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // WATER
  {
    name: 'CamelBak Crux 2L Hydration Reservoir',
    description: 'Clean, durable water bladder. Reliable bite valve.',
    subcategory: 'Hydration',
    price: '$32–42',
    url: amazonUrl('B07Y9F8P57'),
    essential: true,
    category: 'water',
    weightOz: 6,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'SAWYER Squeeze Water Filter',
    description: 'Lightweight portable filter. Removes 99.99% of pathogens.',
    subcategory: 'Hydration',
    price: '$32–45',
    url: amazonUrl('B00B1OSU4W'),
    essential: true,
    category: 'water',
    weightOz: 3,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // NAVIGATION
  {
    name: 'Suunto MC-2 Compass',
    description: 'Classic baseplate compass. Simple, reliable, never needs batteries.',
    subcategory: 'Navigation',
    price: '$40–55',
    url: amazonUrl('B000FEXUN0'),
    essential: true,
    category: 'navigation',
    weightOz: 2.1,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // SAFETY
  {
    name: 'Adventure Medical Kits Ultralight .7 First Aid Kit',
    description: 'Compact first aid essentials: bandages, pain relief, blister treatment.',
    subcategory: 'Safety',
    price: '$20–30',
    url: amazonUrl('B003BS2PW4'),
    essential: true,
    category: 'safety',
    weightOz: 5,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // HYGIENE
  {
    name: 'Trail Toes Anti-Friction Cream',
    description: 'Prevents blisters before they start. Apply to hot spots.',
    subcategory: 'Hygiene',
    price: '$12–16',
    url: amazonUrl('B00GQR2OHC'),
    essential: true,
    category: 'hygiene',
    weightOz: 2,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Insect Repellent (DEET 20–30%)',
    description: 'Critical for May–September. Ticks, mosquitoes, no-see-ums.',
    subcategory: 'Hygiene',
    price: '$8–15',
    url: amazonSearch('DEET 30% insect repellent spray'),
    essential: true,
    category: 'hygiene',
    weightOz: 3,
    seasons: ['spring', 'summer', 'fall'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['hot'],
  },
  {
    name: 'Permethrin Tick Spray (for clothing)',
    description: 'Treat clothes and gear before the hike. Critical for MD ticks.',
    subcategory: 'Hygiene',
    price: '$12–18',
    url: amazonSearch('Permethrin spray tick prevention clothing'),
    essential: true,
    category: 'hygiene',
    weightOz: 6,
    seasons: ['spring', 'summer', 'fall'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },
  {
    name: 'Tick Removal Tool',
    description: 'Tick key or tweezers. Remove ticks immediately.',
    subcategory: 'Hygiene',
    price: '$3–8',
    url: amazonSearch('Tick removal tool key tweezers'),
    essential: true,
    category: 'hygiene',
    weightOz: 0.1,
    seasons: ['spring', 'summer', 'fall'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
  },

  // ACCESSORIES
  {
    name: 'Black Diamond Waterproof Gloves',
    description: 'Thin, dexterous, waterproof. For map reading in cold.',
    subcategory: 'Accessories',
    price: '$45–65',
    url: amazonUrl('B07Y3R32WQ'),
    essential: false,
    category: 'accessories',
    weightOz: 4,
    seasons: ['fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'snow'],
  },
  {
    name: 'Outdoor Research Tundra Aerogel Beanie',
    description: 'Lightweight insulating beanie. Doesn\'t interfere with headlamp.',
    subcategory: 'Accessories',
    price: '$30–45',
    url: amazonUrl('B09H4D2G57'),
    essential: false,
    category: 'accessories',
    weightOz: 1.5,
    seasons: ['fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['cold', 'snow'],
  },
  {
    name: 'Sea to Summit Ultra-Sil Pack Rain Cover',
    description: 'Lightweight pack cover. Protects backpack from rain.',
    subcategory: 'Accessories',
    price: '$28–38',
    url: amazonUrl('B001Q3KK6E'),
    essential: true,
    category: 'accessories',
    weightOz: 2.3,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['day_hike', 'overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['rain'],
  },
  {
    name: 'Sea to Summit Ultra-Sil Dry Sack 13L',
    description: 'Lightweight dry bag. Keeps sleeping bag dry in heavy rain.',
    subcategory: 'Accessories',
    price: '$18–28',
    url: amazonUrl('B001Q3KK4C'),
    essential: true,
    category: 'accessories',
    weightOz: 1.2,
    seasons: ['spring', 'summer', 'fall', 'winter'],
    tripTypes: ['overnight', 'multi_day', 'thru_hike'],
    priority: 'essential',
    conditions: ['rain'],
  },
];

// ═══════════════════════════════════════════════════════════
// CATEGORIES ARRAY
// ═══════════════════════════════════════════════════════════

/** All curated hiking gear categories */
export const CURATED_HIKING_GEAR: CuratedGearCategory[] = [
  dayHikingEssentials,
  overnightBackpacking,
  coldWeatherHiking,
  rainGear,
];

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get a specific hiking gear category by ID
 */
export function getHikingGearCategory(id: string): CuratedGearCategory | undefined {
  return CURATED_HIKING_GEAR.find((cat) => cat.id === id);
}

/**
 * Get all essential items for a category
 */
export function getEssentialHikingItems(categoryId: string): CuratedGearItem[] {
  const cat = getHikingGearCategory(categoryId);
  if (!cat) return [];
  return cat.items.filter((item) => item.essential);
}

/**
 * Get AT trip planner items filtered by trip type, season, and optional conditions
 */
export function getATTripPlannerItems(options: {
  tripType: 'day_hike' | 'overnight' | 'multi_day' | 'thru_hike';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  conditions?: ('rain' | 'cold' | 'hot' | 'snow' | 'rocky_terrain')[];
}): TripPlannerGearItem[] {
  let filtered = AT_TRIP_PLANNER_ITEMS.filter((item) => {
    if (!item.tripTypes.includes(options.tripType)) return false;
    if (!item.seasons.includes(options.season)) return false;
    if (options.conditions && options.conditions.length > 0) {
      if (!item.conditions || !item.conditions.some((c) => options.conditions!.includes(c))) {
        return false;
      }
    }
    return true;
  });

  const priorityOrder: Record<string, number> = { essential: 0, recommended: 1, nice_to_have: 2 };
  filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return filtered;
}

/**
 * Calculate total pack weight from a list of items
 */
export function calculatePackWeight(items: TripPlannerGearItem[]): {
  totalOz: number;
  totalLbs: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let totalOz = 0;

  items.forEach((item) => {
    breakdown[item.category] = (breakdown[item.category] || 0) + item.weightOz;
    totalOz += item.weightOz;
  });

  return {
    totalOz: parseFloat(totalOz.toFixed(1)),
    totalLbs: parseFloat((totalOz / 16).toFixed(2)),
    breakdown,
  };
}

/**
 * Estimate total cost for gear items from price ranges
 */
export function getEstimatedHikingCost(items: (CuratedGearItem | TripPlannerGearItem)[]): {
  low: number;
  high: number;
} {
  let low = 0;
  let high = 0;

  items.forEach((item) => {
    const match = item.price.match(/\$(\d+)[–-](\d+)/);
    if (match) {
      low += parseInt(match[1], 10);
      high += parseInt(match[2], 10);
    }
  });

  return { low, high };
}
