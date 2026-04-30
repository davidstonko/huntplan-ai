/**
 * Camping-mode domain types.
 *
 * Built for Phase 5A (V2.2.0). Covers campgrounds (read-only data),
 * user-owned multi-day trips, gear checklists, and group-camp
 * collaboration (which piggybacks on Deer Camp's shared-annotation
 * infrastructure but has its own data model).
 *
 * No premium / pay-gated fields — V2.2.0 is fully free.
 */

export type CampgroundType =
  | 'state_forest'
  | 'state_park'
  | 'national_park'
  | 'private'
  | 'primitive'
  | 'group'
  | 'equestrian'
  | 'backpacker';

/**
 * Amenities a campground can offer. Stored as a flat boolean record so
 * Mapbox filter expressions can read individual flags with ['get', 'X'].
 */
export interface CampgroundAmenities {
  potableWater: boolean;
  flushToilets: boolean;
  pitToilets: boolean;
  shower: boolean;
  fireRing: boolean;
  picnicTable: boolean;
  electricHookup: boolean;
  waterHookup: boolean;
  sewerHookup: boolean;
  dumpStation: boolean;
  petsAllowed: boolean;
  ada: boolean;
  trashService: boolean;
  laundry: boolean;
  store: boolean;
}

export interface Campground {
  id: string; // "md-green-ridge-sf-pine-lick-run" — stable slug
  name: string;
  type: CampgroundType;
  lat: number;
  lon: number;
  park: string; // e.g. "Green Ridge State Forest"
  county: string;

  amenities: CampgroundAmenities;
  siteCount: number | null; // null = unknown
  reservationRequired: boolean;
  reservationUrl: string | null;
  season: {
    openMonth: number | null; // 1-12; null = year-round
    closeMonth: number | null;
    notes: string | null; // "weather-dependent" etc.
  };
  phone: string | null;
  description: string | null;
  tags: string[]; // free-text: "tent-only", "waterfront", "bear-box", etc.

  /**
   * Visual color used on the camp map. Data-driven by type but allows
   * overrides for featured sites (e.g. AT backpacker shelters which
   * also appear in the hiking dataset).
   */
  color?: string;
}

/**
 * A user's multi-day camp trip. Saved locally via AsyncStorage (V2.2.0)
 * and synced via backend `/api/v1/camping/trips` when authenticated.
 */
export interface CampTrip {
  id: string;
  campgroundId: string;
  campgroundName: string; // denormalized for reference; display use tripName
  tripName: string; // user-chosen trip name

  arrivalDate: string; // ISO yyyy-mm-dd
  departureDate: string; // ISO yyyy-mm-dd
  partySize: number;

  tripType: 'car_camp' | 'backcountry' | 'group' | 'family' | 'solo';

  notes: string | null;
  gearChecklistId: string | null; // FK to CampGearChecklist
  groupCampId: string | null; // FK to GroupCamp if collaborative

  createdAt: string;
  updatedAt: string;
}

export type GearCategory =
  | 'shelter'
  | 'sleep'
  | 'cook'
  | 'clothing'
  | 'safety'
  | 'tools'
  | 'hygiene'
  | 'navigation'
  | 'miscellaneous';

export interface GearItem {
  id: string;
  label: string;
  category: GearCategory;
  quantity: number;
  checked: boolean;
  notes: string | null;
  /**
   * Amazon ASIN for optional affiliate link. Falsy means no link.
   * Affiliate tag mdoutdoors-20 is applied at render time.
   */
  asin: string | null;
  /** True if the item was auto-added by the rules engine vs user. */
  autoAdded: boolean;
  /**
   * If set, explains why the rules engine added this item.
   * Example: "Added for forecast low < 40°F".
   */
  autoReason: string | null;
}

export interface CampGearChecklist {
  id: string;
  tripId: string | null; // null = standalone template
  name: string; // "Weekend car camp — family of 4"
  items: GearItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A GroupCamp is the collaborative layer for campground stays. It
 * mirrors the DeerCamp shared-annotation pattern but is keyed to a
 * campground + date range rather than a hunting season.
 *
 * When a GroupCamp is linked to a DeerCamp group, its members sync
 * over the same WebSocket channel.
 */
export interface GroupCamp {
  id: string;
  name: string; // "Memorial Day at Assateague"
  campgroundId: string;
  campgroundName: string;
  arrivalDate: string;
  departureDate: string;
  createdBy: string; // userId
  createdAt: string;

  linkedDeerCampId: string | null; // optional back-reference

  members: GroupCampMember[];
  annotations: GroupCampAnnotation[]; // waypoints inside the campground
  photos: GroupCampPhoto[];
}

export interface GroupCampMember {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  color: string;
  joinedAt: string;
}

export interface GroupCampAnnotation {
  id: string;
  type:
    | 'tent'
    | 'fire_pit'
    | 'bear_box'
    | 'water_source'
    | 'parking'
    | 'trail_entry'
    | 'vista'
    | 'note';
  lat: number;
  lon: number;
  label: string | null;
  createdBy: string;
  createdAt: string;
}

export interface GroupCampPhoto {
  id: string;
  uploadedBy: string;
  uploadedAt: string;
  imageUri: string; // R2 URL
  lat: number;
  lon: number;
  caption: string | null;
}

/**
 * A reservation helper — we never act as a reservation agent, we
 * just deep-link to the official portal. The CampResourcesScreen
 * surfaces these.
 */
export interface ReservationPortal {
  id: string;
  name: string; // "ReserveMaryland.gov"
  url: string;
  covers: 'state_park' | 'state_forest' | 'national_park' | 'private';
  notes: string | null;
}
