# Release 2.5.0 (build 2) — submission guide + What's New

App: **MDHuntFishOutdoors** · Bundle ID `com.davidstonko.huntmaryland` · Apple ID 6761347484
Version **2.5.0**, build **2** (2.4.0/1 is the build already on the store).
All code is committed and pushed to `origin/main` (HEAD `7e7e3fa6`).

---

## App Store "What's New" copy (paste into App Store Connect)

```
What's new in 2.5.0:

• Property lines — see parcel boundaries on the Hunt and Scout maps, with
  owner mailing info and which land is likely public (huntable) vs private.
  Tap any parcel to look up the owner on the official Maryland SDAT record.

• Offline maps — download the exact area you're heading into so the map
  works deep in the woods with no cell service.

• Live stream gauges — real-time flow, gauge height, and water temperature
  from USGS stations, right on the Fish map.

• Wild trout waters — Maryland's native brook and wild trout streams,
  shaded by species (DNR survey data).

• Today's legal shooting hours — now shown right in the "Can I Hunt?" checker.

• Accuracy fixes across hunting regulations (deer regions and bag limits,
  Sunday hunting, shooting hours), sunrise/sunset times, and the maps.

Always verify current rules with the Maryland DNR before you head out.
```

---

## Pre-archive checklist (already satisfied — verify)

- [x] Version 2.5.0 / build 2 in `package.json`, `src/config.ts`
      (APP_MARKETING_VERSION/APP_BUILD_NUMBER), and pbxproj
      (MARKETING_VERSION + CURRENT_PROJECT_VERSION). Info.plist uses `$()` refs.
- [x] `npx tsc --noEmit` → 0 errors.
- [x] `npm test` → 117 suites / 2724 passed.
- [x] All new features verified live on the iPhone 17 Pro simulator.
- [ ] If pods drifted: `cd ios && RCT_NEW_ARCH_ENABLED=0 pod install`
      (New Architecture stays DISABLED — Node 25 codegen crash).
- [ ] Optional clean: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`.

## Step-by-step submission (your part — needs Apple signing)

1. **Open the workspace** (NOT the .xcodeproj):
   `ios/HuntPlanAI.xcworkspace` in Xcode.
2. **Select the archive destination:** scheme **HuntPlanAI**, device target
   **Any iOS Device (arm64)** (not a simulator).
3. **Product → Archive.** Wait for the archive to build and the Organizer to open.
4. In the Organizer, select the new 2.5.0 (2) archive → **Distribute App** →
   **App Store Connect** → **Upload** → keep defaults (automatic signing,
   upload symbols) → Upload.
5. In **App Store Connect** (appstoreconnect.apple.com → Apps →
   MDHuntFishOutdoors):
   - Create a new version **2.5.0** (if not already present).
   - Once build **2** finishes processing (a few–30 min), attach it under "Build".
   - Paste the **What's New** copy above.
   - Confirm App Privacy answers still match `ios/HuntPlanAI/PrivacyInfo.xcprivacy`.
   - **Submit for Review.**

## Notes for the reviewer (if asked)
- The app is a Maryland outdoors planning reference (hunt/fish/camp/hike); it
  shows DNR regulations, public-land + parcel maps, and tides/gauges. It is not
  legal advice and shows a persistent "verify with MD DNR" disclaimer.
- Parcel/public-land data is from Maryland's open GIS (MD iMAP/MDP/SDAT);
  stream gauges from USGS (public domain). No account required.
