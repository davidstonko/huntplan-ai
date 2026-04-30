import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Colors from '../theme/colors';

interface SplashDisclaimerProps {
  onAccept: () => void;
}

export default function SplashDisclaimer({ onAccept }: SplashDisclaimerProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Maryland Flag Accent Bar */}
          <View style={styles.mdFlagBar}>
            <View style={[styles.mdStripe, { backgroundColor: '#E03C31' }]} />
            <View style={[styles.mdStripe, { backgroundColor: '#FFD700' }]} />
            <View style={[styles.mdStripe, { backgroundColor: '#1C1C1C' }]} />
            <View style={[styles.mdStripe, { backgroundColor: '#F5F5DC' }]} />
          </View>

          {/* App Title */}
          <View style={styles.logoArea}>
            <Text style={styles.title}>MDHuntFishOutdoors</Text>
            <Text style={styles.subtitle}>Hunt  {'\u00B7'}  Fish  {'\u00B7'}  Camp  {'\u00B7'}  Hike</Text>
            <Text style={styles.tagline}>Maryland's outdoor planning companion</Text>
          </View>

          {/* Disclaimer Card */}
          <View style={styles.disclaimerBox}>
            <View style={styles.disclaimerHeader}>
              <Text style={styles.disclaimerHeading}>IMPORTANT DISCLAIMER</Text>
            </View>

            <Text style={styles.disclaimerText}>
              MDHuntFishOutdoors is a planning tool for hunting, fishing,
              camping, and hiking in Maryland. This application is NOT legal
              advice and does not replace your responsibility to follow all
              applicable laws and regulations.
            </Text>

            <Text style={styles.disclaimerText}>
              <Text style={styles.bold}>Always verify current rules</Text> with
              the Maryland Department of Natural Resources (DNR), the U.S.
              Forest Service, the National Park Service, and the Appalachian
              Trail Conservancy as applicable. Seasons, limits, access rules,
              and trail conditions change frequently.
            </Text>

            <Text style={styles.disclaimerText}>
              You are solely responsible for:
            </Text>

            <Text style={styles.bulletPoint}>
              Obtaining required licenses, permits, and reservations
            </Text>
            <Text style={styles.bulletPoint}>
              Verifying current seasons, bag limits, and access windows
            </Text>
            <Text style={styles.bulletPoint}>
              Understanding weapon restrictions, fishing regulations, and
              land-use rules
            </Text>
            <Text style={styles.bulletPoint}>
              Confirming trail, campsite, and public-land access rights
            </Text>
            <Text style={styles.bulletPoint}>
              Following all local, state, and federal laws
            </Text>

            <View style={styles.warningBar}>
              <Text style={styles.warningText}>
                Data may not reflect current regulations or conditions. When
                in doubt, contact the relevant agency directly.
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptButtonText}>I understand — continue</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By continuing, you acknowledge this disclaimer and accept full
            responsibility for verifying current rules and conditions before
            any trip.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mdFlagBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
    marginHorizontal: 40,
  },
  mdStripe: {
    flex: 1,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.tan,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.sage,
    marginTop: 6,
    letterSpacing: 2,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  disclaimerBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disclaimerHeader: {
    backgroundColor: Colors.forestDark,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  disclaimerHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.amber,
    letterSpacing: 1.5,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  bold: {
    fontWeight: '700',
    color: Colors.tan,
  },
  bulletPoint: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginLeft: 28,
    marginBottom: 4,
    paddingRight: 16,
  },
  warningBar: {
    backgroundColor: Colors.mud,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  warningText: {
    fontSize: 12,
    color: Colors.amber,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  acceptButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptButtonText: {
    color: Colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
});
