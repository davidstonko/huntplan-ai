/**
 * @file FishResourcesScreen.tsx
 * @description Curated collection of fishing resources and external links for Maryland.
 * Organized by category: Quick Reference, Licensing, Trout & Freshwater, Chesapeake Bay, Boat Ramps, Species Guides
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Resource categories with emoji icons, titles, subtitles
 * - External link support via Linking.openURL
 * - Organized for quick reference
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Colors from '../theme/colors';
import ActivityDisclaimer from '../components/common/ActivityDisclaimer';

interface FishResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
}

interface FishResourceCategory {
  name: string;
  icon: string;
  links: FishResourceLink[];
}

const FISH_RESOURCES: FishResourceCategory[] = [
  {
    name: 'Quick Reference',
    icon: '📋',
    links: [
      {
        id: 'fish-ereg',
        title: 'eRegulations Maryland Fishing',
        description: 'Comprehensive fishing regulations online',
        url: 'https://www.eregulations.com/maryland/fishing',
        icon: '⚖️',
      },
      {
        id: 'fish-dnr',
        title: 'MD DNR Fisheries',
        description: 'Official Maryland fisheries programs and information',
        url: 'https://dnr.maryland.gov/fisheries/Pages/index.aspx',
        icon: '🏛️',
      },
      {
        id: 'fishing-guide',
        title: 'Guide to Fishing & Crabbing',
        description: 'Complete guide to fishing and crabbing in Maryland',
        url: 'https://dnr.maryland.gov/fisheries/Documents/FishingGuide.pdf',
        icon: '📖',
      },
    ],
  },
  {
    name: 'Licensing',
    icon: '📝',
    links: [
      {
        id: 'compass-dnr',
        title: 'Buy a License (Compass DNR)',
        description: 'Purchase fishing licenses online — 24/7 access',
        url: 'https://compass.dnr.maryland.gov/',
        icon: '💳',
      },
      {
        id: 'license-types',
        title: 'License Types & Fees',
        description: 'Resident, nonresident, senior, youth, and special licenses',
        url: 'https://dnr.maryland.gov/fisheries/pages/licenses.aspx',
        icon: '💰',
      },
      {
        id: 'free-fishing-days',
        title: 'Free Fishing Days',
        description: 'Fish for free on selected weekends without a license',
        url: 'https://dnr.maryland.gov/fisheries/pages/freefishingdays.aspx',
        icon: '🎣',
      },
    ],
  },
  {
    name: 'Trout & Freshwater',
    icon: '🌊',
    links: [
      {
        id: 'trout-stocking',
        title: 'Trout Stocking Schedule',
        description: 'Weekly stocking updates for trout waters',
        url: 'https://dnr.maryland.gov/fisheries/pages/stocking.aspx',
        icon: '📅',
      },
      {
        id: 'trout-waters',
        title: 'Trout Waters & Regulations',
        description: 'Put-and-Take and Catch-and-Return stream information',
        url: 'https://dnr.maryland.gov/fisheries/pages/trout.aspx',
        icon: '🏞️',
      },
      {
        id: 'bass-fishing',
        title: 'Bass Fishing Regulations',
        description: 'Largemouth, smallmouth, and striped bass seasons',
        url: 'https://dnr.maryland.gov/fisheries/pages/bass.aspx',
        icon: '🐟',
      },
    ],
  },
  {
    name: 'Chesapeake Bay',
    icon: '🌊',
    links: [
      {
        id: 'bay-fishing-guide',
        title: 'Chesapeake Bay Fishing Guide',
        description: 'Complete guide to Bay fishing and regulations',
        url: 'https://dnr.maryland.gov/fisheries/Documents/BayFishingGuide.pdf',
        icon: '📖',
      },
      {
        id: 'striped-bass',
        title: 'Striped Bass Regulations',
        description: '2026 slot limits, spawning closures, gear restrictions',
        url: 'https://dnr.maryland.gov/fisheries/pages/stripedBass.aspx',
        icon: '🐟',
      },
      {
        id: 'bay-fish-species',
        title: 'Tidal Fish Species Guide',
        description: 'Bluefish, flounder, perch, croaker, seatrout',
        url: 'https://dnr.maryland.gov/fisheries/pages/baySpecies.aspx',
        icon: '📚',
      },
    ],
  },
  {
    name: 'Boat Ramps & Access',
    icon: '🚤',
    links: [
      {
        id: 'water-access-guide',
        title: 'Water Access Guide',
        description: 'Comprehensive guide to Maryland boat ramps and access areas',
        url: 'https://dnr.maryland.gov/boating/pages/water-access/boatramps.aspx',
        icon: '🗺️',
      },
      {
        id: 'public-fishing-access',
        title: 'Public Fishing Access Sites',
        description: '307+ public fishing access locations',
        url: 'https://dnr.maryland.gov/fisheries/pages/publicAccess.aspx',
        icon: '📍',
      },
      {
        id: 'angler-access-map',
        title: 'Angler Access Map',
        description: 'Interactive map of fishing access throughout Maryland',
        url: 'https://dnr.maryland.gov/fisheries/pages/AnglerAccessMap.aspx',
        icon: '🗺️',
      },
    ],
  },
  {
    name: 'Species Guides',
    icon: '📚',
    links: [
      {
        id: 'fish-identification',
        title: 'Fish Identification Guide',
        description: 'Learn to identify Maryland fish species',
        url: 'https://dnr.maryland.gov/fisheries/pages/fishid.aspx',
        icon: '🔍',
      },
      {
        id: 'catch-measurement',
        title: 'How to Measure Your Catch',
        description: 'Proper techniques for measuring fish size',
        url: 'https://dnr.maryland.gov/fisheries/Documents/Measurement-Guide.pdf',
        icon: '📏',
      },
      {
        id: 'invasive-species',
        title: 'Invasive Species Report',
        description: 'Report invasive fish species and help protect Maryland waters',
        url: 'https://dnr.maryland.gov/fisheries/pages/invasiveSpecies.aspx',
        icon: '⚠️',
      },
    ],
  },
  {
    name: 'Health & Safety',
    icon: '⚕️',
    links: [
      {
        id: 'fish-advisory',
        title: 'Fish Consumption Advisory',
        description: 'Mercury, PCBs, PFAS — which fish are safe to eat, by species and waterway',
        url: 'https://mde.maryland.gov/programs/Marylander/fishandshellfish/Pages/FishConsumptionAdvisory.aspx',
        icon: '🐟',
      },
      {
        id: 'advisory-map',
        title: 'Advisory Interactive Map',
        description: 'Mobile-friendly map of fish consumption advisories by waterway',
        url: 'https://mde.maryland.gov/programs/Marylander/fishandshellfish/Pages/FishAdvisoryMap.aspx',
        icon: '🗺️',
      },
      {
        id: 'boating-safety-cert',
        title: 'Boating Safety Certificate',
        description: 'Required for operators born after July 1, 1972 — 8-hour NASBLA course',
        url: 'https://dnr.maryland.gov/boating/Pages/safety.aspx',
        icon: '🛥️',
      },
      {
        id: 'vessel-registration',
        title: 'Vessel Registration',
        description: 'Register motorized vessels — 2-year renewal, decals required',
        url: 'https://dnr.maryland.gov/boating/Pages/registration.aspx',
        icon: '📋',
      },
    ],
  },
  {
    name: 'Crabbing',
    icon: '🦀',
    links: [
      {
        id: 'crabbing-regs',
        title: 'Blue Crab Regulations',
        description: 'Season Apr 1–Dec 15, males only, 5″ min — complete rules',
        url: 'https://dnr.maryland.gov/fisheries/Pages/crabbing.aspx',
        icon: '📋',
      },
      {
        id: 'crabbing-guide',
        title: 'Guide to Crabbing in Maryland',
        description: 'Gear, techniques, best locations, and seasonal tips',
        url: 'https://dnr.maryland.gov/fisheries/Documents/CrabbingGuide.pdf',
        icon: '📖',
      },
      {
        id: 'crab-pot-regs',
        title: 'Crab Pot Requirements',
        description: 'Cull rings, turtle reduction devices, and registration rules',
        url: 'https://dnr.maryland.gov/fisheries/Pages/crabpots.aspx',
        icon: '🪤',
      },
    ],
  },
  {
    name: 'Fishing Reports & Community',
    icon: '📰',
    links: [
      {
        id: 'weekly-fishing-report',
        title: 'DNR Weekly Fishing Report',
        description: 'Official Friday reports — water temps, species activity, conditions',
        url: 'https://news.maryland.gov/dnr/category/fishing-report/',
        icon: '📰',
      },
      {
        id: 'stocking-hotline',
        title: 'Trout Stocking Hotline',
        description: '800-688-3467 ext 1 — daily stocking updates during season',
        url: 'tel:8006883467',
        icon: '📞',
      },
      {
        id: 'creel-surveys',
        title: 'Volunteer Creel Surveys',
        description: 'Help monitor fish populations — log your catches for DNR research',
        url: 'https://dnr.maryland.gov/fisheries/Pages/surveys.aspx',
        icon: '📊',
      },
      {
        id: 'free-fishing-2026',
        title: 'Free Fishing Days 2026',
        description: 'June 6, June 13, July 4 — fish without a license statewide',
        url: 'https://dnr.maryland.gov/fisheries/pages/freefishingdays.aspx',
        icon: '🎉',
      },
    ],
  },
  {
    name: 'Bay Access & Paddling',
    icon: '🚣',
    links: [
      {
        id: 'captain-john-smith',
        title: 'Captain John Smith Water Trail',
        description: '3,000-mile historic trail — free access, no permit required',
        url: 'https://www.nps.gov/cajo/index.htm',
        icon: '🛶',
      },
      {
        id: 'md-paddling-trails',
        title: 'Maryland Paddling Trails',
        description: 'Kayak, canoe, and SUP routes for all skill levels',
        url: 'https://visitmaryland.org/paddling-trails-maryland',
        icon: '🏄',
      },
      {
        id: 'artificial-reefs',
        title: 'Maryland Artificial Reefs',
        description: 'Reef Initiative — 60+ partners, reef balls, Coble Reef (5 acres)',
        url: 'https://dnr.maryland.gov/fisheries/Pages/artificial-reefs.aspx',
        icon: '🪸',
      },
    ],
  },
  {
    name: 'Community & Media',
    icon: '📱',
    links: [
      {
        id: 'tidal-fish-forum',
        title: 'Tidal Fish Forum',
        description: 'Very active Chesapeake Bay fishing community — reports, tips, gear talk',
        url: 'https://www.tidalfish.com/forums/',
        icon: '💬',
      },
      {
        id: 'fishtalk-mag',
        title: 'FishTalk Magazine',
        description: 'Weekly Bay fishing reports, event calendar, species guides',
        url: 'https://www.fishtalkmag.com/',
        icon: '📰',
      },
      {
        id: 'on-the-water',
        title: 'On The Water — Chesapeake',
        description: 'Current conditions, fishing reports, and regional coverage',
        url: 'https://onthewater.com/regions/chesapeake',
        icon: '🌊',
      },
      {
        id: 'fishing-dmv-podcast',
        title: 'Fishing the DMV Podcast',
        description: '#1 DMV fishing podcast — guide interviews, biologist insights',
        url: 'https://www.fishingthedmv.com',
        icon: '🎙️',
      },
      {
        id: 'md-fishing-line-pod',
        title: 'Maryland Fishing Line Podcast',
        description: 'Rockfish, snakehead, trout — Maryland-focused episodes',
        url: 'https://podcasts.apple.com/us/podcast/maryland-fishing-line/id1491997885',
        icon: '🎧',
      },
      {
        id: 'yt-amped-up',
        title: 'Amped Up Outdoors (YouTube)',
        description: 'Maryland-based crew — fishing, hunting, camping, hiking videos',
        url: 'https://www.youtube.com/@AmpedUpOutdoors',
        icon: '▶️',
      },
      {
        id: 'yt-chesapeake-light',
        title: 'Chesapeake Light Tackle (YouTube)',
        description: '"Chesapeake Minute" instructional series for Bay anglers',
        url: 'https://www.youtube.com/@ChesapeakeLightTackle',
        icon: '▶️',
      },
    ],
  },
  {
    name: 'Tournaments & Events',
    icon: '🏆',
    links: [
      {
        id: 'white-marlin-open',
        title: 'White Marlin Open — Aug 3-8, 2026',
        description: '52-year tradition. Ocean City billfishing tournament.',
        url: 'https://www.whitemarlinopen.com',
        icon: '🐟',
      },
      {
        id: 'oc-tuna',
        title: 'Ocean City Tuna Tournament',
        description: "39th year, world's largest tuna tournament. $1M+ payout.",
        url: 'https://www.oCtuna.com',
        icon: '💰',
      },
      {
        id: 'explore-shore-expo',
        title: 'Explore the Shore Outdoor Expo',
        description: 'Cambridge, MD — outdoor recreation festival and expo',
        url: 'https://www.visitdorchester.org',
        icon: '🎪',
      },
      {
        id: 'fish-maryland-program',
        title: 'FishMaryland Citation Program',
        description: 'Submit trophy catches for state recognition — 60+ species tracked',
        url: 'https://dnr.maryland.gov/fisheries/Pages/FishMaryland.aspx',
        icon: '🎖️',
      },
    ],
  },
  {
    name: 'Bay Area Lodging',
    icon: '🛏️',
    links: [
      {
        id: 'airbnb-bay-area',
        title: 'Airbnb Coastal Stays',
        description: 'Waterfront cabins and cottages near Chesapeake Bay fishing areas',
        url: 'https://www.airbnb.com/s/Chesapeake-Bay/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&query=Chesapeake%20Bay&source=structured_search_input_header&search_type=autocomplete_click',
        icon: '🏠',
      },
      {
        id: 'booking-bay-area',
        title: 'Booking.com — Bay Region Hotels',
        description: 'Hotels near Ocean City, Annapolis, and Eastern Shore fishing ports',
        url: 'https://www.booking.com/searchresults.html?ss=Chesapeake+Bay&ssne=Chesapeake+Bay',
        icon: '🏨',
      },
      {
        id: 'hipcamp-bay',
        title: 'Hipcamp — Waterfront & Camping',
        description: 'Unique waterfront camping and glamping on the Bay',
        url: 'https://www.hipcamp.com/en-US/d/united-states/maryland/glamping/all',
        icon: '✨',
      },
    ],
  },
];

export default function FishResourcesScreen() {
  // 2026-05-01 (V2.4 audit, third pass): FishResourcesScreen is rendered
  // as a CHILD of ResourcesHubScreen (when activeMode==='fish' &&
  // segment==='links'). The parent already mounts OnboardingTourGate +
  // tourReplayRow for both Hunt and Fish modes. A second-pass audit
  // briefly thought this screen needed its own gate; reverted because
  // the parent handles it. wiringIntegrity test for OnboardingTourGate
  // was tightened to skip Fish for the same reason.
  const handleLinkPress = (url: string, title: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open ${title}`);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {FISH_RESOURCES.map((category) => (
          <View key={category.name} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>

            {category.links.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.linkCard}
                onPress={() => handleLinkPress(link.url, link.title)}
                activeOpacity={0.7}
              >
                <Text style={styles.linkIcon}>{link.icon}</Text>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkDescription}>{link.description}</Text>
                </View>
                <Text style={styles.linkArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>Always verify regulations with Maryland DNR</Text>
        </View>
      </ScrollView>
      <ActivityDisclaimer mode="fish" />
      {/* 2026-05-01 (V2.4 audit, third pass): NOT mounting ContactFab
          here — FishResourcesScreen is rendered as a child of
          ResourcesHubScreen (when activeMode==='fish' &&
          segment==='links'), and the parent already mounts ContactFab.
          A duplicate here would stack two FABs in the bottom-right. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.water,
  },
  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  linkIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  linkArrow: {
    fontSize: 16,
    color: Colors.water,
    marginTop: 4,
  },
  disclaimerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blood,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
