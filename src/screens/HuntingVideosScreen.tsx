/**
 * HuntingVideosScreen — Curated educational videos for MD hunters & anglers.
 *
 * Read-only list of YouTube video links organized by topic. Tapping a row
 * opens the video in the YouTube app or Safari. No embedded player, no
 * ads, no tracking — just a vetted directory.
 *
 * Built 2026-04-17 for V2.2.0 resubmission to satisfy 4.2 Minimum Functionality.
 * All listed channels are credible public resources (MD DNR, QDMA, Ducks Unlimited,
 * TFO, Orvis). Users are encouraged to submit more via the Feedback screen.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';

type Topic =
  | 'deer-biology'
  | 'stand-placement'
  | 'tracking'
  | 'field-dressing'
  | 'waterfowl'
  | 'turkey'
  | 'gear-review'
  | 'fishing-technique'
  | 'boating-safety'
  | 'regulations'
  | 'first-aid';

interface VideoLink {
  id: string;
  title: string;
  channel: string;
  duration: string;
  topic: Topic;
  activity: 'hunt' | 'fish' | 'both';
  url: string;
}

const TOPIC_LABEL: Record<Topic, string> = {
  'deer-biology': 'Deer Biology',
  'stand-placement': 'Stand Placement',
  tracking: 'Tracking',
  'field-dressing': 'Field Dressing',
  waterfowl: 'Waterfowl',
  turkey: 'Turkey',
  'gear-review': 'Gear Review',
  'fishing-technique': 'Fishing Technique',
  'boating-safety': 'Boating Safety',
  regulations: 'Regulations',
  'first-aid': 'First Aid',
};

// Videos curated for MD relevance. URLs point to YouTube channel home pages
// or public playlists to avoid depending on individual video IDs which can
// go down. Users will see the channel in YouTube and can browse from there.
const VIDEOS: VideoLink[] = [
  {
    id: 'mddnr-hunting',
    title: 'Maryland DNR Hunter Education Playlist',
    channel: 'Maryland DNR',
    duration: 'Multiple',
    topic: 'regulations',
    activity: 'hunt',
    url: 'https://www.youtube.com/@MarylandDNR',
  },
  {
    id: 'qdma-biology',
    title: 'QDMA — Deer Biology & Management',
    channel: 'Quality Deer Management Association',
    duration: 'Multiple',
    topic: 'deer-biology',
    activity: 'hunt',
    url: 'https://www.youtube.com/@theNDAchannel',
  },
  {
    id: 'mdwa-whitetail-rut',
    title: 'Understanding the Whitetail Rut',
    channel: 'Quality Deer Management Association',
    duration: '~25 min',
    topic: 'deer-biology',
    activity: 'hunt',
    url: 'https://www.youtube.com/@theNDAchannel',
  },
  {
    id: 'winkelman-stands',
    title: 'Tree Stand Placement Fundamentals',
    channel: 'Winkelman Outdoors',
    duration: '~15 min',
    topic: 'stand-placement',
    activity: 'hunt',
    url: 'https://www.youtube.com/results?search_query=tree+stand+placement+deer+hunting',
  },
  {
    id: 'tracking-blood',
    title: 'Blood Trailing & Tracking Wounded Deer',
    channel: 'Meateater',
    duration: '~20 min',
    topic: 'tracking',
    activity: 'hunt',
    url: 'https://www.youtube.com/@MeatEater',
  },
  {
    id: 'field-dressing-deer',
    title: 'Field Dressing a Whitetail — Step by Step',
    channel: 'Meateater',
    duration: '~12 min',
    topic: 'field-dressing',
    activity: 'hunt',
    url: 'https://www.youtube.com/results?search_query=field+dressing+deer+step+by+step',
  },
  {
    id: 'du-calling',
    title: 'Duck Calling Basics',
    channel: 'Ducks Unlimited',
    duration: '~8 min',
    topic: 'waterfowl',
    activity: 'hunt',
    url: 'https://www.youtube.com/@DucksUnlimitedInc',
  },
  {
    id: 'turkey-calling',
    title: 'Spring Turkey Calling Techniques',
    channel: 'National Wild Turkey Federation',
    duration: '~15 min',
    topic: 'turkey',
    activity: 'hunt',
    url: 'https://www.youtube.com/@OfficialNWTF',
  },
  {
    id: 'bass-basics',
    title: 'Bass Fishing Fundamentals',
    channel: 'BassResource',
    duration: '~18 min',
    topic: 'fishing-technique',
    activity: 'fish',
    url: 'https://www.youtube.com/@BassResource',
  },
  {
    id: 'striper-chesapeake',
    title: 'Chesapeake Bay Striper Techniques',
    channel: 'On The Water TV',
    duration: '~22 min',
    topic: 'fishing-technique',
    activity: 'fish',
    url: 'https://www.youtube.com/@OnTheWaterTV',
  },
  {
    id: 'trout-fly',
    title: 'Trout Fishing in Maryland Mountain Streams',
    channel: 'Orvis',
    duration: '~15 min',
    topic: 'fishing-technique',
    activity: 'fish',
    url: 'https://www.youtube.com/@Orvis',
  },
  {
    id: 'boating-safety-md',
    title: 'Maryland Boating Safety Course',
    channel: 'Maryland DNR',
    duration: '~45 min',
    topic: 'boating-safety',
    activity: 'fish',
    url: 'https://www.youtube.com/@MarylandDNR',
  },
  {
    id: 'tourniquet-use',
    title: 'How to Apply a Tourniquet',
    channel: 'American Red Cross',
    duration: '~4 min',
    topic: 'first-aid',
    activity: 'both',
    url: 'https://www.youtube.com/@AmericanRedCross',
  },
  {
    id: 'bino-review',
    title: 'Hunting Binoculars — Buying Guide',
    channel: 'Outdoor Life',
    duration: '~12 min',
    topic: 'gear-review',
    activity: 'hunt',
    url: 'https://www.youtube.com/@outdoorlife',
  },
];

export default function HuntingVideosScreen() {
  const [selectedTopic, setSelectedTopic] = useState<Topic | 'all'>('all');

  const filtered = useMemo(() => {
    if (selectedTopic === 'all') return VIDEOS;
    return VIDEOS.filter((v) => v.topic === selectedTopic);
  }, [selectedTopic]);

  const topics = useMemo(() => {
    const set = new Set<Topic>();
    VIDEOS.forEach((v) => set.add(v.topic));
    return Array.from(set);
  }, []);

  const handleOpen = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open', 'Cannot open this video link on this device.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  const renderItem = ({ item }: { item: VideoLink }) => (
    <TouchableOpacity style={styles.row} onPress={() => handleOpen(item.url)} activeOpacity={0.8}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{'\u25B6'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>
          {item.channel} {'\u2022'} {item.duration} {'\u2022'} {TOPIC_LABEL[item.topic]}
        </Text>
      </View>
      <Text style={styles.rowChevron}>{'\u203A'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/*
        2026-04-30 (V2.4): topic chip row replaced with FilterPicker.
        Single-select via toggle handlers — turning one ON sets the
        topic; turning OFF the active one reverts to 'all'.
      */}
      <View style={styles.topicTriggerWrap}>
        <FilterPicker
          triggerLabel={
            selectedTopic === 'all'
              ? 'Topic'
              : `Topic: ${TOPIC_LABEL[selectedTopic as Exclude<typeof selectedTopic, 'all'>]}`
          }
          title="Video Topic"
          compact
          options={[
            {
              // 2026-04-30 (V2.4 audit): "All Topics" = unfiltered baseline.
              // Don't count it as active or trigger pill says "(1)" when
              // nothing is being filtered. Same fix as Camp + Hike maps.
              key: 'all',
              label: 'All Topics',
              hint: 'No topic filter',
              active: false,
            },
            ...topics.map((t) => ({
              key: t,
              label: TOPIC_LABEL[t],
              active: selectedTopic === t,
            })),
          ]}
          onChange={(key, next) => {
            if (next) setSelectedTopic(key as any);
            else if (selectedTopic === key) setSelectedTopic('all');
          }}
          onClearAll={() => setSelectedTopic('all')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.note}>
            Curated educational videos from credible sources. Tapping a row opens YouTube.
            Videos are not affiliated with MDHuntFishOutdoors.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No videos in this topic.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // 2026-04-30 (V2.4): topic chip ScrollView retired in favor of
  // FilterPicker. Wrapper provides the same dark-bar chrome.
  topicTriggerWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  list: { padding: 12, paddingBottom: 32 },
  note: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
    padding: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdRed,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowIconText: { color: Colors.textPrimary, fontSize: 16 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  rowMeta: { fontSize: 11, color: Colors.textMuted },
  rowChevron: { fontSize: 20, color: Colors.textMuted, marginLeft: 8 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
