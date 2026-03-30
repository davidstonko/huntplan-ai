import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ImageBackground,
  ImageSourcePropType,
} from 'react-native';
import Colors from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// BUNDLED SPLASH PHOTOS
// Real user-submitted photos. In a future version, community photos will be
// fetched from the backend after content moderation review.
// ─────────────────────────────────────────────────────────────────────────────

const SPLASH_PHOTOS = {
  sunsetDeer: require('../../assets/splash/splash_sunset_deer.jpg'),
  buckCrossbow: require('../../assets/splash/splash_buck_crossbow.jpg'),
  buckCloseup: require('../../assets/splash/splash_buck_closeup.jpg'),
  arrow: require('../../assets/splash/splash_arrow.jpg'),
};

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCENES
// Mix of photo-backed scenes and emoji-only scenes for variety.
// Photo scenes use real hunting photos; emoji scenes are fallbacks.
// ─────────────────────────────────────────────────────────────────────────────

interface SplashScene {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  bgColorTop: string;
  bgColorBottom: string;
  image?: ImageSourcePropType;
}

const SPLASH_SCENES: SplashScene[] = [
  // ── Photo-backed scenes (real user photos) ──
  {
    id: 'sunset_deer',
    emoji: '🦌',
    title: 'MDHuntFishOutdoors',
    tagline: 'Every season. Every county. One app.',
    bgColorTop: '#1A2E1A',
    bgColorBottom: '#0D1A0D',
    image: SPLASH_PHOTOS.sunsetDeer,
  },
  {
    id: 'buck_crossbow',
    emoji: '🎯',
    title: 'MDHuntFishOutdoors',
    tagline: 'Know before you go',
    bgColorTop: '#2A2210',
    bgColorBottom: '#1A150A',
    image: SPLASH_PHOTOS.buckCrossbow,
  },
  {
    id: 'buck_closeup',
    emoji: '🏆',
    title: 'MDHuntFishOutdoors',
    tagline: 'Maryland\'s outdoor planning companion',
    bgColorTop: '#1A2E1A',
    bgColorBottom: '#0D1A0D',
    image: SPLASH_PHOTOS.buckCloseup,
  },
  {
    id: 'arrow',
    emoji: '🏹',
    title: 'MDHuntFishOutdoors',
    tagline: '192 public lands at your fingertips',
    bgColorTop: '#2A1A0D',
    bgColorBottom: '#1A0E05',
    image: SPLASH_PHOTOS.arrow,
  },
  // ── Emoji-only fallback scenes ──
  {
    id: 'forest',
    emoji: '🌲',
    title: 'MDHuntFishOutdoors',
    tagline: 'Seasons, regs, and maps — all in one',
    bgColorTop: '#0D2A1A',
    bgColorBottom: '#061510',
  },
  {
    id: 'bay',
    emoji: '🦀',
    title: 'OutdoorsMaryland',
    tagline: 'Hunt · Fish · Crab · Hike · Boat',
    bgColorTop: '#1A1A2A',
    bgColorBottom: '#0D0D15',
  },
];

interface AnimatedSplashProps {
  onFinish: () => void;
  duration?: number; // total splash duration in ms
}

/**
 * AnimatedSplash — Full-screen animated splash that shows a random scene
 * with real hunting photos or Maryland-themed emoji compositions.
 *
 * Photo scenes: full-bleed background image with dark overlay + animated text
 * Emoji scenes: gradient background with large emoji + animated text
 *
 * FUTURE: Community Photo Module
 * - Users submit photos via social tab
 * - Backend runs content moderation (nudity, violence, copyright)
 * - Approved photos cached to AsyncStorage
 * - Splash picks from cached community photos + bundled photos
 * - Photo credit shown in bottom corner
 */
export default function AnimatedSplash({
  onFinish,
  duration = 2800,
}: AnimatedSplashProps) {
  // Pick a random scene
  const [scene] = useState(
    () => SPLASH_SCENES[Math.floor(Math.random() * SPLASH_SCENES.length)]
  );

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleEmoji = useRef(new Animated.Value(0.3)).current;
  const slideTitle = useRef(new Animated.Value(30)).current;
  const fadeTagline = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const flagSlide = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const imageScale = useRef(new Animated.Value(1.1)).current; // Ken Burns zoom

  useEffect(() => {
    // Ken Burns slow zoom on photo backgrounds
    if (scene.image) {
      Animated.timing(imageScale, {
        toValue: 1.0,
        duration: duration,
        useNativeDriver: true,
      }).start();
    }

    // Phase 1: Fade in + emoji bounce (0-600ms)
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleEmoji, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Title slides up (400ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideTitle, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeTagline, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Phase 3: MD flag stripe slides across (800ms)
    setTimeout(() => {
      Animated.timing(flagSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Phase 4: Fade out everything
    setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duration - 400);
  }, []);

  const overlayContent = (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Main content */}
      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* Emoji hero (smaller on photo scenes to not compete) */}
        <Animated.Text
          style={[
            scene.image ? styles.emojiSmall : styles.emoji,
            {
              transform: [{ scale: scaleEmoji }],
            },
          ]}
        >
          {scene.emoji}
        </Animated.Text>

        {/* App name */}
        <Animated.View
          style={{
            transform: [{ translateY: slideTitle }],
          }}
        >
          <Text style={styles.logoMark}>OMD</Text>
          <Text style={styles.title}>{scene.title}</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: fadeTagline }]}>
          {scene.tagline}
        </Animated.Text>
      </Animated.View>

      {/* MD flag stripe animation */}
      <Animated.View
        style={[
          styles.flagStripe,
          { transform: [{ translateX: flagSlide }] },
        ]}
      >
        <View style={[styles.flagBlock, { backgroundColor: Colors.mdRed }]} />
        <View style={[styles.flagBlock, { backgroundColor: Colors.mdGold }]} />
        <View style={[styles.flagBlock, { backgroundColor: Colors.mdBlack }]} />
        <View style={[styles.flagBlock, { backgroundColor: Colors.mdWhite }]} />
      </Animated.View>

      {/* Footer */}
      <Animated.Text style={[styles.version, { opacity: fadeTagline }]}>
        v1.0 — Maryland
      </Animated.Text>
    </Animated.View>
  );

  // Photo-backed scene: full-bleed image with Ken Burns + dark overlay
  if (scene.image) {
    return (
      <View style={styles.outerContainer}>
        <Animated.View
          style={[
            styles.imageWrapper,
            { transform: [{ scale: imageScale }] },
          ]}
        >
          <ImageBackground
            source={scene.image}
            style={styles.imageBackground}
            resizeMode="cover"
          />
        </Animated.View>
        <View style={styles.imageOverlay} />
        {overlayContent}
      </View>
    );
  }

  // Emoji-only scene: gradient background
  return (
    <View style={styles.outerContainer}>
      <View
        style={[styles.bgTop, { backgroundColor: scene.bgColorTop }]}
      />
      <View
        style={[styles.bgBottom, { backgroundColor: scene.bgColorBottom }]}
      />
      {overlayContent}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  imageBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 10, 0.55)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 96,
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  emojiSmall: {
    fontSize: 56,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  logoMark: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.oak,
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.tan,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    color: Colors.sage,
    marginTop: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  flagStripe: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    marginHorizontal: 60,
    overflow: 'hidden',
  },
  flagBlock: {
    flex: 1,
  },
  version: {
    position: 'absolute',
    bottom: 60,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});
