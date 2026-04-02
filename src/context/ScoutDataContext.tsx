/**
 * ScoutDataContext — Manages hunt plans, waypoints, routes, areas, and GPS tracks.
 * WatermelonDB-backed persistence (V2+). Shared between ScoutScreen and DeerCamp (export).
 * Maintains backward-compatible interface with AsyncStorage migration support.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../db';
import {
  HuntPlanModel,
  WaypointModel,
  RouteModel,
  DrawnAreaModel,
  RecordedTrackModel,
} from '../db/models';
import {
  HuntPlan,
  Waypoint,
  Route,
  DrawnArea,
  RecordedTrack,
  TrackPoint,
  PLAN_COLORS,
} from '../types/scout';

const STORAGE_KEY_PLANS = '@scout_hunt_plans';
const STORAGE_KEY_TRACKS = '@scout_recorded_tracks';
const MIGRATION_KEY = '@scout_migration_done';

interface ScoutDataContextType {
  // Plans
  plans: HuntPlan[];
  createPlan: (name: string) => HuntPlan;
  updatePlan: (plan: HuntPlan) => void;
  deletePlan: (planId: string) => void;
  togglePlanVisibility: (planId: string) => void;
  getPlan: (planId: string) => HuntPlan | undefined;

  // Waypoints
  addWaypoint: (planId: string, waypoint: Waypoint) => void;
  removeWaypoint: (planId: string, waypointId: string) => void;

  // Routes
  addRoute: (planId: string, route: Route) => void;
  removeRoute: (planId: string, routeId: string) => void;

  // Areas
  addArea: (planId: string, area: DrawnArea) => void;
  removeArea: (planId: string, areaId: string) => void;

  // Tracks
  tracks: RecordedTrack[];
  saveTrack: (track: RecordedTrack) => void;
  deleteTrack: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
}

const ScoutDataContext = createContext<ScoutDataContextType | undefined>(undefined);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Convert WatermelonDB HuntPlanModel to plain HuntPlan interface.
 * Assembles all related waypoints, routes, and areas.
 */
async function modelToHuntPlan(model: HuntPlanModel): Promise<HuntPlan> {
  const [waypoints, routes, areas] = await Promise.all([
    model.waypoints.fetch(),
    model.routes.fetch(),
    model.drawnAreas.fetch(),
  ]);

  const parkingPoint: Waypoint | null =
    model.parkingLat != null && model.parkingLng != null
      ? {
          id: 'parking-' + model.id,
          lat: model.parkingLat,
          lng: model.parkingLng,
          icon: 'parking',
          label: model.parkingLabel || 'Parking',
          notes: '',
        }
      : null;

  return {
    id: model.id,
    name: model.name,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
    color: model.color,
    visible: model.visible,
    parkingPoint,
    waypoints: waypoints.map((w: WaypointModel) => ({
      id: w.id,
      lat: w.lat,
      lng: w.lng,
      icon: (w.icon || 'custom') as any,
      label: w.label,
      notes: '',
    })),
    routes: routes.map((r: RouteModel) => ({
      id: r.id,
      points: r.points.map((p: any) => [p.lng, p.lat] as [number, number]),
      style: 'solid' as const,
      label: r.label,
      distanceMeters: 0, // Computed from points at render time
    })),
    areas: areas.map((a: DrawnAreaModel) => ({
      id: a.id,
      polygon: a.points.map((p: any) => [p.lng, p.lat] as [number, number]),
      label: a.label,
      areaAcres: 0, // Computed from polygon at render time
    })),
    notes: model.notes || '',
  };
}

/**
 * Convert WatermelonDB RecordedTrackModel to plain RecordedTrack interface.
 */
function trackModelToTrack(model: RecordedTrackModel): RecordedTrack {
  return {
    id: model.id,
    name: model.name,
    date: model.createdAt.toISOString(),
    points: model.points,
    distanceMeters: model.distanceMeters,
    durationSeconds: model.durationSeconds,
    visible: model.visible,
  };
}

/**
 * Migrate data from AsyncStorage to WatermelonDB (one-time).
 * Only runs if WatermelonDB is empty and AsyncStorage has data.
 */
async function migrateAsyncStorageToWatermelon(): Promise<void> {
  try {
    // Check if migration already done
    const migrationDone = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationDone) return;

    // Check if WatermelonDB already has data
    const existingPlans = await database
      .get<HuntPlanModel>('hunt_plans')
      .query()
      .fetch();
    if (existingPlans.length > 0) {
      // Already has data, skip migration
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    // Load data from AsyncStorage
    const [plansJson, tracksJson] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_PLANS),
      AsyncStorage.getItem(STORAGE_KEY_TRACKS),
    ]);

    if (!plansJson && !tracksJson) {
      // No data to migrate
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    // Migrate plans
    if (plansJson) {
      const plansData = JSON.parse(plansJson) as HuntPlan[];
      await database.write(async () => {
        for (const plan of plansData) {
          const createdTime = new Date(plan.createdAt).getTime();
          const updatedTime = new Date(plan.updatedAt).getTime();

          const planModel = await database
            .get<HuntPlanModel>('hunt_plans')
            .create((p: any) => {
              p.name = plan.name;
              p.color = plan.color;
              p.visible = plan.visible;
              p.parkingLat = plan.parkingPoint?.lat ?? null;
              p.parkingLng = plan.parkingPoint?.lng ?? null;
              p.parkingLabel = plan.parkingPoint?.label ?? null;
              p.notes = plan.notes;
              p.createdAt = createdTime;
              p.updatedAt = updatedTime;
            });

          // Migrate waypoints
          for (const wp of plan.waypoints) {
            await database
              .get<WaypointModel>('waypoints')
              .create((w: any) => {
                w.planId = planModel.id;
                w.label = wp.label;
                w.lat = wp.lat;
                w.lng = wp.lng;
                w.icon = wp.icon;
                w.createdAt = createdTime;
              });
          }

          // Migrate routes
          for (const route of plan.routes) {
            await database
              .get<RouteModel>('routes')
              .create((r: any) => {
                r.planId = planModel.id;
                r.label = route.label;
                r.pointsJson = JSON.stringify(
                  route.points.map(([lng, lat]) => ({ lat, lng }))
                );
                r.color = route.style; // Store style in color field temporarily
                r.createdAt = createdTime;
              });
          }

          // Migrate areas
          for (const area of plan.areas) {
            await database
              .get<DrawnAreaModel>('drawn_areas')
              .create((a: any) => {
                a.planId = planModel.id;
                a.label = area.label;
                a.pointsJson = JSON.stringify(
                  area.polygon.map(([lng, lat]) => ({ lat, lng }))
                );
                a.createdAt = createdTime;
              });
          }
        }
      });
    }

    // Migrate tracks
    if (tracksJson) {
      const tracksData = JSON.parse(tracksJson) as RecordedTrack[];
      await database.write(async () => {
        for (const track of tracksData) {
          const createdTime = new Date(track.date).getTime();
          await database
            .get<RecordedTrackModel>('recorded_tracks')
            .create((t: any) => {
              t.name = track.name;
              t.pointsJson = JSON.stringify(track.points);
              t.distanceMeters = track.distanceMeters;
              t.durationSeconds = track.durationSeconds;
              t.elevationGain = 0;
              t.elevationLoss = 0;
              t.visible = track.visible;
              t.createdAt = createdTime;
            });
        }
      });
    }

    // Mark migration as complete
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');

    if (__DEV__) console.log('[ScoutDataContext] AsyncStorage → WatermelonDB migration complete');
  } catch (err) {
    if (__DEV__) console.warn('[ScoutDataContext] Migration error:', err);
  }
}

export function ScoutDataProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<HuntPlan[]>([]);
  const [tracks, setTracks] = useState<RecordedTrack[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ── Load from WatermelonDB on mount ──
  useEffect(() => {
    (async () => {
      try {
        // Perform one-time AsyncStorage migration
        await migrateAsyncStorageToWatermelon();

        // Load all plans from WatermelonDB
        const planModels = await database
          .get<HuntPlanModel>('hunt_plans')
          .query()
          .fetch();
        const plansData = await Promise.all(planModels.map(modelToHuntPlan));
        setPlans(plansData);

        // Load all tracks from WatermelonDB
        const trackModels = await database
          .get<RecordedTrackModel>('recorded_tracks')
          .query()
          .fetch();
        const tracksData = trackModels.map(trackModelToTrack);
        setTracks(tracksData);
      } catch (e) {
        if (__DEV__) console.warn('[ScoutDataContext] Failed to load from WatermelonDB', e);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Plan CRUD ──
  const createPlan = useCallback(
    (name: string): HuntPlan => {
      const now = new Date().toISOString();
      const color = PLAN_COLORS[plans.length % PLAN_COLORS.length];
      const newPlan: HuntPlan = {
        id: generateId(),
        name,
        createdAt: now,
        updatedAt: now,
        color,
        visible: true,
        parkingPoint: null,
        waypoints: [],
        routes: [],
        areas: [],
        notes: '',
      };

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        const nowTime = new Date().getTime();
        await database
          .get<HuntPlanModel>('hunt_plans')
          .create((p: any) => {
            p.id = newPlan.id;
            p.name = newPlan.name;
            p.color = newPlan.color;
            p.visible = newPlan.visible;
            p.parkingLat = null;
            p.parkingLng = null;
            p.parkingLabel = null;
            p.notes = '';
            p.createdAt = nowTime;
            p.updatedAt = nowTime;
          });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error creating plan:', err);
      });

      // Update React state optimistically
      setPlans((prev) => [...prev, newPlan]);
      return newPlan;
    },
    [plans.length]
  );

  const updatePlan = useCallback((updated: HuntPlan) => {
    // Write to WatermelonDB asynchronously
    database.write(async () => {
      const model = await database
        .get<HuntPlanModel>('hunt_plans')
        .find(updated.id);
      await model.update((p: any) => {
        p.name = updated.name;
        p.color = updated.color;
        p.visible = updated.visible;
        p.notes = updated.notes;
        p.parkingLat = updated.parkingPoint?.lat ?? null;
        p.parkingLng = updated.parkingPoint?.lng ?? null;
        p.parkingLabel = updated.parkingPoint?.label ?? null;
        p.updatedAt = new Date().getTime();
      });
    }).catch((err) => {
      if (__DEV__) console.warn('[ScoutDataContext] Error updating plan:', err);
    });

    // Update React state optimistically
    setPlans((prev) =>
      prev.map((p) =>
        p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p
      )
    );
  }, []);

  const deletePlan = useCallback((planId: string) => {
    // Delete from WatermelonDB asynchronously
    database.write(async () => {
      const model = await database
        .get<HuntPlanModel>('hunt_plans')
        .find(planId);
      await model.destroyPermanently();
    }).catch((err) => {
      if (__DEV__) console.warn('[ScoutDataContext] Error deleting plan:', err);
    });

    // Update React state optimistically
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  const togglePlanVisibility = useCallback((planId: string) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId ? { ...p, visible: !p.visible } : p
      );

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        const model = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        const plan = updated.find((p) => p.id === planId);
        if (plan) {
          await model.update((p: any) => {
            p.visible = plan.visible;
          });
        }
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error toggling visibility:', err);
      });

      return updated;
    });
  }, []);

  const getPlan = useCallback(
    (planId: string) => plans.find((p) => p.id === planId),
    [plans]
  );

  // ── Waypoint helpers ──
  const addWaypoint = useCallback((planId: string, waypoint: Waypoint) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, waypoints: [...p.waypoints, waypoint], updatedAt: new Date().toISOString() }
          : p
      );

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        await database
          .get<WaypointModel>('waypoints')
          .create((w: any) => {
            w.id = waypoint.id;
            w.planId = planId;
            w.label = waypoint.label;
            w.lat = waypoint.lat;
            w.lng = waypoint.lng;
            w.icon = waypoint.icon;
            w.createdAt = new Date().getTime();
          });

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error adding waypoint:', err);
      });

      return updated;
    });
  }, []);

  const removeWaypoint = useCallback((planId: string, waypointId: string) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, waypoints: p.waypoints.filter((w) => w.id !== waypointId), updatedAt: new Date().toISOString() }
          : p
      );

      // Delete from WatermelonDB asynchronously
      database.write(async () => {
        const waypoint = await database
          .get<WaypointModel>('waypoints')
          .find(waypointId);
        await waypoint.destroyPermanently();

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error removing waypoint:', err);
      });

      return updated;
    });
  }, []);

  // ── Route helpers ──
  const addRoute = useCallback((planId: string, route: Route) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, routes: [...p.routes, route], updatedAt: new Date().toISOString() }
          : p
      );

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        await database
          .get<RouteModel>('routes')
          .create((r: any) => {
            r.id = route.id;
            r.planId = planId;
            r.label = route.label;
            r.pointsJson = JSON.stringify(
              route.points.map(([lng, lat]) => ({ lat, lng }))
            );
            r.color = route.style;
            r.createdAt = new Date().getTime();
          });

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error adding route:', err);
      });

      return updated;
    });
  }, []);

  const removeRoute = useCallback((planId: string, routeId: string) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, routes: p.routes.filter((r) => r.id !== routeId), updatedAt: new Date().toISOString() }
          : p
      );

      // Delete from WatermelonDB asynchronously
      database.write(async () => {
        const route = await database
          .get<RouteModel>('routes')
          .find(routeId);
        await route.destroyPermanently();

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error removing route:', err);
      });

      return updated;
    });
  }, []);

  // ── Area helpers ──
  const addArea = useCallback((planId: string, area: DrawnArea) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, areas: [...p.areas, area], updatedAt: new Date().toISOString() }
          : p
      );

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        await database
          .get<DrawnAreaModel>('drawn_areas')
          .create((a: any) => {
            a.id = area.id;
            a.planId = planId;
            a.label = area.label;
            a.pointsJson = JSON.stringify(
              area.polygon.map(([lng, lat]) => ({ lat, lng }))
            );
            a.createdAt = new Date().getTime();
          });

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error adding area:', err);
      });

      return updated;
    });
  }, []);

  const removeArea = useCallback((planId: string, areaId: string) => {
    setPlans((prev) => {
      const updated = prev.map((p) =>
        p.id === planId
          ? { ...p, areas: p.areas.filter((a) => a.id !== areaId), updatedAt: new Date().toISOString() }
          : p
      );

      // Delete from WatermelonDB asynchronously
      database.write(async () => {
        const area = await database
          .get<DrawnAreaModel>('drawn_areas')
          .find(areaId);
        await area.destroyPermanently();

        // Update plan's updatedAt timestamp
        const planModel = await database
          .get<HuntPlanModel>('hunt_plans')
          .find(planId);
        await planModel.update((p: any) => {
          p.updatedAt = new Date().getTime();
        });
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error removing area:', err);
      });

      return updated;
    });
  }, []);

  // ── Track CRUD ──
  const saveTrack = useCallback((track: RecordedTrack) => {
    setTracks((prev) => [...prev, track]);

    // Write to WatermelonDB asynchronously
    database.write(async () => {
      const createdTime = new Date(track.date).getTime();
      await database
        .get<RecordedTrackModel>('recorded_tracks')
        .create((t: any) => {
          t.id = track.id;
          t.name = track.name;
          t.pointsJson = JSON.stringify(track.points);
          t.distanceMeters = track.distanceMeters;
          t.durationSeconds = track.durationSeconds;
          t.elevationGain = 0;
          t.elevationLoss = 0;
          t.visible = track.visible;
          t.createdAt = createdTime;
        });
    }).catch((err) => {
      if (__DEV__) console.warn('[ScoutDataContext] Error saving track:', err);
    });
  }, []);

  const deleteTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));

    // Delete from WatermelonDB asynchronously
    database.write(async () => {
      const track = await database
        .get<RecordedTrackModel>('recorded_tracks')
        .find(trackId);
      await track.destroyPermanently();
    }).catch((err) => {
      if (__DEV__) console.warn('[ScoutDataContext] Error deleting track:', err);
    });
  }, []);

  const toggleTrackVisibility = useCallback((trackId: string) => {
    setTracks((prev) => {
      const updated = prev.map((t) =>
        t.id === trackId ? { ...t, visible: !t.visible } : t
      );

      // Write to WatermelonDB asynchronously
      database.write(async () => {
        const model = await database
          .get<RecordedTrackModel>('recorded_tracks')
          .find(trackId);
        const track = updated.find((t) => t.id === trackId);
        if (track) {
          await model.update((t: any) => {
            t.visible = track.visible;
          });
        }
      }).catch((err) => {
        if (__DEV__) console.warn('[ScoutDataContext] Error toggling track visibility:', err);
      });

      return updated;
    });
  }, []);

  return (
    <ScoutDataContext.Provider
      value={{
        plans,
        createPlan,
        updatePlan,
        deletePlan,
        togglePlanVisibility,
        getPlan,
        addWaypoint,
        removeWaypoint,
        addRoute,
        removeRoute,
        addArea,
        removeArea,
        tracks,
        saveTrack,
        deleteTrack,
        toggleTrackVisibility,
      }}
    >
      {children}
    </ScoutDataContext.Provider>
  );
}

export function useScoutData(): ScoutDataContextType {
  const ctx = useContext(ScoutDataContext);
  if (!ctx) throw new Error('useScoutData must be used within ScoutDataProvider');
  return ctx;
}

export default ScoutDataContext;
