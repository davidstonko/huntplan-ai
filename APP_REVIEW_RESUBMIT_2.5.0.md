# App Review resubmission plan — 2.5.0

## The rejection (version 2.3.0 build 5, rejected 2026-05-27)
- **Guideline 2.3.1(a) – hidden features:** "The app contains hidden features."
- **Guideline 4.2 – Minimum Functionality:** "not sufficiently different from a
  web browsing experience … include additional native functionality."

## What we fixed in code
- **2.3.1(a):** The Settings → "Dev tools → Wind widget playground" (a developer
  StyleSheet-tweaking tool that copied code snippets, added in the Apr-26 fork
  merge) shipped ungated in the Release/App Store build. It is now gated behind
  `__DEV__`, so the App Store build never renders it. Swept the codebase — it was
  the only dev/test entry point, and the app contains **no WebViews**. (commit dcb20b8e)
- Bumped to **build 3** (build 2 was uploaded before this fix, so it's stale).

## 4.2 — the argument (the app is genuinely native, not a web wrapper)
The app has **zero WebViews**. It is a native offline-first Maryland outdoors tool.
At resubmit, reply to App Review pointing to the substantial native functionality,
especially what 2.5.0 adds. Draft reply below.

---

### Draft reply to App Review (paste into Resolution Center at resubmit)

```
Thank you for the review. We've addressed both items:

Guideline 2.3.1(a): A developer-only diagnostic screen was unintentionally
included in the shipped build. It has been removed from the production build
(it now only compiles into internal debug builds). There are no hidden or
undocumented features in this version.

Guideline 4.2: We'd like to clarify the app's native functionality, as it is
not a web-based experience — it contains no web views. It is an offline-first
native mapping app for Maryland outdoors:

• A native vector map (Mapbox GL) with custom, data-driven layers for 192 public
  hunting lands, 737 fishing-access sites, trails, and shooting ranges.
• Offline map downloads — users download map regions to a local pack and the map
  works fully with no network connectivity in the field.
• GPS track recording using Core Location — live distance, speed, elevation
  gain/loss, and saved GPS tracks the user can revisit.
• Property-parcel boundaries rendered as a native map overlay, with tap-to-inspect
  parcel details and public-vs-private land shading.
• Live USGS stream-gauge data (flow, gauge height, water temperature) plotted on
  the map.
• On-map tools: distance/bearing measurement, waypoint and route annotation,
  wind/scent overlay, and a sun/moon (solunar) calculator.
• A built-in, fully offline knowledge base that answers regulation questions
  without any network request.

These are device-native capabilities (offline storage, GPS, on-device map
rendering and computation) that are not available through a website. We'd be glad
to provide a walkthrough video if helpful.

Thank you for reconsidering.
```

---

## Resubmit checklist (your steps)
1. **Re-archive in Xcode** (same flow as before): Product → Archive on "Any iOS
   Device". This produces **2.5.0 (3)** with the dev tool gated out.
2. **Distribute App → App Store Connect → Upload.**
3. In App Store Connect → the rejected submission → **Edit** the app version →
   attach the new **build 3** once it finishes processing.
4. **Metadata check (2.3.1 Accurate Metadata):** make sure the screenshots and
   description reflect what's actually in the app (native maps, offline, GPS) and
   don't show anything not present. The 2.5.0 listing copy is in
   APP_STORE_LISTING_2.5.0.md.
5. **Reply to App Review** with the draft above (Resolution Center).
6. **Resubmit to App Review.**

## Open question to confirm
The App Store Connect sidebar shows only "2.3 Rejected" — no "Ready for Sale"
version — which suggests the app may **not currently be live** (2.5.0 would be the
first approval). Worth confirming, because if so, 4.2 is the make-or-break gate
and the reply above matters most.
