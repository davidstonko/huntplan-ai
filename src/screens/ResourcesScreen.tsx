import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useActivityMode } from '../context/ActivityModeContext';

/**
 * ResourcesScreen — Hunt-mode links hub.
 *
 * Build 9 professionalism pass: removed per-link and per-category emoji
 * icons in favor of a moss-colored accent bar + uppercase category title.
 * The `ResourceLink`/`ResourceCategory` interfaces no longer carry an
 * `icon` field — the data below is the single source of truth.
 */

interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
}

interface ResourceCategory {
  name: string;
  links: ResourceLink[];
}

const RESOURCES: ResourceCategory[] = [
  {
    name: 'Quick Reference',
    links: [
      {
        id: 'seasons-calendar',
        title: 'Hunting Seasons Calendar (PDF)',
        description: 'Official Maryland hunting seasons and dates',
        url: 'https://dnr.maryland.gov/huntersguide/Documents/Hunting_Seasons_Calendar.pdf',
      },
      {
        id: 'hunters-guide',
        title: 'Guide to Hunting & Trapping',
        description: 'Comprehensive hunting regulations and guidelines',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/default.aspx',
      },
      {
        id: 'eregulations',
        title: 'eRegulations Maryland',
        description: 'Online hunting regulations and rules',
        url: 'https://www.eregulations.com/maryland/hunting',
      },
      {
        id: 'public-lands',
        title: 'Public Hunting Lands',
        description: 'Find public hunting areas in Maryland',
        url: 'https://www.eregulations.com/maryland/hunting/public-hunting-lands',
      },
      {
        id: 'free-permit',
        title: 'Free Public Hunting Permit Program (PDF)',
        description: 'Information about free hunting permits',
        url: 'https://dnr.maryland.gov/wildlife/Documents/Free-Public-Hunting-Permit-Program.pdf',
      },
    ],
  },
  {
    name: 'Licensing & Permits',
    links: [
      {
        id: 'buy-license',
        title: 'Buy a License (Compass)',
        description: 'Purchase hunting licenses online',
        url: 'https://compass.dnr.maryland.gov/',
      },
      {
        id: 'license-requirements',
        title: 'License Requirements',
        description: 'Learn what licenses you need',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/licenserequirements.aspx',
      },
      {
        id: 'hunter-education',
        title: 'Hunter Education',
        description: 'Complete your hunter safety course',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntereducation.aspx',
      },
      {
        id: 'apprentice-license',
        title: 'Apprentice License Info',
        description: 'Hunt with an apprentice license',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/apprenticelicense.aspx',
      },
    ],
  },
  {
    name: 'Waterfowl',
    links: [
      {
        id: 'waterfowl-guide',
        title: 'Waterfowl Hunting Guide (PDF)',
        description: 'Complete waterfowl regulations, season dates, and bag limits',
        url: 'https://dnr.maryland.gov/wildlife/Documents/Public-Hunting-Waterfowl-Regulation-Packet.pdf',
      },
      {
        id: 'blind-lottery',
        title: 'Public Blind Lottery & Daily Draw',
        description: 'Register for seasonal blind lottery and find daily draw locations',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlblind.aspx',
      },
      {
        id: 'blind-map',
        title: 'Public Blind Locations Map',
        description: '10+ blind sites across Eastern Shore and Chesapeake Bay',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
      },
      {
        id: 'duck-stamp',
        title: 'Federal Duck Stamp',
        description: 'Purchase your required federal migratory bird stamp ($25)',
        url: 'https://www.fws.gov/program/federal-duck-stamp',
      },
      {
        id: 'hip-registration',
        title: 'HIP Registration',
        description: 'Required annual Harvest Information Program registration (free)',
        url: 'https://www.fws.gov/harvestsurvey/',
      },
      {
        id: 'md-migratory-stamp',
        title: 'MD Migratory Game Bird Stamp',
        description: 'State migratory bird stamp required in addition to federal stamp',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/migratory.aspx',
      },
      {
        id: 'snow-goose-conservation',
        title: 'Snow Goose Conservation Season',
        description: 'Liberal season: no plug required, electronic calls allowed, no bag limit',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/snowgoose.aspx',
      },
      {
        id: 'nontoxic-shot',
        title: 'Approved Non-Toxic Shot Types',
        description: 'Steel, bismuth, tungsten and other USFWS-approved alternatives (lead prohibited)',
        url: 'https://www.fws.gov/birds/bird-enthusiasts/hunting/nontoxic.php',
      },
    ],
  },
  {
    name: 'Deer Management',
    links: [
      {
        id: 'deer-seasons',
        title: 'Deer Seasons & Bag Limits',
        description: 'Current deer hunting seasons and limits',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/deerseasons.aspx',
      },
      {
        id: 'antler-restrictions',
        title: 'Antler Restrictions',
        description: 'Understand Maryland antler rules',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/antlerrestrictions.aspx',
      },
      {
        id: 'cwd-info',
        title: 'CWD Info',
        description: 'Chronic Wasting Disease information',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/cwd.aspx',
      },
      {
        id: 'deer-checkin',
        title: 'Deer Check-In (Harvest)',
        description: 'Report your harvest',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/mdcheckstation.aspx',
      },
      {
        id: 'managed-hunts',
        title: 'Managed Deer Hunts',
        description: 'Find managed hunting opportunities',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/manageddeerhunts.aspx',
      },
    ],
  },
  {
    name: 'Turkey',
    links: [
      {
        id: 'turkey-seasons',
        title: 'Turkey Seasons',
        description: 'Turkey hunting season dates and rules',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/turkeyseasons.aspx',
      },
      {
        id: 'turkey-checkin',
        title: 'Turkey Check-In',
        description: 'Report your turkey harvest',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/turkeyharvestinfo.aspx',
      },
    ],
  },
  {
    name: 'Maps & Data',
    links: [
      {
        id: 'wma-map',
        title: 'Interactive WMA Map',
        description: 'Explore Wildlife Management Areas',
        url: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/allbyregion.aspx',
      },
      {
        id: 'imap',
        title: 'MD iMap GIS Data',
        description: 'Maryland geographic and land data',
        url: 'https://data.imap.maryland.gov/',
      },
      {
        id: 'dnr-maps',
        title: 'DNR Land Maps',
        description: 'Official Maryland DNR maps',
        url: 'https://dnr.maryland.gov/Pages/maps.aspx',
      },
      {
        id: 'harvest-stats',
        title: 'Harvest Statistics',
        description: 'View hunting harvest reports',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/HarvestReports.aspx',
      },
    ],
  },
  {
    name: 'Safety & Regulations',
    links: [
      {
        id: 'sunday-hunting',
        title: 'Sunday Hunting Rules',
        description: 'Regulations for hunting on Sundays',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/sundayhunt.aspx',
      },
      {
        id: 'shooting-ranges',
        title: 'Shooting Ranges',
        description: 'Find Maryland shooting ranges',
        url: 'https://dnr.maryland.gov/wildlife/pages/hunt_trap/shooting_ranges.aspx',
      },
      {
        id: 'report-violations',
        title: 'Report Violations (NRP)',
        description: 'Report wildlife violations',
        url: 'https://dnr.maryland.gov/nrp/Pages/default.aspx',
      },
      {
        id: 'safety-course',
        title: 'Hunter Safety Course',
        description: 'Complete your safety training',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntereducation.aspx',
      },
    ],
  },
  {
    name: 'Community',
    links: [
      {
        id: 'md-sportsmen',
        title: 'Maryland Sportsmen',
        description: 'Hunting community and information',
        url: 'https://www.marylandsportsmen.com/',
      },
      {
        id: 'fish-hunt-md',
        title: 'Fish & Hunt Maryland',
        description: 'Local hunting and fishing resources',
        url: 'https://fishandhuntmaryland.com/',
      },
      {
        id: 'dnr-news',
        title: 'DNR News & Announcements',
        description: 'Latest hunting and wildlife news',
        url: 'https://news.maryland.gov/dnr/',
      },
    ],
  },
];

/**
 * Native in-app tools surfaced at the top of the resources screen, gated
 * per-activity-mode via ActivityModeContext below. Routes themselves live
 * in `ResourcesStack` (see AppNavigator.tsx), which is mounted by both
 * Hunt and Fish tab stacks — the per-mode arrays decide which row to
 * render so we don't pollute the wrong mode's UX.
 *
 * Tools that apply to multiple modes (e.g. Best Times solunar) are
 * intentionally listed in BOTH arrays — same route, same screen, same
 * underlying service. That keeps cross-mode parity without forcing
 * users to mode-switch to find a feature that helps them today.
 */
interface InAppTool {
  id: string;
  title: string;
  description: string;
  route: string;
  /** Letter-code chip (matches the codified professionalism pattern). */
  code: string;
}

const HUNT_TOOLS: InAppTool[] = [
  {
    id: 'rut-calendar',
    title: 'Rut Calendar',
    description:
      '30-day Maryland whitetail rut intensity forecast — biological windows + moon phase.',
    route: 'RutCalendar',
    code: 'RUT',
  },
  {
    id: 'best-times-hunt',
    title: 'Best Times (Solunar)',
    description:
      '7-day solunar activity rating — pick the best morning to be in the stand.',
    route: 'BestTimes',
    code: 'BTM',
  },
  {
    id: 'wind-forecast',
    title: 'Wind Forecast & Stand Planner',
    description:
      '7-day wind outlook plus which of your stands the wind favors each day.',
    route: 'WindForecast',
    code: 'WND',
  },
];

const FISH_TOOLS: InAppTool[] = [
  {
    id: 'best-times-fish',
    title: 'Best Times (Solunar)',
    description:
      '7-day solunar activity rating — pick the best tide-aligned morning to fish.',
    route: 'BestTimes',
    code: 'BTM',
  },
];

export default function ResourcesScreen() {
  const [searchText, setSearchText] = useState('');
  const navigation = useNavigation<any>();
  const { activeMode } = useActivityMode();

  const handleOpenURL = (url: string, title: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open "${title}". Please try again.`);
    });
  };

  // Filter resources based on search text
  const filteredCategories = RESOURCES.map((category) => ({
    ...category,
    links: category.links.filter(
      (link) =>
        link.title.toLowerCase().includes(searchText.toLowerCase()) ||
        link.description.toLowerCase().includes(searchText.toLowerCase()) ||
        category.name.toLowerCase().includes(searchText.toLowerCase())
    ),
  })).filter((category) => category.links.length > 0);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources"
          placeholderTextColor={Colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          maxLength={50}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeMode === 'hunt' && searchText.trim().length === 0 ? (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryAccent} />
              <Text style={styles.categoryTitle}>HUNT TOOLS</Text>
            </View>
            {HUNT_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.toolCard}
                onPress={() => navigation.navigate(tool.route)}
                activeOpacity={0.7}
              >
                <View style={styles.toolCodeChip}>
                  <Text style={styles.toolCodeText}>{tool.code}</Text>
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>{tool.title}</Text>
                  <Text style={styles.linkDescription}>
                    {tool.description}
                  </Text>
                </View>
                <Text style={styles.externalIcon}>{'\u203A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {activeMode === 'fish' && searchText.trim().length === 0 ? (
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryAccent} />
              <Text style={styles.categoryTitle}>FISH TOOLS</Text>
            </View>
            {FISH_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.toolCard}
                onPress={() => navigation.navigate(tool.route)}
                activeOpacity={0.7}
              >
                <View style={styles.toolCodeChip}>
                  <Text style={styles.toolCodeText}>{tool.code}</Text>
                </View>
                <View style={styles.linkContent}>
                  <Text style={styles.linkTitle}>{tool.title}</Text>
                  <Text style={styles.linkDescription}>
                    {tool.description}
                  </Text>
                </View>
                <Text style={styles.externalIcon}>{'\u203A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {filteredCategories.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No resources found matching your search.
            </Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <View key={category.name} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryAccent} />
                <Text style={styles.categoryTitle}>{category.name.toUpperCase()}</Text>
              </View>

              {category.links.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.linkCard}
                  onPress={() => handleOpenURL(link.url, link.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.linkContent}>
                    <Text style={styles.linkTitle}>{link.title}</Text>
                    <Text style={styles.linkDescription}>
                      {link.description}
                    </Text>
                  </View>
                  <Text style={styles.externalIcon}>{'\u2197'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.disclaimerText}>
            Always verify regulations with MD DNR before heading out to hunt.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Moss-colored vertical accent bar that replaces the per-category emoji.
  // Gives the header a tactile, branded anchor without relying on glyphs.
  categoryAccent: {
    width: 3,
    height: 14,
    backgroundColor: Colors.moss,
    marginRight: 10,
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.moss,
    letterSpacing: 1.2,
  },
  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  toolCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.moss,
  },
  toolCodeChip: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.moss,
    alignItems: 'center',
    marginRight: 12,
  },
  toolCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textOnAccent,
    letterSpacing: 1,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.tan,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  externalIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  footer: {
    marginTop: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.amber,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 20,
  },
});
