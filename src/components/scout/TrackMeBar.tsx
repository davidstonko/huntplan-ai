/**
 * TrackMeBar — Bottom bar for GPS tracking during scouting.
 * Shows start/stop, elapsed time, distance, speed, and elevation change.
 * Renders a real-time polyline on the map via parent callback.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useScoutData } from '../../context/ScoutDataContext';
import { TrackPoint } from '../../types/scout';
import Colors from '../../theme/colors';

interface TrackMeBarProps {
  /** Called every time a new point is recorded — parent updates the polyline on the map */
  onTrackUpdate: (points: TrackPoint[]) => void;
  /** Called when tracking stops so parent can clear the live polyline */
  onTrackEnd: () => void;
}

// ── Helpers ──
const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1609) return `${Math.round(meters)} ft`;
  return `${(meters / 1609.34).toFixed(2)} mi`;
};

const formatElevation = (meters: number): string => {
  const feet = meters * 3.28084;
  return `${feet >= 0 ? '+' : ''}${Math.round(feet)} ft`;
};

const formatSpeed = (mps: number): string => {
  const mph = mps * 2.23694;
  return `${mph.toFixed(1)} mph`;
};

export default function TrackMeBar({ onTrackUpdate, onTrackEnd }: TrackMeBarProps) {
  const { saveTrack } = useScoutData();

  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);

  const pointsRef = useRef<TrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedSecondsRef = useRef<number>(0);
  const lastAltitudeRef = useRef<number | null>(null);

  // ── Timer ──
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedSecondsRef.current);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isPaused]);

  // ── GPS watcher ──
  const startWatching = useCallback(() => {
    watchIdRef.current = Geolocation.watchPosition(
      (pos) => {
        if (isPaused) return;
        const { latitude, longitude, altitude, speed } = pos.coords;
        const pt: TrackPoint = {
          lat: latitude,
          lng: longitude,
          timestamp: pos.timestamp,
          altitude: altitude ?? undefined,
          speed: speed ?? undefined,
        };

        const prev = pointsRef.current;

        // Distance
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const d = haversineDistance(last.lat, last.lng, latitude, longitude);
          setTotalDistance((td) => td + d);
        }

        // Elevation
        if (altitude != null) {
          if (lastAltitudeRef.current != null) {
            const diff = altitude - lastAltitudeRef.current;
            if (diff > 0) setElevationGain((g) => g + diff);
            else setElevationLoss((l) => l + Math.abs(diff));
          }
          lastAltitudeRef.current = altitude;
        }

        // Speed
        if (speed != null && speed >= 0) setCurrentSpeed(speed);

        pointsRef.current = [...prev, pt];
        onTrackUpdate(pointsRef.current);
      },
      (err) => console.warn('[TrackMe] GPS error', err),
      {
        enableHighAccuracy: true,
        distanceFilter: 5, // meters
        interval: 3000,
        fastestInterval: 1000,
      } as any,
    );
  }, [isPaused, onTrackUpdate]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── Controls ──
  const handleStart = () => {
    pointsRef.current = [];
    lastAltitudeRef.current = null;
    setTotalDistance(0);
    setCurrentSpeed(0);
    setElevationGain(0);
    setElevationLoss(0);
    setElapsedSeconds(0);
    pausedSecondsRef.current = 0;
    startTimeRef.current = Date.now();
    setIsTracking(true);
    setIsPaused(false);
    startWatching();
  };

  const handlePause = () => {
    setIsPaused(true);
    stopWatching();
  };

  const handleResume = () => {
    setIsPaused(false);
    startWatching();
  };

  const handleStop = () => {
    stopWatching();
    setIsTracking(false);
    setIsPaused(false);

    const pts = pointsRef.current;
    if (pts.length >= 2) {
      saveTrack({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        name: `Track ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        points: pts,
        distanceMeters: totalDistance,
        durationSeconds: elapsedSeconds,
        visible: true,
      });
    }

    onTrackEnd();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopWatching]);

  // ── Not tracking: show start button ──
  if (!isTracking) {
    return (
      <View style={styles.barCollapsed}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
          <Text style={styles.startIcon}>{'\u25B6'}</Text>
          <Text style={styles.startLabel}>Track Me</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tracking: full stats bar ──
  return (
    <View style={styles.bar}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{formatSpeed(currentSpeed)}</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: Colors.lichen }]}>{formatElevation(elevationGain)}</Text>
          <Text style={[styles.statValue, { color: Colors.rust, fontSize: 11 }]}>{formatElevation(-elevationLoss)}</Text>
          <Text style={styles.statLabel}>Elev</Text>
        </View>
      </View>

      {/* Control buttons */}
      <View style={styles.controlRow}>
        {isPaused ? (
          <TouchableOpacity style={styles.controlButton} onPress={handleResume}>
            <Text style={styles.controlIcon}>{'\u25B6'}</Text>
            <Text style={styles.controlLabel}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.controlButton} onPress={handlePause}>
            <Text style={styles.controlIcon}>{'\u23F8'}</Text>
            <Text style={styles.controlLabel}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={handleStop}>
          <Text style={styles.controlIcon}>{'\u23F9'}</Text>
          <Text style={styles.controlLabel}>Stop & Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Collapsed (not tracking) ──
  barCollapsed: {
    position: 'absolute',
    bottom: 32,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.moss,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  startIcon: { fontSize: 14, color: Colors.textOnAccent, marginRight: 8 },
  startLabel: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },

  // ── Expanded bar (tracking) ──
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.overlay,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.tan,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.mud,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  stopButton: {
    backgroundColor: Colors.rust,
    borderColor: Colors.rust,
  },
  controlIcon: { fontSize: 14, color: Colors.textPrimary, marginRight: 6 },
  controlLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
