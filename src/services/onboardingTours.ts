/**
 * onboardingTours — per-mode tour content (V2.3 Phase A.26).
 *
 * Each mode has 4 slides: a "what this mode is for" intro, a "what's on
 * the map" data overview, a "your tools" tab tour, and a "your personal
 * layer" closer. Pure data — the modal renders against TOUR_CONTENT
 * directly so adding a slide doesn't require a code change.
 *
 * Letter codes match the existing letter-code chip pattern (TD/WP/TR/...
 * — see PersonalHubScreen). The chip color per slide leans on the mode's
 * existing theme color so the tour reads as part of the mode, not a
 * separate "system" surface.
 */

import Colors from '../theme/colors';
import type { WaypointMode } from '../types/userWaypoint';

export interface TourSlide {
  /** 2–3 char chip code (e.g. 'WP', 'AI'). */
  code: string;
  /** Background color for the chip. */
  chipColor: string;
  /** Text color for the chip (for legibility against chipColor). */
  chipTextColor: string;
  /** Headline. */
  title: string;
  /** Body copy (1–3 short sentences; no marketing fluff). */
  body: string;
}

const HUNT: TourSlide[] = [
  {
    code: 'HM',
    chipColor: Colors.mdRed,
    chipTextColor: Colors.textOnAccent,
    title: 'Welcome to Hunt mode',
    body: 'Public hunting lands, ranges, blinds, regulations — every layer you need to plan a Maryland deer, turkey, or waterfowl hunt. Filter by land type or season from the chips along the left edge of the map.',
  },
  {
    code: 'WP',
    chipColor: Colors.bark,
    chipTextColor: Colors.textOnAccent,
    title: 'Drop your own waypoints',
    body: 'Long-press the map to drop a tree stand, ground blind, trail cam, rub, scrape, or sighting. Tap any pin to edit, attach a photo, or add scouting notes. Everything stays on this device.',
  },
  {
    code: 'TR',
    chipColor: Colors.moss,
    chipTextColor: Colors.textOnAccent,
    title: 'Record your scouts and sits',
    body: 'Tap RECORD on the map controls to log a GPS track of your scout walk or stand approach. Tracks save to My Tracks with distance, time, and elevation — review them later, or seed a journal entry from any one of them.',
  },
  {
    code: 'AI',
    chipColor: Colors.mdGold,
    chipTextColor: Colors.mdBlack,
    title: 'AI hunt planning + your field journal',
    body: 'The AI tab generates a hunt plan from a location and conditions. The Resources tab has regulations and your gear lists. Tap ME on the map for your full personal layer — waypoints, tracks, journal, photos, goals.',
  },
];

const FISH: TourSlide[] = [
  {
    code: 'FM',
    chipColor: '#0277BD',
    chipTextColor: Colors.textOnAccent,
    title: 'Welcome to Fish mode',
    body: 'Public access sites, boat ramps, water trails, crab pots, oyster sanctuaries, NOAA tide stations, USGS gauges — Maryland fishing infrastructure on one map. Toggle layers from the legend.',
  },
  {
    code: 'WP',
    chipColor: '#1565C0',
    chipTextColor: Colors.textOnAccent,
    title: 'Mark your honey holes',
    body: 'Long-press the map to drop a hole, ramp, put-in, take-out, snag, or structure pin. Photos and notes attach to each one. Private to you — no community sharing of fishing spots.',
  },
  {
    code: 'TR',
    chipColor: '#00838F',
    chipTextColor: Colors.textOnAccent,
    title: 'Track your drifts and walks',
    body: 'Tap RECORD to log GPS while you drift a creek or walk the bank. Saved tracks show distance and time so you can revisit a productive run next time.',
  },
  {
    code: 'AI',
    chipColor: Colors.mdGold,
    chipTextColor: Colors.mdBlack,
    title: 'Plan with AI + log every trip',
    body: 'AI tab plans a trip from your target species and conditions. Resources has regulations and tide info. Tap ME on the map for your fish journal, photos, tags, goals, and "what worked the last time it looked like this" search.',
  },
];

const CAMP: TourSlide[] = [
  {
    code: 'CM',
    chipColor: '#6D4C41',
    chipTextColor: Colors.textOnAccent,
    title: 'Welcome to Camp mode',
    body: 'Verified Maryland campgrounds, AT shelters, and your own Deer Camp areas — all on one map. Tap any pin for amenities, reservation links, and directions.',
  },
  {
    code: 'TP',
    chipColor: Colors.amber,
    chipTextColor: Colors.textOnAccent,
    title: 'Plan trips, not just sites',
    body: 'The Trip Planner tab lets you compose arrival/departure dates, party size, and trip type. Save it; tap LOG after the trip to seed a journal entry pre-filled with the plan details.',
  },
  {
    code: 'GR',
    chipColor: Colors.moss,
    chipTextColor: Colors.textOnAccent,
    title: 'Pre-trip gear checklists',
    body: 'The Gear tab generates a starter pack list per trip type (car camp, backcountry, family). Build once, edit per trip — your kit is always a tap away.',
  },
  {
    code: 'DC',
    chipColor: Colors.bark,
    chipTextColor: Colors.textOnAccent,
    title: 'Group Camps + your personal layer',
    body: 'Deer Camp lets you draw a camp boundary, share a join link, and post group notes. Tap ME for your camp journal, photos, gear lists, and tracks.',
  },
];

const HIKE: TourSlide[] = [
  {
    code: 'HK',
    chipColor: Colors.moss,
    chipTextColor: Colors.textOnAccent,
    title: 'Welcome to Hike mode',
    body: 'The Appalachian Trail through Maryland plus 79+ state-park trails — with shelters, trailheads, parking, and view points. Tap any pin for distance, elevation, and access notes.',
  },
  {
    code: 'TR',
    chipColor: '#33691E',
    chipTextColor: Colors.textOnAccent,
    title: 'Pick a trail or plan a thru-trip',
    body: 'The Trails tab lists every trail by mileage and tier. The Trip Planner builds an AT itinerary by mileage-per-day with auto-resolved shelter stops.',
  },
  {
    code: 'WP',
    chipColor: '#558B2F',
    chipTextColor: Colors.textOnAccent,
    title: 'Long-press to mark anything',
    body: 'Drop a landmark, view, water source, hazard, or trailhead pin. Record a track on your hike to capture the actual route, distance, and elevation gain.',
  },
  {
    code: 'JR',
    chipColor: Colors.amber,
    chipTextColor: Colors.textOnAccent,
    title: 'Journal every hike, hit your goals',
    body: 'After the hike, tap ME to write a journal entry. Set yearly mileage or active-day goals and watch the progress bar fill up — On This Day reminds you what you did a year ago.',
  },
];

export const TOUR_CONTENT: Record<WaypointMode, TourSlide[]> = {
  hunt: HUNT,
  fish: FISH,
  camp: CAMP,
  hike: HIKE,
};

/** Friendly mode label for tour headers ("Hunt mode tour"). */
export function tourTitleFor(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt': return 'Hunt mode tour';
    case 'fish': return 'Fish mode tour';
    case 'camp': return 'Camp mode tour';
    case 'hike': return 'Hike mode tour';
  }
}
