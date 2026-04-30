/**
 * @file deepLinkService.ts
 * @description Universal Link handler for MDHuntFishOutdoors.
 * Handles camp invite links: https://davidstonko.github.io/huntmaryland-site/join/{inviteCode}
 *
 * Link format: https://davidstonko.github.io/huntmaryland-site/join/ABC123
 * Fallback: Opens App Store if app not installed
 * Custom URL scheme: huntmaryland://join/{inviteCode}
 *
 * Usage:
 *   import { initializeDeepLinks, shareCampInvite } from '@/services/deepLinkService';
 *
 *   // In App.tsx or root component:
 *   useEffect(() => {
 *     initializeDeepLinks(navigation);
 *   }, [navigation]);
 *
 *   // When sharing a camp invite:
 *   shareCampInvite('My Hunt Camp', 'ABC123DEF456');
 */

import { Linking, Share, Alert } from 'react-native';

/**
 * Parse invite code from various URL formats
 * @param url Full URL or path
 * @returns Invite code or null if invalid
 */
export const parseInviteCode = (url: string): string | null => {
  if (!url) return null;

  try {
    // Handle query parameter format: ?camp=ABC123
    const queryMatch = url.match(/[?&]camp=([a-zA-Z0-9]+)/);
    if (queryMatch && queryMatch[1]) {
      return queryMatch[1];
    }

    // Handle Universal Link with path: https://davidstonko.github.io/huntmaryland-site/join/ABC123
    const universalMatch = url.match(
      /https:\/\/davidstonko\.github\.io\/huntmaryland-site\/join\/([a-zA-Z0-9]+)/
    );
    if (universalMatch && universalMatch[1]) {
      return universalMatch[1];
    }

    // Handle custom URL scheme with path: huntmaryland://join/ABC123
    const customSchemeMatch = url.match(/huntmaryland:\/\/join\/([a-zA-Z0-9]+)/);
    if (customSchemeMatch && customSchemeMatch[1]) {
      return customSchemeMatch[1];
    }

    // Handle custom URL scheme with query: huntmaryland://join?camp=ABC123
    const customSchemeQueryMatch = url.match(/huntmaryland:\/\/join\?camp=([a-zA-Z0-9]+)/);
    if (customSchemeQueryMatch && customSchemeQueryMatch[1]) {
      return customSchemeQueryMatch[1];
    }

    // Handle path-only format: /join/ABC123
    const pathOnlyMatch = url.match(/\/join\/([a-zA-Z0-9]+)/);
    if (pathOnlyMatch && pathOnlyMatch[1]) {
      return pathOnlyMatch[1];
    }

    return null;
  } catch (error) {
    console.error('[deepLinkService] Error parsing invite code:', error);
    return null;
  }
};

/**
 * Generate a shareable Universal Link for a camp invite
 * @param inviteCode The invite code from DeerCampContext
 * @returns Full shareable URL
 */
export const generateShareLink = (inviteCode: string): string => {
  return `https://davidstonko.github.io/huntmaryland-site/join/${inviteCode}`;
};

/**
 * Handle deep link navigation
 * @param url The deep link URL
 * @param navigation React Navigation navigation object
 */
export const handleDeepLink = (
  url: string,
  navigation: any
): void => {
  if (!navigation) {
    console.warn('[deepLinkService] Navigation object not available');
    return;
  }

  const inviteCode = parseInviteCode(url);

  if (inviteCode) {
    // Navigate to Deer Camp screen with invite code
    navigation.navigate('DeerCamp', {
      screen: 'DeerCampScreen',
      params: {
        inviteCode,
        autoJoin: true,
      },
    });
  } else {
    console.warn('[deepLinkService] Invalid or unparseable invite link:', url);
    Alert.alert(
      'Invalid Invite Link',
      'The camp invite link is invalid or expired. Please try again or ask the camp organizer to resend the invite.'
    );
  }
};

/**
 * Initialize deep link listeners
 * Call this once in App.tsx or root component useEffect
 * @param navigation React Navigation navigation object
 */
export const initializeDeepLinks = (navigation: any): (() => void) => {
  const handleDeepLinkEvent = (event: { url: string }) => {
    if (!event.url) return;

    const inviteCode = parseInviteCode(event.url);
    if (inviteCode) {
      handleDeepLink(event.url, navigation);
    }
  };

  // Listen for deep links while app is open
  const subscription = Linking.addEventListener('url', handleDeepLinkEvent);

  // Check for deep link that opened the app initially
  Linking.getInitialURL()
    .then((url) => {
      if (url != null) {
        handleDeepLinkEvent({ url });
      }
    })
    .catch((err) => {
      console.error('[deepLinkService] Error reading initial URL:', err);
    });

  // Return cleanup function
  return () => {
    subscription.remove();
  };
};

/**
 * Trigger iOS share sheet with camp invite link
 * @param campName Display name of the camp
 * @param inviteCode The invite code
 */
export const shareCampInvite = async (
  campName: string,
  inviteCode: string
): Promise<void> => {
  try {
    const shareLink = generateShareLink(inviteCode);
    const message = `Join my Deer Camp "${campName}" on MDHuntFishOutdoors!`;

    const result = await Share.share({
      message,
      url: shareLink, // iOS only: pass URL separately for universal link
      title: `Deer Camp Invite: ${campName}`,
    });

    if (result.action === Share.dismissedAction) {
      console.log('[deepLinkService] Share sheet dismissed');
    }
  } catch (error) {
    console.error('[deepLinkService] Error sharing camp invite:', error);
    Alert.alert(
      'Share Failed',
      'Unable to share the camp invite. Please try again.'
    );
  }
};

/**
 * Open app store fallback if app not installed
 * Used by web fallback page when user clicks invite without app
 * @param teamId Apple Developer Team ID (e.g., 'A1B2C3D4E5')
 */
export const getAppStoreURL = (teamId: string = 'TEAM_ID'): string => {
  return `https://apps.apple.com/app/id6761347484`;
};
