/**
 * @file MoreScreen.tsx
 * @description Root of the More tab — the mode-aware "everything else"
 * hub that replaced the per-mode Info / Gear / Deer Camp / Group tabs
 * in the 2026-09-18 five-tab restructure.
 *
 * Rows (mode-aware):
 *   Regulations       Hunt/Fish → ResourcesMain (regulations segment)
 *                     Camp → CampResources · Hike → HikeResources
 *   Links & Guides    Hunt/Fish → ResourcesMain (links segment)
 *                     Camp → CampResources · Hike → HikeResources
 *   Gear              root 'Gear' (mode-aware component)
 *   Deer Camp         Hunt only → DeerCampMain
 *   Group Camp        Camp only → GroupCampMain
 *   Community Forum   root 'Forum'
 *   Weather & Safety  root 'Weather'
 *   Offline Maps      root 'OfflineMaps'
 *   Backup & Import   LogTab → PersonalHub (backup / import rows live there)
 *   Settings          root 'Settings'
 *   Contact           mailto: the shared feedback inbox
 */

import React, { useMemo } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useActivityMode, type ActivityMode } from '../context/ActivityModeContext';
import { TAB } from '../navigation/routes';

const FEEDBACK_EMAIL = 'feedback.mdhuntfishoutdoors@gmail.com';

interface MoreRow {
  key: string;
  code: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface MoreSection {
  title: string;
  rows: MoreRow[];
}

function regulationsTarget(mode: ActivityMode): { screen: string; params?: object } {
  switch (mode) {
    case 'camp':
      return { screen: 'CampResources' };
    case 'hike':
      return { screen: 'HikeResources' };
    default:
      return { screen: 'ResourcesMain', params: { initialSegment: 'regulations' } };
  }
}

function linksTarget(mode: ActivityMode): { screen: string; params?: object } {
  switch (mode) {
    case 'camp':
      return { screen: 'CampResources' };
    case 'hike':
      return { screen: 'HikeResources' };
    default:
      return { screen: 'ResourcesMain', params: { initialSegment: 'links' } };
  }
}

const REGULATIONS_SUBTITLE: Record<ActivityMode, string> = {
  hunt: 'Seasons, bag limits, weapons, and the "Can I Hunt?" checker.',
  fish: 'Seasons, creel limits, licenses, and the 2026 striped bass rules.',
  camp: 'Park rules, campfires and burn bans, Leave No Trace, reservations.',
  hike: 'Trail rules, AT shelters and water, Four States Challenge.',
};

const GEAR_SUBTITLE: Record<ActivityMode, string> = {
  hunt: 'Curated hunting kit — whitetail, turkey, optics, stands, clothing.',
  fish: 'Curated fishing kit — fly, lakes & ponds, bay shore, bay boat.',
  camp: 'Curated camping kit — shelter, sleep, kitchen, safety.',
  hike: 'Curated hiking kit — day hike, backpacking, winter, rain.',
};

export function openContactEmail(): void {
  const subject = encodeURIComponent('MDHuntFishOutdoors — feedback');
  const body = encodeURIComponent(
    'Hi,\n\n' +
      'I would like to [report a bug / suggest a feature / add my business / other]:\n\n\n' +
      '— Sent from MDHuntFishOutdoors',
  );
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`).catch(
    () => {},
  );
}

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { activeMode } = useActivityMode();

  const sections = useMemo<MoreSection[]>(() => {
    const regs = regulationsTarget(activeMode);
    const links = linksTarget(activeMode);

    const reference: MoreRow[] = [
      {
        key: 'regulations',
        code: 'RG',
        title: 'Regulations',
        subtitle: REGULATIONS_SUBTITLE[activeMode],
        onPress: () => navigation.navigate(regs.screen, regs.params),
      },
      {
        key: 'links',
        code: 'LK',
        title: 'Links & Guides',
        subtitle: 'Official DNR pages, licenses, maps, guides, and local pros.',
        onPress: () => navigation.navigate(links.screen, links.params),
      },
      {
        key: 'gear',
        code: 'GR',
        title: 'Gear',
        subtitle: GEAR_SUBTITLE[activeMode],
        onPress: () => navigation.navigate('Gear'),
      },
    ];

    const community: MoreRow[] = [];
    if (activeMode === 'hunt') {
      community.push({
        key: 'deercamp',
        code: 'DC',
        title: 'Deer Camp',
        subtitle: 'Shared maps, pins, and photos with your hunting group.',
        onPress: () => navigation.navigate('DeerCampMain'),
      });
    }
    if (activeMode === 'camp') {
      community.push({
        key: 'groupcamp',
        code: 'GC',
        title: 'Group Camp',
        subtitle: 'Shared campsites, gear lists, and plans with your group.',
        onPress: () => navigation.navigate('GroupCampMain'),
      });
    }
    community.push({
      key: 'forum',
      code: 'CF',
      title: 'Community Forum',
      subtitle: 'Reports, questions, and tips from other Maryland outdoors folks.',
      onPress: () => navigation.navigate('Forum'),
    });

    const tools: MoreRow[] = [
      {
        key: 'weather',
        code: 'WX',
        title: 'Weather & Safety',
        subtitle: 'NOAA forecast, wind, sunrise/sunset, and safety notes.',
        onPress: () => navigation.navigate('Weather'),
      },
      {
        key: 'offline',
        code: 'OM',
        title: 'Offline Maps',
        subtitle: 'Download map regions so the map works with no signal.',
        onPress: () => navigation.navigate('OfflineMaps'),
      },
      {
        key: 'backup',
        code: 'BK',
        title: 'Backup & Import',
        subtitle: 'Export everything as one file, or import KML / GPX.',
        onPress: () => navigation.navigate(TAB.LOG, { screen: 'PersonalHub' }),
      },
    ];

    const app: MoreRow[] = [
      {
        key: 'settings',
        code: 'ST',
        title: 'Settings',
        subtitle: 'Units, map defaults, notifications, and data.',
        onPress: () => navigation.navigate('Settings'),
      },
      {
        key: 'contact',
        code: '@',
        title: 'Contact',
        subtitle: `Bugs, ideas, partnerships — ${FEEDBACK_EMAIL}`,
        onPress: openContactEmail,
      },
    ];

    return [
      { title: 'Reference', rows: reference },
      { title: 'Community', rows: community },
      { title: 'Tools', rows: tools },
      { title: 'App', rows: app },
    ];
  }, [activeMode, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
          {section.rows.map((row) => (
            <TouchableOpacity
              key={row.key}
              style={styles.row}
              onPress={row.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={row.title}
            >
              <View style={styles.codeChip}>
                <Text style={styles.codeChipText}>{row.code}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={2}>
                  {row.subtitle}
                </Text>
              </View>
              <Text style={styles.rowChev}>{'›'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <Text style={styles.disclaimer}>
        Always verify regulations with Maryland DNR.
      </Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  codeChip: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  codeChipText: {
    color: Colors.textOnAccent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  rowChev: {
    fontSize: 22,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
