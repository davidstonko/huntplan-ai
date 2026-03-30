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
import Colors from '../theme/colors';

interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
}

interface ResourceCategory {
  name: string;
  icon: string;
  links: ResourceLink[];
}

const RESOURCES: ResourceCategory[] = [
  {
    name: 'Quick Reference',
    icon: '📋',
    links: [
      {
        id: 'seasons-calendar',
        title: 'Hunting Seasons Calendar (PDF)',
        description: 'Official Maryland hunting seasons and dates',
        url: 'https://dnr.maryland.gov/huntersguide/Documents/Hunting_Seasons_Calendar.pdf',
        icon: '📅',
      },
      {
        id: 'hunters-guide',
        title: 'Guide to Hunting & Trapping',
        description: 'Comprehensive hunting regulations and guidelines',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/default.aspx',
        icon: '📖',
      },
      {
        id: 'eregulations',
        title: 'eRegulations Maryland',
        description: 'Online hunting regulations and rules',
        url: 'https://www.eregulations.com/maryland/hunting',
        icon: '⚖️',
      },
      {
        id: 'public-lands',
        title: 'Public Hunting Lands',
        description: 'Find public hunting areas in Maryland',
        url: 'https://www.eregulations.com/maryland/hunting/public-hunting-lands',
        icon: '🏞️',
      },
      {
        id: 'free-permit',
        title: 'Free Public Hunting Permit Program (PDF)',
        description: 'Information about free hunting permits',
        url: 'https://dnr.maryland.gov/wildlife/Documents/Free-Public-Hunting-Permit-Program.pdf',
        icon: '🎫',
      },
    ],
  },
  {
    name: 'Licensing & Permits',
    icon: '📝',
    links: [
      {
        id: 'buy-license',
        title: 'Buy a License (Compass)',
        description: 'Purchase hunting licenses online',
        url: 'https://compass.dnr.maryland.gov/',
        icon: '💳',
      },
      {
        id: 'license-requirements',
        title: 'License Requirements',
        description: 'Learn what licenses you need',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/licenserequirements.aspx',
        icon: '📜',
      },
      {
        id: 'hunter-education',
        title: 'Hunter Education',
        description: 'Complete your hunter safety course',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntereducation.aspx',
        icon: '🎓',
      },
      {
        id: 'apprentice-license',
        title: 'Apprentice License Info',
        description: 'Hunt with an apprentice license',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/apprenticelicense.aspx',
        icon: '👤',
      },
    ],
  },
  {
    name: 'Waterfowl',
    icon: '🦆',
    links: [
      {
        id: 'waterfowl-guide',
        title: 'Waterfowl Hunting Guide (PDF)',
        description: 'Waterfowl hunting regulations and requirements',
        url: 'https://dnr.maryland.gov/wildlife/Documents/Public-Hunting-Waterfowl-Regulation-Packet.pdf',
        icon: '📘',
      },
      {
        id: 'blind-lottery',
        title: 'Blind Lottery System',
        description: 'Register for waterfowl blind lottery',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlblind.aspx',
        icon: '🎲',
      },
      {
        id: 'duck-stamp',
        title: 'Federal Duck Stamp',
        description: 'Get your federal duck stamp',
        url: 'https://www.fws.gov/program/federal-duck-stamp',
        icon: '🎟️',
      },
      {
        id: 'hip-registration',
        title: 'HIP Registration',
        description: 'Register for Harvest Information Program',
        url: 'https://www.fws.gov/harvestsurvey/',
        icon: '✏️',
      },
    ],
  },
  {
    name: 'Deer Management',
    icon: '🦌',
    links: [
      {
        id: 'deer-seasons',
        title: 'Deer Seasons & Bag Limits',
        description: 'Current deer hunting seasons and limits',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/deerseasons.aspx',
        icon: '📅',
      },
      {
        id: 'antler-restrictions',
        title: 'Antler Restrictions',
        description: 'Understand Maryland antler rules',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/antlerrestrictions.aspx',
        icon: '🔔',
      },
      {
        id: 'cwd-info',
        title: 'CWD Info',
        description: 'Chronic Wasting Disease information',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/cwd.aspx',
        icon: '⚠️',
      },
      {
        id: 'deer-checkin',
        title: 'Deer Check-In (Harvest)',
        description: 'Report your harvest',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/mdcheckstation.aspx',
        icon: '✅',
      },
      {
        id: 'managed-hunts',
        title: 'Managed Deer Hunts',
        description: 'Find managed hunting opportunities',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/manageddeerhunts.aspx',
        icon: '🎯',
      },
    ],
  },
  {
    name: 'Turkey',
    icon: '🦃',
    links: [
      {
        id: 'turkey-seasons',
        title: 'Turkey Seasons',
        description: 'Turkey hunting season dates and rules',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/turkeyseasons.aspx',
        icon: '📅',
      },
      {
        id: 'turkey-checkin',
        title: 'Turkey Check-In',
        description: 'Report your turkey harvest',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/turkeyharvestinfo.aspx',
        icon: '✅',
      },
    ],
  },
  {
    name: 'Maps & Data',
    icon: '🗺️',
    links: [
      {
        id: 'wma-map',
        title: 'Interactive WMA Map',
        description: 'Explore Wildlife Management Areas',
        url: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/allbyregion.aspx',
        icon: '📍',
      },
      {
        id: 'imap',
        title: 'MD iMap GIS Data',
        description: 'Maryland geographic and land data',
        url: 'https://data.imap.maryland.gov/',
        icon: '🗺️',
      },
      {
        id: 'dnr-maps',
        title: 'DNR Land Maps',
        description: 'Official Maryland DNR maps',
        url: 'https://dnr.maryland.gov/Pages/maps.aspx',
        icon: '🗺️',
      },
      {
        id: 'harvest-stats',
        title: 'Harvest Statistics',
        description: 'View hunting harvest reports',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/HarvestReports.aspx',
        icon: '📊',
      },
    ],
  },
  {
    name: 'Safety & Regulations',
    icon: '🛡️',
    links: [
      {
        id: 'sunday-hunting',
        title: 'Sunday Hunting Rules',
        description: 'Regulations for hunting on Sundays',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/sundayhunt.aspx',
        icon: '📖',
      },
      {
        id: 'shooting-ranges',
        title: 'Shooting Ranges',
        description: 'Find Maryland shooting ranges',
        url: 'https://dnr.maryland.gov/wildlife/pages/hunt_trap/shooting_ranges.aspx',
        icon: '🎯',
      },
      {
        id: 'report-violations',
        title: 'Report Violations (NRP)',
        description: 'Report wildlife violations',
        url: 'https://dnr.maryland.gov/nrp/Pages/default.aspx',
        icon: '📞',
      },
      {
        id: 'safety-course',
        title: 'Hunter Safety Course',
        description: 'Complete your safety training',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntereducation.aspx',
        icon: '🎓',
      },
    ],
  },
  {
    name: 'Community',
    icon: '👥',
    links: [
      {
        id: 'md-sportsmen',
        title: 'Maryland Sportsmen',
        description: 'Hunting community and information',
        url: 'https://www.marylandsportsmen.com/',
        icon: '🤝',
      },
      {
        id: 'fish-hunt-md',
        title: 'Fish & Hunt Maryland',
        description: 'Local hunting and fishing resources',
        url: 'https://fishandhuntmaryland.com/',
        icon: '🎣',
      },
      {
        id: 'dnr-news',
        title: 'DNR News & Announcements',
        description: 'Latest hunting and wildlife news',
        url: 'https://news.maryland.gov/dnr/',
        icon: '📢',
      },
    ],
  },
];

export default function ResourcesScreen() {
  const [searchText, setSearchText] = useState('');

  const handleOpenURL = (url: string, title: string) => {
    Linking.openURL(url).catch((err) => {
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          placeholderTextColor={Colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryTitle}>{category.name}</Text>
              </View>

              {category.links.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.linkCard}
                  onPress={() => handleOpenURL(link.url, link.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.linkContent}>
                    <View style={styles.linkHeader}>
                      <Text style={styles.linkIcon}>{link.icon}</Text>
                      <Text style={styles.linkTitle}>{link.title}</Text>
                    </View>
                    <Text style={styles.linkDescription}>
                      {link.description}
                    </Text>
                  </View>
                  <Text style={styles.externalIcon}>↗</Text>
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
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
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
  categoryIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.moss,
    letterSpacing: 0.3,
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
  linkContent: {
    flex: 1,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  linkIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.tan,
    flex: 1,
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
