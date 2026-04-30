/**
 * curatedHuntingGear.ts — David's curated hunting gear recommendations for Maryland
 *
 * Personal gear picks organized by hunting type:
 * 1. Whitetail Deer — Saddle Hunting on Public Land
 * 2. Spring Turkey Hunting
 * 3. Sika Deer (future)
 * 4. Bear Hunting (future)
 *
 * All Amazon links use affiliate tag: mdoutdoors1-20
 * Non-Amazon items link to manufacturer or retailer
 *
 * NOTE: These are David's actual preferences mixed with standard mid-range recommendations.
 * He will review and update with final product links.
 *
 * @module Data
 */

import type { CuratedGearItem, CuratedGearCategory } from './curatedFishingGear';

const TAG = 'mdoutdoors1-20';

function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

// ═══════════════════════════════════════════════════════════
// 1. WHITETAIL DEER — SADDLE HUNTING ON PUBLIC LAND
// ═══════════════════════════════════════════════════════════

const whitetailSaddle: CuratedGearCategory = {
  id: 'whitetail_saddle',
  title: 'Whitetail Deer — Saddle Hunting',
  description: 'Complete saddle hunting setup for bowhunting whitetail on Maryland public lands and private farms.',
  icon: '🦌',
  intro: 'I mostly hunt whitetail from a saddle on public lands or walk-in private farms — usually 1–3 miles in on the average hunt. Saddle hunting is the most mobile, versatile way to hunt public land. My setup is almost entirely Tethrd, and I\'ve dialed it in over multiple seasons. Here\'s everything you need to get started from scratch.',
  items: [
    // ── Saddle System ──
    {
      name: 'Tethrd Phantom Saddle',
      description: 'The saddle itself. Comfortable for all-day sits with good weight distribution.',
      subcategory: 'Saddle System',
      price: '$299–379',
      url: amazonUrl('B0FKR643SS'),
      essential: true,
      note: 'The Phantom is what I use. Get the right size — sizing matters more than brand.',
    },
    {
      name: 'Tethrd Workhorse Platform',
      description: 'My primary platform. Best balance of size and weight — critical with size 10.5 boots on long sits.',
      subcategory: 'Saddle System',
      price: '$299–349',
      url: 'https://tethrd.com/products/tethrd-workhorse-platform',
      essential: true,
      note: 'I also own the Predator platform (lighter, smaller), but for sits longer than 2 hours I always grab the Workhorse. The extra surface area is worth the weight.',
    },
    {
      name: 'Tethrd Predator Platform',
      description: 'My ultralight platform for run-and-gun hunts where every ounce counts.',
      subcategory: 'Saddle System',
      price: '$349–399',
      url: 'https://tethrd.com/products/predator-v',
      essential: false,
      note: 'If you can only buy one platform, get the Workhorse. The Predator is for when you\'re going deep and fast.',
    },
    {
      name: 'Tethrd One Sticks (4-pack)',
      description: 'My climbing sticks. I carry 4 with aiders, wrapped in stealth strips. Silent, lightweight, bomb-proof.',
      subcategory: 'Saddle System',
      price: '$350–450',
      url: 'https://store.themeateater.com/products/CLIMB-ONE-3.html',
      essential: true,
      note: 'Four sticks with aiders gets me 20+ feet up any tree. Wrap them in stealth tape — it eliminates all metal-on-metal noise.',
    },
    {
      name: 'Stick Aiders (4-pack)',
      description: 'Extends each stick by ~16". Reduces the number of sticks you need to carry.',
      subcategory: 'Saddle System',
      price: '$25–40',
      url: amazonUrl('B0FXB7KCY5'),
      essential: true,
    },
    {
      name: 'Stealth Strips Camo Tape',
      description: 'Silencing tape for climbing sticks and platform. Eliminates noise on setup.',
      subcategory: 'Saddle System',
      price: '$15–25',
      url: amazonUrl('B0C254QK4K'),
      essential: true,
    },
    {
      name: 'Tethrd Ultralock Lineman Belt',
      description: 'Safety tether for climbing and descending. Stays connected to the tree at all times.',
      subcategory: 'Saddle System',
      price: '$199–249',
      url: `https://www.amazon.com/s?k=Tethrd+Ultralock+Lineman+Belt&tag=${TAG}`,
      essential: true,
      note: 'Non-negotiable safety gear. Never leave the ground without being tethered.',
    },
    {
      name: 'Tree Tether (Amsteel / Whoopie Sling)',
      description: 'Adjustable tether that connects your saddle to the tree at hunting height.',
      subcategory: 'Saddle System',
      price: '$25–50',
      url: amazonUrl('B0D8J1PHVB'),
      essential: true,
    },

    // ── Bow & Archery ──
    {
      name: 'Bear Archery Legit RTH Compound Bow (Timber Strata)',
      description: 'Very similar to the Species RTH I use (currently unavailable). The Legit is a ready-to-hunt package — 10-70 lbs draw weight, 14-30" draw length, up to 315 FPS. Will handle any animal in Maryland.',
      subcategory: 'Bow & Archery',
      price: '$299–399',
      url: `https://www.amazon.com/s?k=Bear+Archery+Legit+RTH+Compound+Bow&tag=${TAG}`,
      essential: true,
      note: 'I shoot the Species RTH at 65 lbs / 30" draw — the Legit is the same platform. Adding a Bear Paw Grip (available on beararchery.com) is recommended for adults with larger hands. You don\'t need to spend $1,500 to kill deer.',
    },
    {
      name: 'Victory RIP Arrows 400 Spine (6-pack)',
      description: 'Small-diameter hunting arrows for maximum penetration. 400 spine for 65lb draw.',
      subcategory: 'Bow & Archery',
      price: '$50–70',
      url: amazonUrl('B0D6Z9S7R4'),
      essential: true,
    },
    {
      name: 'G5 Deadmeat V2 Broadheads (3-pack)',
      description: 'My broadhead of choice. Expandable mechanical with devastating wound channels.',
      subcategory: 'Bow & Archery',
      price: '$25–35',
      url: amazonUrl('B06Y2CN27L'),
      essential: true,
    },
    {
      name: 'QAD Ultrarest HDX Drop-Away Arrow Rest',
      description: 'Reliable drop-away rest. Full containment means your arrow stays put while climbing.',
      subcategory: 'Bow & Archery',
      price: '$90–130',
      url: amazonUrl('B07RHVTSNF'),
      essential: true,
    },
    {
      name: 'Trophy Ridge React H4 Bow Sight',
      description: 'Mid-range 4-pin sight with React technology — set two pins and it calculates the rest.',
      subcategory: 'Bow & Archery',
      price: '$100–150',
      url: `https://www.amazon.com/s?k=Trophy+Ridge+React+H4+Bow+Sight&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Tru-Fire Patriot Wrist Release',
      description: 'Consistent, reliable wrist strap release. Perfect for hunting.',
      subcategory: 'Bow & Archery',
      price: '$35–55',
      url: `https://www.amazon.com/s?k=Tru-Fire+Patriot+Wrist+Release&tag=${TAG}`,
      essential: true,
    },

    // ── Optics & Electronics ──
    {
      name: 'Vortex Crossfire HD 1400 Rangefinder',
      description: 'Essential for bowhunting. Know your exact yardage before the shot.',
      subcategory: 'Optics & Electronics',
      price: '$200–280',
      url: `https://www.amazon.com/s?k=Vortex+Crossfire+HD+1400+Rangefinder&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Tactacam Reveal X Pro Trail Camera',
      description: 'Cellular trail camera. Get photos to your phone without checking the camera.',
      subcategory: 'Optics & Electronics',
      price: '$130–180',
      url: amazonUrl('B0D7HZKFCQ'),
      essential: false,
      note: 'Cellular cams are a game-changer for patterning deer without bumping them.',
    },

    // ── Calls ──
    {
      name: 'Illusion Extinguisher Deer Call',
      description: 'All-in-one grunt call. Does grunt, bleat, and young buck tones.',
      subcategory: 'Calls',
      price: '$25–40',
      url: amazonUrl('B07DL9SXFV'),
      essential: true,
    },
    {
      name: 'Primos The Original CAN Doe Bleat',
      description: 'Flip it over for a doe bleat. Dead simple and effective during the rut.',
      subcategory: 'Calls',
      price: '$12–20',
      url: amazonUrl('B0F576SSDD'),
      essential: true,
    },
    {
      name: 'Rattling Bag',
      description: 'Simulates two bucks sparring. Effective from late October through the rut.',
      subcategory: 'Calls',
      price: '$15–25',
      url: amazonUrl('B0D78QYFB7'),
      essential: false,
    },

    // ── Clothing & Camo ──
    {
      name: 'First Lite Merino Wool Base Layer Set',
      description: 'Merino base layers for all-day scent control and warmth. Worth the investment.',
      subcategory: 'Clothing',
      price: '$90–150 (top + bottom)',
      url: 'https://www.firstlite.com/collections/base-layers',
      essential: true,
      note: 'Merino wool naturally controls scent and regulates temperature. I wear First Lite under everything.',
    },
    {
      name: 'Mid-Layer Fleece (Sitka Fanatic Hoody or equivalent)',
      description: 'Quiet fleece mid-layer. Avoid anything with Velcro or loud zippers.',
      subcategory: 'Clothing',
      price: '$100–180',
      url: `https://www.amazon.com/s?k=Sitka+Fanatic+Hoody+Fleece&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Outer Layer Jacket (Early season — light, Late season — insulated)',
      description: 'Layer up based on temp. MD deer season spans 50°F archery days to 15°F late season.',
      subcategory: 'Clothing',
      price: '$150–250',
      url: `https://www.amazon.com/s?k=Hunting+Jacket+Insulated+Waterproof&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'LaCrosse Alphaburly Pro 800G Rubber Boots',
      description: 'Scent-free rubber boots. Essential for walking in without leaving scent.',
      subcategory: 'Clothing',
      price: '$170–220',
      url: `https://www.amazon.com/s?k=LaCrosse+Alphaburly+Pro+800G+Rubber+Boots&tag=${TAG}`,
      essential: true,
      note: 'Rubber boots are non-negotiable on public land. They seal in your scent completely.',
    },
    {
      name: 'Scent Killer Gold Spray',
      description: 'Spray everything — clothes, boots, gear — before every hunt.',
      subcategory: 'Clothing',
      price: '$10–18',
      url: amazonUrl('B07XQHFQ6D'),
      essential: true,
    },

    // ── Pack ──
    {
      name: 'GUNTRY Club Saddle Hunting Pack',
      description: 'The pack I use. Holds all saddle gear — sticks, platform, saddle, bow — in one organized system.',
      subcategory: 'Packs',
      price: '$180–250',
      url: 'https://guntryclub.com',
      essential: true,
      note: 'I\'ve tried a LOT of packs and never found the perfect one until I found this at GUNTRY Club. It holds everything I need for a saddle hunt and organizes it so setup is fast and quiet.',
    },

    // ── Accessories ──
    {
      name: 'BioLite HeadLamp 200 (Red Light Mode)',
      description: 'Lightweight headlamp with red light mode for walking in and out in the dark.',
      subcategory: 'Accessories',
      price: '$30–50',
      url: amazonUrl('B095GJD4H5'),
      essential: true,
    },
    {
      name: 'Reflective Trail Tacks',
      description: 'Mark your trail in to your stand. The headlamp catches them on the walk in.',
      subcategory: 'Accessories',
      price: '$8–15',
      url: `https://www.amazon.com/s?k=Reflective+Trail+Tacks+Hunting&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Havalon Piranta Hunting Knife',
      description: 'Replaceable surgical-sharp blades. The easiest field dressing you\'ll ever do.',
      subcategory: 'Accessories',
      price: '$35–50',
      url: `https://www.amazon.com/s?k=Havalon+Piranta+Hunting+Knife&tag=${TAG}`,
      essential: true,
      note: 'Replaceable blades mean you never have to sharpen in the field. Swap in a fresh blade and keep going.',
    },
    {
      name: 'Caribou Gear Game Bags (4-pack)',
      description: 'Breathable game bags for quartering your deer. Keeps flies off and meat clean.',
      subcategory: 'Accessories',
      price: '$35–55',
      url: `https://www.amazon.com/s?k=Caribou+Gear+Game+Bags+4+pack&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Deer Drag Rope with Handle',
      description: 'Simple rope harness for dragging your deer out. Cheap and effective.',
      subcategory: 'Accessories',
      price: '$12–20',
      url: `https://www.amazon.com/s?k=Deer+Drag+Rope+Handle&tag=${TAG}`,
      essential: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 2. SPRING TURKEY HUNTING
// ═══════════════════════════════════════════════════════════

const springTurkey: CuratedGearCategory = {
  id: 'spring_turkey',
  title: 'Spring Turkey Hunting',
  description: 'Complete setup for Maryland spring gobbler season — shotgun or bow.',
  icon: '🦃',
  intro: 'Turkey hunting in Maryland is incredible — we have a healthy population statewide. I hunt turkey with both a shotgun and my bow on a tripod. Spring season runs mid-April through late May. Here\'s everything you need for a complete setup.',
  items: [
    // ── Weapons ──
    {
      name: 'Savage 301 Turkey XP 20 Gauge',
      description: 'My turkey shotgun. Single-shot, lightweight, and deadly accurate with TSS.',
      subcategory: 'Weapons',
      price: '$250–313',
      url: 'https://savagearms.com/firearms/sku/23220',
      essential: true,
      note: 'The single-shot Savage 301 is all you need. It\'s light enough to carry all day and patterns beautifully with TSS loads.',
    },
    {
      name: 'Bear Archery Legit RTH (for bow turkey hunting)',
      description: 'Same platform as the Species RTH I use for deer — set it on a tripod for turkeys. Draw when they\'re in strut or behind a tree.',
      subcategory: 'Weapons',
      price: '$299–399',
      url: `https://www.amazon.com/s?k=Bear+Archery+Legit+RTH+Compound+Bow&tag=${TAG}`,
      essential: false,
      note: 'Bow hunting turkeys is the ultimate challenge. Use a ground blind or tripod — you can\'t draw on an alert bird. Bear Paw Grip recommended for larger hands (beararchery.com).',
    },
    {
      name: 'BOG DeathGrip Tripod',
      description: 'Rock-steady tripod for bow or gun. Eliminates shake on long waits.',
      subcategory: 'Weapons',
      price: '$80–130',
      url: `https://www.amazon.com/s?k=BOG+DeathGrip+Tripod&tag=${TAG}`,
      essential: true,
    },

    // ── Ammo ──
    {
      name: 'Federal Premium Heavyweight TSS #9 (20 Gauge)',
      description: 'TSS is the gold standard for turkey loads. Devastating pattern density at 40+ yards.',
      subcategory: 'Ammo',
      price: '$30–50 (5 rounds)',
      url: `https://www.amazon.com/s?k=Federal+Premium+Heavyweight+TSS+20+Gauge&tag=${TAG}`,
      essential: true,
      note: 'TSS is expensive but worth every penny. One pellet to the head/neck is all it takes. Pattern your gun before season.',
    },

    // ── Camo & Concealment ──
    {
      name: 'First Lite Phantom Leafy Suit',
      description: 'My turkey camo. Full-body 3D leafy suit that breaks up your outline completely.',
      subcategory: 'Camo & Concealment',
      price: '$95–150',
      url: amazonUrl('B0BLSDRG6C'),
      essential: true,
      note: 'This suit goes over whatever you\'re wearing and makes you disappear. Turkey have incredible eyesight — concealment is everything.',
    },
    {
      name: 'Camo Face Mask / Head Net',
      description: 'Full head concealment. Turkeys will pick off an uncovered face at 100 yards.',
      subcategory: 'Camo & Concealment',
      price: '$10–20',
      url: amazonUrl('B077H4ZP84'),
      essential: true,
    },
    {
      name: 'Lightweight Camo Gloves',
      description: 'Cover your hands. Any movement of bare skin will bust a turkey.',
      subcategory: 'Camo & Concealment',
      price: '$12–25',
      url: amazonUrl('B076CDF1XP'),
      essential: true,
    },

    // ── Turkey Vest ──
    {
      name: 'ALPS OutdoorZ Grand Slam Turkey Vest',
      description: 'Dedicated turkey vest with built-in seat cushion, shell loops, call pockets, and game bag.',
      subcategory: 'Turkey Vest',
      price: '$80–130',
      url: amazonUrl('B07ZGDHZY7'),
      essential: true,
      note: 'A dedicated turkey vest is a must — it organizes all your calls, shells, and snacks, and the built-in seat means you can sit anywhere.',
    },

    // ── Calls ──
    {
      name: 'Primos Hunting Hook-Up Magnetic Box Call',
      description: 'Box call for loud yelps and cutting. Best for locating birds at distance.',
      subcategory: 'Calls',
      price: '$25–40',
      url: amazonUrl('B001CZGSSI'),
      essential: true,
      note: 'A box call is the easiest call to learn. Start here if you\'re new to turkey hunting.',
    },
    {
      name: 'Woodhaven Custom Calls Ninja Hammer Slate',
      description: 'Friction (slate/pot) call for realistic yelps, purrs, and clucks at close range.',
      subcategory: 'Calls',
      price: '$25–45',
      url: `https://www.amazon.com/s?k=Woodhaven+Custom+Calls+Ninja+Hammer+Slate&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Primos Hook Hunter Diaphragm Calls (3-pack)',
      description: 'Mouth calls for hands-free calling when the bird is close. Takes practice but deadly.',
      subcategory: 'Calls',
      price: '$12–20',
      url: `https://www.amazon.com/s?k=Primos+Hook+Hunter+Diaphragm+Calls+3+pack&tag=${TAG}`,
      essential: true,
      note: 'Start practicing with diaphragm calls months before season. They\'re the most versatile call once you learn them.',
    },
    {
      name: 'Crow Call (Locator Call)',
      description: 'Locator call to shock-gobble roosted birds at dawn. Essential for finding turkeys.',
      subcategory: 'Calls',
      price: '$10–18',
      url: `https://www.amazon.com/s?k=Crow+Call+Turkey+Locator&tag=${TAG}`,
      essential: true,
    },

    // ── Decoys ──
    {
      name: 'Avian-X LCD Lookout Hen Decoy',
      description: 'Realistic hen decoy that draws toms in. Collapsible for easy carry.',
      subcategory: 'Decoys',
      price: '$50–80',
      url: amazonUrl('B00HSK655O'),
      essential: true,
    },
    {
      name: 'MOJO Outdoors Fatal Fan Turkey Reaping Decoy',
      description: 'Fan mounted on a stake for fanning/reaping a strutting tom. Aggressive tactic that works.',
      subcategory: 'Decoys',
      price: '$35–60',
      url: amazonUrl('B07NZ8P9GY'),
      essential: false,
      note: 'Reaping is incredibly effective but use caution on public land — other hunters may mistake you for a turkey.',
    },

    // ── Accessories ──
    {
      name: 'Thermacell MR450 Mosquito Repeller',
      description: 'Creates a 15-foot bug-free zone. May turkey season in MD is mosquito season.',
      subcategory: 'Accessories',
      price: '$30–45',
      url: `https://www.amazon.com/s?k=Thermacell+MR450+Mosquito+Repeller&tag=${TAG}`,
      essential: true,
      note: 'Bugs will ruin your turkey hunt faster than anything. The Thermacell is a must for May hunts.',
    },
    {
      name: 'Hunting Seat Cushion (if not using a turkey vest with built-in)',
      description: 'You\'ll sit against a tree for hours. Your back will thank you.',
      subcategory: 'Accessories',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=Hunting+Seat+Cushion+Foam&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'BASSDASH Fingerless Hunting Gloves',
      description: 'Lightweight camo fingerless gloves for warm-season turkey hunting. Keep your hands concealed while maintaining trigger feel.',
      subcategory: 'Accessories',
      price: '$12–18',
      url: amazonUrl('B0BRP4KZJ3'),
      essential: true,
      note: 'Recommended for spring turkey — your hands are the most visible part of your body when calling. These keep you hidden without overheating.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 3. OPTICS & OBSERVATION GEAR
// ═══════════════════════════════════════════════════════════

const opticsGear: CuratedGearCategory = {
  id: 'hunting_optics_observation',
  title: 'Optics & Observation',
  description: 'Binoculars, rangefinders, and trail cameras for scouting and hunting success.',
  icon: '🔭',
  intro: 'Quality optics are the foundation of effective hunting. A good pair of binoculars lets you glass distant hillsides and spot deer movement. A rangefinder removes guesswork from distance estimation. Trail cameras reveal which areas get the most deer traffic. Invest in optics — they last a lifetime and pay dividends in success rates.',
  items: [
    {
      name: 'Vortex Diamondback HD 8x42 Binoculars',
      description: 'Premium binoculars with excellent light transmission and clarity. Lifetime warranty.',
      subcategory: 'Binoculars',
      price: '$599–749',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: true,
      note: 'Superior optics for glassing hillsides. Great light transmission in low-light conditions.',
    },
    {
      name: 'Nikon Prostaff 7S 8x42 Binoculars',
      description: 'Solid mid-range binoculars with good ED glass. Weather-resistant and compact.',
      subcategory: 'Binoculars',
      price: '$249–349',
      url: amazonUrl('B08DCGGRKD'),
      essential: false,
      note: 'Budget-friendly alternative that still delivers solid image quality.',
    },
    {
      name: 'Bushnell Prime 1700 Rangefinder',
      description: 'Compact rangefinder good to 1700 yards. Displays angle-compensated distance.',
      subcategory: 'Rangefinder',
      price: '$199–279',
      url: amazonUrl('B0BVR1GHFT'),
      essential: true,
      note: 'Rangefinders eliminate guesswork. Know your distances before taking the shot.',
    },
    {
      name: 'Stealth Cam G42NG Trail Camera',
      description: '24MP game camera with no-glow infrared. WiFi enabled for remote viewing.',
      subcategory: 'Trail Camera',
      price: '$149–199',
      url: amazonUrl('B08SXFMYM1'),
      essential: true,
      note: 'Trail cameras show you exactly what\'s using your hunting areas. Set them in fall to pattern deer.',
    },
    {
      name: 'Spypoint Force-11D Trail Camera',
      description: 'Cell-enabled game camera sends photos to your phone. 4G LTE capable.',
      subcategory: 'Trail Camera',
      price: '$249–349',
      url: amazonUrl('B09J6VXLNQ'),
      essential: false,
      note: 'Cell-enabled cameras eliminate the need to visit sites to retrieve SD cards.',
    },
    {
      name: 'Nikon Prostaff 7S 8x32 Binoculars',
      description: 'Budget-tier binos with the optical clarity of glass twice the price. Compact 8x32 form factor is right for tree-stand glassing.',
      subcategory: 'Optics',
      price: '$150–180',
      url: `https://www.amazon.com/s?k=Nikon+Prostaff+7S+8x32+Binoculars&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 4. TREE STANDS & BLINDS
// ═══════════════════════════════════════════════════════════

const standsAndBlinds: CuratedGearCategory = {
  id: 'hunting_stands_blinds',
  title: 'Tree Stands & Blinds',
  description: 'Climbing stands, hang-ons, and ground blinds for elevated and ground-level hunting.',
  icon: '🌲',
  intro: 'A quality stand keeps you safe, comfortable, and ready to hunt all day. Climbing stands are versatile and don\'t require pre-installed steps. Hang-on stands offer stability and are easier to move than climbing stands. Ground blinds work great when no suitable trees are available. Choose based on your hunting terrain and style.',
  items: [
    {
      name: 'Summit Viper SD Climbing Stand',
      description: 'Premium climbing stand with wide platform and comfortable seat. Made in USA.',
      subcategory: 'Climbing Stand',
      price: '$599–749',
      url: amazonUrl('B08DRQ4FDC'),
      essential: true,
      note: 'This stand climbs smoothly and feels solid. The platform is roomy for all-day sits.',
    },
    {
      name: 'Lone Wolf Assault II Hang-On Stand',
      description: 'Lightweight hang-on stand weighing just 8 lbs. Solid footrest and backrest.',
      subcategory: 'Hang-On Stand',
      price: '$299–399',
      url: amazonUrl('B08CL7TVMB'),
      essential: true,
      note: 'Great for quick moves to new trees or setting up multiple stands on a property.',
    },
    {
      name: 'Muddy Outdoors Vertex 360 Hang-On Stand',
      description: 'Budget-friendly hang-on with 360-degree seat rotation. Includes safety belt.',
      subcategory: 'Hang-On Stand',
      price: '$129–179',
      url: amazonUrl('B086K2L7DD'),
      essential: false,
      note: 'Good entry-level hang-on stand if you\'re just getting started.',
    },
    {
      name: 'Primal Tree Stands The Furnace Ground Blind',
      description: 'Fully enclosed ground blind with large windows. Roomy and weather-tight.',
      subcategory: 'Ground Blind',
      price: '$249–349',
      url: amazonUrl('B08CXLHQKJ'),
      essential: true,
      note: 'Perfect for fields or areas without suitable climbing trees. Conceals movement completely.',
    },
    {
      name: 'Muddy Outdoors Boss Hog Deluxe Ground Blind',
      description: 'Extra-large ground blind with multiple windows. 360-degree visibility.',
      subcategory: 'Ground Blind',
      price: '$189–249',
      url: amazonUrl('B0B5NJCB6C'),
      essential: false,
      note: 'If you hunt with a buddy or need more space, this blind provides plenty of room.',
    },
    {
      name: 'Ameristep Doghouse Ground Blind',
      description: 'Pop-up ground blind for public-land hunters who can not bring a stand. Camo pattern, three windows, small enough for a hike-in.',
      subcategory: 'Ground Blinds',
      price: '$80–130',
      url: `https://www.amazon.com/s?k=Ameristep+Doghouse+Ground+Blind&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 5. CALLS & DECOYS
// ═══════════════════════════════════════════════════════════

const callsDecoys: CuratedGearCategory = {
  id: 'hunting_calls_decoys',
  title: 'Calls & Decoys',
  description: 'Grunt calls, turkey calls, and decoys to bring game within range.',
  icon: '📢',
  intro: 'Calls and decoys are force multipliers in hunting. A well-timed grunt call stops a wandering deer. Predator calls attract curious coyotes. Turkey decoys set up in a field pull gobblers in close. Master these tools and you\'ll tag more game. Start with quality calls and learn to use them properly.',
  items: [
    {
      name: 'Primos Can Doe Estrus Call',
      description: 'Simple can call for doe estrus bleats. No batteries, no setup — just blow and go.',
      subcategory: 'Deer Call',
      price: '$8–15',
      url: amazonUrl('B000BDLV4C'),
      essential: true,
      note: 'A dead-simple estrus call that works. Keep one in your pack on every hunt.',
    },
    {
      name: 'Primos Deer Call Combo (Grunt + Bleat + Snort)',
      description: 'Versatile multi-sound call for all deer vocalizations.',
      subcategory: 'Deer Call',
      price: '$18–28',
      url: amazonUrl('B0B7KTXZ7X'),
      essential: true,
      note: 'Three sounds in one call. The grunt is most useful, but bleats and snorts have their place.',
    },
    {
      name: 'Mossy Oak Strut Zone Electronic Turkey Call',
      description: 'Electronic turkey call with realistic gobble, cluck, purr, and drum sounds.',
      subcategory: 'Turkey Call',
      price: '$79–129',
      url: amazonUrl('B00F4QVZNO'),
      essential: true,
      note: 'Electronic calls are highly effective for turkey hunting. This one is loud and durable.',
    },
    {
      name: 'Primos Hand Call Box Call — Hardwood',
      description: 'Traditional box call for turkey hunting. Produces yelps, clucks, and purrs.',
      subcategory: 'Turkey Call',
      price: '$15–25',
      url: amazonUrl('B00005OMV2'),
      essential: false,
      note: 'If you prefer hand calls to electronic, a box call is the gold standard.',
    },
    {
      name: 'Mossy Oak Full-Body Turkey Decoy',
      description: 'Full-body turkey decoy with realistic proportions. Attracts toms in spring.',
      subcategory: 'Decoy',
      price: '$49–79',
      url: amazonUrl('B00CCCDVSO'),
      essential: true,
      note: 'Set this up in an open field with a call in the morning. Gobblers can\'t resist.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 6. HUNTING CLOTHING & LAYERING
// ═══════════════════════════════════════════════════════════

const huntingClothing: CuratedGearCategory = {
  id: 'hunting_clothing_layers',
  title: 'Clothing & Layering',
  description: 'Base layers, insulation, outer layers, boots, and gloves for all-day comfort.',
  icon: '🧥',
  intro: 'Comfort in the stand determines how long you\'ll stay and hunt effectively. The key is layering: start with moisture-wicking base layers, add an insulating mid-layer, and top it with a windproof outer shell. Insulated boots keep your feet warm and alert. Good gloves let you draw and shoot while staying warm. Hunt longer, hunt better.',
  items: [
    {
      name: 'First Lite Merino Wool Base Layer Set',
      description: 'Merino base layers for warmth without bulk. Moisture-wicking and temperature-regulating.',
      subcategory: 'Base Layer',
      price: '$90–150',
      url: amazonUrl('B07HKY8Z5F'),
      essential: true,
      note: 'Merino is the gold standard for hunting. Keeps you warm in cold and cool in warm weather.',
    },
    {
      name: 'Sitka Gear Core Midweight Merino',
      description: 'Premium mid-weight base layer for cold mornings.',
      subcategory: 'Base Layer',
      price: '$130–180',
      url: amazonUrl('B08VCQZFL9'),
      essential: false,
      note: 'If you can afford premium, Sitka is worth it. Exceptional quality.',
    },
    {
      name: 'Mossy Oak Brush Insulated Parka',
      description: 'Insulated jacket rated for cold weather. Quiet fabric for stealth movement.',
      subcategory: 'Outer Layer',
      price: '$149–199',
      url: amazonUrl('B08D2QQHGY'),
      essential: true,
      note: 'Outer layers must be quiet. This parka is built for hunting, not fashion.',
    },
    {
      name: 'Carhartt Brushed Flannel Shirt',
      description: 'Classic flannel for mid-layer insulation. Breathable and effective.',
      subcategory: 'Mid Layer',
      price: '$35–55',
      url: amazonUrl('B01M5LC8KZ'),
      essential: true,
      note: 'A simple flannel works great as an insulating mid-layer.',
    },
    {
      name: 'LaCrosse Alphaburly Pro Hunting Boots',
      description: '1000g insulated hunting boots rated to -40°F. Waterproof and comfortable.',
      subcategory: 'Boots',
      price: '$199–279',
      url: amazonUrl('B078J8TCGC'),
      essential: true,
      note: 'Cold feet ruin hunts. Invest in quality insulated boots. These last for years.',
    },
    {
      name: 'Danner Pronghorn GTX Hunting Boot',
      description: 'Premium waterproof hunting boot with Gore-Tex. Lightweight and nimble.',
      subcategory: 'Boots',
      price: '$249–349',
      url: amazonUrl('B08GY9L5YF'),
      essential: false,
      note: 'If you prefer lighter footwear, these Danners are exceptional.',
    },
    {
      name: 'Mechanix ColdWork Gloves',
      description: 'Insulated tactical gloves with trigger-finger dexterity. Warm and functional.',
      subcategory: 'Gloves',
      price: '$25–40',
      url: amazonUrl('B00QJRXWGI'),
      essential: true,
      note: 'Gloves that let you manipulate your bow or gun without losing warmth.',
    },
    {
      name: 'Sitka Gear Merino Wool Knit Hat',
      description: 'Premium merino knit hat that regulates temperature and wicks moisture.',
      subcategory: 'Headwear',
      price: '$45–65',
      url: amazonUrl('B08VCSFMRM'),
      essential: true,
      note: 'A good hat keeps you warm and is quiet when shifting position.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 7. HUNTING ACCESSORIES & TOOLS
// ═══════════════════════════════════════════════════════════

const huntingAccessories: CuratedGearCategory = {
  id: 'hunting_accessories_tools',
  title: 'Accessories & Tools',
  description: 'Knives, headlamps, scent control, game bags, and field kit essentials.',
  icon: '🔪',
  intro: 'The right accessories make hunting safer and more efficient. A sharp knife is essential for field dressing game. A headlamp gets you to your stand in the dark. Scent control keeps wind-sensitive deer from detecting you. Quality game bags preserve meat quality in the field. Start with essentials and build from there.',
  items: [
    {
      name: 'Benchmade 15500 Crooked River Hunting Knife',
      description: 'Fixed-blade hunting knife with a sharp, durable edge. Great for field dressing.',
      subcategory: 'Knife',
      price: '$139–189',
      url: amazonUrl('B01MRW3CHS'),
      essential: true,
      note: 'A sharp knife is non-negotiable. This Benchmade is an excellent field knife.',
    },
    {
      name: 'CRKT Folts Minimalist Blade Fixed Knife',
      description: 'Compact fixed-blade knife for light processing. Budget-friendly.',
      subcategory: 'Knife',
      price: '$25–40',
      url: amazonUrl('B01MSXVSMZ'),
      essential: false,
      note: 'Good backup or smaller knife for processing small game.',
    },
    {
      name: 'Black Diamond Spot 350 Headlamp',
      description: 'Bright headlamp with red light mode. Lightweight and weather-resistant.',
      subcategory: 'Lighting',
      price: '$30–45',
      url: amazonUrl('B09JQRR21N'),
      essential: true,
      note: 'You need hands-free light for pre-dawn hikes to your stand.',
    },
    {
      name: 'Wildlife Research Center Code Blue Deer Scent',
      description: 'Scent control: doe urine and estrus pheromone combo.',
      subcategory: 'Scent Control',
      price: '$12–18',
      url: amazonUrl('B00005OMMB'),
      essential: true,
      note: 'Scent matters. Use code blue during the rut to draw deer.',
    },
    {
      name: 'Mossy Oak Game Bag Set',
      description: 'Breathable game bags for field dressing and carrying venison.',
      subcategory: 'Game Processing',
      price: '$18–28',
      url: amazonUrl('B0088OPD0M'),
      essential: true,
      note: 'Proper game bags keep insects and dirt off your meat. Essential for quality.',
    },
    {
      name: 'Gerber Gut Hook Field Dressing Kit',
      description: 'Complete field dressing kit with knife, bone saw, and tools.',
      subcategory: 'Game Processing',
      price: '$45–65',
      url: amazonUrl('B076GYC5G2'),
      essential: false,
      note: 'If you prefer an all-in-one field kit, this has everything you need.',
    },
    {
      name: 'Outdoor Products Hunter\'s Backpack (22L)',
      description: 'Comfortable pack for carrying gear to and from your stand.',
      subcategory: 'Pack',
      price: '$45–65',
      url: amazonUrl('B08YDC8L3J'),
      essential: true,
      note: 'You need a pack to haul your gear, calls, and extra layers to your location.',
    },
    {
      name: 'Dead Down Wind Scent Eliminator Laundry Detergent',
      description: 'Strips human scent from camo wash. Pairs with the field spray; adds a season-long scent-control routine instead of one-shot prep.',
      subcategory: 'Scent Control',
      price: '$20–30',
      url: `https://www.amazon.com/s?k=Dead+Down+Wind+Laundry+Detergent&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 8. SIKA DEER (FUTURE — PLACEHOLDER)
// ═══════════════════════════════════════════════════════════

const sikaDeer: CuratedGearCategory = {
  id: 'sika_deer',
  title: 'Sika Deer — Eastern Shore',
  description: 'Hunting Maryland\'s unique sika deer on the Eastern Shore marshlands.',
  icon: '🫎',
  intro: 'Coming soon — Sika deer hunting is a uniquely Maryland experience. These small elk relatives inhabit the marshes of Dorchester County and the Eastern Shore. Gear recommendations will focus on marsh-specific boots, layout blinds, and calling techniques.',
  items: [],
};

// ═══════════════════════════════════════════════════════════
// 4. BEAR HUNTING (FUTURE — PLACEHOLDER)
// ═══════════════════════════════════════════════════════════

const bearHunting: CuratedGearCategory = {
  id: 'bear_hunting',
  title: 'Bear Hunting — Western Maryland',
  description: 'Black bear hunting in Maryland\'s Garrett and Allegany counties.',
  icon: '🐻',
  intro: 'Coming soon — Maryland\'s bear population in western MD has grown steadily. Gear recommendations will cover large-game archery setups, bear-specific safety equipment, and processing gear for large game.',
  items: [],
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

/** All curated hunting gear categories */
export const CURATED_HUNTING_GEAR: CuratedGearCategory[] = [
  whitetailSaddle,
  springTurkey,
  opticsGear,
  standsAndBlinds,
  callsDecoys,
  huntingClothing,
  huntingAccessories,
  sikaDeer,
  bearHunting,
];

/** Get a specific hunting gear category by ID */
export function getHuntingGearCategory(id: string): CuratedGearCategory | undefined {
  return CURATED_HUNTING_GEAR.find((cat) => cat.id === id);
}

/** Get all active categories (with items) */
export function getActiveHuntingCategories(): CuratedGearCategory[] {
  return CURATED_HUNTING_GEAR.filter((cat) => cat.items.length > 0);
}

/** Get all coming-soon categories */
export function getComingSoonHuntingCategories(): CuratedGearCategory[] {
  return CURATED_HUNTING_GEAR.filter((cat) => cat.items.length === 0);
}

/** Get all essential items for a category */
export function getEssentialHuntingItems(categoryId: string): CuratedGearItem[] {
  const cat = getHuntingGearCategory(categoryId);
  if (!cat) return [];
  return cat.items.filter((item) => item.essential);
}

/** Get total estimated cost for a category (essentials only) */
export function getEstimatedHuntingCost(categoryId: string): string {
  const items = getEssentialHuntingItems(categoryId);
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
