/**
 * GroupCampContext — Manages collaborative shared maps for camping trips.
 * AsyncStorage-backed persistence (V2) with WatermelonDB planned for V3+.
 * Simplified version of DeerCampContext without WebSocket sync.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CampMember,
  SharedAnnotation as DeerCampSharedAnnotation,
  ActivityFeedItem,
  MEMBER_COLORS,
} from '../types/deercamp';

const STORAGE_KEY = '@group_camps';
const CURRENT_USER_KEY = '@current_user';

export type SharedAnnotation = DeerCampSharedAnnotation;

export interface GroupCamp {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string; // userId
  inviteCode?: string; // 6-char alphanumeric code for sharing via Universal Link
  centerPoint: { lat: number; lng: number };
  defaultZoom: number;
  members: CampMember[];
  annotations: SharedAnnotation[];
  activityFeed: ActivityFeedItem[];
}

interface GroupCampContextType {
  camps: GroupCamp[];
  currentUserId: string;
  currentUsername: string;

  // Camp CRUD
  createCamp: (name: string, centerPoint: { lat: number; lng: number }) => GroupCamp;
  deleteCamp: (campId: string) => void;
  getCamp: (campId: string) => GroupCamp | undefined;

  // Members
  addMember: (campId: string, username: string) => void;
  removeMember: (campId: string, userId: string) => void;

  // Annotations
  addAnnotation: (campId: string, annotation: SharedAnnotation) => void;
  removeAnnotation: (campId: string, annotationId: string) => void;

  // Invite sharing
  shareGroupCampInvite: (campId: string) => Promise<void>;
  joinGroupCampByInvite: (inviteCode: string) => GroupCamp | null;
  getGroupCampByInviteCode: (inviteCode: string) => GroupCamp | undefined;
}

const GroupCampContext = createContext<GroupCampContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Generate a 6-character alphanumeric invite code */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Base URL for camp invite Universal Links */
const INVITE_BASE_URL = 'https://davidstonko.github.io/huntmaryland-site/join';

function addFeedItem(
  userId: string,
  username: string,
  action: string,
  annotationId?: string
): ActivityFeedItem {
  return {
    id: generateId(),
    userId,
    username,
    action,
    timestamp: new Date().toISOString(),
    annotationId,
  };
}

export function GroupCampProvider({ children }: { children: ReactNode }) {
  const [camps, setCamps] = useState<GroupCamp[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  // ── Load from AsyncStorage ──
  useEffect(() => {
    (async () => {
      try {
        // Load user profile
        let userId = '';
        let username = '';
        const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
        if (userJson) {
          const user = JSON.parse(userJson);
          userId = user.id || '';
          username = user.username || '';
        } else {
          // Generate a local user ID for V2
          const localId = generateId();
          const localUser = { id: localId, username: 'Me' };
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(localUser));
          userId = localId;
          username = 'Me';
        }

        setCurrentUserId(userId);
        setCurrentUsername(username);

        // Load camps from AsyncStorage
        const campsJson = await AsyncStorage.getItem(STORAGE_KEY);
        if (campsJson) {
          const loadedCamps: GroupCamp[] = JSON.parse(campsJson);
          // 2026-05-01 (V2.4 audit, iter 3): backfill inviteCode for
          // legacy records that pre-date the eager-generation fix
          // (commit 6518a2b1). Without this, old groups relied on the
          // lazy regeneration in shareGroupCampInvite — clean now so
          // every persisted GroupCamp has an inviteCode invariant.
          const migratedCamps = loadedCamps.map((c) =>
            typeof c?.inviteCode === 'string' && c.inviteCode.length > 0
              ? c
              : { ...c, inviteCode: generateInviteCode() },
          );
          setCamps(migratedCamps);
          if (__DEV__) console.log('[GroupCampContext] Loaded', migratedCamps.length, 'camps from AsyncStorage');
        }
      } catch (e) {
        if (__DEV__) console.warn('[GroupCampContext] Failed to load from storage:', e);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Persist camps to AsyncStorage ──
  const persistCamps = useCallback(async (updated: GroupCamp[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      if (__DEV__) console.warn('[GroupCampContext] Failed to persist camps:', e);
    }
  }, []);

  // ── Camp CRUD ──
  const createCamp = useCallback(
    (name: string, centerPoint: { lat: number; lng: number }): GroupCamp => {
      const now = new Date().toISOString();
      const campId = generateId();
      const adminMember: CampMember = {
        userId: currentUserId,
        username: currentUsername || 'Me',
        role: 'admin',
        color: MEMBER_COLORS[0],
        joinedAt: now,
      };
      const creationFeedItem: ActivityFeedItem = {
        id: generateId(),
        userId: currentUserId,
        username: currentUsername || 'Me',
        action: `created "${name}"`,
        timestamp: now,
      };

      const newCamp: GroupCamp = {
        id: campId,
        name,
        createdAt: now,
        createdBy: currentUserId,
        centerPoint,
        defaultZoom: 13,
        members: [adminMember],
        annotations: [],
        activityFeed: [creationFeedItem],
        // 2026-05-01 (V2.4 audit, second pass): generate inviteCode
        // eagerly at create time. Same fix that landed for DeerCamp on
        // 2026-04-28 — without this, the Share Link via Messages flow
        // alerts "No Share Code Yet" because the receiver-side router
        // expects a 6-char alphanumeric code in the path. Adversarial
        // audit caught GroupCamp had not received the same fix.
        inviteCode: generateInviteCode(),
      };

      const updated = [...camps, newCamp];
      setCamps(updated);
      persistCamps(updated);
      return newCamp;
    },
    [camps, currentUserId, currentUsername, persistCamps]
  );

  const deleteCamp = useCallback(
    (campId: string) => {
      const updated = camps.filter((c) => c.id !== campId);
      setCamps(updated);
      persistCamps(updated);
    },
    [camps, persistCamps]
  );

  const getCamp = useCallback(
    (campId: string) => camps.find((c) => c.id === campId),
    [camps]
  );

  // ── Members ──
  const addMember = useCallback(
    (campId: string, username: string) => {
      const now = new Date().toISOString();
      const updated = camps.map((camp) => {
        if (camp.id !== campId) return camp;
        const memberColor = MEMBER_COLORS[camp.members.length % MEMBER_COLORS.length];
        const newMember: CampMember = {
          userId: generateId(),
          username,
          role: 'member',
          color: memberColor,
          joinedAt: now,
        };
        const feedItem = addFeedItem(currentUserId, currentUsername, `invited ${username}`);
        return {
          ...camp,
          members: [...camp.members, newMember],
          activityFeed: [feedItem, ...camp.activityFeed],
        };
      });
      setCamps(updated);
      persistCamps(updated);
    },
    [camps, currentUserId, currentUsername, persistCamps]
  );

  const removeMember = useCallback(
    (campId: string, userId: string) => {
      const updated = camps.map((camp) =>
        camp.id === campId
          ? { ...camp, members: camp.members.filter((m) => m.userId !== userId) }
          : camp
      );
      setCamps(updated);
      persistCamps(updated);
    },
    [camps, persistCamps]
  );

  // ── Annotations ──
  const addAnnotation = useCallback(
    (campId: string, annotation: SharedAnnotation) => {
      const updated = camps.map((camp) => {
        if (camp.id !== campId) return camp;
        const feedItem = addFeedItem(
          currentUserId,
          currentUsername,
          `added a ${annotation.type}`,
          annotation.id
        );
        return {
          ...camp,
          annotations: [...camp.annotations, annotation],
          activityFeed: [feedItem, ...camp.activityFeed],
        };
      });
      setCamps(updated);
      persistCamps(updated);
    },
    [camps, currentUserId, currentUsername, persistCamps]
  );

  const removeAnnotation = useCallback(
    (campId: string, annotationId: string) => {
      const updated = camps.map((camp) =>
        camp.id === campId
          ? { ...camp, annotations: camp.annotations.filter((a) => a.id !== annotationId) }
          : camp
      );
      setCamps(updated);
      persistCamps(updated);
    },
    [camps, persistCamps]
  );

  /**
   * Generate an invite code for a camp (if it doesn't have one) and open
   * the iOS Share Sheet with a Universal Link.
   */
  const shareGroupCampInvite = useCallback(
    async (campId: string) => {
      let camp = camps.find((c) => c.id === campId);
      if (!camp) return;

      // Generate invite code if camp doesn't have one yet
      let inviteCode = camp.inviteCode;
      if (!inviteCode) {
        inviteCode = generateInviteCode();
        // Persist invite code to camp
        const updated = camps.map((c) =>
          c.id === campId ? { ...c, inviteCode } : c
        );
        setCamps(updated);
        persistCamps(updated);
      }

      // 2026-05-01 (V2.4 audit, second pass): switched from
      // `?camp=CODE` query string to `/CODE` path because:
      //   (1) AASA at website/.well-known/apple-app-site-association
      //       declares `/huntmaryland-site/join/*` — query strings are
      //       not part of the matching path component, so `?camp=CODE`
      //       would match the AASA pattern with NO code visible to iOS.
      //   (2) deepLinkRouter.parseLink only matches the path regex
      //       `/huntmaryland-site/join/([a-zA-Z0-9]+)`. Query string
      //       was silently ignored — the Share Link would deep-link
      //       into the app but parse no inviteCode.
      // Same path shape DeerCamp uses, so the receiver-side router
      // works for both without a separate branch.
      const url = `${INVITE_BASE_URL}/${inviteCode}`;

      try {
        await Share.share({
          message: `Join my Group Camp "${camp.name}" on MDHuntFishOutdoors!\n${url}`,
          url: url,
        });

        // Add to activity feed
        const updated = camps.map((c) => {
          if (c.id !== campId) return c;
          const feedItem = addFeedItem(currentUserId, currentUsername, 'shared an invite link');
          return { ...c, activityFeed: [feedItem, ...c.activityFeed] };
        });
        setCamps(updated);
        persistCamps(updated);
      } catch (err) {
        if (__DEV__) console.warn('[GroupCampContext] Share failed:', err);
      }
    },
    [camps, currentUserId, currentUsername, persistCamps]
  );

  /**
   * Look up a camp by its invite code.
   */
  const getGroupCampByInviteCode = useCallback(
    (inviteCode: string): GroupCamp | undefined => {
      return camps.find((c) => c.inviteCode === inviteCode);
    },
    [camps]
  );

  /**
   * Join a camp using an invite code. Called from deep link handler.
   * Auto-adds the current user as a member if not already in the camp.
   * Returns the camp on success, null if invite code not found.
   */
  const joinGroupCampByInvite = useCallback(
    (inviteCode: string): GroupCamp | null => {
      const camp = camps.find((c) => c.inviteCode === inviteCode);
      if (!camp) return null;

      // Check if user is already a member
      const alreadyMember = camp.members.some((m) => m.userId === currentUserId);
      if (!alreadyMember) {
        addMember(camp.id, currentUsername || 'Me');
      }

      return camp;
    },
    [camps, currentUserId, currentUsername, addMember]
  );

  const value: GroupCampContextType = {
    camps,
    currentUserId,
    currentUsername,
    createCamp,
    deleteCamp,
    getCamp,
    addMember,
    removeMember,
    addAnnotation,
    removeAnnotation,
    shareGroupCampInvite,
    joinGroupCampByInvite,
    getGroupCampByInviteCode,
  };

  return (
    <GroupCampContext.Provider value={value}>
      {children}
    </GroupCampContext.Provider>
  );
}

export function useGroupCamp() {
  const context = useContext(GroupCampContext);
  if (!context) {
    throw new Error('useGroupCamp must be used within GroupCampProvider');
  }
  return context;
}
