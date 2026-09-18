# MDHuntFishOutdoors — Monetization Integration Plan

Last Updated: 2026-04-11

## Current Revenue Streams

### 1. Amazon Associates (ACTIVE)
- **Tag:** mdoutdoors-20
- **Commission:** 3–10% depending on category
- **Integration Points:**
  - Gear Guide screens (hunt, fish, camp, hike)
  - Trip Planner packing lists (AT, Camping)
  - CampGearScreen curated picks
- **Status:** Live and generating clicks

### 2. RevenueCat Subscriptions (ACTIVE)
- **Tiers:** Free / Pro / Team
- **Integration:** SubscriptionScreen, feature gates via purchaseService.ts
- **Status:** SDK wired, needs App Store product configuration

---

## Tier 1: Quick Wins (Implement Now)

### A. Guide Services Directory (DONE ✅)
- **Screen:** GuideDirectoryScreen.tsx
- **Data:** 10 fishing charters, 9 hunting guides, 4 outfitters/shops
- **Revenue Model:** Booking commission partnerships (negotiate 5–15% per referral)
- **Next Steps:**
  1. Reach out to top 3 charters (Chesapeake Bay Sport Fishing, Griffin's, Hookset)
  2. Negotiate referral tracking links or promo codes
  3. Add "Book Now" deep links when partnerships are confirmed
  4. Track clicks via analyticsService

### B. Campnab Integration
- **What:** Campground availability alerts — notifies users when sold-out campsites open up
- **Revenue:** $3 per scan, $7 per membership
- **Integration:** Add "Get Availability Alerts" button in CampResourcesScreen
- **URL:** campnab.com affiliate program
- **Priority:** HIGH — direct value to camping users, low friction

### C. Expand Amazon Associates Coverage
- **Current:** Camping gear, hiking gear, fishing kits
- **Add:** Boating safety gear, crabbing supplies, hunting optics, tree stands
- **Action:** Create new product arrays in curatedCampingGear.ts and equivalent files
- **Expected lift:** 40–60% more affiliate impressions

---

## Tier 2: Medium-Term (Next 30 Days)

### D. Bass Pro / Cabela's Affiliate Program
- **What:** Direct affiliate partnership with major outdoor retailer
- **Revenue:** Commission on referred purchases
- **Integration:** Add "Shop Local" section in GearGuideScreen with Hanover store info
- **Action:** Apply to Bass Pro Shops affiliate program, replace Amazon links where commission is higher

### E. Lodging Affiliates
- **Airbnb:** Referral fee program — cabin and outdoor stays near hunting/fishing areas
- **Booking.com:** Hotel affiliate — lodging near state parks and public lands
- **Hipcamp:** Glamping and private campsite affiliate
- **Integration:** "Where to Stay" section in CampResourcesScreen and FishResourcesScreen

### F. ReserveAmerica Direct Integration
- **What:** Official MD state parks reservation system
- **Revenue:** Potential booking referral fee
- **Integration:** Deep link from CampMapScreen campground details → reservation page
- **Action:** Contact ReserveAmerica/Aspira about affiliate program

---

## Tier 3: Premium (60+ Days)

### G. Guide Booking Platform
- **What:** In-app booking for fishing charters and hunting guides
- **Revenue:** 10–15% booking commission
- **Requirements:** Payment processing, calendar integration, messaging
- **Phase:** V4+ (requires backend work)
- **Market:** 19 guides/charters already cataloged, Eastern Shore concentration

### H. Sponsored Content / Featured Listings
- **What:** Guide services and outfitters pay for premium placement
- **Revenue:** $50–200/month per featured listing
- **Integration:** "Featured" badge in GuideDirectoryScreen, priority sort
- **Phase:** After reaching 1,000+ MAU

### I. REI Co-op Partnership
- **What:** REI membership co-promotion
- **Revenue:** Membership referral bonus
- **Integration:** Gear recommendations linking to REI when REI commission > Amazon
- **Action:** Apply to REI affiliate program

### J. Trip Insurance Affiliate
- **What:** Travel/outdoor insurance referrals
- **Revenue:** Per-policy commission
- **Integration:** Pre-trip checklist in Trip Planners
- **Partners:** World Nomads, Ripcord Rescue Travel Insurance

---

## Revenue Projections (Conservative)

| Stream | Monthly Est. | Notes |
|--------|-------------|-------|
| Amazon Associates | $50–200 | Based on 5K MAU, 2% click rate |
| Campnab Referrals | $30–100 | Seasonal (March–October) |
| Guide Bookings | $100–500 | At scale with booking integration |
| Subscriptions (Pro) | $200–1000 | $4.99/mo at 2–5% conversion |
| Featured Listings | $200–600 | 3–4 guides at $50–150/mo |
| Lodging Affiliates | $50–200 | Seasonal peak summer |
| **Total Potential** | **$630–2,600/mo** | At 5K MAU maturity |

---

## Implementation Tracking

- [x] Amazon Associates — mdoutdoors-20 tag active
- [x] RevenueCat SDK — wired in purchaseService.ts
- [x] Guide Directory — GuideDirectoryScreen created with 23 listings
- [x] Guide Data — guideServicesData.ts with fishing/hunting/outfitters
- [ ] Campnab affiliate signup
- [ ] Bass Pro affiliate application
- [ ] Airbnb/Booking.com affiliate signup
- [ ] Guide partnership outreach (top 3 charters)
- [ ] In-app booking flow (V4+)
- [ ] Featured listings system (post 1K MAU)

---

## Key Contacts for Outreach

### Fishing Charters (Priority Partnerships)
1. Chesapeake Bay Sport Fishing — Top 10 Charter award winner
2. Griffin's Guide Service — Light tackle specialist
3. Hookset Guide Service — Bay stripers

### Hunting Guides (Priority Partnerships)
1. B & J Guide Service — 40+ years, Eastern Shore
2. Talbot County Outfitters — Multi-species
3. DOA Outfitters — Trophy sika/whitetail

### Retail (Affiliate Applications)
1. Bass Pro Shops / Cabela's
2. REI Co-op
3. Savage River Outfitters (local fly shop partnership)
