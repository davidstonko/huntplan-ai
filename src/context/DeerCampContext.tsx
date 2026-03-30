/**
 * DeerCampContext — Manages collaborative shared maps (Deer Camps).
 * AsyncStorage-backed persistence for V2 (local-first MVP).
 * Backend sync will be added in V3+.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeerCamp,
  CampMember,
  SharedAnnotation,
  CampPhoto,
  ActivityFeedItem,
  MEMBER_COLORS,
} from '../types/deercamp';
import { HuntPlan, RecordedTrack } from '../types/scout';

const STORAGE_KEY = '@deer_camps';
const CURRENT_USER_KEY = '@current_user';

interface DeerCampContextType {
  camps: DeerCamp[];
  currentUserId: string;
  currentUsername: string;

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
}

const DeerCampContext = createContext<DeerCampContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
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

export function DeerCampProvider({ children }: { children: ReactNode }) {
  const [camps, setCamps] = useState<DeerCamp[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  // ── Load from AsyncStorage ──
  useEffect(() => {
    (async () => {
      try {
        const [campsJson, userJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CURRENT_USER_KEY),
        ]);
        if (campsJson) setCamps(JSON.parse(campsJson));
        if (userJson) {
          const user = JSON.parse(userJson);
          setCurrentUserId(user.id || '');
          setCurrentUsername(user.username || '');
        } else {
          // Generate a local user ID for V2
          const localId = generateId();
          const localUser = { id: localId, username: 'Me' };
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(localUser));
          setCurrentUserId(localId);
          setCurrentUsername('Me');
        }
      } catch (e) {
        console.warn('DeerCampContext: Failed to load from storage', e);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Persist camps ──
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(camps)).catch(console.warn);
  }, [camps, loaded]);

  // ── Camp CRUD ──
  const createCamp = useCallback(
    (name: string, centerPoint: { lat: number; lng: number }, linkedLandId?: string): DeerCamp => {
      const now = new Date().toISOString();
      const newCamp: DeerCamp = {
        id: generateId(),
        name,
        createdAt: now,
        createdBy: currentUserId,
        linkedLandId,
        centerPoint,
        defaultZoom: 13,
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
        activityFeed: [
          {
            id: generateId(),
            userId: currentUserId,
            username: currentUsername || 'Me',
            action: `created "${name}"`,
            timestamp: now,
          },
        ],
      };
      setCamps((prev) => [...prev, newCamp]);
      return newCamp;
    },
    [currentUserId, currentUsername]
  );

  const deleteCamp = useCallback((campId: string) => {
    setCamps((prev) => prev.filter((c) => c.id !== campId));
  }, []);

  const getCamp = useCallback(
    (campId: string) => camps.find((c) => c.id === campId),
    [camps]
  );

  // ── Members ──
  const addMember = useCallback(
    (campId: string, username: string) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
          const memberColor = MEMBER_COLORS[camp.members.length % MEMBER_COLORS.length];
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

  const removeMember = useCallback((campId: string, userId: string) => {
    setCamps((prev) =>
      prev.map((camp) =>
        camp.id === campId
          ? { ...camp, members: camp.members.filter((m) => m.userId !== userId) }
          : camp
      )
    );
  }, []);

  // ── Annotations ──
  const addAnnotation = useCallback(
    (campId: string, annotation: SharedAnnotation) => {
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
  }, []);

  // ── Photos ──
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
  }, []);

  // ── Import plan from Scout ──
  const importPlanToCamp = useCallback(
    (campId: string, plan: HuntPlan) => {
      setCamps((prev) =>
        prev.map((camp) => {
          if (camp.id !== campId) return camp;
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

  // ── Export a saved track to a camp ──
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

  return (
    <DeerCampContext.Provider
      value={{
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
        addPhoto,
        removePhoto,
        importPlanToCamp,
        exportTrackToCamp,
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
