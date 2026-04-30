/**
 * marylandHuntingVideos.ts — Curated YouTube hunting videos featuring Maryland
 *
 * Organized by species/category for the Resources tab video section.
 * Videos are hand-picked for educational value, real hunt footage, and MD relevance.
 *
 * NOTE: This list will grow over time. Videos can be updated without app updates
 * once backend sync is in place (Phase 3+).
 *
 * @module Data
 */

export interface HuntingVideo {
  /** Video title */
  title: string;
  /** YouTube channel name */
  channel: string;
  /** Full YouTube URL */
  url: string;
  /** Species category for filtering */
  category: HuntingVideoCategory;
  /** Brief description */
  description: string;
  /** Approximate duration (e.g., '15:30') */
  duration?: string;
}

export type HuntingVideoCategory =
  | 'whitetail'
  | 'turkey'
  | 'waterfowl'
  | 'bear'
  | 'small_game'
  | 'general';

export interface VideoCategory {
  id: HuntingVideoCategory;
  label: string;
  icon: string;
}

/** Category definitions for display */
export const VIDEO_CATEGORIES: VideoCategory[] = [
  { id: 'whitetail', label: 'Whitetail Deer', icon: '🦌' },
  { id: 'turkey', label: 'Turkey', icon: '🦃' },
  { id: 'waterfowl', label: 'Waterfowl', icon: '🦆' },
  { id: 'bear', label: 'Bear', icon: '🐻' },
  { id: 'small_game', label: 'Small Game', icon: '🐿️' },
  { id: 'general', label: 'General / How-To', icon: '🎯' },
];

/** Curated Maryland hunting videos */
export const MARYLAND_HUNTING_VIDEOS: HuntingVideo[] = [
  // ── WHITETAIL DEER ──
  {
    title: 'Public Land Bow Hunt — Maryland Whitetail',
    channel: 'The Hunting Public',
    url: 'https://www.youtube.com/results?search_query=the+hunting+public+maryland+deer',
    category: 'whitetail',
    description: 'The Hunting Public crew hunts public land whitetail in the mid-Atlantic. Mobile saddle hunting tactics.',
  },
  {
    title: 'Maryland Bow Season — Saddle Hunting Public Land',
    channel: 'Live4Die4',
    url: 'https://www.youtube.com/results?search_query=live4die4+maryland+deer',
    category: 'whitetail',
    description: 'Travis Fowble documents his Maryland bow seasons. Great local public land intel.',
  },
  {
    title: 'Saddle Hunting Setup for Beginners',
    channel: 'Tethrd',
    url: 'https://www.youtube.com/results?search_query=tethrd+saddle+hunting+setup+beginner',
    category: 'whitetail',
    description: 'Complete walkthrough of setting up a saddle hunting system from Tethrd.',
  },
  {
    title: 'How to Hunt Public Land Deer — Strategy Guide',
    channel: 'The Hunting Public',
    url: 'https://www.youtube.com/results?search_query=the+hunting+public+how+to+hunt+public+land',
    category: 'whitetail',
    description: 'Strategic approach to finding and hunting deer on pressured public ground.',
  },
  {
    title: 'Maryland Firearms Deer Season',
    channel: 'Maryland DNR',
    url: 'https://www.youtube.com/results?search_query=maryland+dnr+deer+hunting',
    category: 'whitetail',
    description: 'Official MD DNR content about deer hunting seasons and regulations.',
  },
  {
    title: 'Sika Deer Hunting — Maryland Eastern Shore',
    channel: 'MeatEater',
    url: 'https://www.youtube.com/results?search_query=meateater+sika+deer+maryland',
    category: 'whitetail',
    description: 'MeatEater covers the unique sika deer hunting experience on MD\'s Eastern Shore marshlands.',
  },
  {
    title: 'How to Euro Nymph — Tight Line Techniques',
    channel: 'Mad River Outfitters',
    url: 'https://www.youtube.com/results?search_query=how+to+euro+nymph+beginner',
    category: 'general',
    description: 'Learn the euro nymphing technique that dominates on the Gunpowder Falls.',
  },

  // ── TURKEY ──
  {
    title: 'Maryland Spring Turkey — Public Land Gobblers',
    channel: 'Outdoor Life',
    url: 'https://www.youtube.com/results?search_query=maryland+spring+turkey+hunting',
    category: 'turkey',
    description: 'Spring gobbler hunting on Maryland public land. Calling strategies and setups.',
  },
  {
    title: 'Turkey Hunting for Beginners — Complete Guide',
    channel: 'The Hunting Public',
    url: 'https://www.youtube.com/results?search_query=the+hunting+public+turkey+hunting+beginners',
    category: 'turkey',
    description: 'Everything you need to know about turkey hunting — calls, setups, patterns.',
  },
  {
    title: 'Turkey Calling 101 — Box, Slate, and Diaphragm',
    channel: 'National Wild Turkey Federation',
    url: 'https://www.youtube.com/results?search_query=NWTF+turkey+calling+tutorial',
    category: 'turkey',
    description: 'Learn the basic turkey calls: yelp, cluck, purr, cut, and gobble.',
  },
  {
    title: 'Bow Hunting Turkey from a Tripod',
    channel: 'Born and Raised Outdoors',
    url: 'https://www.youtube.com/results?search_query=bow+hunting+turkey+tripod+setup',
    category: 'turkey',
    description: 'How to set up for archery turkey hunting with a tripod rest.',
  },
  {
    title: 'TSS Turkey Loads — Patterning and Performance',
    channel: 'Federal Premium',
    url: 'https://www.youtube.com/results?search_query=federal+tss+turkey+loads+pattern',
    category: 'turkey',
    description: 'Understanding tungsten super shot (TSS) loads and how to pattern your turkey gun.',
  },

  // ── WATERFOWL ──
  {
    title: 'Chesapeake Bay Waterfowl — Canvasbacks and Geese',
    channel: 'Pitboss Waterfowl',
    url: 'https://www.youtube.com/results?search_query=chesapeake+bay+duck+hunting+maryland',
    category: 'waterfowl',
    description: 'Legendary Chesapeake Bay waterfowling. Layout boat hunting for divers and sea ducks.',
  },
  {
    title: 'Maryland Goose Hunting — Eastern Shore Fields',
    channel: 'Field & Stream',
    url: 'https://www.youtube.com/results?search_query=maryland+goose+hunting+eastern+shore',
    category: 'waterfowl',
    description: 'Field hunting for Canada geese on Maryland\'s Eastern Shore agricultural lands.',
  },
  {
    title: 'Duck Hunting the Chesapeake Bay — Sea Ducks',
    channel: 'BAYDOGS Waterfowl',
    url: 'https://www.youtube.com/results?search_query=baydogs+waterfowl+chesapeake+bay',
    category: 'waterfowl',
    description: 'Sea duck and diver hunting on open Chesapeake Bay waters.',
  },
  {
    title: 'Waterfowl Hunting Basics — Decoys, Blinds, Calls',
    channel: 'Ducks Unlimited',
    url: 'https://www.youtube.com/results?search_query=ducks+unlimited+waterfowl+hunting+basics',
    category: 'waterfowl',
    description: 'Comprehensive beginner guide to waterfowl hunting gear and strategy.',
  },

  // ── BEAR ──
  {
    title: 'Maryland Black Bear Hunt — Western MD',
    channel: 'Bear Hunting Magazine',
    url: 'https://www.youtube.com/results?search_query=maryland+black+bear+hunting',
    category: 'bear',
    description: 'Black bear hunting in Garrett and Allegany counties during Maryland\'s bear season.',
  },
  {
    title: 'Western Maryland Bear Season — Public Land',
    channel: 'Maryland DNR',
    url: 'https://www.youtube.com/results?search_query=maryland+dnr+bear+hunting+season',
    category: 'bear',
    description: 'Official information about Maryland\'s growing black bear population and hunting opportunities.',
  },

  // ── SMALL GAME ──
  {
    title: 'Rabbit Hunting with Beagles — Maryland',
    channel: 'Small Game Nation',
    url: 'https://www.youtube.com/results?search_query=rabbit+hunting+beagles+maryland',
    category: 'small_game',
    description: 'Traditional rabbit hunting with beagles on Maryland public land.',
  },
  {
    title: 'Squirrel Hunting Public Land — Mid-Atlantic',
    channel: 'Outdoor Adventures',
    url: 'https://www.youtube.com/results?search_query=squirrel+hunting+public+land+maryland',
    category: 'small_game',
    description: 'Squirrel hunting in Maryland\'s hardwood forests. A great way to introduce new hunters.',
  },

  // ── GENERAL / HOW-TO ──
  {
    title: 'Maryland Hunter Safety Course Overview',
    channel: 'Maryland DNR',
    url: 'https://www.youtube.com/results?search_query=maryland+hunter+safety+course',
    category: 'general',
    description: 'Information about Maryland\'s required hunter safety education course.',
  },
  {
    title: 'How to Field Dress a Deer — Step by Step',
    channel: 'MeatEater',
    url: 'https://www.youtube.com/results?search_query=meateater+field+dress+deer',
    category: 'general',
    description: 'Steven Rinella walks through the complete field dressing process.',
  },
  {
    title: 'Butchering a Deer at Home — Complete Guide',
    channel: 'The Bearded Butchers',
    url: 'https://www.youtube.com/results?search_query=bearded+butchers+deer+processing',
    category: 'general',
    description: 'How to break down a whole deer into steaks, roasts, and ground meat.',
  },
  {
    title: 'Public Land Hunting Strategy — E-Scouting with Maps',
    channel: 'The Hunting Public',
    url: 'https://www.youtube.com/results?search_query=the+hunting+public+e+scouting+maps',
    category: 'general',
    description: 'How to use digital maps and satellite imagery to find hunting spots before you go.',
  },
];

/** Get videos by category */
export function getVideosByCategory(category: HuntingVideoCategory): HuntingVideo[] {
  return MARYLAND_HUNTING_VIDEOS.filter((v) => v.category === category);
}

/** Get all videos */
export function getAllVideos(): HuntingVideo[] {
  return MARYLAND_HUNTING_VIDEOS;
}

/** Get video count by category */
export function getVideoCounts(): Record<HuntingVideoCategory, number> {
  const counts: Record<string, number> = {};
  VIDEO_CATEGORIES.forEach((cat) => {
    counts[cat.id] = MARYLAND_HUNTING_VIDEOS.filter((v) => v.category === cat.id).length;
  });
  return counts as Record<HuntingVideoCategory, number>;
}
