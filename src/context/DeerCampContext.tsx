/**
 * DeerCampContext — Manages collaborative shared maps called Deer Camps.
 *
 * Core state for team hunting and fishing camps. Each camp is a shared collaborative map
 * where members can add annotations (waypoints, routes, areas, tracks), upload photos,
 * and see activity from all teammates in real-time.
 *
 * V3 upgrade: Now integrates with campSyncService for backend synchronization.
 * - Offline-first: all mutations apply locally first, then queue for sync
 * - syncCamp() pulls new data from server when online
 * - joinCampByCode() joins remote camps via invite codes
 * - Auto-sync on app foreground (when network available)
 *
 * Deer Camps can:
 * - Import scouting plans from the Scout tab (converts all annotations into shared ones)
 * - Export saved GPS tracks as shared annotations
 * - Display color-coded member contributions and activity feed
 * - Manage member roster (add/remove)
 * - Sync with backend for real-time collaboration
 *
 * Persistence: AsyncStorage-backed locally + backend sync via campSyncService.
 *
 * Data flow:
 * - DeerCampScreen: Lists camps, renders camp map with all shared annotations
 * - ScoutDataContext: Plans/tracks exported to camps via importPlanToCamp/exportTrackToCamp
 * - AnnotationLayer: Renders all camp annotations (shared by all members)
 * - campSyncService: Offline queue → push pending → pull new from server
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  DeerCamp,
  CampMember,
  SharedAnnotation,
  CampPhoto,
  ActivityFeedItem,
  CampArea,
  OfflineTileStatus,
  CampDocument,
  MEMBER_COLORS,
} from '../types/deercamp';
import { HuntPlan, RecordedTrack } from '../types/scout';
import {
  syncCamp as syncCampRemote,
  createCampRemote,
  joinCampRemote,
  fetchCampRemote,
  deleteCampRemote,
  queueAction,
  getPendingCount,
} from '../services/campSyncService';

const STORAGE_KEY = '@deer_camps';
// 2026-04-27: Schema version sentinel. Bump when DeerCamp shape changes
// in a way migrateCamps can't recover from. The version-key parallel to
// STORAGE_KEY lets us branch in load logic without touching the data.
const STORAGE_VERSION_KEY = '@deer_camps_schema_version';
const CURRENT_SCHEMA_VERSION = 2;
const CURRENT_USER_KEY = '@current_user';

/**
 * DeerCampContextType — Contract for Deer Camp state and mutations.
 * @interface
 */
interface DeerCampContextType {
  /** Array of all camps owned by or joined by the current user */
  camps: DeerCamp[];
  /** ID of the current local user (generated on first launch) */
  currentUserId: string;
  /** Display name of the current user (defaults to 'Me' in V2) */
  currentUsername: string;

  // ── Camp CRUD ──
  /**
   * Create a new Deer Camp with the current user as admin.
   *
   * 2026-04-20 contract change: callers must supply the rectangular `area`
   * the user drew in CampAreaPickerScreen. centerPoint + defaultZoom are
   * derived from that area and stored for back-compat. offlineTileStatus
   * defaults to 'none' — users opt in to offline tiles via the camp detail
   * screen's "Download offline map" button.
   *
   * @param name - Camp name (e.g., "Opening Weekend 2026")
   * @param area - User-drawn rectangular bounds (anchors shared map + offline tiles)
   * @param linkedLandId - Optional link to a public hunting land (reserved for future)
   * @returns The created camp
   */
  createCamp: (name: string, area: CampArea, linkedLandId?: string) => DeerCamp;
  /** Delete a camp and all its annotations/photos (permanent) */
  deleteCamp: (campId: string) => void;
  /** Retrieve a single camp by ID */
  getCamp: (campId: string) => DeerCamp | undefined;
  /**
   * Update the offline tile status for a camp (download lifecycle).
   * Called by the offline-download service as the pack moves through
   * 'none' → 'downloading' → 'ready' | 'error'.
   */
  setCampOfflineStatus: (campId: string, status: OfflineTileStatus) => void;
  /**
   * Return the camp's share-link invite code. If the camp doesn't have
   * one yet (created before 2026-04-28 eager-generation), generate one,
   * persist it, and return it. Idempotent for camps that already have
   * a code. Returns null if the campId isn't found. Mirrors the lazy
   * pattern in `GroupCampContext.shareGroupCampInvite`.
   */
  ensureCampInviteCode: (campId: string) => string | null;

  // ── Moderator tools (admin-only UX, enforced at the call site) ──
  /** Rename a camp (admin action). Logs to the activity feed. */
  renameCamp: (campId: string, newName: string) => void;
  /**
   * Update a camp's moderator description. Pass an empty string to clear it.
   * Logs to the activity feed only when the description actually changed.
   */
  updateCampDescription: (campId: string, description: string) => void;
  /**
   * Attach a document or reference photo to a camp (admin action).
   * The caller supplies the full CampDocument (including a freshly-generated
   * id) so the UI can optimistically render before any network upload.
   */
  addCampDocument: (campId: string, document: CampDocument) => void;
  /** Remove a camp document by id (admin action). */
  removeCampDocument: (campId: string, documentId: string) => void;

  // ── Members ──
  /**
   * Add a user to a camp by username.
   * V2: Creates local user record. V3+: Will invite real users and sync.
   */
  addMember: (campId: string, username: string) => void;
  /** Remove a member from a camp (admin action) */
  removeMember: (campId: string, userId: string) => void;

  // ── Annotations (waypoints, routes, areas, tracks) ──
  /**
   * Add a shared annotation to a camp.
   * Annotations include waypoints, routes, areas, and tracks — all color-coded by creator.
   */
  addAnnotation: (campId: string, annotation: SharedAnnotation) => void;
  /** Remove a shared annotation from a camp */
  removeAnnotation: (campId: string, annotationId: string) => void;

  // ── Photos ──
  /**
   * Add a geotagged photo to a camp with optional caption.
   * Full image upload deferred to V3+; V2 stores metadata only.
   */
  addPhoto: (campId: string, photo: CampPhoto) => void;
  /** Remove a photo from a camp */
  removePhoto: (campId: string, photoId: string) => void;

  // ── Import/Export from Scout ──
  /**
   * Import a scout plan into a camp, converting all plan annotations
   * (waypoints, routes, areas, parking point) into shared annotations.
   * Creates a single activity feed entry.
   */
  importPlanToCamp: (campId: string, plan: HuntPlan) => void;
  /**
   * Export a saved GPS track to a camp as a shared annotation.
   * Tracks are independent of plans and can be shared standalone.
   */
  exportTrackToCamp: (campId: string, track: RecordedTrack) => void;

  // ── V3 Sync Functions ──
  /** Sync a camp with the backend. Returns true on success. */
  syncCamp: (campId: string) => Promise<boolean>;
  /** Join a remote camp using an invite code */
  joinCampByCode: (inviteCode: string) => Promise<boolean>;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Number of pending offline actions queued for sync */
  pendingActions: number;
}

const DeerCampContext = createContext<DeerCampContextType | undefined>(undefined);

/**
 * generateId — Lightweight unique ID generator for camps, members, and annotations.
 * Uses timestamp (base36) + random string for reasonable uniqueness.
 * @returns {string} A unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * generateInviteCode — 6-character alphanumeric invite code for share-link URLs.
 *
 * Locked at 6 chars to match the format the server uses + the regex in
 * `services/deepLinkRouter.ts`'s `parseLink()` (`[a-zA-Z0-9]+` of any length,
 * but the existing UI assumes ~6). Mirrors the helper in `GroupCampContext.tsx`.
 *
 * 2026-04-28: added so that newly-created local camps surface the
 * "Share Link via Messages" button immediately. Live audit caught that
 * `createCamp` was leaving `inviteCode` undefined → Share Link button
 * always alerted "No Share Code Yet" until the camp round-tripped through
 * the server. See live_audit_2026_04_28.md.
 *
 * @returns {string} 6-character UPPERCASE alphanumeric code (e.g. "AB12CD")
 */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * addFeedItem — Helper to create an activity feed entry for a camp action.
 *
 * Used to log when members add annotations, photos, import plans, etc.
 * Feed is displayed in the ActivityFeedPanel on the camp map.
 *
 * @param camp - The camp being updated (for timestamp)
 * @param userId - ID of the user performing the action
 * @param username - Display name of the user
 * @param action - Human-readable action string (e.g., "added a waypoint", "imported plan \"Morning Scout\"")
 * @param annotationId - Optional ID of related annotation (for linking feed to map items)
 * @param photoId - Optional ID of related photo
 * @returns {ActivityFeedItem} New feed entry
 */
/**
 * Migrate deer camps persisted before the 2026-04-20 schema change.
 *
 * Older camps were stored with only `centerPoint` + `defaultZoom` — they
 * lacked `area` and `offlineTileStatus`. We backfill a default area
 * centered on the stored centerPoint. The default area is ~1 sq mi
 * (0.014° × 0.020°), which is well under the 5 sq mi cap and matches
 * a mid-size private lease.
 *
 * This is a one-time read-side migration: the next setCamps() write
 * persists the upgraded records. Idempotent — rerunning on already-
 * migrated camps is a no-op.
 */
function migrateCamps(raw: unknown): DeerCamp[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: any) => {
    // Back-compat: area + offlineTileStatus were added 2026-04-20; description
    // + documents were added later the same day for moderator tooling. Older
    // records may be missing any subset of these fields.
    const cp = c?.centerPoint ?? { lat: 39.0458, lng: -76.6413 };
    let area: CampArea;
    if (c && c.area) {
      area = c.area;
    } else {
      // ~1 sq mi default (0.014° lat × 0.020° lng at MD's mid-latitude)
      const halfLat = 0.007;
      const halfLng = 0.010;
      area = {
        north: cp.lat + halfLat,
        south: cp.lat - halfLat,
        east: cp.lng + halfLng,
        west: cp.lng - halfLng,
        areaSqMi: 1.0,
      };
    }
    return {
      ...c,
      area,
      offlineTileStatus: (c?.offlineTileStatus ?? 'none') as OfflineTileStatus,
      description: typeof c?.description === 'string' ? c.description : '',
      documents: Array.isArray(c?.documents) ? c.documents : [],
      // 2026-05-01 (V2.4 audit, iter 3): backfill inviteCode for
      // legacy V2.3 records that pre-date the eager-generation fix
      // (live_audit_round_2_invite_code_bug_2026_04_28.md). Without
      // this, old camps relied on the lazy ensureCampInviteCode
      // fallback; the data shape was inconsistent on disk. Backfilling
      // at migration time gives a clean invariant: every persisted
      // camp has an inviteCode regardless of when it was created.
      inviteCode:
        typeof c?.inviteCode === 'string' && c.inviteCode.length > 0
          ? c.inviteCode
          : generateInviteCode(),
    } as DeerCamp;
  });
}

function addFeedItem(
  camp: DeerCamp,
  userId: string,
  username: string,
  action: string,
  annotationId?: string,
  photoId?: string
): ActivityFeedItem {
  return {
    id: generateId(),
    userId,
    username,
    action,
    timestamp: new Date().toISOString(),
    annotationId,
    photoId,
  };
}

/**
 * DeerCampProvider — React context provider for Deer Camp state.
 *
 * Manages creation, updates, deletion, and shared annotations for Deer Camps.
 * Handles AsyncStorage persistence: camps are loaded on mount and persisted on every change.
 * Also manages the current user's ID and username (generated locally on first launch).
 *
 * @param {ReactNode} children - Child components
 * @returns {JSX.Element}
 *
 * @example
 * <DeerCampProvider>
 *   <DeerCampScreen />
 * </DeerCampProvider>
 */
export function DeerCampProvider({ children }: { children: ReactNode }) {
  const [camps, setCamps] = useState<DeerCamp[]>([]);
  const campsRef = useRef<DeerCamp[]>([]);
  // Keep ref in sync so AppState listener always reads latest camps
  useEffect(() => { campsRef.current = camps; }, [camps]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  /** Flag to prevent persisting before initial load completes */
  const [loaded, setLoaded] = useState(false);
  /** V3: Sync state */
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);
  const appState = useRef(AppState.currentState);

  // ── Load from AsyncStorage on mount ──
  // Restore data from persistent storage on app start
  useEffect(() => {
    (async () => {
      try {
        const [campsJson, userJson, schemaVersionStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CURRENT_USER_KEY),
          AsyncStorage.getItem(STORAGE_VERSION_KEY),
        ]);
        if (campsJson) {
          // 2026-04-27: try/catch around JSON.parse so corrupted storage
          // doesn't crash the load. We log + reset rather than throw —
          // worst case the user loses local-only camp state which is
          // recoverable post backend-sync (Phase 3+).
          try {
            const parsed = JSON.parse(campsJson);
            const storedVersion = schemaVersionStr ? parseInt(schemaVersionStr, 10) : 1;
            if (storedVersion > CURRENT_SCHEMA_VERSION) {
              // User has a NEWER schema than this build supports — likely
              // came from a later install + downgrade. Don't blow it away;
              // just skip-load and surface a console.warn.
              console.warn(
                `DeerCampContext: stored schema v${storedVersion} > app v${CURRENT_SCHEMA_VERSION}; skipping load to avoid data loss`,
              );
            } else {
              setCamps(migrateCamps(parsed));
              if (storedVersion !== CURRENT_SCHEMA_VERSION) {
                await AsyncStorage.setItem(
                  STORAGE_VERSION_KEY,
                  String(CURRENT_SCHEMA_VERSION),
                );
              }
            }
          } catch (parseErr) {
            console.warn('DeerCampContext: corrupted storage, starting fresh', parseErr);
            setCamps([]);
          }
        }
        if (userJson) {
          // Load existing user identity
          const user = JSON.parse(userJson);
          setCurrentUserId(user.id || '');
          setCurrentUsername(user.username || '');
        } else {
          // V2: Generate a local user on first launch. V3+ will use real authentication.
          const localId = generateId();
          const localUser = { id: localId, username: 'Me' };
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(localUser));
          setCurrentUserId(localId);
          setCurrentUsername('Me');
        }
        // Load pending action count
        const pending = await getPendingCount();
        setPendingActions(pending);
      } catch (e) {
        console.warn('DeerCampContext: Failed to load from storage', e);
      }
      // Mark load complete so persistence effects can begin
      setLoaded(true);
    })();
  }, []);

  // Persist camps to AsyncStorage whenever camps change (after initial load).
  // 2026-04-27: also stamps the schema version so a future downgrade detects
  // an incompatible store and refuses to overwrite it (see load path above).
  useEffect(() => {
    if (!loaded) return;
    Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(camps)),
      AsyncStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_SCHEMA_VERSION)),
    ]).catch(console.warn);
  }, [camps, loaded]);

  // ── V3: Auto-sync when app comes to foreground ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground — try to sync all camps
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          for (const camp of campsRef.current) {
            try {
              await syncCampRemote(camp.id);
            } catch {
              // Silently fail — offline-first
            }
          }
          const pending = await getPendingCount();
          setPendingActions(pending);
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — sync reads camps via ref-like setCamps

  // ── Camp CRUD Operations ──

  /**
   * Create a new Deer Camp with the current user as the admin member.
   * Initializes with empty annotations, photos, and an activity feed entry.
   * Each member is assigned a distinct color from MEMBER_COLORS rotation.
   */
  const createCamp = useCallback(
    (name: string, area: CampArea, linkedLandId?: string): DeerCamp => {
      const now = new Date().toISOString();
      // Derive centerPoint from the area's centroid for back-compat (camp-map
      // code that hasn't been migrated to read `area` directly still gets a
      // sensible default camera target).
      const centerPoint = {
        lat: (area.north + area.south) / 2,
        lng: (area.east + area.west) / 2,
      };
      const newCamp: DeerCamp = {
        id: generateId(),
        name,
        createdAt: now,
        createdBy: currentUserId,
        linkedLandId,
        // 2026-04-28: eagerly generate the share-link invite code at create
        // time so the Share Link via Messages button works on the very
        // first tap, without needing a server roundtrip. See
        // generateInviteCode JSDoc + live_audit_2026_04_28.md.
        inviteCode: generateInviteCode(),
        area,
        centerPoint,
        defaultZoom: 13,
        offlineTileStatus: 'none',
        description: '',
        documents: [],
        // Start with creator as admin
        members: [
          {
            userId: currentUserId,
            username: currentUsername || 'Me',
            role: 'admin',
            color: MEMBER_COLORS[0],
            joinedAt: now,
          },
        ],
        annotations: [],
        photos: [],
        // Activity feed logs all camp actions (imports, uploads, etc.)
        activityFeed: [
          {
            id: generateId(),
            userId: currentUserId,
            username: currentUsername || 'Me',
            action: `created "${name}" (${area.areaSqMi.toFixed(2)} sq mi)`,
            timestamp: now,
          },
        ],
      };
      setCamps((prev) => [...prev, newCamp]);
      return newCamp;
    },
    [currentUserId, currentUsername]
  );

  /**
   * Update a camp's offlineTileStatus. Used by the offline-download flow
   * to walk the camp through downloading → ready (or error).
   */
  const setCampOfflineStatus = useCallback(
    (campId: string, status: OfflineTileStatus) => {
      setCamps((prev) =>
        prev.map((camp) => (camp.id === campId ? { ...camp, offlineTileStatus: status } : camp))
      );
    },
    []
  );

  /**
   * 2026-04-28: Lazily generate + persist an invite code for camps that
   * don't have one (created before eager-generation landed). New camps
   * created after 2026-04-28 always have one already, so this returns
   * the existing code without mutating state.
   *
   * Implemented as a synchronous getter that uses the functional setCamps
   * form to fetch + mutate atomically. The returned code is also captured
   * outside the updater so the caller (Share Link button) can use it
   * immediately without waiting for a re-render.
   *
   * Returns null if the campId isn't found.
   */
  const ensureCampInviteCode = useCallback((campId: string): string | null => {
    let resolvedCode: string | null = null;
    setCamps((prev) => {
      const target = prev.find((c) => c.id === campId);
      if (!target) {
        resolvedCode = null;
        return prev;
      }
      if (target.inviteCode) {
        resolvedCode = target.inviteCode;
        return prev; // no mutation
      }
      const newCode = generateInviteCode();
      resolvedCode = newCode;
      return prev.map((c) => (c.id === campId ? { ...c, inviteCode: newCode } : c));
    });
    return resolvedCode;
  }, []);

  // ── Moderator tools (admin-only at the UI layer) ──

  /**
   * Rename a camp. Admin-only at the UI layer; the context does not police
   * role because membership/role lookups are easiest at the call site and
   * DeerCampScreen already derives "am I admin" once per screen.
   */
  const renameCamp = useCallback(
    (campId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          if (camp.name === trimmed) return camp;
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            `renamed camp to "${trimmed}"`
          );
          return {
            ...camp,
            name: trimmed,
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /**
   * Update a camp's moderator-authored description. A no-op if the text
   * matches the stored description (so idle save-clicks don't spam the feed).
   */
  const updateCampDescription = useCallback(
    (campId: string, description: string) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          if ((camp.description ?? '') === description) return camp;
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            description.trim().length === 0
              ? 'cleared the camp description'
              : 'updated the camp description'
          );
          return {
            ...camp,
            description,
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /**
   * Attach a moderator-supplied document (lease PDF, property-map scan,
   * hero photo, etc.). The caller generates `document.id` and fills in
   * `addedBy` / `addedAt` — the context just stores the record and logs it.
   */
  const addCampDocument = useCallback(
    (campId: string, document: CampDocument) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            `attached "${document.title}"`
          );
          return {
            ...camp,
            documents: [...(camp.documents ?? []), document],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /** Remove a camp document by id. Admin-only at the UI layer. */
  const removeCampDocument = useCallback(
    (campId: string, documentId: string) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const removed = (camp.documents ?? []).find((d) => d.id === documentId);
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            `removed "${removed?.title ?? 'a document'}"`
          );
          return {
            ...camp,
            documents: (camp.documents ?? []).filter((d) => d.id !== documentId),
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /**
   * Delete a camp and all its annotations, photos, and activity history.
   * This is permanent.
   */
  const deleteCamp = useCallback((campId: string) => {
    setCamps((prev) => prev.filter((c) => c.id !== campId));
  }, []);

  /**
   * Retrieve a single camp by ID.
   * @returns The camp if found, undefined otherwise
   */
  const getCamp = useCallback(
    (campId: string) => camps.find((c) => c.id === campId),
    [camps]
  );

  // ── Member Management ──

  /**
   * Add a new member to a camp by username.
   * Assigns the next color in rotation. Creates activity feed entry.
   * Username-based identity mirrors the rest of the app; server-side
   * multi-device sync is handled by the shared camp sync infrastructure.
   */
  const addMember = useCallback(
    (campId: string, username: string) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          // Rotate through colors so each member has distinct color
          const memberColor = MEMBER_COLORS?.length
            ? MEMBER_COLORS[camp.members.length % MEMBER_COLORS.length]
            : '#808080';
          const newMember: CampMember = {
            userId: generateId(),
            username,
            role: 'member',
            color: memberColor,
            joinedAt: new Date().toISOString(),
          };
          const feedItem = addFeedItem(camp, currentUserId, currentUsername, `invited ${username}`);
          return {
            ...camp,
            members: [...camp.members, newMember],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /**
   * Remove a member from a camp (admin action).
   * Creates activity feed entry logging the removal.
   */
  const removeMember = useCallback((campId: string, userId: string) => {
    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        const removedMember = camp.members.find((m) => m.userId === userId);
        const feedItem = addFeedItem(
          camp,
          currentUserId,
          currentUsername,
          `removed ${removedMember?.username || 'a member'}`
        );
        return {
          ...camp,
          members: camp.members.filter((m) => m.userId !== userId),
          activityFeed: [feedItem, ...camp.activityFeed],
        };
      })
    );
  }, [currentUserId, currentUsername]);

  // ── Annotations (waypoints, routes, areas, tracks) ──

  /**
   * Add a shared annotation to a camp.
   * Annotations are color-coded by createdBy user and visible to all members.
   * Creates activity feed entry.
   */
  const addAnnotation = useCallback(
    (campId: string, annotation: SharedAnnotation) => {
      // Apply locally first (offline-first)
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const feedItem = addFeedItem(
            camp,
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
        })
      );
      // Queue for backend sync
      queueAction({
        campId,
        type: 'add_annotation',
        payload: {
          annotation_type: annotation.type,
          data: annotation.data,
          imported_from_plan_id: annotation.importedFromPlanId,
        },
      }).then(() => getPendingCount().then(setPendingActions)).catch(console.warn);
    },
    [currentUserId, currentUsername]
  );

  /**
   * Remove a shared annotation from a camp by ID.
   * Creates activity feed entry logging the removal.
   */
  const removeAnnotation = useCallback((campId: string, annotationId: string) => {
    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        const removed = camp.annotations.find((a) => a.id === annotationId);
        const feedItem = addFeedItem(
          camp,
          currentUserId,
          currentUsername,
          `removed a ${removed?.type || 'annotation'}`,
          annotationId
        );
        return {
          ...camp,
          annotations: camp.annotations.filter((a) => a.id !== annotationId),
          activityFeed: [feedItem, ...camp.activityFeed],
        };
      })
    );
    // Queue for backend sync
    queueAction({
      campId,
      type: 'remove_annotation',
      payload: { annotationId },
    }).then(() => getPendingCount().then(setPendingActions)).catch(console.warn);
  }, [currentUserId, currentUsername]);

  // ── Photos (geotagged) ──

  /**
   * Add a geotagged photo to a camp with optional caption.
   * V2: Stores metadata only (lat, lng, caption). Full image upload deferred to V3+.
   * Creates activity feed entry.
   */
  const addPhoto = useCallback(
    (campId: string, photo: CampPhoto) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            'uploaded a photo',
            undefined,
            photo.id
          );
          return {
            ...camp,
            photos: [...camp.photos, photo],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
      // Queue for backend sync
      queueAction({
        campId,
        type: 'add_photo',
        payload: {
          image_key: photo.imageUri,
          lat: photo.lat,
          lng: photo.lng,
          caption: photo.caption,
        },
      }).then(() => getPendingCount().then(setPendingActions)).catch(console.warn);
    },
    [currentUserId, currentUsername]
  );

  /**
   * Remove a photo from a camp by ID.
   * Creates activity feed entry logging the removal.
   */
  const removePhoto = useCallback((campId: string, photoId: string) => {
    setCamps((prev) =>
      prev.map((camp) => {
        if (camp.id !== campId) return camp;
        const feedItem = addFeedItem(
          camp,
          currentUserId,
          currentUsername,
          'removed a photo',
          undefined,
          photoId
        );
        return {
          ...camp,
          photos: camp.photos.filter((p) => p.id !== photoId),
          activityFeed: [feedItem, ...camp.activityFeed],
        };
      })
    );
  }, [currentUserId, currentUsername]);

  // ── Import/Export from Scout Tab ──

  /**
   * Import a scout plan into a camp, converting all plan annotations into shared ones.
   *
   * Imports:
   * - All waypoints (as 'waypoint' type)
   * - Parking point (as a 'waypoint' type)
   * - All routes (as 'route' type)
   * - All areas (as 'area' type)
   *
   * Each imported annotation is tagged with importedFromPlanId for traceability.
   * Creates a single activity feed entry for the import.
   */
  const importPlanToCamp = useCallback(
    (campId: string, plan: HuntPlan) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const now = new Date().toISOString();
          const newAnnotations: SharedAnnotation[] = [];

          // Import waypoints (stand locations, water sources, etc.)
          (plan.waypoints ?? []).forEach((wp) => {
            newAnnotations.push({
              id: generateId(),
              type: 'waypoint',
              createdBy: currentUserId,
              createdAt: now,
              data: wp,
              importedFromPlanId: plan.id,
            });
          });

          // Import parking point as a special waypoint
          if (plan.parkingPoint) {
            newAnnotations.push({
              id: generateId(),
              type: 'waypoint',
              createdBy: currentUserId,
              createdAt: now,
              data: plan.parkingPoint,
              importedFromPlanId: plan.id,
            });
          }

          // Import routes (polylines like approach trails)
          (plan.routes ?? []).forEach((route) => {
            newAnnotations.push({
              id: generateId(),
              type: 'route',
              createdBy: currentUserId,
              createdAt: now,
              data: route,
              importedFromPlanId: plan.id,
            });
          });

          // Import areas (polygons like hot zones)
          (plan.areas ?? []).forEach((area) => {
            newAnnotations.push({
              id: generateId(),
              type: 'area',
              createdBy: currentUserId,
              createdAt: now,
              data: area,
              importedFromPlanId: plan.id,
            });
          });

          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            `imported plan "${plan.name}"`
          );

          return {
            ...camp,
            annotations: [...camp.annotations, ...newAnnotations],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  /**
   * Export a saved GPS track to a camp as a shared annotation.
   *
   * Tracks can be exported independently (unlike plans which import all annotations).
   * Useful for sharing recorded hiking/scouting routes with the team.
   * Creates activity feed entry.
   */
  const exportTrackToCamp = useCallback(
    (campId: string, track: RecordedTrack) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const now = new Date().toISOString();
          const annotation: SharedAnnotation = {
            id: generateId(),
            type: 'track',
            createdBy: currentUserId,
            createdAt: now,
            data: track,
          };
          const feedItem = addFeedItem(
            camp,
            currentUserId,
            currentUsername,
            `shared track "${track.name}"`
          );
          return {
            ...camp,
            annotations: [...camp.annotations, annotation],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );
    },
    [currentUserId, currentUsername]
  );

  // ── V3 Sync Functions ──

  /**
   * Sync a specific camp with the backend.
   * Pushes pending offline actions, then pulls new data since last sync.
   * @returns true if sync succeeded
   */
  const syncCamp = useCallback(
    async (campId: string): Promise<boolean> => {
      setIsSyncing(true);
      try {
        const result = await syncCampRemote(campId);
        if (result.success) {
          // Refresh camp data from server
          const serverCamp = await fetchCampRemote(campId);
          if (serverCamp) {
            setCamps((prev) =>
              prev.map((c) => (c.id === campId ? { ...c, ...serverCamp } : c))
            );
          }
        }
        const pending = await getPendingCount();
        setPendingActions(pending);
        return result.success;
      } catch (e) {
        console.warn('[DeerCamp] Sync failed:', e);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  /**
   * Join a remote camp using an invite code.
   * Fetches the camp from server and adds it to local state.
   * @returns true if join succeeded
   */
  const joinCampByCode = useCallback(
    async (inviteCode: string): Promise<boolean> => {
      try {
        const result = await joinCampRemote(inviteCode, currentUsername);
        if (!result) return false;

        // Fetch full camp data from server
        const serverCamp = await fetchCampRemote(result.camp_id);
        if (serverCamp) {
          // Add to local camps if not already present
          setCamps((prev) => {
            const exists = prev.some((c) => c.id === result.camp_id);
            if (exists) return prev;
            return [...prev, serverCamp as unknown as DeerCamp];
          });
        }
        return true;
      } catch (e) {
        console.warn('[DeerCamp] Join by code failed:', e);
        return false;
      }
    },
    [currentUsername]
  );

  return (
    <DeerCampContext.Provider
      value={{
        camps,
        currentUserId,
        currentUsername,
        createCamp,
        setCampOfflineStatus,
        ensureCampInviteCode,
        renameCamp,
        updateCampDescription,
        addCampDocument,
        removeCampDocument,
        deleteCamp,
        getCamp,
        addMember,
        removeMember,
        addAnnotation,
        removeAnnotation,
        addPhoto,
        removePhoto,
        importPlanToCamp,
        exportTrackToCamp,
        syncCamp,
        joinCampByCode,
        isSyncing,
        pendingActions,
      }}
    >
      {children}
    </DeerCampContext.Provider>
  );
}

/**
 * useDeerCamp — Custom hook to access Deer Camp state and mutation functions.
 *
 * Provides access to all camps, current user identity, and functions to create,
 * update, delete, and import/export camp data. Throws if called outside DeerCampProvider.
 *
 * @returns {DeerCampContextType} All camp state and mutators
 * @throws {Error} If used outside DeerCampProvider
 *
 * @example
 * const { camps, createCamp, addMember, importPlanToCamp } = useDeerCamp();
 * const camp = createCamp('Opening Weekend', {
 *   north: 39.51, south: 39.49, east: -76.99, west: -77.01, areaSqMi: 1.0,
 * });
 * addMember(camp.id, 'JoeHunter');
 * importPlanToCamp(camp.id, scoutPlan);
 */
export function useDeerCamp(): DeerCampContextType {
  const ctx = useContext(DeerCampContext);
  if (!ctx) throw new Error('useDeerCamp must be used within DeerCampProvider');
  return ctx;
}

export default DeerCampContext;
