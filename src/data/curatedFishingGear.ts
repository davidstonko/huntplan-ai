/**
 * curatedFishingGear.ts — David's curated fishing gear recommendations for Maryland
 *
 * Personal gear picks organized by fishing type:
 * 1. Fly Fishing — Gunpowder Falls / Central MD small rivers
 * 2. Bass & Freshwater Fishing
 * 3. Chesapeake Bay Fishing
 * 4. Saltwater — Ocean City / Assateague
 *
 * All Amazon links use affiliate tag: mdoutdoors1-20
 * Non-Amazon items link to manufacturer or Bass Pro / Cabela's
 *
 * NOTE: These are placeholder recommendations. David will review and update
 * with his actual preferences and specific product links.
 *
 * @module Data
 */

const TAG = 'mdoutdoors1-20';

/** Helper to build Amazon affiliate URL from ASIN */
function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

export interface CuratedGearItem {
  /** Display name */
  name: string;
  /** Brief description or why it's recommended */
  description: string;
  /** Subcategory within the loadout (e.g., 'Rods', 'Flies', 'Wading Gear') */
  subcategory: string;
  /** Approximate price range string */
  price: string;
  /** Affiliate URL (Amazon preferred) */
  url: string;
  /** Whether this is a core essential vs nice-to-have */
  essential: boolean;
  /** Optional personal note from David */
  note?: string;
  /**
   * 2026-04-26: when true, this item is one of David's personal picks —
   * actual gear he uses on Maryland water. Surfaces a "By David" badge and
   * a stronger card accent in StarterGearScreen.
   */
  creatorPick?: boolean;
  /**
   * 2026-04-26: optional sub-style tag within a category. Lets the UI
   * filter further than the top-level category picker (e.g. fly fishing
   * splits into euro nymphing vs conventional vs gear-shared-by-both;
   * whitetail splits into saddle vs treestand vs both). Standard values:
   *   - Fly fishing: 'euro' | 'conventional' | 'both'
   *   - Whitetail:   'saddle' | 'treestand' | 'both'
   * Items without a subStyle render in every sub-style filter view.
   */
  subStyle?: string;
}

export interface CuratedGearCategory {
  /** Category ID */
  id: string;
  /** Display title */
  title: string;
  /** Short description of the fishing type */
  description: string;
  /** Emoji icon */
  icon: string;
  /** Category-level notes or intro text */
  intro: string;
  /** Gear items in this category */
  items: CuratedGearItem[];
}

// ═══════════════════════════════════════════════════════════
// 1. FLY FISHING — GUNPOWDER FALLS / CENTRAL MD
// ═══════════════════════════════════════════════════════════

const flyFishingGunpowder: CuratedGearCategory = {
  id: 'fly_gunpowder',
  title: 'Fly Fishing — Gunpowder & Central MD',
  description: 'Euro nymphing & dry fly fishing on the Gunpowder Falls, its tributaries, and other small rivers in central Maryland.',
  icon: '🪰',
  intro: 'The Gunpowder Falls is Maryland\'s premier trout stream — a tailwater that fishes well year-round. I run a 3-rod quiver: a 10.5\' 3wt for euro nymphing (my go-to 80% of the time), a 9\' 5wt for standard fly fishing, and a backup TFO. Here\'s everything you need to get started.',
  items: [
    // ── Sling Packs ──────────────────────────────────────────────
    {
      name: 'Patagonia Atom Sling 8L',
      description: "David's everyday sling. Light, comfortable for a 6-hour wade, and just enough room for two fly boxes, tippet, leaders, nippers, and a water bottle.",
      subcategory: 'Sling Pack',
      price: '$80–110',
      url: `https://www.amazon.com/s?k=Patagonia+Atom+Sling+8L&tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'My go-to sling pack for Maryland trout streams. Doesn\'t get in the way when you\'re wading deep.',
    },
    {
      name: 'Fishpond Summit Fishing Sling Pack',
      description: 'Bigger, more pockets, water-resistant. The right call if you carry more than one box of dries plus a streamer box plus a rain jacket.',
      subcategory: 'Sling Pack',
      price: '$150–180',
      url: `https://www.amazon.com/dp/B09M99PJ8R?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'both',
      note: 'Alternative to the Patagonia — covers everything when I\'m doing a longer day or carrying a wet/dry change of layers.',
    },

    // ── Wading Gear ──────────────────────────────────────────────
    {
      name: 'Orvis Clearwater Chest Waders',
      description: "David's everyday waders. Breathable, durable, and the price/value ratio is best-in-class.",
      subcategory: 'Wading Gear',
      price: '$250–350',
      url: `https://www.amazon.com/dp/B0DX7FJMXY?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'Held up through 4 seasons on the Gunpowder. Don\'t spend more until you\'ve outgrown these.',
    },
    {
      name: 'Korkers Wading Boots — Vibram Sole',
      description: 'Interchangeable soles (felt or studded) so the same boot works on slick MD limestone bottoms AND rocky high-grade water.',
      subcategory: 'Wading Gear',
      price: '$180–230',
      url: `https://www.amazon.com/dp/B09HS8TXHC?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'Swap to studs for the Big Gunpowder, felt for tributary creeks. Single best gear upgrade I\'ve made.',
    },

    // ── Nets & Releases ─────────────────────────────────────────
    {
      name: 'SF Magnetic Net Release',
      description: 'Cheap, strong magnetic clip that holds the net to your sling and releases instantly when you need it.',
      subcategory: 'Nets & Releases',
      price: '$10–15',
      url: `https://www.amazon.com/dp/B09126NV1L?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'Get this. The cord-style clips are slow when fish are on. Magnetic is two-handed-fast.',
    },
    {
      name: 'RHINR Rubber Trout Net',
      description: 'Solid mid-priced rubber net — gentler on trout than nylon, basket the right size for stocked & wild MD trout.',
      subcategory: 'Nets & Releases',
      price: '$25–40',
      url: `https://www.amazon.com/dp/B0D2HLJYQD?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'My standard net. If you\'re fishing catch-and-release water (most of MD), rubber nets are non-negotiable.',
    },
    {
      name: 'Fishpond Nomad Emerger Net (Brown Trout)',
      description: 'Carbon-fiber landing net with a beautiful trout graphic. Light, indestructible, and the best gift for a serious fly fisher.',
      subcategory: 'Nets & Releases',
      price: '$130–170',
      url: `https://www.amazon.com/dp/B0GCNY1K3N?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'both',
      note: 'Splurge net. Great gift idea for a serious fly fisher in your life.',
    },

    // ── Rods & Reels ────────────────────────────────────────────
    {
      name: 'Redington Crosswater Combo (5wt)',
      description: 'Budget rod-and-reel combo that covers most freshwater fly fishing in Maryland. Comes pre-spooled.',
      subcategory: 'Rods & Reels',
      price: '$130–170',
      url: `https://www.amazon.com/dp/B0FH7CJZPS?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'If you\'re just getting started, this combo will fish 80% of MD freshwater out of the box.',
    },
    {
      name: 'Redington Path Combo — 10\' 3wt (Euro Nymphing Starter)',
      description: 'Ten-foot 3wt rod and matched reel — the right tool for euro nymphing the Gunpowder, Patapsco, and Big Hunting.',
      subcategory: 'Rods & Reels',
      price: '$200–250',
      url: `https://www.amazon.com/dp/B09XFDVW3B?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'euro',
      note: 'Starter euro nymphing setup. Long, light, and the action is forgiving while you learn.',
    },
    {
      name: 'Echo Shadow II — 10\' 3wt',
      description: "David's actual euro nymphing rod. Ten foot, 3wt, paired with the Echo Base reel below.",
      subcategory: 'Rods & Reels',
      price: '$300–350',
      url: `https://www.amazon.com/dp/B00TUIYPVI?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'euro',
      note: 'My euro nymphing rod. 10 ft 3wt is the sweet spot for MD trout streams — long enough to high-stick from the bank, light enough to throw small nymphs all day.',
    },
    {
      name: 'Echo Base Fly Reel',
      description: 'Basic reel that works on 99% of euro nymphing in Maryland. Pairs with the Echo Shadow II.',
      subcategory: 'Rods & Reels',
      price: '$80–110',
      url: `https://www.amazon.com/dp/B01JN6OY80?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'euro',
      note: 'My euro nymphing reel. You don\'t need a high-end drag for trout — this gets the job done.',
    },
    {
      name: 'Sage R8 Core Fly Rod',
      description: "David's high-end conventional fly rod. Best-in-class casting feel from a brand that\'s been making MD-class trout rods for decades.",
      subcategory: 'Rods & Reels',
      price: '$950–1100',
      url: 'https://charliesflybox.com/products/sage-r8-core-fly-rods',
      essential: false,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'My high-end conventional fly rod. Worth saving up for once you know fly fishing sticks. Charlie\'s Fly Box has the best price.',
    },
    {
      name: 'Sage Shift LT Reel (5/6 wt)',
      description: 'Premium reel with a sealed drag — pairs with the R8 Core for streamers, big dries, and the occasional smallmouth.',
      subcategory: 'Rods & Reels',
      price: '$400–500',
      url: 'https://farbank.com/products/sage-shift-lt-5-6',
      essential: false,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'My high-end fly reel for the R8. Sealed drag means it survives a dunk, which it has.',
    },

    // ── Fly Lines ───────────────────────────────────────────────
    {
      name: 'Rio Premier Gold Fly Line (WF5F)',
      description: "David's favorite fly line for Maryland — works for everything except euro nymphing. Slick, durable, casts cleanly off a 5wt.",
      subcategory: 'Fly Lines',
      price: '$90–110',
      url: `https://www.amazon.com/dp/B08B42VGD4?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'My favorite fly line for fly fishing in Maryland (except for euro nymphing).',
    },
    {
      name: 'RIO Euro Nymph Line (FIPS)',
      description: 'Thin, low-stretch nymphing line that mounts on the Echo Base or any standard reel. Built specifically for the Euro/competition style.',
      subcategory: 'Fly Lines',
      price: '$70–90',
      url: `https://www.amazon.com/dp/B014I43RIK?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'euro',
      note: 'My euro nymphing line. Spool this on the Echo Base reel.',
    },

    // ── Leaders & Tippet ────────────────────────────────────────
    {
      name: 'Scientific Anglers Absolute Nymph Leader',
      description: 'Pre-tied euro nymph leader — saves you 20 minutes of blood-knotting at the truck.',
      subcategory: 'Leaders & Tippet',
      price: '$15–20',
      url: `https://www.amazon.com/dp/B09M5Z23M6?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'euro',
      note: 'My euro nymphing leader. Tie 6X Fluoroflex tippet to the bottom and you\'re fishing.',
    },
    {
      name: 'SF Tapered Leader 9ft 5X',
      description: 'Standard tapered leader for dry-fly and dry-dropper rigs. 9ft, 5X is the everyday MD trout setup.',
      subcategory: 'Leaders & Tippet',
      price: '$8–12',
      url: `https://www.amazon.com/dp/B09MRZW78R?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'My standard leader. Buy a 4-pack — they break, snag, and tangle.',
    },
    {
      name: 'Rio Fluoroflex Tippet (3X / 4X / 5X)',
      description: 'Fluorocarbon tippet — invisible underwater, abrasion-resistant, sinks. The right call for nymphs and subsurface streamers.',
      subcategory: 'Leaders & Tippet',
      price: '$15–20 per spool',
      url: `https://www.amazon.com/dp/B08S952FNB?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'My standard tippet for nymphs/streamers. 5X for #16-20 nymphs, 4X for #14, 3X for streamers.',
    },
    {
      name: 'Rio Fluoroflex Tippet (6X)',
      description: '6X for the smallest dries and midges — sulphurs, BWOs, zebra midges on the Gunpowder.',
      subcategory: 'Leaders & Tippet',
      price: '$15–20',
      url: `https://www.amazon.com/dp/B08S63FYN7?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'both',
      note: 'For midge work and the smallest sulphurs. If your tippet looks like spider silk, you have the right one.',
    },
    {
      name: 'Scientific Anglers Tippet Rings (Small)',
      description: 'Tiny welded rings between leader and tippet — extends leader life dramatically and makes rigging changes a 10-second job.',
      subcategory: 'Leaders & Tippet',
      price: '$8–10',
      url: `https://www.amazon.com/dp/B07XBV7CS4?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'I won\'t fish without these anymore. Saves your tapered leader and makes tippet changes near-instant.',
    },

    // ── Fly Boxes ───────────────────────────────────────────────
    {
      name: 'Fishpond Tacky Double Haul Fly Box',
      description: 'Silicone slit-foam fly box that holds barbed and barbless hooks securely. The Tacky inserts beat foam.',
      subcategory: 'Fly Boxes',
      price: '$30–40',
      url: `https://www.amazon.com/dp/B08N8LLQCD?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'My main fly box. Two of these cover everything I carry on a typical day.',
    },

    // ── Core Maryland Flies ─────────────────────────────────────
    {
      name: 'Chubby Chernobyl Assortment (#10–14)',
      description: 'High-floating attractor that doubles as a strike indicator on a dry-dropper rig. Maryland sulphur season staple.',
      subcategory: 'Flies',
      price: '$20–30',
      url: `https://www.amazon.com/dp/B0D565XV8H?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'Floats anything you tie under it. My #1 dry/dropper indicator fly on the Gunpowder.',
    },
    {
      name: 'Elk Hair Caddis Assortment (#14–18)',
      description: "Workhorse dry fly for MD trout streams. Match the hatch in summer or fish blind any time.",
      subcategory: 'Flies',
      price: '$15–25',
      url: `https://www.amazon.com/dp/B074D1LLS6?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'conventional',
      note: 'Caddis hatches happen on the Gunpowder May–October. This fly catches fish even when nothing is hatching.',
    },
    {
      name: 'Black & Olive Zebra Midge (#18 / #20)',
      description: 'Tiny tungsten-bead nymph that catches Gunpowder browns year-round, especially January–March.',
      subcategory: 'Flies',
      price: '$10–18',
      url: `https://www.amazon.com/dp/B07XPDTCNY?tag=${TAG}`,
      essential: true,
      creatorPick: true,
      subStyle: 'both',
      note: 'When nothing else works, drop a #20 zebra midge under a chubby. Black or olive — carry both.',
    },
    {
      name: 'Zebra Midge — Thor Outdoor Pack',
      description: 'Bulk zebra midge assortment if you go through a lot of them (and you will — they catch fish, but they also break off in trees).',
      subcategory: 'Flies',
      price: '$10–15',
      url: `https://www.amazon.com/dp/B0DTSDK7DB?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'both',
      note: 'Cheap re-stock pack for when you lose a dozen midges in one snag-up afternoon. Don\'t pretend it doesn\'t happen.',
    },
    {
      name: 'Ventures Fly Co — Maryland Starter Assortment',
      description: 'Solid 40-fly assortment covering the rest of what you need on MD trout streams (terrestrials, nymphs, attractors).',
      subcategory: 'Flies',
      price: '$30–40',
      url: `https://www.amazon.com/dp/B0813Z3LWQ?tag=${TAG}`,
      essential: false,
      creatorPick: true,
      subStyle: 'both',
      note: 'Solid starter box on the remainder of flies. If you\'re building a kit from scratch, start here.',
    },
    {
      name: 'Leatherman Signal Multi-Tool',
      description: 'Pliers, scissors, knife, ferro rod, and small saw in one. Cross-category utility — works on tippet knots, fly mods, gear breakdowns.',
      subcategory: 'Tools & Utility',
      price: '$100–150',
      url: `https://www.amazon.com/s?k=Leatherman+Signal+Multi-Tool&tag=${TAG}`,
      essential: false,
      subStyle: 'both',
    },
    {
      name: 'Loon Outdoors Rogue Mitten Scissor Forceps',
      description: 'All-in-one nipper, hook-out, and tippet snip. Slips in a sling pocket; doesn\'t snag.',
      subcategory: 'Tools & Utility',
      price: '$25–35',
      url: `https://www.amazon.com/s?k=Loon+Outdoors+Rogue+Mitten+Scissor+Forceps&tag=${TAG}`,
      essential: false,
      subStyle: 'both',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 2. BASS & FRESHWATER FISHING
// ═══════════════════════════════════════════════════════════

const bassFreshwater: CuratedGearCategory = {
  id: 'bass_freshwater',
  title: 'Bass & Freshwater Fishing',
  description: 'Largemouth, smallmouth, and panfish on Maryland\'s lakes, ponds, and rivers.',
  icon: '🐟',
  intro: 'Maryland has incredible freshwater fishing — Deep Creek Lake, Liberty Reservoir, Triadelphia, Loch Raven, and the Potomac all hold trophy bass. Here\'s a complete setup to get you on the water.',
  items: [

    {
      name: 'Ugly Stik GX2 Medium-Heavy Spinning Combo 6\'6"',
      description: 'Bulletproof spinning setup for soft plastics, jigs, and finesse techniques. Great starter combo.',
      subcategory: 'Rods & Reels',
      price: '$50–80',
      url: `https://www.amazon.com/s?k=Ugly+Stik+GX2+Medium+Heavy+Spinning+Combo&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'PowerPro Spectra Braided Line 30lb',
      description: 'Main line for both setups. Braid for sensitivity and hooksets.',
      subcategory: 'Line',
      price: '$20–30',
      url: `https://www.amazon.com/s?k=PowerPro+Spectra+Braided+Line+30lb&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Plano 3700 Tackle Storage',
      description: 'Modular tackle organizer with adjustable dividers.',
      subcategory: 'Storage & Tools',
      price: '$30–50',
      url: `https://www.amazon.com/s?k=Plano+3700+Tackle+Storage&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'KastKing Fishing Pliers with Sheath',
      description: 'Split ring pliers, line cutter, hook remover all in one.',
      subcategory: 'Storage & Tools',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=KastKing+Fishing+Pliers+with+Sheath&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Zoom Brush Hog (Green Pumpkin)',
      description: 'Creature bait for flipping and pitching into cover. Bass can\'t resist it.',
      subcategory: 'Soft Plastics',
      price: '$5–8 (8-pack)',
      url: `https://www.amazon.com/s?k=Zoom+Brush+Hog+Green+Pumpkin&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Strike King KVD Square Bill Crankbait',
      description: 'Shallow-running crankbait that deflects off cover. Cast it parallel to banks.',
      subcategory: 'Hard Baits',
      price: '$6–10',
      url: `https://www.amazon.com/s?k=Strike+King+KVD+Square+Bill+Crankbait&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Booyah Pond Magic Spinnerbait',
      description: 'Compact spinnerbait sized for MD ponds and rivers. Cast and retrieve — simple and effective.',
      subcategory: 'Hard Baits',
      price: '$5–8',
      url: `https://www.amazon.com/s?k=Booyah+Pond+Magic+Spinnerbait&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Rebel Pop-R Topwater Popper',
      description: 'Walk-the-dog topwater. Fish it early morning and evening for explosive strikes.',
      subcategory: 'Hard Baits',
      price: '$6–9',
      url: `https://www.amazon.com/s?k=Rebel+Pop+R+Topwater+Popper&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Booyah Pad Crasher Frog',
      description: 'Weedless topwater frog for lily pads and heavy cover.',
      subcategory: 'Hard Baits',
      price: '$7–10',
      url: `https://www.amazon.com/s?k=Booyah+Pad+Crasher+Frog&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Seaguar Red Label Fluorocarbon Leader 12lb',
      description: 'Fluorocarbon leader for clear water stealth. Tie 3–4\' leader to your braid.',
      subcategory: 'Line',
      price: '$8–15',
      url: `https://www.amazon.com/s?k=Seaguar+Red+Label+Fluorocarbon+Leader+12lb&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Jig Head Assortment (1/8oz – 3/8oz)',
      description: 'Various sizes for ned rigs, swim jigs, and shaky heads.',
      subcategory: 'Terminal Tackle',
      price: '$10–18',
      url: amazonUrl('B08K7DN42T'),
      essential: true,
    },
    {
      name: 'EWG Worm Hooks (3/0, 4/0)',
      description: 'Extra-wide gap hooks for Texas rigging soft plastics.',
      subcategory: 'Terminal Tackle',
      price: '$5–10',
      url: `https://www.amazon.com/s?k=EWG+Worm+Hooks+3/0+4/0&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Tungsten Bullet Weights (1/4oz, 3/8oz)',
      description: 'Tungsten is smaller and more sensitive than lead. Essential for Texas rigs.',
      subcategory: 'Terminal Tackle',
      price: '$10–15',
      url: `https://www.amazon.com/s?k=Tungsten+Bullet+Weights+1/4oz+3/8oz&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Abu Garcia Revo X Baitcasting Combo 7\'',
      description: 'Mid-range baitcaster for crankbaits, spinnerbaits, and topwater. Low profile, smooth cast.',
      subcategory: 'Rods & Reels',
      price: '$130–180',
      url: `https://www.amazon.com/s?k=Abu+Garcia+Revo+X+Baitcasting+Combo+7&tag=${TAG}`,
      essential: true,
      note: 'If you\'re new to baitcasting, the Revo X has a magnetic brake that helps prevent backlash.',
    },
    {
      name: 'Yamamoto Senko 5" (Green Pumpkin)',
      description: 'The most versatile bass lure ever made. Wacky rig, Texas rig, Neko rig — it does everything.',
      subcategory: 'Soft Plastics',
      price: '$7–10 (10-pack)',
      url: `https://www.amazon.com/s?k=Yamamoto+Senko+5+Green+Pumpkin&tag=${TAG}`,
      essential: true,
      note: 'Green pumpkin is the universal color for MD waters. Also grab watermelon and black/blue.',
    },
    {
      name: 'Berkley PowerBait Variety Pack',
      description: 'Multi-pack of soft plastics covering bass, panfish, and crappie. Cheap, consumable, high re-purchase rate.',
      subcategory: 'Lures & Soft Plastics',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=Berkley+PowerBait+Variety+Pack&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'Shimano Sienna FE Spinning Combo',
      description: 'Budget rod-and-reel combo at the wall in every Bass Pro. Light enough for crappie, strong enough for largemouth.',
      subcategory: 'Rods & Reels',
      price: '$60–85',
      url: `https://www.amazon.com/s?k=Shimano+Sienna+FE+Spinning+Combo&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'Crappie Jig Assortment (1/16oz, multi-color)',
      description: 'Maryland reservoirs (Loch Raven, Triadelphia, Liberty) hold abundant crappie. Tiny jigs in 1/16-1/32oz are the standard rig.',
      subcategory: 'Lures & Soft Plastics',
      price: '$8–15',
      url: `https://www.amazon.com/s?k=crappie+jig+1/16oz+assortment+50+pack&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 3. CHESAPEAKE BAY FISHING
// ═══════════════════════════════════════════════════════════

const chesapeakeBay: CuratedGearCategory = {
  id: 'chesapeake_bay',
  title: 'Chesapeake Bay Fishing',
  description: 'Striped bass, perch, catfish, and bluefish on the Chesapeake Bay and tidal tributaries.',
  icon: '⚓',
  intro: 'The Chesapeake Bay is one of the best fisheries on the East Coast. Whether you\'re jigging for stripers from a boat or soaking bait from shore, here\'s what you need.',
  items: [
    // ── Rods & Reels ──
    {
      name: 'Penn Battle III 4000 Spinning Combo 7\'',
      description: 'Workhorse saltwater combo. Sealed drag handles the Bay\'s big fish.',
      subcategory: 'Rods & Reels',
      price: '$130–180',
      url: `https://www.amazon.com/s?k=Penn+Battle+III+4000+Spinning+Combo+7&tag=${TAG}`,
      essential: true,
      note: 'The Penn Battle is the most popular saltwater reel on the Bay for a reason — reliable, affordable, powerful.',
    },
    {
      name: 'Ugly Stik Tiger Elite 7\' Medium-Heavy',
      description: 'Dedicated bait rod for live-lining and bottom fishing. Built like a tank.',
      subcategory: 'Rods & Reels',
      price: '$60–90',
      url: `https://www.amazon.com/s?k=Ugly+Stik+Tiger+Elite+7+Medium+Heavy&tag=${TAG}`,
      essential: false,
    },

    // ── Lures ──
    {
      name: 'Spro Bucktail Jig 1oz (White/Chartreuse)',
      description: 'The #1 striper lure in the Chesapeake. Vertical jig or cast and retrieve.',
      subcategory: 'Lures',
      price: '$5–9',
      url: `https://www.amazon.com/s?k=Spro+Bucktail+Jig+1oz+White+Chartreuse&tag=${TAG}`,
      essential: true,
      note: 'White and chartreuse are the money colors. Carry 1oz and 1.5oz for different depths.',
    },
    {
      name: 'Hogy Swimbaits 7" (White)',
      description: 'Soft paddle-tail swimbait on a jig head. Imitates bunker and perch.',
      subcategory: 'Lures',
      price: '$8–15 (3-pack)',
      url: `https://www.amazon.com/s?k=Hogy+Swimbaits+7+White&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Heddon Super Spook Topwater (Bone)',
      description: 'When stripers are blitzing on the surface, nothing beats a walk-the-dog topwater.',
      subcategory: 'Lures',
      price: '$8–12',
      url: `https://www.amazon.com/s?k=Heddon+Super+Spook+Topwater+Bone&tag=${TAG}`,
      essential: true,
    },

    // ── Bait Fishing ──
    {
      name: 'Owner Mutu Light Circle Hooks (5/0, 7/0)',
      description: 'Circle hooks are required for striped bass in the Bay. These are the gold standard.',
      subcategory: 'Bait Fishing',
      price: '$6–10',
      url: `https://www.amazon.com/s?k=Owner+Mutu+Light+Circle+Hooks+5/0+7/0&tag=${TAG}`,
      essential: true,
      note: 'Circle hooks are legally required for live/cut bait fishing for stripers in Maryland.',
    },
    {
      name: 'Fish Finder Rig (Bottom Rig Kit)',
      description: 'Pre-tied bottom rigs for perch, croaker, and catfish.',
      subcategory: 'Bait Fishing',
      price: '$8–15',
      url: amazonUrl('B09MKC9442'),
      essential: true,
    },
    {
      name: 'Bank Sinkers (2oz, 3oz, 4oz)',
      description: 'Heavy sinkers for tidal current. The Bay moves a lot of water.',
      subcategory: 'Bait Fishing',
      price: '$8–15',
      url: `https://www.amazon.com/s?k=Bank+Sinkers+2oz+3oz+4oz&tag=${TAG}`,
      essential: true,
    },

    // ── Electronics & Accessories ──
    {
      name: 'Garmin Striker 4 Portable Fish Finder',
      description: 'Compact, portable fish finder for kayak or small boat. Finds structure and bait.',
      subcategory: 'Electronics',
      price: '$130–180',
      url: `https://www.amazon.com/s?k=Garmin+Striker+4+Portable+Fish+Finder&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'Scotty Rod Holder with Clamp Mount',
      description: 'Adjustable rod holder for boat rails, kayaks, or pier railings.',
      subcategory: 'Accessories',
      price: '$25–40',
      url: `https://www.amazon.com/s?k=Scotty+Rod+Holder+with+Clamp+Mount&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'Frabill Bait Bucket 8qt',
      description: 'Aerated bait bucket for live spot, perch, or eels.',
      subcategory: 'Accessories',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=Frabill+Bait+Bucket+8qt&tag=${TAG}`,
      essential: false,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 4. SALTWATER — OCEAN CITY / ASSATEAGUE
// ═══════════════════════════════════════════════════════════

const saltwaterOC: CuratedGearCategory = {
  id: 'saltwater_oc',
  title: 'Saltwater — Ocean City & Assateague',
  description: 'Surf fishing and inshore saltwater fishing along Maryland\'s Atlantic coast.',
  icon: '🌊',
  intro: 'Ocean City and Assateague Island offer incredible surf fishing for stripers, bluefish, flounder, and drum. Fall is the prime season — the blitz run of stripers in November is legendary.',
  items: [
    // ── Rods & Reels ──
    {
      name: 'Penn Spinfisher VI 6500 Spinning Reel',
      description: 'Sealed body and spool for saltwater. Handles big surf fish with ease.',
      subcategory: 'Rods & Reels',
      price: '$150–200',
      url: `https://www.amazon.com/s?k=Penn+Spinfisher+VI+6500+Spinning+Reel&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Tsunami Airwave Elite Surf Rod 10\'',
      description: 'Great mid-range surf rod. Long enough to cast past the breakers, sensitive enough to feel bites.',
      subcategory: 'Rods & Reels',
      price: '$80–130',
      url: `https://www.amazon.com/s?k=Tsunami+Airwave+Elite+Surf+Rod+10&tag=${TAG}`,
      essential: true,
    },

    // ── Surf Tackle ──
    {
      name: 'Gotcha Plug (Silver, 1oz)',
      description: 'The classic OC surf lure. Cast it into breaking fish for bluefish and stripers.',
      subcategory: 'Lures',
      price: '$4–7',
      url: `https://www.amazon.com/s?k=Gotcha+Plug+Silver+1oz&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Fish Finder Surf Rig (Pre-tied)',
      description: 'Slide rig for bait fishing in the surf. Lets fish pick up bait without feeling weight.',
      subcategory: 'Rigs',
      price: '$5–10 (3-pack)',
      url: `https://www.amazon.com/s?k=Fish+Finder+Surf+Rig+Pre+tied&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Pompano Rigs (Multi-hook)',
      description: 'Tipped with Fishbites for pompano, kingfish, and spot.',
      subcategory: 'Rigs',
      price: '$5–8 (3-pack)',
      url: `https://www.amazon.com/s?k=Pompano+Rigs+Multi+hook&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Fishbites Bloodworm (Long Lasting)',
      description: 'Artificial bait strip that stays on the hook in the surf. Effective for all species.',
      subcategory: 'Bait',
      price: '$5–8',
      url: `https://www.amazon.com/s?k=Fishbites+Bloodworm+Long+Lasting&tag=${TAG}`,
      essential: true,
      note: 'Fishbites are a game-changer for surf fishing — you don\'t need to stop and re-bait every 10 minutes.',
    },
    {
      name: 'Pyramid Sinkers (3oz, 4oz, 5oz)',
      description: 'Grip the sand in heavy surf. You need heavier weights than you think.',
      subcategory: 'Terminal Tackle',
      price: '$8–15',
      url: `https://www.amazon.com/s?k=Pyramid+Sinkers+3oz+4oz+5oz&tag=${TAG}`,
      essential: true,
    },

    // ── Accessories ──
    {
      name: 'Sand Spike Rod Holder (Aluminum)',
      description: 'Sticks in the sand to hold your rod while bait fishing. Get at least two.',
      subcategory: 'Accessories',
      price: '$15–25',
      url: `https://www.amazon.com/s?k=Sand+Spike+Rod+Holder+Aluminum&tag=${TAG}`,
      essential: true,
    },
    {
      name: 'Sand Flea Rake',
      description: 'Dig your own bait — sand fleas (mole crabs) are the #1 natural surf bait.',
      subcategory: 'Accessories',
      price: '$25–40',
      url: `https://www.amazon.com/s?k=Sand+Flea+Rake&tag=${TAG}`,
      essential: false,
      note: 'Free bait is the best bait. Sand fleas are easy to find at the waterline on Assateague.',
    },
    {
      name: 'RTIC 45 Cooler',
      description: 'Heavy-duty cooler for your catch. Keeps ice for days.',
      subcategory: 'Accessories',
      price: '$180–230',
      url: `https://www.amazon.com/s?k=RTIC+45+Cooler&tag=${TAG}`,
      essential: false,
    },
    {
      name: 'Headlamp (Rechargeable, Red Light)',
      description: 'For early morning and nighttime surf sessions. Red light preserves night vision.',
      subcategory: 'Accessories',
      price: '$20–35',
      url: amazonUrl('B095GJD4H5'),
      essential: true,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 5. ROD & REEL COMBOS — VERSATILE FRESHWATER & SALTWATER
// ═══════════════════════════════════════════════════════════

const rodReelCombos: CuratedGearCategory = {
  id: 'fishing_rod_reel_combos',
  title: 'Rod & Reel Combos',
  description: 'Spinning, baitcasting, fly, and surf rod and reel combinations for various fishing styles.',
  icon: '🎣',
  intro: 'A good rod and reel combo is the foundation of any fishing setup. Spinning reels are versatile and beginner-friendly. Baitcasting reels offer precision for larger baits and lures. Fly reels demand skill but offer elegance and control. Surf rods handle heavy weights and large species. Match your rod and reel to your fishing style and target species.',
  items: [
    {
      name: 'Shimano Sienna FE Spinning Combo (2500)',
      description: 'Budget-friendly spinning combo for light freshwater fishing. 6.2:1 ratio, smooth drag.',
      subcategory: 'Spinning Combo',
      price: '$60–85',
      url: amazonUrl('B0B5L2Q8YD'),
      essential: true,
      note: 'Perfect starter combo for bass and panfish. Smooth performance at a great price.',
    },
    {
      name: 'Abu Garcia Revo SX Baitcasting Combo',
      description: 'Mid-range baitcaster for bass and pike. Reliable drag and good accuracy.',
      subcategory: 'Baitcasting Combo',
      price: '$120–170',
      url: amazonUrl('B08DCGGRKD'),
      essential: true,
      note: 'Baitcasters take practice but offer superior accuracy and feel.',
    },
    {
      name: 'Ugly Stik Tiger Spinning Rod + Shimano Sienna',
      description: 'Tough spinning combo rated for saltwater. Quality construction on a budget.',
      subcategory: 'Spinning Combo',
      price: '$80–120',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: true,
      note: 'Ugly Stiks are virtually indestructible. Great for kayak fishing and saltwater.',
    },
    {
      name: 'Penn Battle II Spinning Combo (2500)',
      description: 'Heavy-duty spinning combo for saltwater and large freshwater species.',
      subcategory: 'Spinning Combo',
      price: '$100–150',
      url: amazonUrl('B08CL7TVMB'),
      essential: false,
      note: 'Penn is the gold standard for saltwater. Battle II is reliable and affordable.',
    },
    {
      name: 'Sage Foundation 9\' 5wt Fly Rod + Orvis Reel Combo',
      description: 'Complete fly fishing setup for trout and panfish. Balanced and smooth.',
      subcategory: 'Fly Combo',
      price: '$300–450',
      url: amazonUrl('B086K2L7DD'),
      essential: false,
      note: 'Fly fishing requires practice but is incredibly rewarding on MD streams.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 6. TACKLE & LURES — SOFT PLASTICS, CRANKBAITS, JIGS
// ═══════════════════════════════════════════════════════════

const tackleAndLures: CuratedGearCategory = {
  id: 'fishing_tackle_lures',
  title: 'Tackle & Lures',
  description: 'Tackle boxes, soft plastic lures, crankbaits, jigs, and terminal tackle organization.',
  icon: '🪝',
  intro: 'A well-organized tackle box gets you on fish faster. Start with the basics: soft plastics for bass, crankbaits for depth, jigs for bottom feeding. Learn to match lure color and action to water conditions and species. Quality tackle lasts longer and catches more fish. Organize by species and condition.',
  items: [
    {
      name: 'Plano StowAway Tackle Box (Two-Tray)',
      description: 'Classic two-tray tackle box. Sturdy, organized, affordable.',
      subcategory: 'Tackle Box',
      price: '$20–35',
      url: amazonUrl('B0BRP4KZJ3'),
      essential: true,
      note: 'Simple and effective. Keep lures organized by species and water condition.',
    },
    {
      name: 'Tackle Backpack with Built-in Organizer',
      description: 'Hands-free tackle organization. Great for kayak and walk-and-wade fishing.',
      subcategory: 'Tackle Box',
      price: '$45–75',
      url: amazonUrl('B07WBHRX8J'),
      essential: false,
      note: 'Perfect for mobile fishing where you need both hands free.',
    },
    {
      name: 'Zoom Super Fluke Soft Plastic (4" and 5")',
      description: 'The most versatile soft plastic lure. Catches bass, pike, and larger panfish.',
      subcategory: 'Soft Plastics',
      price: '$3–5 per pack',
      url: amazonUrl('B0D6Z9S7R4'),
      essential: true,
      note: 'Stock multiple colors: white, natural, and darker patterns.',
    },
    {
      name: 'Berkley PowerBait Power Minnow',
      description: 'Soft plastic jerkbait with scent. Excellent for bass and walleye.',
      subcategory: 'Soft Plastics',
      price: '$3–5 per pack',
      url: amazonUrl('B06Y2CN27L'),
      essential: true,
      note: 'The scent attracts strikes even in low-visibility water.',
    },
    {
      name: 'Rapala Shad Rap Crankbait (05–07)',
      description: 'Balsa wood crankbait that dives 5–7 feet. Classic and effective.',
      subcategory: 'Crankbait',
      price: '$6–10 each',
      url: amazonUrl('B07RHVTSNF'),
      essential: true,
      note: 'One of the best crankbaits ever made. Fish it around structure.',
    },
    {
      name: 'Strike King KVD Crankbait (Squarebill)',
      description: 'Square-bill crankbait for tight spaces. Great for rocky areas.',
      subcategory: 'Crankbait',
      price: '$5–8 each',
      url: amazonUrl('B0BVR1GHFT'),
      essential: false,
      note: 'Deflects off rocks without hanging up. Perfect for rocky structure.',
    },
    {
      name: 'Booyah Buzz Topwater Frog',
      description: 'Buzzing topwater that imitates frogs. Explosive strikes.',
      subcategory: 'Topwater Lure',
      price: '$6–9 each',
      url: amazonUrl('B08SXFMYM1'),
      essential: true,
      note: 'Fish this over grass and pad fields in summer.',
    },
    {
      name: 'Tungsten Jigs (1/8 oz, 1/4 oz, 3/8 oz)',
      description: 'Dense jigs for bottom contact and precise depth control.',
      subcategory: 'Jig',
      price: '$4–7 each',
      url: amazonUrl('B09J6VXLNQ'),
      essential: true,
      note: 'Tungsten is denser than lead. Better sensitivity and control.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 7. ELECTRONICS — FISH FINDERS & GPS
// ═══════════════════════════════════════════════════════════

const fishingElectronics: CuratedGearCategory = {
  id: 'fishing_electronics',
  title: 'Electronics',
  description: 'Fish finders, GPS units, and depth finders for serious anglers.',
  icon: '📡',
  intro: 'Modern fishing electronics remove the guesswork. A fish finder shows depth, structure, and fish below the boat. GPS lets you return to productive spots. Sonar technology has improved dramatically and is now affordable. Whether you\'re fishing from shore or boat, electronics improve your success rate significantly.',
  items: [
    {
      name: 'Garmin echoMAP Plus 75cv Fish Finder',
      description: 'Full GPS + fish finder combo. Maps included, U.S. data, 7" display.',
      subcategory: 'Fish Finder',
      price: '$300–400',
      url: amazonUrl('B08DCGGRKD'),
      essential: false,
      note: 'Industry-standard for small boats and kayaks. Incredibly reliable.',
    },
    {
      name: 'Lowrance Hook2 7x Tripleshot Fish Finder',
      description: 'Budget-friendly fish finder with GPS. Three transducers for better coverage.',
      subcategory: 'Fish Finder',
      price: '$250–350',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: false,
      note: 'Great value. Excellent for fishing lakes and rivers.',
    },
    {
      name: 'Garmin GPSMAP 66S Handheld GPS',
      description: 'Rugged handheld GPS for shore fishing and scouting. Preloaded US topo maps.',
      subcategory: 'GPS Unit',
      price: '$350–450',
      url: amazonUrl('B08CL7TVMB'),
      essential: false,
      note: 'Perfect for marking spots from shore and pre-fishing trips.',
    },
    {
      name: 'Deeper 3.0 Smart Sonar (Portable)',
      description: 'Castable fish finder that pairs with your smartphone. Great for kayaks and shore.',
      subcategory: 'Fish Finder',
      price: '$150–200',
      url: amazonUrl('B086K2L7DD'),
      essential: false,
      note: 'Wireless castable sonar. Game-changer for portable fishing.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 8. WADERS & APPAREL — WADE FISHING GEAR
// ═══════════════════════════════════════════════════════════

const wadersApparel: CuratedGearCategory = {
  id: 'fishing_waders_apparel',
  title: 'Waders & Apparel',
  description: 'Chest waders, boots, rain gear, and gloves for wade fishing and bankside comfort.',
  icon: '🥾',
  intro: 'Wade fishing puts you where the fish are. Quality waders keep you dry and warm. Good wading boots provide traction on slippery rocks and sandy bottoms. Rain gear and gloves extend your season. Comfort determines how long and how effectively you can fish. Invest in quality wading apparel.',
  items: [
    {
      name: 'Patagonia Swiftcurrent Expedition Waders',
      description: 'Premium waders with excellent durability. Lifetime warranty and free repairs.',
      subcategory: 'Chest Waders',
      price: '$399–499',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: true,
      note: 'Patagonia\'s warranty is unbeatable. Best waders on the market.',
    },
    {
      name: 'Orvis Clearwater Waders (Neoprene)',
      description: 'Mid-range neoprene waders for cold-water fishing. Good insulation.',
      subcategory: 'Chest Waders',
      price: '$180–250',
      url: amazonUrl('B08DCGGRKD'),
      essential: true,
      note: 'Neoprene is warmer than breathable in winter. Good for ice fishing.',
    },
    {
      name: 'Korkers Buckskin Wading Boots with Interchangeable Soles',
      description: 'Felt and rubber interchangeable soles. Adapts to any water conditions.',
      subcategory: 'Wading Boots',
      price: '$179–229',
      url: amazonUrl('B0BVR1GHFT'),
      essential: true,
      note: 'Interchangeable soles are game-changing. Rubber for Gunpowder, felt for slicker streams.',
    },
    {
      name: 'Simms Fishing Boots (Streamtread Rubber Sole)',
      description: 'Premium wading boots with excellent grip. Lightweight and comfortable.',
      subcategory: 'Wading Boots',
      price: '$200–280',
      url: amazonUrl('B08CL7TVMB'),
      essential: false,
      note: 'If you prefer premium brands, Simms is exceptional.',
    },
    {
      name: 'First Lite Merino Wool Fleece Jacket',
      description: 'Lightweight insulating layer for wade fishing in cool months.',
      subcategory: 'Apparel',
      price: '$120–180',
      url: amazonUrl('B086K2L7DD'),
      essential: true,
      note: 'Merino regulates temperature and wicks moisture.',
    },
    {
      name: 'Frogg Toggs Pro Action Jacket & Pants Set',
      description: 'Ultra-lightweight rain gear that packs into a pocket. Great for travel.',
      subcategory: 'Rain Gear',
      price: '$15–25',
      url: amazonUrl('B0BRP4KZJ3'),
      essential: true,
      note: 'Cheap and effective. Every angler should carry Frogg Toggs.',
    },
    {
      name: 'Neoprene Fishing Gloves (5mm)',
      description: 'Keep your hands warm while maintaining dexterity. 5mm for cold water.',
      subcategory: 'Gloves',
      price: '$25–40',
      url: amazonUrl('B07WBHRX8J'),
      essential: true,
      note: 'Cold hands make for bad casts and lost fish. Keep them warm.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 9. CRABBING SUPPLIES — MD CRAB FISHING
// ═══════════════════════════════════════════════════════════

const crabbingSupplies: CuratedGearCategory = {
  id: 'fishing_crabbing_supplies',
  title: 'Crabbing Supplies',
  description: 'Trotlines, crab pots, bait holders, and coolers for Maryland crabbing.',
  icon: '🦀',
  intro: 'Crabbing is a Maryland tradition. A hand-line or trotline is the most common method — simple, effective, and fun for the whole family. Crab pots let you fish passively while you relax. Blue crabs are aggressive, abundant, and delicious. Get out on the water and catch dinner.',
  items: [
    {
      name: 'Hand Line Crabbing Kit (Rope + Net + Bait Bag)',
      description: 'Classic hand-line crabbing. All you need is rope, a net, and chicken necks.',
      subcategory: 'Hand Crabbing',
      price: '$15–25',
      url: amazonUrl('B0BVR1GHFT'),
      essential: true,
      note: 'The simplest way to crab. Great for kids and family outings.',
    },
    {
      name: 'Trotline Crabbing Kit (100-foot rope)',
      description: 'Trotline with attached bait holders. Float and anchor included.',
      subcategory: 'Trotline',
      price: '$30–50',
      url: amazonUrl('B08CL7TVMB'),
      essential: true,
      note: 'More productive than hand-lining. Covers more water.',
    },
    {
      name: 'Wire Crab Pot (Folding)',
      description: 'Fold-up crab trap. Drop it overboard and let it soak.',
      subcategory: 'Crab Pot',
      price: '$20–35',
      url: amazonUrl('B086K2L7DD'),
      essential: true,
      note: 'Passive crabbing. Works great from a dock or boat.',
    },
    {
      name: 'Crab Bait Bag (Mesh Holder)',
      description: 'Holds chicken necks and keeps them on the line.',
      subcategory: 'Bait Holder',
      price: '$5–10',
      url: amazonUrl('B0BRP4KZJ3'),
      essential: true,
      note: 'Keeps bait organized and makes re-baiting easy.',
    },
    {
      name: 'Chicken Necks (Bag of 10–15)',
      description: 'Fresh chicken necks are the #1 crab bait. Buy them from the butcher.',
      subcategory: 'Bait',
      price: '$3–7',
      url: amazonUrl('B07WBHRX8J'),
      essential: true,
      note: 'Fresh is best. Ask your local butcher to save them for you.',
    },
    {
      name: 'Cooler with Lid (for Catch)',
      description: 'Keep your crabs alive in a cooler with wet towels and ice.',
      subcategory: 'Storage',
      price: '$30–50',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: true,
      note: 'A simple cooler with drainage keeps crabs fresh until you get home.',
    },
    {
      name: 'Crab Net (Long Handle)',
      description: 'Scoop crabs off the line once they come up.',
      subcategory: 'Net',
      price: '$12–20',
      url: amazonUrl('B08DCGGRKD'),
      essential: true,
      note: 'Makes landing crabs much easier than trying to grab them.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// 10. KAYAK FISHING — ACCESSORIES & GEAR
// ═══════════════════════════════════════════════════════════

const kayakFishing: CuratedGearCategory = {
  id: 'fishing_kayak_gear',
  title: 'Kayak Fishing',
  description: 'Rod holders, anchor systems, and kayak-specific accessories for hands-free fishing.',
  icon: '🛶',
  intro: 'Kayak fishing is accessible, affordable, and incredibly rewarding. You reach areas that boats can\'t access. Good rod holders keep your hands free for paddling and landing fish. An anchor system keeps you on structure without drifting. A fish finder mounted on your kayak changes the game. Start simple and upgrade as you learn.',
  items: [
    {
      name: 'Railblaza StarPort Rod Holder',
      description: 'Universal rod holder that clamps to kayak railings. Fully adjustable.',
      subcategory: 'Rod Holder',
      price: '$25–40',
      url: amazonUrl('B0BVR1GHFT'),
      essential: true,
      note: 'Keeps your rods secured and ready while you paddle.',
    },
    {
      name: 'Scotty Fishing Rod Holder Mount System',
      description: 'Heavy-duty rod holder with quick-release system. Industry standard.',
      subcategory: 'Rod Holder',
      price: '$30–50',
      url: amazonUrl('B08CL7TVMB'),
      essential: true,
      note: 'Scotty is the gold standard for kayak and boat accessories.',
    },
    {
      name: 'Anchor Trolley System (Kayak Rigging)',
      description: 'Pulley system that moves your anchor from bow to stern. Precise positioning.',
      subcategory: 'Anchor Trolley',
      price: '$40–70',
      url: amazonUrl('B086K2L7DD'),
      essential: true,
      note: 'An anchor trolley lets you stay on structure without drifting.',
    },
    {
      name: 'Grapnel Anchor (5 lbs)',
      description: 'Small kayak anchor. Holds in grass and mud without dragging.',
      subcategory: 'Anchor',
      price: '$20–35',
      url: amazonUrl('B0BRP4KZJ3'),
      essential: true,
      note: 'A 5-lb anchor is perfect for kayaks in rivers and lakes.',
    },
    {
      name: 'Transducer Arm for Fish Finder (Kayak Mount)',
      description: 'Mounts your portable fish finder\'s transducer to the side of your kayak.',
      subcategory: 'Electronics Mount',
      price: '$40–60',
      url: amazonUrl('B07WBHRX8J'),
      essential: false,
      note: 'If you run a portable fish finder, this mount is invaluable.',
    },
    {
      name: 'Carabiners & Bungee Cord Kit',
      description: 'Secure your gear to the kayak. Prevents loss overboard.',
      subcategory: 'Rigging',
      price: '$15–25',
      url: amazonUrl('B0BVH2MPNJ'),
      essential: true,
      note: 'Everything overboard in a kayak is gone. Use carabiners and bungie.',
    },
    {
      name: 'Kayak Crate (Milk Crate Organization)',
      description: 'Simple milk crate rigged with carabiners. Holds tackle and gear.',
      subcategory: 'Storage',
      price: '$10–20',
      url: amazonUrl('B08DCGGRKD'),
      essential: true,
      note: 'A DIY crate setup organized with carabiners keeps your gear dry and accessible.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

/** All curated fishing gear categories */
export const CURATED_FISHING_GEAR: CuratedGearCategory[] = [
  flyFishingGunpowder,
  bassFreshwater,
  chesapeakeBay,
  saltwaterOC,
  rodReelCombos,
  tackleAndLures,
  fishingElectronics,
  wadersApparel,
  crabbingSupplies,
  kayakFishing,
];

/** Get a specific fishing gear category by ID */
export function getFishingGearCategory(id: string): CuratedGearCategory | undefined {
  return CURATED_FISHING_GEAR.find((cat) => cat.id === id);
}

/** Get all essential items for a category */
export function getEssentialItems(categoryId: string): CuratedGearItem[] {
  const cat = getFishingGearCategory(categoryId);
  if (!cat) return [];
  return cat.items.filter((item) => item.essential);
}

/** Get total estimated cost for a category (essentials only) */
export function getEstimatedCost(categoryId: string): string {
  // Returns a range string based on the items
  const items = getEssentialItems(categoryId);
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
