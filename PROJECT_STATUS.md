# PROJECT_STATUS.md — MDHuntFishOutdoors

> **This is the single authoritative done/to-do tracker for the app.**
> Update it at the end of every working session. Older plan docs
> (V2_3_*, PRE_BUILD_AUDIT_*, PUSH_AUDIT.md) are historical records —
> this file supersedes them for "what's left."

Last updated: 2026-06-27 (audit + regs accuracy + competitive features + LIVE-SIM verification)

## Live-simulator verification 2026-06-27 (the audit step that was missing)

Built + ran the app on iPhone 17 Pro / iOS 26.5 and tapped through every new
feature in all 4 modes. This caught **5 bugs that tsc + 2716 jest tests did NOT**
(commits a29e224b, dcaf7d89):
1. Hunt DL/PRC buttons overlapped the zoom controls → moved to bottom-left group.
2. Parcels never fetched (gated on a zoom value gesture-zoom doesn't update) →
   gate on viewport span from getVisibleBounds.
3. Parcel lines invisible (0.06 fill on tan basemap) → visible orange.
4. Trout watersheds invisible (muted colors on green basemap) → bright green/amber/pink.
5. Gauges not tappable (rendered under the access layers) → moved on top; also
   shrank the "USGS" label to fit + enlarged the gauge dot.
VERIFIED WORKING on-device: boot/disclaimer/onboarding, Hunt offline modal +
download-current-view, Hunt parcels render + SDAT detail card, Fish gauges render
+ tap → detail (Gwynns Falls 44 cfs / 2.55 ft), Fish wild-trout overlay (Gunpowder
amber), no overlap on Fish/Scout/Hike. Camp not separately checked (identical to Hike).
**These commits are LOCAL (not pushed) and not yet archived.**

## What landed 2026-06-27 (audit + audit-of-audit)

Four-auditor pass (domain coverage / wiring / meta-audit / submission risk) →
`AUDIT_2026_06_27.md`. Core finding: the audit cadence verifies build-integrity,
not mission-correctness; the regs DATA had legal-accuracy errors. Fixed this session:
- **Submission:** app-icon alpha channel removed (Apple upload reject); affiliate
  tag typo `mdoutdoors-20`→`mdoutdoors1-20` (main gear screen was earning $0).
- **Hunt regs accuracy (verified vs DNR/eRegulations):** real Region A/B deer model
  + statewide antler-point restriction; region-aware antlerless limits (was a flat
  wrong "5/yr"); Sunday-hunting messaging fixed to "designated dates only";
  added chat handlers for legal hunting hours, blaze orange, field tagging;
  `isInSeason()` now county-aware so Can-I-Hunt no longer green-lights bear/grouse
  statewide; bear season → 4 counties; license fees reconciled; winter muzzleloader
  dates fixed; staleness banner now fires. Guard test `huntRegsAccuracy.test.ts`.
- tsc clean · jest 113 suites / 2690 passed / 0 failed.
- **Still open from audit:** wholesale 2026-27 season-date refresh; offline-with-radio-off
  verify; first-run/zero-data states; real-device cold-start; EXIF strip live-verify.

## Where we are

- **Shipping target:** V2.4.0 build 1 → App Store Review
- **Previous release:** V2.3.0 build 5 (uploaded + Apple-validated 2026-04-30, never submitted for review)
- **Canonical repo:** `~/Code/huntmaryland-build/` (moved from ~/Documents, May 2026)
- **Git:** main = ac4d23a8, pushed to origin 2026-06-10 (was 47 ahead)
- **Quality gates (as of ac4d23a8, 2026-05-14):** tsc clean; jest 112 suites / 2680+ tests / 0 failed; wiringIntegrity ~196 assertions
- **Versions aligned:** package.json 2.4.0 · src/config.ts 2.4.0(1) · pbxproj MARKETING_VERSION 2.4.0 / CURRENT_PROJECT_VERSION 1

## Done (major milestones)

- V1 hunting app shipped 2026-03-30; V2.2.0(7) submitted-era baseline
- 4-mode expansion (Hunt 6 tabs / Fish 5 / Camp 6 / Hike 6) + AI chat per mode
- 309+ fishing hotspots, 51+ local services, gear monetization (Amazon tag mdoutdoors1-20)
- V2.3: EXIF stripper, deep links/AASA, privacy rewrite, fork consolidation
- V2.4: 22+2 audit iterations, ~35 bugs fixed (7+ live-sim BLOCKERs), trapping/bowfishing/federal-lands chat knowledge, Maryland geofence, ActivityMode + ScoutData persistence, Settings/Forum cross-mode reach (#57), tab a11y labels (#59), research Categories A–F
- 2026-06-10: 47 commits pushed to origin; **huntmaryland-site V2.4 deployed to GitHub Pages** — fixed production-broken AASA (legacy /join* paths didn't match app URLs), V2.4 privacy.html (feedback email), new 404.html invite fallback for /join/CODE + /trip/CODE

## Competitive feature expansion (started 2026-06-27)

Researched onX Hunt / HuntStand / TroutRoutes / AllTrails → gap analysis in
`COMPETITIVE_FEATURES_2026_06_27.md`. Build order chosen by David.
- [x] **Offline maps wired into every map screen** (onX's #1 feature + fixes our own
  broken offline-first promise). Offline button on all 5 maps → shared `OfflineMapsModal`
  + `useOfflineMaps` hook. Fixed a silent style mismatch (v11 packs vs v12 maps) via new
  `constants/mapStyles`. tsc clean, jest 113/2692. Polish left: per-viewport download,
  satellite-style pack.
- [x] **MD parcel boundaries (free version)** — PRC/Parcels toggle on Hunt + Scout maps;
  viewport query from MD open ArcGIS, tap → address/acreage/owner mailing + SDAT owner
  deep-link. Owner NAMES deferred (MD hides them; needs licensed Regrid feed). 8 tests.
- [x] **fishing live USGS gauges** — "USGS" toggle on Fish map, live flow/height/temp per
  MD station + detail sheet (free NWIS API, 6 tests).
- [x] **wild-trout classification overlay** — "Wild Trout" filter on Fish map shades 159 MD
  watersheds by species (brook/brown/rainbow) from bundled DNR MBSS data; tap → species + DNR
  link. Offline (6 tests).
- [x] **offline "download the area I'm viewing"** — Hunt + Scout offline sheet (3 tests).
- [~] per-stand scent-cone forecast — LARGELY ALREADY BUILT (scentConeGeometry, ScentConeLayer,
  StandScoreService, HuntWindPanel, StandWindBadge). Don't rebuild; consider a multi-day planner.
- [ ] fishing access/easement overlays (data-curation-heavy) · [ ] live-share safety (needs
  backend) · [ ] wrong-turn alerts (pure geometry, testable) · [ ] crowd trail conditions (backend)

## TO DO — path to App Store submission (in order)

1. [x] **Re-verify quality gates on current HEAD** — DONE 2026-06-10: tsc clean; jest 112 suites / 2680 passed / 5 skipped / 0 failed. NOTE: David's shell exports NODE_ENV=production which breaks RNTL render tests — `npm test` now forces NODE_ENV=test; stale audit worktree pruned (duplicate-mock warning gone)
2. [~] **Verify site deploy live** — privacy.html verified live (June 10 / V2.4.0 / feedback email). AASA + /join/TESTCODE pending CDN cache flush — re-verify within 24 h
2b. [x] **Backend: fix Render huntplan-api** — DONE 2026-06-10 9:54 PM, deploy 9f766db live, /health returns ok. Root cause chain: (1) free-tier Postgres expired + was deleted (~April 30) → DB hostname stopped resolving → init_db threw at startup → uvicorn exit 3 on every deploy since; (2) fresh-DB create_all then exposed a latent schema bug — landowner_blind_favorites.user_id was Integer vs users.id UUID (fixed in 9f766db). New DB: huntplan-db (dpg-d8l1696gvqtc73aemcf0-a, Oregon, PG16, internal URL set in service env). **⚠️ NEW FREE DB EXPIRES JULY 10, 2026** — upgrade to paid (~$6/mo Basic-256mb) before launch or the backend dies again with any user data on it
3. [ ] **Live-verify EXIF strip** — upload photo in sim, pull file, `exiftool` confirms GPS/EXIF gone (privacy-policy promise)
4. [ ] **Simulator visual verify** — every tab in every mode (Hunt 6 / Fish 5 / Camp 6 / Hike 6), overlay-overlap check per audit_overlap_check pattern (DAVID: ⌘R in Xcode)
5. [ ] **Real-device verify Fish Map drag** (task #46 — only open sim-audit issue; cluster touch interception suspected)
6. [ ] **Archive** — Xcode → Product → Archive (scheme HuntPlanAI, workspace ios/HuntPlanAI.xcworkspace)
7. [ ] **Upload to App Store Connect** via Organizer; wait for processing (~15 min)
8. [ ] **App Store Connect metadata:**
   - [ ] Privacy nutrition label (unchanged from V2.3 declaration)
   - [ ] Privacy Policy URL: https://davidstonko.github.io/huntmaryland-site/privacy.html
   - [ ] Affiliate disclosure in app description (Amazon Associates)
   - [ ] V2.4 screenshots (6.7" + 6.1" minimum)
   - [ ] Release notes (user-facing — adapt from RELEASE_NOTES_V2.4.md "What's new for users")
   - [ ] Support contact: feedback.mdhuntfishoutdoors@gmail.com
9. [ ] **Submit for review** (~24–48 h)

## TO DO — post-submission backlog (V2.4.1+)

- Research Category G — forums/community sweep (RESEARCH_PLAN.md)
- Console.log cleanup in DB models (dev-only, cosmetic)
- Fishing hotspots growth toward 1000 (Pass 3+6 recovery ≈460 → charters/DNR press releases ≈1000)
- Local services Phases 3–7 (LOCAL_SERVICES_PLAN.md)
- FishRegulationsScreen 5-tab emoji redesign (deferred 2026-05-01)
- Backend Render exited-status-3 investigation; Phase 3 WatermelonDB sync
- Xcode project structural rename HuntPlanAI → MDHuntFishOutdoors
- Custom domain (mdhuntfishoutdoors.com) — requires AASA + privacy URL updates

## Standing rules (do not relearn these)

- Live simulator step-through is mandatory before any push/submit — tsc+jest cannot catch UI wiring or overlay-overlap bugs
- Adversarial/independent audit before declaring "ready"; don't stop at the first clean iteration
- After any user-facing string fix: repo-wide grep sweep (the bug is never in just one file)
- `git add -A` only after checking `git status` against gitignore; never commit .env / .xcode.env.local
- AASA source of truth = `website/.well-known/` in THIS repo; site repo (~/Code/huntmaryland-site) gets copies
- Update THIS file + CLAUDE.md session section at end of every session
