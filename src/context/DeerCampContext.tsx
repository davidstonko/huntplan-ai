/**
 * DeerCampContext — Manages collaborative shared maps (Deer Camps).
 * WatermelonDB-backed persistence with AsyncStorage migration (V2+).
 * WebSocket real-time sync with REST fallback (Phase 3+).
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../db';
import DeerCampModel from '../db/models/DeerCampModel';
import CampMemberModel from '../db/models/CampMemberModel';
import SharedAnnotationModel from '../db/models/SharedAnnotationModel';
import CampPhotoModel from '../db/models/CampPhotoModel';
import ActivityFeedModel from '../db/models/ActivityFeedModel';
import {
  DeerCamp,
  CampMember,
  SharedAnnotation,
  CampPhoto,
  ActivityFeedItem,
  MEMBER_COLORS,
} from '../types/deercamp';
import { HuntPlan, RecordedTrack } from '../types/scout';
import { getSyncManager, resetSyncManager, SyncState } from '../services/campSyncService';

const STORAGE_KEY = '@deer_camps';
const CURRENT_USER_KEY = '@current_user';
const MIGRATION_FLAG = '@wmdb_migration_done';

interface DeerCampContextType {
  camps: DeerCamp[];
  currentUserId: string;
  currentUsername: string;
  syncState: SyncState | null; // Current WebSocket/sync state

  // Camp CRUD
  createCamp: (name: string, centerPoint: { lat: number; lng: number }, linkedLandId?: string) => DeerCamp;
  deleteCamp: (campId: string) => void;
  getCamp: (campId: string) => DeerCamp | undefined;

  // Members
  addMember: (campId: string, username: string) => void;
  removeMember: (campId: string, userId: string) => void;

  // Annotations
  addAnnotation: (campId: string, annotation: SharedAnnotation) => void;
  removeAnnotation: (campId: string, annotationId: string) => void;

  // Photos
  addPhoto: (campId: string, photo: CampPhoto) => void;
  removePhoto: (campId: string, photoId: string) => void;

  // Import from Scout
  importPlanToCamp: (campId: string, plan: HuntPlan) => void;
  exportTrackToCamp: (campId: string, track: RecordedTrack) => void;

  // Real-time sync
  syncCamp: (campId: string) => Promise<void>;
  disconnectSync: () => void;
  syncNow: () => Promise<void>;
}

const DeerCampContext = createContext<DeerCampContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Convert WatermelonDB models to plain JS DeerCamp objects for React state.
 */
async function modelToDeerCamp(campModel: DeerCampModel): Promise<DeerCamp> {
  const membersModels = await campModel.members.fetch();
  const annotationsModels = await campModel.annotations.fetch();
  const photosModels = await campModel.photos.fetch();
  const feedModels = await campModel.activityFeed.fetch();

  const members: CampMember[] = membersModels.map((m: CampMemberModel) => ({
    userId: m.userId,
    username: m.username,
    role: m.role as 'admin' | 'member',
    color: m.color,
    joinedAt: m.joinedAt.toISOString(),
  }));

  const annotations: SharedAnnotation[] = annotationsModels.map((a: SharedAnnotationModel) => ({
    id: a.id,
    type: a.annotationType as 'waypoint' | 'route' | 'area' | 'note' | 'track',
    createdBy: a.createdBy,
    createdAt: a.createdAt.toISOString(),
    data: a.data,
    importedFromPlanId: a.importedFromPlanId || undefined,
  }));

  const photos: CampPhoto[] = photosModels.map((p: CampPhotoModel) => ({
    id: p.id,
    uploadedBy: p.uploadedBy,
    uploadedAt: p.createdAt.toISOString(),
    imageUri: p.uri,
    lat: p.lat,
    lng: p.lng,
    caption: p.caption || undefined,
  }));

  const activityFeed: ActivityFeedItem[] = feedModels.map((f: ActivityFeedModel) => ({
    id: f.id,
    userId: f.userId,
    username: f.username,
    action: f.action,
    timestamp: f.createdAt.toISOString(),
    annotationId: f.annotationId || undefined,
    photoId: f.photoId || undefined,
  }));

  return {
    id: campModel.id,
    name: campModel.name,
    createdAt: campModel.createdAt.toISOString(),
    createdBy: campModel.createdBy,
    linkedLandId: campModel.linkedLandId || undefined,
    centerPoint: {
      lat: campModel.centerLat,
      lng: campModel.centerLng,
    },
    defaultZoom: campModel.defaultZoom,
    members,
    annotations,
    photos,
    activityFeed,
  };
}

function addFeedItem(
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

export function DeerCampProvider({ children }: { children: ReactNode }) {
  const [camps, setCamps] = useState<DeerCamp[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [activeSyncCampId, setActiveSyncCampId] = useState<string>('');

  // ── Load from WatermelonDB (with AsyncStorage migration) ──
  useEffect(() => {
    (async () => {
      try {
        // Check if migration has been done
        const migrationDone = await AsyncStorage.getItem(MIGRATION_FLAG);

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

        // Migrate from AsyncStorage to WatermelonDB if needed
        if (!migrationDone) {
          const campsJson = await AsyncStorage.getItem(STORAGE_KEY);
          if (campsJson) {
            try {
              const oldCamps: DeerCamp[] = JSON.parse(campsJson);
              await migrateOldCampsToWMDB(oldCamps, userId);
              if (__DEV__) console.log('[DeerCampContext] Migrated', oldCamps.length, 'camps to WatermelonDB');
            } catch (e) {
              if (__DEV__) console.warn('[DeerCampContext] Migration failed:', e);
            }
          }
        }

        // Load camps from WatermelonDB
        const campModels = await database.get<DeerCampModel>('deer_camps').query().fetch();
        const loadedCamps = await Promise.all(campModels.map(modelToDeerCamp));
        setCamps(loadedCamps);

        // Set migration flag AFTER successful load
        if (!migrationDone) {
          await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
        }

        if (__DEV__) console.log('[DeerCampContext] Loaded', loadedCamps.length, 'camps from WatermelonDB');
      } catch (e) {
        if (__DEV__) console.warn('[DeerCampContext] Failed to load from database:', e);
      }
      setLoaded(true);
    })();

    // Cleanup on unmount
    return () => {
      resetSyncManager();
    };
  }, []);

  // ── Migration helper ──
  const migrateOldCampsToWMDB = async (oldCamps: DeerCamp[], userId: string) => {
    await database.write(async () => {
      for (const camp of oldCamps) {
        // Create camp record
        const campRecord = await database.get<DeerCampModel>('deer_camps').create((c) => {
          c._raw.id = camp.id;
          c.name = camp.name;
          c.createdBy = camp.createdBy;
          c.linkedLandId = camp.linkedLandId || null;
          c.centerLat = camp.centerPoint.lat;
          c.centerLng = camp.centerPoint.lng;
          c.defaultZoom = camp.defaultZoom;
          c.inviteCode = null;
          c.createdAt = new Date(camp.createdAt);
          c.updatedAt = new Date();
        });

        // Create members
        for (const member of camp.members) {
          await database.get<CampMemberModel>('camp_members').create((m) => {
            m.campId = camp.id;
            m.userId = member.userId;
            m.username = member.username;
            m.role = member.role;
            m.color = member.color;
            m.joinedAt = new Date(member.joinedAt);
          });
        }

        // Create annotations
        for (const annotation of camp.annotations) {
          await database.get<SharedAnnotationModel>('shared_annotations').create((a) => {
            a._raw.id = annotation.id;
            a.campId = camp.id;
            a.annotationType = annotation.type;
            a.createdBy = annotation.createdBy;
            a.dataJson = JSON.stringify(annotation.data);
            a.importedFromPlanId = annotation.importedFromPlanId || null;
            a.createdAt = new Date(annotation.createdAt);
          });
        }

        // Create photos
        for (const photo of camp.photos) {
          await database.get<CampPhotoModel>('camp_photos').create((p) => {
            p._raw.id = photo.id;
            p.campId = camp.id;
            p.uploadedBy = photo.uploadedBy;
            p.username = photo.uploadedBy;
            p.uri = photo.imageUri;
            p.thumbnailUri = null;
            p.lat = photo.lat;
            p.lng = photo.lng;
            p.caption = photo.caption || null;
            p.createdAt = new Date(photo.uploadedAt);
          });
        }

        // Create activity feed items
        for (const feed of camp.activityFeed) {
          await database.get<ActivityFeedModel>('activity_feed').create((f) => {
            f._raw.id = feed.id;
            f.campId = camp.id;
            f.userId = feed.userId;
            f.username = feed.username;
            f.action = feed.action;
            f.annotationId = feed.annotationId || null;
            f.photoId = feed.photoId || null;
            f.createdAt = new Date(feed.timestamp);
          });
        }
      }
    });
  };

  // ── Camp CRUD ──
  const createCamp = useCallback(
    (name: string, centerPoint: { lat: number; lng: number }, linkedLandId?: string): DeerCamp => {
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

      const newCamp: DeerCamp = {
        id: campId,
        name,
        createdAt: now,
        createdBy: currentUserId,
        linkedLandId,
        centerPoint,
        defaultZoom: 13,
        members: [adminMember],
        annotations: [],
        photos: [],
        activityFeed: [creationFeedItem],
      };

      // Write to WatermelonDB
      database.write(async () => {
        const campModel = await database.get<DeerCampModel>('deer_camps').create((c) => {
          c._raw.id = campId;
          c.name = name;
          c.createdBy = currentUserId;
          c.linkedLandId = linkedLandId || null;
          c.centerLat = centerPoint.lat;
          c.centerLng = centerPoint.lng;
          c.defaultZoom = 13;
          c.inviteCode = null;
          c.createdAt = new Date(now);
          c.updatedAt = new Date();
        });

        // Create admin member
        await database.get<CampMemberModel>('camp_members').create((m) => {
          m.campId = campId;
          m.userId = currentUserId;
          m.username = currentUsername || 'Me';
          m.role = 'admin';
          m.color = MEMBER_COLORS[0];
          m.joinedAt = new Date(now);
        });

        // Create creation feed item
        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = creationFeedItem.id;
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername || 'Me';
          f.action = creationFeedItem.action;
          f.annotationId = null;
          f.photoId = null;
          f.createdAt = new Date(now);
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to create camp in WMDB:', e);
      });

      setCamps((prev) => [...prev, newCamp]);
      return newCamp;
    },
    [currentUserId, currentUsername]
  );

  const deleteCamp = useCallback((campId: string) => {
    // Remove from WatermelonDB
    database.write(async () => {
      const campModel = await database.get<DeerCampModel>('deer_camps').find(campId);
      await campModel.destroyPermanently();
    }).catch((e) => {
      if (__DEV__) console.warn('[DeerCampContext] Failed to delete camp in WMDB:', e);
    });

    setCamps((prev) => prev.filter((c) => c.id !== campId));
  }, []);

  const getCamp = useCallback(
    (campId: string) => camps.find((c) => c.id === campId),
    [camps]
  );

  // ── Members ──
  const addMember = useCallback(
    (campId: string, username: string) => {
      const now = new Date().toISOString();
      setCamps((prev) =>
        prev.map((camp) => {
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
        })
      );

      // Write to WatermelonDB
      database.write(async () => {
        const camp = await database.get<DeerCampModel>('deer_camps').find(campId);
        const memberColor = MEMBER_COLORS[camp.members.length % MEMBER_COLORS.length];
        const newUserId = generateId();

        await database.get<CampMemberModel>('camp_members').create((m) => {
          m.campId = campId;
          m.userId = newUserId;
          m.username = username;
          m.role = 'member';
          m.color = memberColor;
          m.joinedAt = new Date();
        });

        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = generateId();
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername;
          f.action = `invited ${username}`;
          f.annotationId = null;
          f.photoId = null;
          f.createdAt = new Date();
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to add member in WMDB:', e);
      });
    },
    [currentUserId, currentUsername]
  );

  const removeMember = useCallback((campId: string, userId: string) => {
    setCamps((prev) =>
      prev.map((camp) =>
        camp.id === campId
          ? { ...camp, members: camp.members.filter((m) => m.userId !== userId) }
          : camp
      )
    );

    // Remove from WatermelonDB
    database.write(async () => {
      const Q = require('@nozbe/watermelondb').Q;
      const members = await database.get<CampMemberModel>('camp_members')
        .query(Q.and(Q.where('camp_id', campId), Q.where('user_id', userId)))
        .fetch();
      for (const member of members) {
        await member.destroyPermanently();
      }
    }).catch((e) => {
      if (__DEV__) console.warn('[DeerCampContext] Failed to remove member in WMDB:', e);
    });
  }, []);

  // ── Annotations ──
  const addAnnotation = useCallback(
    (campId: string, annotation: SharedAnnotation) => {
      setCamps((prev) =>
        prev.map((camp) => {
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
        })
      );

      // Write to WatermelonDB
      database.write(async () => {
        await database.get<SharedAnnotationModel>('shared_annotations').create((a) => {
          a._raw.id = annotation.id;
          a.campId = campId;
          a.annotationType = annotation.type;
          a.createdBy = annotation.createdBy;
          a.dataJson = JSON.stringify(annotation.data);
          a.importedFromPlanId = annotation.importedFromPlanId || null;
          a.createdAt = new Date(annotation.createdAt);
        });

        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = generateId();
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername;
          f.action = `added a ${annotation.type}`;
          f.annotationId = annotation.id;
          f.photoId = null;
          f.createdAt = new Date();
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to add annotation in WMDB:', e);
      });
    },
    [currentUserId, currentUsername]
  );

  const removeAnnotation = useCallback((campId: string, annotationId: string) => {
    setCamps((prev) =>
      prev.map((camp) =>
        camp.id === campId
          ? { ...camp, annotations: camp.annotations.filter((a) => a.id !== annotationId) }
          : camp
      )
    );

    // Remove from WatermelonDB
    database.write(async () => {
      const annotation = await database.get<SharedAnnotationModel>('shared_annotations').find(annotationId);
      await annotation.destroyPermanently();
    }).catch((e) => {
      if (__DEV__) console.warn('[DeerCampContext] Failed to remove annotation in WMDB:', e);
    });
  }, []);

  // ── Photos ──
  const addPhoto = useCallback(
    (campId: string, photo: CampPhoto) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const feedItem = addFeedItem(
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

      // Write to WatermelonDB
      database.write(async () => {
        await database.get<CampPhotoModel>('camp_photos').create((p) => {
          p._raw.id = photo.id;
          p.campId = campId;
          p.uploadedBy = photo.uploadedBy;
          p.username = photo.uploadedBy;
          p.uri = photo.imageUri;
          p.thumbnailUri = null;
          p.lat = photo.lat;
          p.lng = photo.lng;
          p.caption = photo.caption || null;
          p.createdAt = new Date(photo.uploadedAt);
        });

        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = generateId();
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername;
          f.action = 'uploaded a photo';
          f.annotationId = null;
          f.photoId = photo.id;
          f.createdAt = new Date();
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to add photo in WMDB:', e);
      });
    },
    [currentUserId, currentUsername]
  );

  const removePhoto = useCallback((campId: string, photoId: string) => {
    setCamps((prev) =>
      prev.map((camp) =>
        camp.id === campId
          ? { ...camp, photos: camp.photos.filter((p) => p.id !== photoId) }
          : camp
      )
    );

    // Remove from WatermelonDB
    database.write(async () => {
      const photo = await database.get<CampPhotoModel>('camp_photos').find(photoId);
      await photo.destroyPermanently();
    }).catch((e) => {
      if (__DEV__) console.warn('[DeerCampContext] Failed to remove photo in WMDB:', e);
    });
  }, []);

  // ── Import plan from Scout ──
  const importPlanToCamp = useCallback(
    (campId: string, plan: HuntPlan) => {
      const now = new Date().toISOString();
      const newAnnotations: SharedAnnotation[] = [];

      // Import waypoints
      plan.waypoints.forEach((wp) => {
        newAnnotations.push({
          id: generateId(),
          type: 'waypoint',
          createdBy: currentUserId,
          createdAt: now,
          data: wp,
          importedFromPlanId: plan.id,
        });
      });

      // Import parking point as a waypoint
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

      // Import routes
      plan.routes.forEach((route) => {
        newAnnotations.push({
          id: generateId(),
          type: 'route',
          createdBy: currentUserId,
          createdAt: now,
          data: route,
          importedFromPlanId: plan.id,
        });
      });

      // Import areas
      plan.areas.forEach((area) => {
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
        currentUserId,
        currentUsername,
        `imported plan "${plan.name}"`
      );

      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          return {
            ...camp,
            annotations: [...camp.annotations, ...newAnnotations],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );

      // Write to WatermelonDB
      database.write(async () => {
        // Write all annotations
        for (const annotation of newAnnotations) {
          await database.get<SharedAnnotationModel>('shared_annotations').create((a) => {
            a._raw.id = annotation.id;
            a.campId = campId;
            a.annotationType = annotation.type;
            a.createdBy = annotation.createdBy;
            a.dataJson = JSON.stringify(annotation.data);
            a.importedFromPlanId = annotation.importedFromPlanId || null;
            a.createdAt = new Date(annotation.createdAt);
          });
        }

        // Write feed item
        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = feedItem.id;
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername;
          f.action = feedItem.action;
          f.annotationId = null;
          f.photoId = null;
          f.createdAt = new Date();
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to import plan in WMDB:', e);
      });
    },
    [currentUserId, currentUsername]
  );

  // ── Export a saved track to a camp ──
  const exportTrackToCamp = useCallback(
    (campId: string, track: RecordedTrack) => {
      const now = new Date().toISOString();
      const annotationId = generateId();
      const annotation: SharedAnnotation = {
        id: annotationId,
        type: 'track',
        createdBy: currentUserId,
        createdAt: now,
        data: track,
      };
      const feedItem = addFeedItem(
        currentUserId,
        currentUsername,
        `shared track "${track.name}"`
      );

      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          return {
            ...camp,
            annotations: [...camp.annotations, annotation],
            activityFeed: [feedItem, ...camp.activityFeed],
          };
        })
      );

      // Write to WatermelonDB
      database.write(async () => {
        await database.get<SharedAnnotationModel>('shared_annotations').create((a) => {
          a._raw.id = annotationId;
          a.campId = campId;
          a.annotationType = 'track';
          a.createdBy = currentUserId;
          a.dataJson = JSON.stringify(track);
          a.importedFromPlanId = null;
          a.createdAt = new Date(now);
        });

        await database.get<ActivityFeedModel>('activity_feed').create((f) => {
          f._raw.id = feedItem.id;
          f.campId = campId;
          f.userId = currentUserId;
          f.username = currentUsername;
          f.action = feedItem.action;
          f.annotationId = null;
          f.photoId = null;
          f.createdAt = new Date();
        });
      }).catch((e) => {
        if (__DEV__) console.warn('[DeerCampContext] Failed to export track in WMDB:', e);
      });
    },
    [currentUserId, currentUsername]
  );

  // ── Real-time sync methods ──

  /**
   * Connect to WebSocket sync for a specific camp.
   * Called when user opens a camp in map view.
   */
  const syncCamp = useCallback(
    async (campId: string) => {
      if (activeSyncCampId === campId) {
        if (__DEV__) console.log(`[DeerCampContext] Already syncing camp ${campId}`);
        return;
      }

      // Disconnect previous sync if any
      if (activeSyncCampId) {
        const manager = getSyncManager();
        manager.disconnect();
      }

      setActiveSyncCampId(campId);
      const manager = getSyncManager();

      // Wire up WebSocket event handlers
      manager.onAnnotationAdd = (event, annotation) => {
        if (__DEV__) console.log(`[DeerCampContext] Real-time annotation added: ${annotation.id}`);
        addAnnotation(campId, annotation);
      };

      manager.onAnnotationUpdate = (event, annotation) => {
        if (__DEV__) console.log(`[DeerCampContext] Real-time annotation updated: ${annotation.id}`);
        // Update annotation in local state
        setCamps((prev) =>
          prev.map((camp) => {
            if (camp.id !== campId) return camp;
            return {
              ...camp,
              annotations: camp.annotations.map((a) =>
                a.id === annotation.id ? annotation : a
              ),
            };
          })
        );
      };

      manager.onAnnotationDelete = (annotationId) => {
        if (__DEV__) console.log(`[DeerCampContext] Real-time annotation deleted: ${annotationId}`);
        removeAnnotation(campId, annotationId);
      };

      manager.onPhotoAdded = (event, photo) => {
        if (__DEV__) console.log(`[DeerCampContext] Real-time photo added: ${photo.id}`);
        addPhoto(campId, photo);
      };

      manager.onMemberOnline = (event) => {
        if (__DEV__) console.log(`[DeerCampContext] Member online: ${event.user_id}`);
        // Update presence in UI — optional: show "X members online" indicator
      };

      manager.onMemberOffline = (event) => {
        if (__DEV__) console.log(`[DeerCampContext] Member offline: ${event.user_id}`);
      };

      manager.onError = (error) => {
        if (__DEV__) console.error(`[DeerCampContext] Sync error: ${error}`);
      };

      manager.onSyncStateChanged = (state) => {
        setSyncState(state);
      };

      // Connect to the camp
      await manager.connect(campId);
    },
    [activeSyncCampId, addAnnotation, removeAnnotation, addPhoto]
  );

  /**
   * Disconnect from active camp sync.
   */
  const disconnectSync = useCallback(() => {
    if (activeSyncCampId) {
      const manager = getSyncManager();
      manager.disconnect();
      setActiveSyncCampId('');
      setSyncState(null);
    }
  }, [activeSyncCampId]);

  /**
   * Manually trigger a sync with the backend.
   * Useful for forcing a pull of new data.
   */
  const syncNow = useCallback(async () => {
    const manager = getSyncManager();
    await manager.syncNow();
  }, []);

  /**
   * Wire up annotation/photo methods to send changes via sync manager.
   */
  const addAnnotationWithSync = useCallback(
    (campId: string, annotation: SharedAnnotation) => {
      // Add to local state
      addAnnotation(campId, annotation);

      // Send to server (real-time or queued if offline)
      const manager = getSyncManager();
      manager.sendAnnotationAdd(annotation).catch((err) => { if (__DEV__) console.warn('[DeerCampContext]', err); });
    },
    [addAnnotation]
  );

  const removeAnnotationWithSync = useCallback(
    (campId: string, annotationId: string) => {
      // Remove from local state
      removeAnnotation(campId, annotationId);

      // Send to server (real-time or queued if offline)
      const manager = getSyncManager();
      manager.sendAnnotationDelete(annotationId).catch((err) => { if (__DEV__) console.warn('[DeerCampContext]', err); });
    },
    [removeAnnotation]
  );

  const addPhotoWithSync = useCallback(
    (campId: string, photo: CampPhoto) => {
      // Add to local state
      addPhoto(campId, photo);

      // Send to server (real-time or queued if offline)
      const manager = getSyncManager();
      manager.sendPhotoAdded(photo).catch((err) => { if (__DEV__) console.warn('[DeerCampContext]', err); });
    },
    [addPhoto]
  );

  return (
    <DeerCampContext.Provider
      value={{
        camps,
        currentUserId,
        currentUsername,
        syncState,
        createCamp,
        deleteCamp,
        getCamp,
        addMember,
        removeMember,
        addAnnotation: addAnnotationWithSync,
        removeAnnotation: removeAnnotationWithSync,
        addPhoto: addPhotoWithSync,
        removePhoto,
        importPlanToCamp,
        exportTrackToCamp,
        syncCamp,
        disconnectSync,
        syncNow,
      }}
    >
      {children}
    </DeerCampContext.Provider>
  );
}

export function useDeerCamp(): DeerCampContextType {
  const ctx = useContext(DeerCampContext);
  if (!ctx) throw new Error('useDeerCamp must be used within DeerCampProvider');
  return ctx;
}

export default DeerCampContext;
