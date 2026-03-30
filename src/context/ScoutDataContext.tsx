/**
 * ScoutDataContext — Manages hunt plans, waypoints, routes, areas, and GPS tracks.
 * AsyncStorage-backed persistence. Shared between ScoutScreen and DeerCamp (export).
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HuntPlan,
  Waypoint,
  Route,
  DrawnArea,
  RecordedTrack,
  PLAN_COLORS,
} from '../types/scout';

const STORAGE_KEY_PLANS = '@scout_hunt_plans';
const STORAGE_KEY_TRACKS = '@scout_recorded_tracks';

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

export function ScoutDataProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<HuntPlan[]>([]);
  const [tracks, setTracks] = useState<RecordedTrack[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ── Load from AsyncStorage ──
  useEffect(() => {
    (async () => {
      try {
        const [plansJson, tracksJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_PLANS),
          AsyncStorage.getItem(STORAGE_KEY_TRACKS),
        ]);
        if (plansJson) setPlans(JSON.parse(plansJson));
        if (tracksJson) setTracks(JSON.parse(tracksJson));
      } catch (e) {
        console.warn('ScoutDataContext: Failed to load from storage', e);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Persist plans ──
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans)).catch(console.warn);
  }, [plans, loaded]);

  // ── Persist tracks ──
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(tracks)).catch(console.warn);
  }, [tracks, loaded]);

  // ── Plan CRUD ──
  const createPlan = useCallback((name: string): HuntPlan => {
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
    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  }, [plans.length]);

  const updatePlan = useCallback((updated: HuntPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const deletePlan = useCallback((planId: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  const togglePlanVisibility = useCallback((planId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, visible: !p.visible } : p))
    );
  }, []);

  const getPlan = useCallback(
    (planId: string) => plans.find((p) => p.id === planId),
    [plans]
  );

  // ── Waypoint helpers ──
  const addWaypoint = useCallback((planId: string, waypoint: Waypoint) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, waypoints: [...p.waypoints, waypoint], updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const removeWaypoint = useCallback((planId: string, waypointId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, waypoints: p.waypoints.filter((w) => w.id !== waypointId), updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  // ── Route helpers ──
  const addRoute = useCallback((planId: string, route: Route) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, routes: [...p.routes, route], updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const removeRoute = useCallback((planId: string, routeId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, routes: p.routes.filter((r) => r.id !== routeId), updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  // ── Area helpers ──
  const addArea = useCallback((planId: string, area: DrawnArea) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, areas: [...p.areas, area], updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const removeArea = useCallback((planId: string, areaId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, areas: p.areas.filter((a) => a.id !== areaId), updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  // ── Track CRUD ──
  const saveTrack = useCallback((track: RecordedTrack) => {
    setTracks((prev) => [...prev, track]);
  }, []);

  const deleteTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const toggleTrackVisibility = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
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
