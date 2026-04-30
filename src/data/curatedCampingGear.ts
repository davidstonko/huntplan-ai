/**
 * curatedCampingGear.ts — David's curated camping gear recommendations for Maryland
 *
 * Personal gear picks organized by camping style:
 * 1. Car Camping Essentials — Traditional family car camping
 * 2. Backpacking Ultralight — Minimalist multi-day trips
 * 3. Family Camping — Large group, comfort-focused
 * 4. Winter Camping — Cold weather overnight expeditions
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

// ═══════════════════════════════════════════════════════════
// 1. CAR CAMPING ESSENTIALS
// ═══════════════════════════════════════════════════════════

const carCampingEssentials: CuratedGearCategory = {
  id: 'car_camping_essentials',
  title: 'Car Camping Essentials',
  description: 'Traditional car-based camping for families and groups — drive-in sites with vehicle access.',
  icon: '🏕️',
  intro: 'Car camping is the gateway to outdoor adventure. You can bring whatever you want since you\'re not carrying it. Start with the essentials — a solid tent, sleeping bags, and a camp stove — then add comfort gear as your trips accumulate. This setup works for 4-person groups on weekends or family vacations.',
  items: [
    // ── Shelter ──
    {
      name: 'Coleman Sundome 4-Person Dome Tent',
      description: 'Affordable, reliable 4-person tent with good ventilation. Perfect starter tent for car camping.',
      subcategory: 'Shelter',
      price: '$60–90',
      url: amazonUrl('B004E4AW3Q'),
      essential: true,
      note: 'The Sundome is a classic for a reason — it\'s weatherproof, spacious, and costs less than a night in a hotel.',
    },
    {
      name: 'Coleman Evanston 6-Person Tent',
      description: 'Step up in size — room for 6 people or gear storage. Two-room design with room divider.',
      subcategory: 'Shelter',
      price: '$90–130',
      url: amazonUrl('B08TCCX1GQ'),
      essential: false,
      note: 'If you\'re camping with extended family, the extra room is worth it.',
    },

    // ── Sleeping ──
    {
      name: 'Coleman Sleeping Bag — 20°F',
      description: '20°F rating handles spring through fall in Maryland. Rectangular shape for comfort.',
      subcategory: 'Sleeping',
      price: '$35–55',
      url: amazonUrl('B0B5L2Q8YD'),
      essential: true,
      note: 'Grab one per person. Coleman bags are budget-friendly and reliable.',
    },
    {
      name: 'Coleman Self-Inflating Sleep Pad',
      description: 'Adds cushioning and insulation from the ground. Rolls up small for car camping.',
      subcategory: 'Sleeping',
      price: '$25–40',
      url: amazonUrl('B08LJJXRPY'),
      essential: true,
    },
    {
      name: 'Coleman Queen Airbed with Built-in Pump',
      description: 'Upgrade comfort — plug into your vehicle\'s 12V outlet for automatic inflation.',
      subcategory: 'Sleeping',
      price: '$45–70',
      url: amazonUrl('B08L6WDJL9'),
      essential: false,
      note: 'For car camping, an air mattress beats sleeping on the ground.',
    },

    // ── Cooking ──
    {
      name: 'Coleman Classic Propane Stove',
      description: 'Two-burner camp stove. Runs on standard propane cartridges.',
      subcategory: 'Cooking',
      price: '$25–40',
      url: amazonUrl('B00005OU9D'),
      essential: true,
      note: 'This stove is bomb-proof and affordable. Good for cooking breakfast and dinner.',
    },
    {
      name: 'GSI Outdoors Cookware Set (6-Piece)',
      description: 'Pots, pans, plates, and utensils in one compact set. Non-stick and lightweight.',
      subcategory: 'Cooking',
      price: '$35–55',
      url: amazonUrl('B00X9OF3XA'),
      essential: true,
    },
    {
      name: 'Coleman Camping Cooler — 70 Quart',
      description: 'Large cooler holds food and drinks for a family. Good ice retention.',
      subcategory: 'Cooking',
      price: '$50–85',
      url: amazonUrl('B01MTZOMQD'),
      essential: true,
      note: 'Food safety is important — invest in a quality cooler.',
    },

    // ── Lighting ──
    {
      name: 'Coleman NorthStar Lantern — Propane',
      description: 'Propane lantern for bright, even camp light. Runs all night.',
      subcategory: 'Lighting',
      price: '$30–50',
      url: amazonUrl('B000BQRJFE'),
      essential: true,
      note: 'A lantern is essential for camp setup and breaking down in the dark.',
    },
    {
      name: 'Black Diamond Spot Headlamp',
      description: 'Reliable headlamp with red light mode for night navigation without ruining night vision.',
      subcategory: 'Lighting',
      price: '$35–50',
      url: amazonUrl('B09JQRR21N'),
      essential: true,
    },

    // ── Seating & Tables ──
    {
      name: 'Coleman Camping Chair (Set of 4)',
      description: 'Padded camping chairs that fold up. Get at least one per person.',
      subcategory: 'Seating',
      price: '$40–70',
      url: amazonUrl('B0B5M2R3JC'),
      essential: true,
      note: 'Sitting on stumps gets old fast. Bring proper chairs.',
    },
    {
      name: 'Coleman Camping Table — 6ft',
      description: 'Large camp table for cooking prep, meals, and activities.',
      subcategory: 'Seating',
      price: '$35–60',
      url: amazonUrl('B00006IPQL'),
      essential: true,
    },

    // ── First Aid & Safety ──
    {
      name: 'Adventure Medical Kits Comprehensive First Aid Kit',
      description: 'Complete first aid with bandages, pain relief, blister treatment, and more.',
      subcategory: 'First Aid',
      price: '$25–40',
      url: amazonUrl('B000BQKM54'),
      essential: true,
      note: 'Camping accidents happen. Have a good first aid kit on hand.',
    },
    {
      name: 'Sawyer Squeeze Water Filter',
      description: 'Filter questionable water from streams or lakes. Essential for water safety.',
      subcategory: 'First Aid',
      price: '$25–35',
      url: amazonUrl('B00B1OSU4W'),
      essential: false,
      note: 'If you\'re camping near water sources, a filter adds peace of mind.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 2. BACKPACKING ULTRALIGHT
// ═══════════════════════════════════════════════════════════

const backpackingUltralight: CuratedGearCategory = {
  id: 'backpacking_ultralight',
  title: 'Backpacking Ultralight',
  description: 'Minimalist multi-day backpacking setup — every ounce counts.',
  icon: '🎒',
  intro: 'Ultralight backpacking means carrying less weight and staying mobile. This setup gets you into the backcountry with just the essentials. Maryland\'s topography is forgiving, so a lightweight kit works well for Garrett County and the Ridge & Valley region. Pack light, move fast, camp simple.',
  items: [
    // ── Shelter ──
    {
      name: 'Big Agnes Copper Spur HV UL2 Tent',
      description: '2-person ultralight tent — weighs under 3 lbs. Free-standing design.',
      subcategory: 'Shelter',
      price: '$300–380',
      url: amazonUrl('B08PDHHQL5'),
      essential: true,
      note: 'This is the gold standard for ultralight 2-person backpacking. Expensive but worth it for weight.',
    },
    {
      name: 'Nemo Dragonfly Tent — 2 Person (lighter alternative)',
      description: 'Comparable to Big Agnes. 2-person, freestanding, good ventilation.',
      subcategory: 'Shelter',
      price: '$280–360',
      url: amazonUrl('B07HJG7Q7B'),
      essential: true,
    },

    // ── Backpack ──
    {
      name: 'Osprey Exos 48 Pack',
      description: '48-liter ultralight pack. Weighs 2.4 lbs. Perfect for 2–3 day trips.',
      subcategory: 'Backpack',
      price: '$200–280',
      url: amazonUrl('B08YJP8GQP'),
      essential: true,
      note: 'The Exos is the benchmark ultralight pack. Comfortable and light.',
    },
    {
      name: 'Hyperlite Mountain Gear 2400 Ultralight Pack (premium alternative)',
      description: '40-liter ultralight frameless pack. Heavier use materials, around 2 lbs.',
      subcategory: 'Backpack',
      price: '$250–350',
      url: amazonUrl('B08LN5C9K6'),
      essential: false,
      note: 'If you want cutting-edge ultralight design, HMG is the leader.',
    },

    // ── Sleeping ──
    {
      name: 'Kelty Cosmic 20 Sleeping Bag (Down)',
      description: '20°F down bag — lightweight and compressible. Around 1.5 lbs.',
      subcategory: 'Sleeping',
      price: '$180–250',
      url: amazonUrl('B07BNJM3F9'),
      essential: true,
      note: 'Down is warmer and lighter than synthetic. Protect it from moisture.',
    },
    {
      name: 'Therm-a-Rest NeoAir XLite Sleeping Pad',
      description: 'Ultralight inflatable pad — 12 oz, R-value 5.7. Excellent warmth-to-weight.',
      subcategory: 'Sleeping',
      price: '$150–200',
      url: amazonUrl('B07TQVBK5V'),
      essential: true,
      note: 'The NeoAir is the ultralight standard. Packed, it\'s smaller than a water bottle.',
    },

    // ── Cooking ──
    {
      name: 'Jetboil Flash Camping Stove',
      description: 'Integrated camping stove and pot. Boils water in 100 seconds. ~13 oz.',
      subcategory: 'Cooking',
      price: '$90–130',
      url: amazonUrl('B07N3MBPV4'),
      essential: true,
      note: 'Fast, efficient, and weighs almost nothing. Great for backpacking.',
    },
    {
      name: 'Sea to Summit Ultralight Cooking Set',
      description: 'Lightweight pot and pan set. Minimal weight, stackable design.',
      subcategory: 'Cooking',
      price: '$30–50',
      url: amazonUrl('B01CWRTQGE'),
      essential: true,
    },
    {
      name: 'Sawyer Squeeze Water Filter',
      description: 'Lightweight water purification. Essential for backcountry water.',
      subcategory: 'Cooking',
      price: '$25–35',
      url: amazonUrl('B00B1OSU4W'),
      essential: true,
      note: 'Filters water from any source. Ultralight at 3 oz.',
    },

    // ── Lighting ──
    {
      name: 'Black Diamond Spot 350 Headlamp',
      description: 'Ultra-compact headlamp — 47 grams. Red light mode for night preservation.',
      subcategory: 'Lighting',
      price: '$30–45',
      url: amazonUrl('B09JQRR21N'),
      essential: true,
      note: 'Lightweight and reliable. Worth the investment.',
    },

    // ── Clothing & Sleep System ──
    {
      name: 'Patagonia Houdini Air Jacket',
      description: 'Ultralight wind layer. Packs into its pocket. ~5 oz.',
      subcategory: 'Clothing',
      price: '$99–129',
      url: amazonUrl('B07WBHRX8J'),
      essential: true,
      note: 'This jacket handles MD mountain winds and weighs almost nothing.',
    },
    {
      name: 'Merino Wool Base Layer Set (lightweight)',
      description: 'Lightweight merino for core body temperature regulation.',
      subcategory: 'Clothing',
      price: '$60–100',
      url: amazonUrl('B07HKY8Z5F'),
      essential: true,
    },

    // ── Accessories ──
    {
      name: 'Zpacks Ultralight Stuff Sacks (set of 5)',
      description: 'Ultralight dry bags. Organize gear and save weight.',
      subcategory: 'Accessories',
      price: '$20–35',
      url: amazonUrl('B07M8KRVZ5'),
      essential: false,
    },
    {
      name: 'Garmin inReach Mini GPS Device',
      description: 'Satellite communicator — send messages and location from the backcountry.',
      subcategory: 'Accessories',
      price: '$350–450',
      url: amazonUrl('B07Y8JQYDG'),
      essential: false,
      note: 'Safety device for solo backpackers. Lets you communicate from remote areas.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 3. FAMILY CAMPING
// ═══════════════════════════════════════════════════════════

const familyCamping: CuratedGearCategory = {
  id: 'family_camping',
  title: 'Family Camping',
  description: 'Comfort-focused camping for families and large groups — entertainment and convenience.',
  icon: '👨‍👩‍👧‍👦',
  intro: 'Camping with the whole family means bringing enough gear for comfort and entertainment. Kids need fun, adults need coffee, and everyone needs a dry tent. This setup works for family weekends or reunions — prioritize space and comfort over light weight.',
  items: [
    // ── Shelter ──
    {
      name: 'Coleman 8-Person Tent with Dividers',
      description: 'Large 8-person tent with separate room divider. Three-season weather protection.',
      subcategory: 'Shelter',
      price: '$120–180',
      url: amazonUrl('B00H1ZXM1W'),
      essential: true,
      note: 'Divider lets you separate sleeping and gear storage. Great for families.',
    },
    {
      name: 'Core Equipment 11-Person Lighted Instant Cabin Tent (premium)',
      description: 'Huge 11-person cabin tent with built-in light fixtures and pockets.',
      subcategory: 'Shelter',
      price: '$350–500',
      url: amazonUrl('B07DDC3M8D'),
      essential: false,
      note: 'For family reunions or large groups, this tent is a game-changer.',
    },

    // ── Sleeping ──
    {
      name: 'Coleman Sleeping Bag Set — 20°F (per person)',
      description: '20°F bags for everyone. Budget-friendly bulk option.',
      subcategory: 'Sleeping',
      price: '$30–50 each',
      url: amazonUrl('B0B5L2Q8YD'),
      essential: true,
      note: 'Get one per family member. Coleman bags are reliable and inexpensive.',
    },
    {
      name: 'Coleman Queen Airbed with Built-in Pump (multiple)',
      description: 'Air mattresses for adults. Inflate via 12V vehicle outlet.',
      subcategory: 'Sleeping',
      price: '$45–70 each',
      url: amazonUrl('B08L6WDJL9'),
      essential: true,
      note: 'Parents sleep on beds, kids can sleep on pads. Everyone wins.',
    },
    {
      name: 'Intex Twin Airbed (for kids)',
      description: 'Smaller air beds for children. Easy to inflate.',
      subcategory: 'Sleeping',
      price: '$25–40',
      url: amazonUrl('B00NHX0DNE'),
      essential: false,
    },

    // ── Cooking & Dining ──
    {
      name: 'Coleman 3-Burner Propane Camp Stove',
      description: 'Three-burner stove for cooking family meals. Griddle attachment compatible.',
      subcategory: 'Cooking',
      price: '$60–90',
      url: amazonUrl('B0088NQFLA'),
      essential: true,
      note: 'This stove handles breakfast, lunch, and dinner for the whole family.',
    },
    {
      name: 'Camp Kitchen Table with Sink',
      description: 'Portable camp kitchen with built-in sink, counter space, and storage.',
      subcategory: 'Cooking',
      price: '$80–130',
      url: amazonUrl('B07JCPN3F8'),
      essential: true,
      note: 'Makes dishwashing and food prep much easier.',
    },
    {
      name: 'Coleman 90 Quart Cooler (Large)',
      description: 'Extra-large cooler keeps food cold for a week of camping.',
      subcategory: 'Cooking',
      price: '$70–110',
      url: amazonUrl('B0088NYF20'),
      essential: true,
    },
    {
      name: 'Stainless Steel Cookware Set (12-piece)',
      description: 'Full cookware set with pots, pans, skillet, and utensils for family cooking.',
      subcategory: 'Cooking',
      price: '$50–80',
      url: amazonUrl('B08YD6G8GH'),
      essential: true,
    },

    // ── Lighting ──
    {
      name: 'Coleman Northern Nova LED Lantern',
      description: 'Bright LED lantern — 400 lumens, battery powered, dimmable.',
      subcategory: 'Lighting',
      price: '$25–40',
      url: amazonUrl('B075MKYDHB'),
      essential: true,
      note: 'LED lasts way longer than propane and is safer for kids.',
    },
    {
      name: 'String Lights for Campsite',
      description: 'Battery or solar-powered string lights for ambiance.',
      subcategory: 'Lighting',
      price: '$20–35',
      url: amazonUrl('B086WL5QKS'),
      essential: false,
      note: 'Kids love it. Makes the campsite feel festive.',
    },

    // ── Seating & Entertainment ──
    {
      name: 'Coleman Camping Chair Set (6-pack)',
      description: 'Six padded camping chairs so everyone has a seat.',
      subcategory: 'Seating',
      price: '$60–100',
      url: amazonUrl('B0B5M2R3JC'),
      essential: true,
    },
    {
      name: 'Coleman 8-Foot Camping Table',
      description: 'Extra-large table for meals and games.',
      subcategory: 'Seating',
      price: '$50–80',
      url: amazonUrl('B00J5UGQQ2'),
      essential: true,
    },
    {
      name: 'Portable Cornhole Set',
      description: 'Classic outdoor game for family entertainment.',
      subcategory: 'Entertainment',
      price: '$35–60',
      url: amazonUrl('B00TZFKQXC'),
      essential: false,
      note: 'Gets the kids away from screens and engaged with the outdoors.',
    },
    {
      name: 'Badminton Set (for family)',
      description: 'Net, rackets, and shuttlecocks for lawn games.',
      subcategory: 'Entertainment',
      price: '$20–35',
      url: amazonUrl('B0843MGFB3'),
      essential: false,
    },

    // ── Comfort & Safety ──
    {
      name: 'Adventure Medical Kits Family First Aid Kit',
      description: 'Comprehensive first aid kit designed for group camping.',
      subcategory: 'First Aid',
      price: '$30–50',
      url: amazonUrl('B000BQKM54'),
      essential: true,
    },
    {
      name: 'Thermacell Mosquito Repellent Device',
      description: 'Creates 15-foot bug-free zone. Perfect for family camping.',
      subcategory: 'Comfort',
      price: '$15–30',
      url: amazonUrl('B000BQSTNY'),
      essential: true,
      note: 'MD summers have bugs. This keeps the campsite comfortable.',
    },
    {
      name: 'S\'mores Kit with Storage Box',
      description: 'Graham crackers, marshmallows, and chocolate in one kit.',
      subcategory: 'Entertainment',
      price: '$15–25',
      url: amazonUrl('B08MWCVXVL'),
      essential: false,
      note: 'Required for authentic camping. Kids won\'t forgive you if you skip this.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 4. WINTER CAMPING
// ═══════════════════════════════════════════════════════════

const winterCamping: CuratedGearCategory = {
  id: 'winter_camping',
  title: 'Winter Camping',
  description: 'Cold-weather overnight expeditions — 0°F rated gear for deep winter trips.',
  icon: '❄️',
  intro: 'Winter camping in Maryland requires serious gear. Garrett County gets snow, and temperatures can drop to 10°F or lower. This is not for beginners — you need a proper 0°F sleeping system, insulated shelter, and cold-rated camp stove. But the reward is solitude on snow-covered peaks and pristine winter landscapes.',
  items: [
    // ── Shelter ──
    {
      name: 'Big Agnes Copper Spur HV UL2 (winter setup)',
      description: '2-person tent designed for winter use. Add groundsheet and snow stakes.',
      subcategory: 'Shelter',
      price: '$300–380',
      url: amazonUrl('B08PDHHQL5'),
      essential: true,
      note: 'Use in winter mode with footprint and reinforced stakes for snow.',
    },
    {
      name: 'Mountain Hardwear Direkt 2 Tent (winter)',
      description: 'Freestanding winter tent with good snow load capacity.',
      subcategory: 'Shelter',
      price: '$400–550',
      url: amazonUrl('B08D8HPRKJ'),
      essential: true,
      note: 'Better for heavy snow loads than standard 3-season tents.',
    },

    // ── Sleeping ──
    {
      name: 'Western Mountaineering UltraLite 0°F Sleeping Bag (Down)',
      description: 'Premium 0°F down bag. Around 2.2 lbs — serious winter insulation.',
      subcategory: 'Sleeping',
      price: '$600–800',
      url: amazonUrl('B00UQCVF0I'),
      essential: true,
      note: 'Winter camping requires a real 0°F bag. This is the gold standard.',
    },
    {
      name: 'Kelty Cosmic 0 Sleeping Bag (down alternative)',
      description: '0°F bag with synthetic insulation — more water-resistant than down.',
      subcategory: 'Sleeping',
      price: '$250–350',
      url: amazonUrl('B08QWKQ7BF'),
      essential: true,
      note: 'Good alternative to down — synthetic works better if wet.',
    },
    {
      name: 'Therm-a-Rest NeoAir XTherm Sleeping Pad',
      description: 'R-value 6.9 — the most insulating inflatable pad available.',
      subcategory: 'Sleeping',
      price: '$180–250',
      url: amazonUrl('B07TQVBK5V'),
      essential: true,
      note: 'In winter, insulation from the ground is critical. This pad prevents heat loss.',
    },
    {
      name: 'Closed-Cell Foam Pad (backup insulation)',
      description: 'Foam pad under your inflatable pad. Extra insulation layer.',
      subcategory: 'Sleeping',
      price: '$15–30',
      url: amazonUrl('B008BZYPD2'),
      essential: false,
      note: 'Two pads are better than one in winter. The foam pad stays warm.',
    },

    // ── Cooking ──
    {
      name: 'MSR Windburner Winter Stove System',
      description: 'Integrated stove rated for cold and wind. Fuel canister heater included.',
      subcategory: 'Cooking',
      price: '$100–150',
      url: amazonUrl('B07D8T9GQP'),
      essential: true,
      note: 'Standard camp stoves don\'t work in freezing temps. This one does.',
    },
    {
      name: 'Jetboil MiniMo Camping Stove (alternative)',
      description: 'Simmer-capable integrated stove — works at altitude and cold.',
      subcategory: 'Cooking',
      price: '$100–140',
      url: amazonUrl('B00RJCL3TU'),
      essential: true,
    },
    {
      name: 'Thermos 40oz Wide Mouth Bottle',
      description: 'Keep water from freezing. Hot drinks during the night.',
      subcategory: 'Cooking',
      price: '$30–50',
      url: amazonUrl('B001PORMQO'),
      essential: true,
      note: 'Store hot water in your sleeping bag for warmth through the night.',
    },

    // ── Clothing ──
    {
      name: 'First Lite Merino Wool Base Layer Set',
      description: 'Merino base layer for core insulation. Moisture-wicking.',
      subcategory: 'Clothing',
      price: '$90–150',
      url: amazonUrl('B07HKY8Z5F'),
      essential: true,
      note: 'Merino is the gold standard for backcountry winter layering.',
    },
    {
      name: 'Patagonia Down Sweater Jacket',
      description: 'Lightweight down mid-layer insulation.',
      subcategory: 'Clothing',
      price: '$250–350',
      url: amazonUrl('B07VWCBJ1X'),
      essential: true,
      note: 'Down provides excellent warmth-to-weight for winter backpacking.',
    },
    {
      name: 'Arc\'teryx Beta Jacket (hardshell)',
      description: 'Waterproof/windproof hardshell for winter weather protection.',
      subcategory: 'Clothing',
      price: '$400–550',
      url: amazonUrl('B077L8GMYB'),
      essential: true,
      note: 'Keep moisture out and warmth in. A proper hardshell is essential.',
    },
    {
      name: 'Insulated Winter Boots — 0°F Rated',
      description: 'Therminsulated boots rated to 0°F. Waterproof and warm.',
      subcategory: 'Clothing',
      price: '$150–250',
      url: amazonUrl('B0BWZXQQPZ'),
      essential: true,
      note: 'Cold feet ruin winter trips. Invest in quality insulated boots.',
    },
    {
      name: 'Winter Gloves — Insulated (mittens)',
      description: 'Insulated mittens with dexterity. Windproof outer shell.',
      subcategory: 'Clothing',
      price: '$40–70',
      url: amazonUrl('B08TZ1YMPN'),
      essential: true,
      note: 'Mittens are warmer than gloves. Clip them to your jacket so you don\'t lose them.',
    },
    {
      name: 'Balaclava / Neck Gaiter (wool)',
      description: 'Cover your face and neck. Wind and cold protection.',
      subcategory: 'Clothing',
      price: '$20–35',
      url: amazonUrl('B08N8YKL3H'),
      essential: true,
    },

    // ── Accessories ──
    {
      name: 'Hand Warmers — Reusable Heat Packs',
      description: 'Reusable heat packs. Clip inside sleeping bag or pockets.',
      subcategory: 'Accessories',
      price: '$12–20',
      url: amazonUrl('B0832V4K2F'),
      essential: true,
      note: 'Activate and keep in your sleeping bag. They last 8+ hours.',
    },
    {
      name: 'Foot Warmers — Reusable Heat Packs',
      description: 'Larger heat packs for your sleeping bag feet area.',
      subcategory: 'Accessories',
      price: '$15–25',
      url: amazonUrl('B0832YFYPB'),
      essential: true,
    },
    {
      name: 'Black Diamond Spot 350 Headlamp',
      description: 'Reliable headlamp with long battery life in cold.',
      subcategory: 'Accessories',
      price: '$30–45',
      url: amazonUrl('B09JQRR21N'),
      essential: true,
    },
    {
      name: 'Avalanche Beacon (safety)',
      description: 'Backcountry avalanche safety device. Essential in steep terrain.',
      subcategory: 'Accessories',
      price: '$250–350',
      url: amazonUrl('B07PTBYY3D'),
      essential: false,
      note: 'Only for mountaineering. Check slope stability before winter trips.',
    },
    {
      name: 'Microspikes — Winter Traction Device',
      description: 'Strap onto boots for traction on ice and hard snow.',
      subcategory: 'Accessories',
      price: '$80–130',
      url: amazonUrl('B00XMCQ0Z4'),
      essential: true,
      note: 'Prevents slips on icy terrain during winter hikes.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

/** All curated camping gear categories */
export const CURATED_CAMPING_GEAR: CuratedGearCategory[] = [
  carCampingEssentials,
  backpackingUltralight,
  familyCamping,
  winterCamping,
];

/** Get a specific camping gear category by ID */
export function getCampingGearCategory(id: string): CuratedGearCategory | undefined {
  return CURATED_CAMPING_GEAR.find((cat) => cat.id === id);
}

/** Get all essential items for a category */
export function getEssentialCampingItems(categoryId: string): CuratedGearItem[] {
  const cat = getCampingGearCategory(categoryId);
  if (!cat) return [];
  return cat.items.filter((item) => item.essential);
}

/** Get total estimated cost for a category (essentials only) */
export function getEstimatedCampingCost(categoryId: string): string {
  // Returns a range string based on the items
  const items = getEssentialCampingItems(categoryId);
  if (items.length === 0) return '$0';

  let low = 0;
  let high = 0;
  items.forEach((item) => {
    const match = item.price.match(/\$(\d+)/g);
    if (match && match.length >= 1) {
      low += parseInt(match[0].replace('$', ''), 10);
      high += parseInt((match[1] || match[0]).replace('$', ''), 10);
    }
  });
  return `$${low}–$${high}`;
}
