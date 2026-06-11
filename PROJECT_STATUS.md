# PROJECT_STATUS.md — MDHuntFishOutdoors

> **This is the single authoritative done/to-do tracker for the app.**
> Update it at the end of every working session. Older plan docs
> (V2_3_*, PRE_BUILD_AUDIT_*, PUSH_AUDIT.md) are historical records —
> this file supersedes them for "what's left."

Last updated: 2026-06-10 (submission-prep session)

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

## TO DO — path to App Store submission (in order)

1. [ ] **Re-verify quality gates on current HEAD** — `npx tsc --noEmit` + `npx jest` (last run May 14)
2. [ ] **Verify site deploy live** — AASA serves components format w/ /trip/*; privacy shows June 10 / V2.4.0; /join/TESTCODE renders invite card (Apple CDN may cache AASA up to ~24h)
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
