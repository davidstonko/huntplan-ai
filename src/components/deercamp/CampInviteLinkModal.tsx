/**
 * CampInviteLinkModal
 *
 * Moderator-facing modal for sharing a deer camp invite link.
 *
 * Added 2026-04-20 per user directive: "They should be able to invite other
 * members, which would create a link to the deer camp. If the user they are
 * sharing to over text message isn't on the app, then it would direct them
 * to the app store to download it."
 *
 * Link format (handled by Universal Links on iOS):
 *   https://davidstonko.github.io/huntmaryland-site/join/{inviteCode}
 *   (was https://mdhuntfishoutdoors.com/i/{inviteCode} pre-2026-04-28; we
 *    don't own that domain so the AASA handshake would fail. Realigned
 *    on the GitHub Pages domain we actually serve AASA from.)
 *
 * When the recipient already has the app installed, iOS opens it directly
 * via the AASA (apple-app-site-association) handshake and the
 * `deepLinkRouter` catches the URL, switches to Hunt mode, and navigates to
 * `DeerCampTab` with `inviteCode` in params. When the recipient does NOT
 * have the app installed, Safari falls through to the URL, which is served
 * by our marketing site as a redirect to the App Store listing. No extra
 * work is required client-side for that fallback — it's a server-side
 * concern handled by huntmaryland-site.
 *
 * We also expose a `mdhuntfish://camp/invite/{code}` custom-scheme link as a
 * secondary shareable in case someone wants to wire a non-iOS share path.
 *
 * "Share" opens the native iOS share sheet (iMessage, Mail, WhatsApp, etc.)
 * via React Native's `Share.share` API. On iOS the share sheet includes a
 * built-in "Copy" action, so we don't need a third-party Clipboard package
 * for the copy flow. Tapping a link row also re-opens the share sheet for
 * that row's URL so users can quickly share either form.
 *
 * Works identically for locally-created camps (which use `camp.id` as the
 * invite code fallback) and synced camps (which use the server-issued
 * `inviteCode`).
 */

import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Colors from '../../theme/colors';
import { DeerCamp } from '../../types/deercamp';

interface Props {
  visible: boolean;
  camp: DeerCamp | null;
  onClose: () => void;
}

// 2026-04-28 (audit fix): we don't own mdhuntfishoutdoors.com — links
// generated against it would fail DNS / not resolve to our AASA, so the
// recipient's iOS device can't claim the URL for the app and Safari
// falls into a dead page. Realigned on the GitHub Pages domain that
// already serves our AASA file (and that `deepLinkRouter.parseLink`
// already accepts via the /huntmaryland-site/join/{code} branch).
// shareCampInvite (the Share Link via Messages flow) was already on
// this domain — this modal was the parallel-but-broken share path.
const UNIVERSAL_LINK_BASE = 'https://davidstonko.github.io/huntmaryland-site/join/';
const CUSTOM_SCHEME_BASE = 'mdhuntfish://camp/invite/';

export default function CampInviteLinkModal({ visible, camp, onClose }: Props) {
  /**
   * Choose the invite code. The server-issued `inviteCode` is preferred; fall
   * back to the local `camp.id` so users can still share a link before the
   * camp has synced. Server-side redirect resolves either form to the same
   * camp via `camp_id_or_invite_code` lookup.
   */
  const inviteCode = useMemo(() => {
    if (!camp) return '';
    return camp.inviteCode ?? camp.id;
  }, [camp]);

  const universalLink = useMemo(
    () => (inviteCode ? `${UNIVERSAL_LINK_BASE}${inviteCode}` : ''),
    [inviteCode],
  );
  const customSchemeLink = useMemo(
    () => (inviteCode ? `${CUSTOM_SCHEME_BASE}${inviteCode}` : ''),
    [inviteCode],
  );

  const shareLink = useCallback(
    async (link: string) => {
      if (!link || !camp) return;
      try {
        await Share.share({
          message:
            `Join the "${camp.name}" deer camp on MDHuntFishOutdoors:\n${link}\n\n` +
            "If the app isn't installed yet, this link will send you to the App Store.",
          url: link, // iOS uses url for preview; Android ignores
          title: `Invite to ${camp.name}`,
        });
      } catch (err) {
        // User-cancelled share is not an error worth surfacing.
        // eslint-disable-next-line no-console
        console.warn('[CampInviteLinkModal] Share failed:', err);
      }
    },
    [camp],
  );

  if (!camp) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Invite to {camp.name}</Text>
            <Pressable onPress={onClose} hitSlop={16}>
              <Text style={styles.close}>CLOSE</Text>
            </Pressable>
          </View>

          <Text style={styles.body}>
            Share this link to add members to the camp. If the recipient does
            not have the app installed yet, the link takes them to the App
            Store.
          </Text>

          <Pressable style={styles.linkBox} onPress={() => shareLink(universalLink)}>
            <Text style={styles.linkLabel}>UNIVERSAL LINK · TAP TO SHARE</Text>
            <Text style={styles.linkValue} numberOfLines={2}>
              {universalLink}
            </Text>
          </Pressable>

          <Pressable style={styles.linkBox} onPress={() => shareLink(customSchemeLink)}>
            <Text style={styles.linkLabel}>CUSTOM SCHEME · TAP TO SHARE</Text>
            <Text style={styles.linkValue} numberOfLines={2}>
              {customSchemeLink}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => shareLink(universalLink)}
          >
            <Text style={styles.btnTextPrimary}>Share invite link</Text>
          </Pressable>

          <Text style={styles.footnote}>
            Only the creator and moderators of a camp should share the invite
            link. Anyone with the link can join the camp.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingBottom: 36,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderColor: Colors.mud,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  close: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  linkBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  linkLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  linkValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Menlo',
  },
  btn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: Colors.mdRed,
  },
  btnTextPrimary: {
    color: Colors.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  footnote: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
});
