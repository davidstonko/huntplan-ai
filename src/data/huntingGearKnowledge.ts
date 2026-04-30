/**
 * huntingGearKnowledge.ts — Hunting gear recommendations for Maryland hunting
 *
 * Provides comprehensive gear recommendations by species and season, including:
 * - Whitetail deer (archery early, rut, firearms, muzzleloader/late season)
 * - Spring and fall turkey
 * - Waterfowl (ducks and geese)
 * - Black bear (limited draw season)
 *
 * Used by the AI chat system to recommend gear based on user's planned hunt.
 * All recommendations include realistic product names, price ranges, and tips.
 *
 * Data sources: Maryland DNR regulations, professional hunting guides, seasonal patterns
 */

import {
  HuntingGearRecommendation,
  GearItem,
} from '../types/gear';

/**
 * Whitetail deer archery early season (September)
 * Focus: Scent control, lightweight mobility, heat management
 */
const WHITETAIL_ARCHERY_EARLY: HuntingGearRecommendation = {
  id: 'whitetail-archery-early',
  species: 'whitetail',
  season: 'archery_early',
  months: [9],
  method: 'archery',
  clothing: [
    {
      name: 'Lightweight Camo (Sitka Subalpine)',
      description:
        'Breathable, moisture-wicking camouflage jacket and pants. Subalpine pattern blends early season foliage. Designed for active hunting and moving between locations.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$280-380',
    },
    {
      name: 'Lightweight Camo (First Lite Cipher)',
      description:
        'Ultra-lightweight merino wool blend. Odor-reducing properties with excellent breathability for early warmth.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$260-340',
    },
    {
      name: 'Moisture-wicking Base Layer',
      description:
        'Merino wool or synthetic blend base layer to wick sweat away from skin during warm weather hunting. Keeps you dry and cool.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$50-100',
    },
    {
      name: 'Rubber Boots (LaCrosse Alphaburly)',
      description:
        'Quiet, scent-reducing rubber boots with good grip. Eliminates human odor better than leather. Comfortable for long walks to the stand.',
      category: 'boot',
      seasonalRelevance: 'high',
      priceRange: '$120-180',
    },
  ],
  scent: [
    {
      name: 'Ozonics HR-500 Scent Elimination Device',
      description:
        'Active ozone generator that neutralizes human odor in real-time. Covers up to 60 yards. Battery-powered with quiet operation. Industry standard for serious hunters.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$400-500',
    },
    {
      name: 'Dead Down Wind Scent Spray',
      description:
        'Aerosol spray to neutralize body odor on clothing and skin. Enzyme-based formula. Lightweight, portable alternative to electronic devices.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$15-25',
    },
    {
      name: 'Scent-Free Laundry Detergent',
      description:
        'Wash all hunting clothes with scent-free detergent. Removes human odors from camo. Use before every season.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$12-20',
    },
  ],
  calls: [
    {
      name: 'Primos Speak Easy Grunt Call',
      description:
        'Quality grunt call for early season doe contact. Realistic, easy to use. Bring early season bucks to your location with soft, natural tones.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$20-35',
    },
    {
      name: 'Doe Bleat Can Call',
      description:
        'Portable can-style call that mimics doe bleats. Attracts bucks searching for does. Light and compact for tree stand use.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$15-30',
    },
  ],
  accessories: [
    {
      name: 'Rangefinder (Vortex Razor HD)',
      description:
        'Premium laser rangefinder for precise yardage. Critical for archery shots. HD optics, lightweight, includes ballistic calculator.',
      category: 'optics',
      seasonalRelevance: 'high',
      priceRange: '$380-480',
    },
    {
      name: 'Archery Release Aid',
      description:
        'Calibrated mechanical release for consistent shot execution. Choose thumb-trigger, finger-trigger, or wrist-strap based on preference. Practice with your release year-round.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$80-180',
    },
    {
      name: 'Broadheads (Rage Hypodermic)',
      description:
        'Mechanical broadheads with expandable blades for maximum wound channel. Known for consistent flight and deadly performance. Field test before season.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$60-90',
    },
    {
      name: 'Trail Camera (Wildgame Innovations)',
      description:
        'Scouting camera to monitor deer movement and establish patterns. Helps identify hot spots before opening day.',
      category: 'accessory',
      seasonalRelevance: 'medium',
      priceRange: '$100-250',
    },
  ],
  conditions:
    'Early season whitetail means warm afternoons, thick vegetation for cover, and deer using water sources heavily. Hunt early mornings and late afternoons near water and food plots.',
  tips: [
    'Scent control is everything in early season — deer rely on smell more than sight with thick cover',
    'Hunt water sources and food plots during warm weather',
    'Morning hunts near bedding areas, evening hunts near food sources',
    'Wind direction is critical — always position yourself upwind',
    'Stay in tree stand or ground blind to minimize movement and visibility',
  ],
  amazonProducts: [],
};

/**
 * Whitetail deer archery rut (October-November)
 * Focus: Aggressive calling, scent attraction, peak rut patterns
 */
const WHITETAIL_ARCHERY_RUT: HuntingGearRecommendation = {
  id: 'whitetail-archery-rut',
  species: 'whitetail',
  season: 'archery_rut',
  months: [10, 11],
  method: 'archery',
  clothing: [
    {
      name: 'Mid-Weight Layering System',
      description:
        'Versatile clothing layers for October/November temperatures. Includes insulated jacket, mid-weight base layer, and wind-blocking outer shell. Allows shedding layers as you heat up.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$200-350',
    },
    {
      name: 'Insulated Boots (LaCrosse Alphaburly Pro)',
      description:
        '200-gram insulation for cooler November hunting. Rubber construction for odor control. Rated for temperatures down to 20°F.',
      category: 'boot',
      seasonalRelevance: 'high',
      priceRange: '$150-220',
    },
  ],
  scent: [
    {
      name: 'Doe Estrus Scent (Code Blue)',
      description:
        'Premium doe urine collected during peak estrus. Most effective scent during rut. Hang scent wick downwind to draw bucks from long distances.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$25-45',
    },
    {
      name: 'Tink\'s #69 Lure',
      description:
        'Classic doe estrus alternative. Strong scent that has been proven to attract rutting bucks. Liquid format for ground or tree application.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$18-30',
    },
    {
      name: 'Scent Drag System',
      description:
        'Rope or fabric strip saturated with doe estrus or buck musk. Drag along ground to create visual and scent trail leading to your stand.',
      category: 'scent',
      seasonalRelevance: 'medium',
      priceRange: '$10-20',
    },
  ],
  calls: [
    {
      name: 'Grunt Tube with Multiple Tones',
      description:
        'Produce bucks, doe grunts, and aggression vocalizations. Most versatile call for rut season. Knock on hard surfaces to vary tone.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$25-45',
    },
    {
      name: 'Rattling Antlers (Wildgame Innovations)',
      description:
        'Authentic-sounding artificial antlers for simulating rutting bucks fighting. Most effective first two weeks of November during peak rut.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$30-70',
    },
    {
      name: 'Snort-Wheeze Call',
      description:
        'Reproduces aggressive buck dominance call. Triggers territorial response in competing bucks. Use sparingly and strategically.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$20-35',
    },
  ],
  accessories: [
    {
      name: 'Binoculars (Vortex Optics 10x42)',
      description:
        'Quality binoculars for long-distance spotting. Helps identify bucks moving through thermal areas during rut without pressuring them.',
      category: 'optics',
      seasonalRelevance: 'high',
      priceRange: '$250-400',
    },
    {
      name: 'Climbing Tree Stand (Summit Viper SD)',
      description:
        'Lightweight, quiet climber stand. Self-climbing design lets you position in new locations daily to follow rut patterns without leaving ground scent.',
      category: 'stand',
      seasonalRelevance: 'high',
      priceRange: '$300-450',
    },
    {
      name: 'Safety Harness',
      description:
        'Full-body harness with shock-absorbing lanyard. Required safety equipment. Never hunt elevated without proper harness.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$70-150',
    },
  ],
  conditions:
    'Peak rut occurs mid-October through early November in Maryland. All-day sits produce best results. Bucks are aggressive, careless, and actively searching for does.',
  tips: [
    'Rattling works best during first two weeks of November',
    'All-day sits during peak rut — biggest bucks move all hours',
    'Scout aggressively to find does, then position for intercepting bucks',
    'Fresh doe estrus scent is your most valuable tool during rut',
    'Aggressive calling in early November triggers territorial responses',
  ],
  amazonProducts: [],
};

/**
 * Whitetail deer firearms season (November-December)
 * Focus: Safety orange, cold weather gear, post-rut patterns
 */
const WHITETAIL_FIREARMS: HuntingGearRecommendation = {
  id: 'whitetail-firearms',
  species: 'whitetail',
  season: 'firearms',
  months: [11, 12],
  method: 'firearms',
  clothing: [
    {
      name: 'Insulated Camo (Sitka Fanatic)',
      description:
        'PrimaLoft insulation with camouflage outer. Designed for sits in cold November/December temperatures. Waterproof outer shell sheds light precipitation.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$320-420',
    },
    {
      name: 'Blaze Orange Vest (REQUIRED)',
      description:
        'MARYLAND LAW REQUIRES blaze orange during firearms season. High-visibility safety vest worn over all outer layers. Non-negotiable for safety.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$25-60',
    },
    {
      name: 'Blaze Orange Hat/Cap (REQUIRED)',
      description:
        'Bright orange hat visible from all angles. Pair with orange vest for maximum visibility to other hunters. Protects you from being mistaken for game.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$15-35',
    },
    {
      name: 'Heavy Insulated Boots',
      description:
        '400+ gram insulation for standing/sitting in cold November and December conditions. Waterproof membrane. Rated for 0°F.',
      category: 'boot',
      seasonalRelevance: 'high',
      priceRange: '$180-280',
    },
  ],
  scent: [
    {
      name: 'Cedar or Earth Cover Scent',
      description:
        'Autumn-appropriate natural scent to mask human odor. Less critical in firearms season since bucks are running on instinct, but still helpful.',
      category: 'scent',
      seasonalRelevance: 'medium',
      priceRange: '$12-25',
    },
  ],
  calls: [
    {
      name: 'Grunt Call (Minimal Use)',
      description:
        'Light calling only. Bucks are no longer in full rut aggression. Soft doe bleats may work better than aggressive grunting.',
      category: 'call',
      seasonalRelevance: 'low',
      priceRange: '$20-35',
    },
    {
      name: 'Doe Bleat Can',
      description:
        'Soft doe contact calls during mid-day. Post-rut bucks are returning to food sources and respond to does.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$15-30',
    },
  ],
  accessories: [
    {
      name: 'Shooting Sticks (Caldwell Lead Sled)',
      description:
        'Adjustable rifle rest for steady aim from stand or ground blind. Critical accuracy tool for ethical, humane shots.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$90-150',
    },
    {
      name: 'Quality Binoculars',
      description:
        'Essential for glassing open fields and woodlines where post-rut bucks spend daylight hours feeding.',
      category: 'optics',
      seasonalRelevance: 'high',
      priceRange: '$200-400',
    },
    {
      name: 'Hand Warmers (Thermacell)',
      description:
        'Odorless, heatless hand warmers for extended cold-weather sits. Maintain dexterity and warmth without producing scent or flame.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$15-30',
    },
    {
      name: 'Heated Insoles',
      description:
        'Battery-powered insoles to keep feet warm during long sits. Maintains feeling and prevents cold-related injury.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$40-80',
    },
  ],
  conditions:
    'Maryland firearms season (Nov 1 - Dec 13) brings colder temperatures, bare trees, and post-rut behavior. Post-rut bucks are exhausted and return to predictable food sources.',
  tips: [
    'Maryland requires blaze orange vest and hat — no exceptions, no excuses',
    'Post-rut bucks return to food sources (acorn concentrations, winter wheat)',
    'Hunt during prime feeding times: early morning and late afternoon',
    'Glass open areas and field edges where deer feel safe in daylight',
    'Firearm season is the most crowded hunting period — scout thoroughly',
  ],
  amazonProducts: [],
};

/**
 * Whitetail deer muzzleloader/late season (December-January)
 * Focus: Extreme cold preparation, minimal activity
 */
const WHITETAIL_MUZZLELOADER_LATE: HuntingGearRecommendation = {
  id: 'whitetail-muzzleloader-late',
  species: 'whitetail',
  season: 'late_season',
  months: [12, 1],
  method: 'muzzleloader',
  clothing: [
    {
      name: 'Extreme Cold Insulation (Sitka Fanatic)',
      description:
        'Maximum insulation with wind-blocking outer shell. Designed for sitting motionless in temperatures near freezing. Core warmth is critical.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$350-450',
    },
    {
      name: 'Hand Muff',
      description:
        'Insulated hand warmer worn around waist. Allows hand access for shooting while maintaining core hand warmth between moments of action.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$30-70',
    },
    {
      name: 'Face Mask/Balaclava',
      description:
        'Protective mask covering entire face except eyes. Prevents frostbite, stops wind, breaks up face outline. Choose orange-trim version for safety.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$20-50',
    },
    {
      name: 'Insulated Boots (1000+ gram)',
      description:
        'Maximum insulation for extreme cold standing/sitting. Rated for -20°F. Thicker insulation than firearms season boots.',
      category: 'boot',
      seasonalRelevance: 'high',
      priceRange: '$220-350',
    },
  ],
  scent: [
    {
      name: 'Minimal Scent Control',
      description:
        'In extreme cold (-10 to 10°F), scent travels only short distances due to dense air. Focus on wind position rather than scent elimination products.',
      category: 'scent',
      seasonalRelevance: 'low',
      priceRange: '$0',
    },
  ],
  calls: [
    {
      name: 'Doe Bleat Only',
      description:
        'Softly contact does only during warm midday hours. Avoid aggressive calling — energy-depleted late-season bucks are less responsive.',
      category: 'call',
      seasonalRelevance: 'low',
      priceRange: '$15-30',
    },
  ],
  accessories: [
    {
      name: 'Hand/Toe Warmers (Extended Duration)',
      description:
        'Long-lasting chemical warmers for pockets, gloves, and boots. Heatless and odorless. Essential for maintaining extremity warmth and dexterity.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$15-35',
    },
    {
      name: 'Thermos of Hot Beverage',
      description:
        'Insulated thermos containing hot coffee, tea, or soup. Provides internal warmth and morale boost during long, cold sits.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$25-60',
    },
    {
      name: 'Heated Vest (Battery-Powered)',
      description:
        'Lightweight heated vest worn under camo. Rechargeable battery maintains core temperature for extended sits.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$80-180',
    },
    {
      name: 'Portable Heater (Ground Blind)',
      description:
        'Small propane or ceramic heater for use in enclosed ground blinds only. Never use in tree stands. Maintains comfortable temperature during extreme cold.',
      category: 'accessory',
      seasonalRelevance: 'medium',
      priceRange: '$40-120',
    },
  ],
  conditions:
    'December and January hunting means extreme cold, snow cover, and very limited deer movement. Bucks are exhausted from rut and focused solely on survival.',
  tips: [
    'Extreme cold reduces scent dispersion — wind position is more important than scent products',
    'Deer movement is minimal — hunt near known bedding and food sources',
    'Midday temperature swings may offer brief movement window',
    'Frostbite and hypothermia are real risks — prioritize your safety first',
    'Many hunters quit in January — less pressure means better hunting despite conditions',
  ],
  amazonProducts: [],
};

/**
 * Spring turkey (April-May)
 * Focus: Camouflage, calling, decoys
 */
const TURKEY_SPRING: HuntingGearRecommendation = {
  id: 'turkey-spring',
  species: 'turkey',
  season: 'spring',
  months: [4, 5],
  method: 'any',
  clothing: [
    {
      name: 'Full-Body Camo (Mossy Oak Obsession)',
      description:
        'Complete head-to-toe camouflage including shirt, pants, hood, and gloves. Mossy Oak Obsession pattern is optimized for spring hardwoods. Every inch must be hidden.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$100-200',
    },
    {
      name: 'Face Mask or Face Paint',
      description:
        'Hide your face completely. Turkeys have excellent eyesight and will spot exposed skin from hundreds of yards. Choose between mask or camo paint.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$8-25',
    },
    {
      name: 'Camo Gloves',
      description:
        'Hands are highly visible in hunting situation. Wear matching camo gloves or use face paint on exposed skin.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$10-25',
    },
  ],
  scent: [
    {
      name: 'No Scent Control Needed',
      description:
        'Turkeys rely almost entirely on sight and hearing. Scent control is not necessary for turkey hunting, allowing focus on camouflage and calling.',
      category: 'scent',
      seasonalRelevance: 'low',
      priceRange: '$0',
    },
  ],
  calls: [
    {
      name: 'Slate Call (HS Strut)',
      description:
        'Friction call with slate striking surface. Produces natural-sounding yelps, clucks, and purrs. Excellent for beginning callers.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$25-50',
    },
    {
      name: 'Box Call (Lynch World Champion)',
      description:
        'Wooden or composite box call with excellent projection. Distinctive yelps and cutts carry long distances. Good option when more volume is needed.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$30-70',
    },
    {
      name: 'Diaphragm Calls (Primos)',
      description:
        'Hands-free mouth call for advanced callers. Allows complete hand movement for gun handling. Multiple tones available in single call.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$15-40',
    },
    {
      name: 'Locator Call (Crow/Owl)',
      description:
        'Produces crow caws or owl hoots to locate roosting turkeys before dawn. Not turkey calls themselves, but tools for finding birds.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$15-35',
    },
  ],
  accessories: [
    {
      name: 'Turkey Vest (ALPS OutdoorZ)',
      description:
        'Specialized vest with padded backpack for sitting against trees. Integrated padded rest and pouch system for calls, shells, and decoys.',
      category: 'pack',
      seasonalRelevance: 'high',
      priceRange: '$80-150',
    },
    {
      name: 'Full-Body Decoy (Avian-X)',
      description:
        'Realistic life-sized hen decoy. Triggers visual response in distant gobbles. Position 10-15 yards from calling position.',
      category: 'decoy',
      seasonalRelevance: 'high',
      priceRange: '$80-140',
    },
    {
      name: 'Hen Decoy',
      description:
        'Companion to full-body decoy to create pair effect. Multiple hens draw aggressive gobblers checking for breeding opportunity.',
      category: 'decoy',
      seasonalRelevance: 'medium',
      priceRange: '$50-100',
    },
    {
      name: 'Ground Blind (Optional)',
      description:
        'Pop-up ground blind for additional concealment. Optional but helpful in open areas without natural cover.',
      category: 'blind',
      seasonalRelevance: 'medium',
      priceRange: '$60-130',
    },
  ],
  conditions:
    'Spring turkey season (April-May) means gobbles at dawn and increasing day length. Turkeys are most vocal and aggressive during peak mating season.',
  tips: [
    'Start with soft tree yelps before birds fly down from roost',
    'Set up within 100 yards of known roost but stay out of sight line',
    'Wait for gobblers to commit before showing decoys',
    'Quality locator calls help identify roosted birds in darkness',
    'In Maryland, only harvest males (gobblers) unless otherwise specified',
  ],
  amazonProducts: [],
};

/**
 * Fall turkey (October)
 * Focus: Disassociation calls, lightweight setup
 */
const TURKEY_FALL: HuntingGearRecommendation = {
  id: 'turkey-fall',
  species: 'turkey',
  season: 'fall',
  months: [10],
  method: 'any',
  clothing: [
    {
      name: 'Lightweight Camo',
      description:
        'Early season camo similar to archery deer setup. October is warm with thick cover. Brown and tan patterns work better than spring patterns.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$80-150',
    },
    {
      name: 'Face Mask/Paint',
      description:
        'Hide your face completely. Fall turkeys are less aggressive but still have excellent eyesight.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$8-25',
    },
  ],
  scent: [
    {
      name: 'Not Required',
      description:
        'Scent control is unnecessary for turkey hunting of any season.',
      category: 'scent',
      seasonalRelevance: 'low',
      priceRange: '$0',
    },
  ],
  calls: [
    {
      name: 'Kee-kee Run Call',
      description:
        'Replicates young-of-the-year turkeys separated from flock. Triggers response in hens trying to reunite with poults. Very effective in fall.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$20-40',
    },
    {
      name: 'Assembly Yelp',
      description:
        'Contact call used by flocks to locate each other. Use when you locate a flock then break it up.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$20-40',
    },
  ],
  accessories: [
    {
      name: 'Lightweight Backpack',
      description:
        'Minimal gear needed for fall turkey hunting. Pack calls, water, and small first aid kit only.',
      category: 'pack',
      seasonalRelevance: 'medium',
      priceRange: '$40-80',
    },
  ],
  conditions:
    'Fall turkey (October) means broken flocks of young birds and hens post-breeding. Turkeys are less vocal and more cautious than spring birds.',
  tips: [
    'Locate and scatter a flock in morning, then call and ambush birds as they reassemble',
    'Kee-kee run calls are your primary tool — replicate separated poults',
    'Movement patterns are less predictable than spring — flexibility is key',
    'Fall hunting is physically demanding — locate turkeys before dark and return in morning',
    'Harvest regulations differ from spring — check Maryland DNR for species/sex specifics',
  ],
  amazonProducts: [],
};

/**
 * Waterfowl — ducks and geese (November-January)
 * Focus: Waders, decoys, blinds, calls
 */
const WATERFOWL_DUCKS_GEESE: HuntingGearRecommendation = {
  id: 'waterfowl-ducks-geese',
  species: 'waterfowl',
  season: 'season',
  months: [11, 12, 1],
  method: 'any',
  clothing: [
    {
      name: 'Waders (Drake Waterfowl EST)',
      description:
        'Insulated neoprene waders for standing in cold water. EST (Elite Shelter Technology) provides maximum waterproofing and insulation. Top-of-the-line for serious waterfowlers.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$300-450',
    },
    {
      name: 'Waterproof Insulated Jacket',
      description:
        'Breathable outer layer with insulation. Must shed water while maintaining warm core. Synthetic insulation works better than down when wet.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$150-300',
    },
    {
      name: 'Neoprene Gloves',
      description:
        'Thick neoprene for cold water handling. Dexterity is critical for loading shells and operating firearm in cold, wet conditions.',
      category: 'clothing',
      seasonalRelevance: 'high',
      priceRange: '$20-50',
    },
  ],
  scent: [
    {
      name: 'Not Required',
      description:
        'Waterfowl rely on sight and sound. Scent control is irrelevant for duck and goose hunting.',
      category: 'scent',
      seasonalRelevance: 'low',
      priceRange: '$0',
    },
  ],
  calls: [
    {
      name: 'Duck Call (RNT Daisy Cutter)',
      description:
        'Premium duck call for mallard, pintail, and sprig species. RNT is industry standard. Master basic quacking and comeback calls.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$60-120',
    },
    {
      name: 'Goose Call (Zink Nothing But Green)',
      description:
        'Specialized goose call for Canada and snow geese. Lower pitch than duck calls. Practice talking to the call before hunting.',
      category: 'call',
      seasonalRelevance: 'high',
      priceRange: '$80-140',
    },
    {
      name: 'Teal Whistle',
      description:
        'High-pitched whistle for blue-winged and green-winged teal. Different sound than mallards. Specific for dabbling duck species.',
      category: 'call',
      seasonalRelevance: 'medium',
      priceRange: '$15-30',
    },
  ],
  accessories: [
    {
      name: 'Layout Blind (Avery Finisher)',
      description:
        'Boat-in layout blind for open water hunting (Chesapeake Bay). Comfortable, waterproof, and built for multiple hunters.',
      category: 'blind',
      seasonalRelevance: 'high',
      priceRange: '$200-400',
    },
    {
      name: 'Decoy Spread (Minimum Dozen)',
      description:
        'At least 12-24 decoys in varied positions (sleeping, alert, feeding). More decoys = more effective. Use species-specific silhouettes.',
      category: 'decoy',
      seasonalRelevance: 'high',
      priceRange: '$100-300',
    },
    {
      name: 'Motion Decoy (MOJO)',
      description:
        'Motorized spinning decoy adding movement and realism. Particularly effective for geese. Increases attention and commitment from passing flocks.',
      category: 'decoy',
      seasonalRelevance: 'medium',
      priceRange: '$40-100',
    },
    {
      name: 'Blind Bag',
      description:
        'Waterproof duffel for transporting gear to blind. Should hold shells, calls, gloves, snacks, and miscellaneous equipment.',
      category: 'pack',
      seasonalRelevance: 'medium',
      priceRange: '$50-150',
    },
  ],
  conditions:
    'Maryland waterfowl seasons vary by location (tidal vs. nontidal). Peak season is November-December during migration. Scout the "X" evening before.',
  tips: [
    'Scout the evening before to identify active feeding and roosting areas',
    'Maryland tidal waterfowl regulations differ from nontidal — verify current rules',
    'Arrive early to set decoys before legal shooting time',
    'Stay hidden until ducks commit and begin landing approach',
    'Practice calling extensively before season — poor calling repels more birds than silence',
  ],
  amazonProducts: [],
};

/**
 * Black bear (October)
 * Focus: Sturdy setup, bear spray, game management
 */
const BLACK_BEAR: HuntingGearRecommendation = {
  id: 'black-bear',
  species: 'bear',
  season: 'season',
  months: [10],
  method: 'any',
  clothing: [
    {
      name: 'Standard Camo (Archery Deer Quality)',
      description:
        'Use the same camouflage system as archery deer hunting. October conditions are similar. Sturdy boots for rough, steep terrain.',
      category: 'camo',
      seasonalRelevance: 'high',
      priceRange: '$150-250',
    },
    {
      name: 'Sturdy Hiking Boots',
      description:
        'Maryland bear hunting occurs in mountainous western terrain. Ankle support, grip, and durability are critical. Not trail shoes.',
      category: 'boot',
      seasonalRelevance: 'high',
      priceRange: '$120-220',
    },
  ],
  scent: [
    {
      name: 'Attractants Prohibited in Maryland',
      description:
        'Maryland DNR prohibits use of scent attractants for bear hunting. Use scent elimination instead. Focus on stand placement and wind.',
      category: 'scent',
      seasonalRelevance: 'high',
      priceRange: '$20-50',
    },
  ],
  calls: [
    {
      name: 'Predator Call (Optional)',
      description:
        'Predator calls (rabbit distress, fawn bleats) can occasionally bring bears in. Secondary tool compared to stand placement.',
      category: 'call',
      seasonalRelevance: 'low',
      priceRange: '$20-40',
    },
  ],
  accessories: [
    {
      name: 'Bear Spray (Counter Assault)',
      description:
        'Essential safety equipment. 10.2 oz canister of capsaicin spray. Mount on belt where instantly accessible. Practice draw.',
      category: 'accessory',
      seasonalRelevance: 'high',
      priceRange: '$40-60',
    },
    {
      name: 'Tree Stand (Summit Viper SD)',
      description:
        'Lightweight self-climbing stand for steep mountain terrain. Position high (15+ feet) when targeting bears.',
      category: 'stand',
      seasonalRelevance: 'high',
      priceRange: '$300-450',
    },
    {
      name: 'Game Bags for Pack-Out',
      description:
        'Bears are heavy. Plan for quartering and carrying meat in stages. Quality game bags prevent meat spoilage.',
      category: 'pack',
      seasonalRelevance: 'high',
      priceRange: '$30-80',
    },
  ],
  conditions:
    'Maryland black bear season is limited draw in October. Success depends on location in western mountains (Garrett, Allegany counties) with known bear populations.',
  tips: [
    'Maryland bear season is limited draw — apply early and check application deadlines',
    'Focus on oak ridges with mast production (acorns). Bears follow food resources.',
    'Position stands high and downwind from likely approach routes',
    'Bear spray is not optional — always carry on your person',
    'Successful bear hunters scout thoroughly in summer/early fall to locate bears before season',
  ],
  amazonProducts: [],
};

/**
 * Complete hunting gear recommendations array
 * Includes all species and seasons for Maryland hunting
 */
export const HUNTING_GEAR_RECOMMENDATIONS: HuntingGearRecommendation[] = [
  WHITETAIL_ARCHERY_EARLY,
  WHITETAIL_ARCHERY_RUT,
  WHITETAIL_FIREARMS,
  WHITETAIL_MUZZLELOADER_LATE,
  TURKEY_SPRING,
  TURKEY_FALL,
  WATERFOWL_DUCKS_GEESE,
  BLACK_BEAR,
];

/**
 * Get hunting gear recommendations for a specific species and season
 *
 * @param species - Target species (whitetail, turkey, waterfowl, bear)
 * @param season - Season type (archery_early, archery_rut, firearms, late_season, spring, fall, season)
 * @returns HuntingGearRecommendation or undefined if not found
 *
 * @example
 * const gear = getHuntingGear('whitetail', 'archery_early');
 * // Returns recommendation with lightweight camo, scent control, and calls
 */
export function getHuntingGear(
  species: string,
  season: string
): HuntingGearRecommendation | undefined {
  return HUNTING_GEAR_RECOMMENDATIONS.find(
    (rec) => rec.species === species && rec.season === season
  );
}

/**
 * Get all hunting gear recommendations applicable to a specific month
 *
 * @param month - Month number (1-12)
 * @returns Array of HuntingGearRecommendation objects for that month
 *
 * @example
 * const novemberGear = getGearForMonth(11);
 * // Returns firearms and archery rut recommendations
 */
export function getGearForMonth(
  month: number
): HuntingGearRecommendation[] {
  return HUNTING_GEAR_RECOMMENDATIONS.filter((rec) =>
    rec.months.includes(month)
  );
}

/**
 * Get specific gear items by species, season, and category
 *
 * @param species - Target species
 * @param season - Season type
 * @param category - Gear category (clothing, scent, call, optics, stand, pack, boot, decoy, blind, accessory)
 * @returns Array of GearItem objects in the requested category
 *
 * @example
 * const scent = getGearByCategory('whitetail', 'archery_early', 'scent');
 * // Returns Ozonics, Dead Down Wind, and scent-free detergent
 */
export function getGearByCategory(
  species: string,
  season: string,
  category: string
): GearItem[] {
  const recommendation = getHuntingGear(species, season);
  if (!recommendation) return [];

  const categoryMapping: Record<string, GearItem[]> = {
    clothing: recommendation.clothing,
    scent: recommendation.scent,
    call: recommendation.calls,
    accessories: recommendation.accessories,
  };

  const items = categoryMapping[category] || [];
  return items.filter((item) => item.category === category);
}
