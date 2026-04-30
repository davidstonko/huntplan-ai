/**
 * GearGuideScreen — Long-form buyer's-guide articles for hunt and fish gear.
 *
 * Shows an expandable list of vetted, category-based guides. Each article
 * is pure text+bullets stored inline — no CMS, no network. Opens into a
 * full-screen reader with a "View related gear on Amazon" button that
 * deep-links to StarterGearScreen (affiliate link on the actual items).
 *
 * Built 2026-04-17 for V2.2.0 resubmission.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import Colors from '../theme/colors';

interface Guide {
  id: string;
  category: 'hunt' | 'fish' | 'both';
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

const GUIDES: Guide[] = [
  {
    id: 'choosing-deer-rifle',
    category: 'hunt',
    title: 'Choosing a Deer Rifle for Maryland',
    summary: 'Caliber, action type, and fit considerations for MD whitetail.',
    sections: [
      {
        heading: 'MD caliber regulations',
        body:
          'MD firearm season allows a wide range of centerfire calibers for deer. Shotgun-only counties require 10, 12, 16, or 20 gauge with slug or buckshot. Always check the current DNR regulations for the county you\u2019ll be hunting.',
      },
      {
        heading: 'Popular calibers',
        body:
          '.243 Winchester (light recoil, adequate for deer at typical MD ranges). .270 Winchester (classic, flat-shooting). .308 Winchester (versatile, widely available). 6.5 Creedmoor (growing in popularity, mild recoil, excellent ballistics). .30-06 Springfield (traditional, plenty of energy).',
      },
      {
        heading: 'Action type',
        body:
          'Bolt-action is the most popular choice for deer — accurate, reliable, and available in every price range. Semi-auto rifles are legal where allowed and offer fast follow-up shots. Lever-action rifles like .30-30 are effective at MD\u2019s typical 50-150 yard woods shots.',
      },
      {
        heading: 'Fit & optics',
        body:
          'Length of pull, comb height, and recoil pad matter more than caliber. Have the rifle professionally fit if possible. A 3-9x40 or 2-7x33 scope covers most MD deer-hunting situations.',
      },
    ],
  },
  {
    id: 'choosing-bow',
    category: 'hunt',
    title: 'Choosing a Compound Bow',
    summary: 'Draw length, draw weight, and let-off explained.',
    sections: [
      {
        heading: 'Draw length',
        body:
          'Draw length is determined by your arm span. Most shops measure this in about 30 seconds. Mismatched draw length is the #1 cause of inconsistent archery shooting.',
      },
      {
        heading: 'Draw weight',
        body:
          'MD requires at least 30 lbs of draw weight for deer. 40-55 lbs is comfortable for most hunters and plenty of energy for MD whitetail.',
      },
      {
        heading: 'Let-off',
        body:
          'Modern compound bows have 75-90% let-off, meaning you hold only 25-10% of peak weight at full draw. This makes holding a shot for extended periods much more manageable.',
      },
      {
        heading: 'Accessories',
        body:
          'Sight (3-pin or single adjustable), arrow rest (drop-away or containment), release aid (index or thumb), quiver, stabilizer, and broadheads (fixed-blade or mechanical per your regulations).',
      },
    ],
  },
  {
    id: 'stand-types',
    category: 'hunt',
    title: 'Tree Stand Types — Climber vs Ladder vs Hang-On',
    summary: 'Pick the right stand style for your land access.',
    sections: [
      {
        heading: 'Climber stands',
        body:
          'Two-piece stand that ratchets up a straight, limb-free tree. Pros: mobile, no preparation needed. Cons: requires the right tree, heavy to pack in, steeper learning curve.',
      },
      {
        heading: 'Ladder stands',
        body:
          'Semi-permanent fixed stand with ladder sections. Pros: stable, comfortable, great for public land groups or private property. Cons: heavy, not easily moved, more visible to deer.',
      },
      {
        heading: 'Hang-on stands',
        body:
          'Separate stand + climbing sticks. Pros: lightweight, set high and hidden. Cons: requires practice to hang safely. Always use a lineman\u2019s belt AND a lifeline.',
      },
      {
        heading: 'Safety',
        body:
          'Wear a full-body harness from the moment you leave the ground until you return. A lifeline connects your harness to the tree for the entire climb. Falls from tree stands are the #1 cause of hunting injuries.',
      },
    ],
  },
  {
    id: 'beginner-fly',
    category: 'fish',
    title: 'Fly Fishing for MD Trout — Beginner Setup',
    summary: 'Rod weight, line type, and flies for Gunpowder/Savage.',
    sections: [
      {
        heading: 'Rod & line weight',
        body:
          'A 5-weight 9-foot rod is the most versatile choice for MD trout streams. Pair with a weight-forward floating line in the matching weight.',
      },
      {
        heading: 'Leader & tippet',
        body:
          'Start with a 9-foot 4X or 5X tapered leader. Carry spools of 4X, 5X, and 6X tippet. Fluorocarbon is less visible but pricier; monofilament is fine for most situations.',
      },
      {
        heading: 'Essential flies',
        body:
          'Dry: Elk Hair Caddis (#14-16), Parachute Adams (#14-18), BWO (#18-20). Nymph: Pheasant Tail (#14-18), Hare\u2019s Ear (#14-16), Zebra Midge (#18-22). Streamer: Woolly Bugger in black or olive (#6-10).',
      },
      {
        heading: 'Reading water',
        body:
          'Fish feeding lies: edges of riffles, seams where fast and slow water meet, soft water behind rocks, undercut banks. Trout spend most of their energy in slow water near fast water.',
      },
    ],
  },
  {
    id: 'striper-season',
    category: 'fish',
    title: 'Chesapeake Striper — Spring & Fall Techniques',
    summary: 'Live-lining, trolling, jigging by season.',
    sections: [
      {
        heading: 'Spring (April-May)',
        body:
          'Spring trophy season targets pre-spawn fish. Trolling large bucktails, parachutes, and umbrella rigs with chartreuse shads is the classic Chesapeake technique. Check current DNR regulations for closure areas and size/creel limits — these change annually.',
      },
      {
        heading: 'Summer (June-Aug)',
        body:
          'Dawn topwater bite with poppers and walkers can be incredible around points and flats. As water warms, fish move deeper — jigging soft plastics on bottom produces well.',
      },
      {
        heading: 'Fall (Sep-Nov)',
        body:
          'Breaking fish on bait schools — cast metal spoons and soft plastics into the melee. Look for diving gulls. Fall striper action on the Chesapeake is legendary.',
      },
      {
        heading: 'Winter (Dec-Mar)',
        body:
          'Check current regulations — the winter catch-and-release and harvest windows shift. Deep-water jigging with heavy bucktails tipped with plastic shad is the primary technique.',
      },
    ],
  },
  {
    id: 'bow-tuning',
    category: 'hunt',
    title: 'Paper-Tuning a Compound Bow',
    summary: 'Diagnose and fix arrow flight issues at home.',
    sections: [
      {
        heading: 'What is paper tuning',
        body:
          'Shooting an arrow through a sheet of paper from about 6 feet away and analyzing the tear pattern. A perfect bullet hole indicates the arrow is flying straight out of the bow.',
      },
      {
        heading: 'Tear reading',
        body:
          'Tail-high tear: rest is too low, or nocking point too high. Tail-low: opposite. Tail-right (for a right-handed shooter): rest needs to move left, OR arrow is too stiff. Tail-left: opposite.',
      },
      {
        heading: 'Systematic approach',
        body:
          'Adjust the rest first in tiny increments (1/32" at a time). Re-shoot after each change. Only move to nock-point adjustments after horizontal tears are cleaned up.',
      },
    ],
  },
  {
    id: 'scent-control',
    category: 'hunt',
    title: 'Scent Control for Deer Hunting',
    summary: 'Keep human odor off your stand.',
    sections: [
      {
        heading: 'Shower & clothes',
        body:
          'Shower with scent-free soap before every hunt. Store hunting clothes in a sealed bag or tote with leaves/dirt from your hunting area. Dress at the vehicle or trailhead, not at home.',
      },
      {
        heading: 'Wind',
        body:
          'No amount of scent control beats hunting the wind. Always plan your stand approach and your stand\u2019s sit direction so wind carries your scent away from where you expect deer.',
      },
      {
        heading: 'Thermals',
        body:
          'Morning: air falls downhill as it cools. Evening: air rises uphill as it warms. Adjust your stand selection based on the thermal — a morning ridge stand may need to be an evening valley stand.',
      },
    ],
  },
  {
    id: 'calling-strategy',
    category: 'hunt',
    title: 'When to Call (and When to Shut Up)',
    summary: 'Grunting, bleating, rattling — timing matters.',
    sections: [
      {
        heading: 'Pre-rut (late Oct)',
        body:
          'Soft grunts and estrus bleats draw attention. Keep it sparse — a call every 20-30 minutes is plenty. Rattling can work but keep it light.',
      },
      {
        heading: 'Rut (early-mid Nov)',
        body:
          'This is when aggressive calling works. Hard rattling, loud grunts, and snort-wheezes can pull bucks from 200+ yards. Remember: if you can\u2019t see a buck, he may be circling downwind.',
      },
      {
        heading: 'Post-rut (late Nov-Dec)',
        body:
          'Calling drops in effectiveness. Stick to food and cover. Soft doe bleats can occasionally work on young bucks.',
      },
    ],
  },
];

export default function GearGuideScreen() {
  const [selected, setSelected] = useState<Guide | null>(null);

  const renderItem = ({ item }: { item: Guide }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardBadge}>
          {item.category === 'hunt' ? 'HUNT' : item.category === 'fish' ? 'FISH' : 'BOTH'}
        </Text>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardSummary}>{item.summary}</Text>
      <Text style={styles.cardRead}>{'Read guide \u2192'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={GUIDES}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.intro}>
            Long-form guides written for Maryland conditions. All content is self-contained and
            available offline. No third-party ads or trackers.
          </Text>
        }
      />

      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setSelected(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>{'\u2715'}</Text>
              </Pressable>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selected.title}
              </Text>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalSummary}>{selected.summary}</Text>
              {selected.sections.map((s, idx) => (
                <View key={idx} style={styles.section}>
                  <Text style={styles.sectionHeading}>{s.heading}</Text>
                  <Text style={styles.sectionBody}>{s.body}</Text>
                </View>
              ))}
              <View style={styles.footer}>
                <Text style={styles.footerNote}>
                  This guide is general advice based on common MD conditions. Always verify current
                  DNR regulations before hunting or fishing. Seek professional instruction before
                  attempting new techniques in the field.
                </Text>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 12, paddingBottom: 32 },
  intro: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
    padding: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.moss,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mdGold,
    backgroundColor: Colors.forestDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  cardSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardRead: { fontSize: 12, fontWeight: '600', color: Colors.moss },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 56,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mud,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeText: { color: Colors.textPrimary, fontSize: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 40 },
  modalSummary: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.tan,
    marginBottom: 18,
    lineHeight: 20,
  },
  section: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.mdGold,
    marginBottom: 6,
  },
  sectionBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  footer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdRed,
  },
  footerNote: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
