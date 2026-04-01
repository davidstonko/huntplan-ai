/**
 * @file solunarService.ts
 * @description Solunar/best hunting times service.
 * Fetches predicted deer activity periods from the backend
 * and falls back to a simplified local calculation when offline.
 *
 * @module services/solunarService
 * @version 3.0.0
 */

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

// ─── Types ──────────────────────────────────────────────────────

export interface SolunarPeriod {
  label: string;
  start?: string;
  end?: string;
  center?: string;
  duration_hours: number;
}

export interface BestTimeWindow {
  window: string;
  start: string;
  end: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ActivityRating {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  factors: {
    moon_phase: string;
    illumination: number;
    solunar_dawn_overlap: boolean;
    solunar_dusk_overlap: boolean;
  };
}

export interface SolunarData {
  date: string;
  moon: {
    phase_name: string;
    illumination_pct: number;
    phase_fraction: number;
  };
  major_periods: SolunarPeriod[];
  minor_periods: SolunarPeriod[];
  sun: {
    sunrise: string;
    sunset: string;
    legal_start: string;
    legal_end: string;
  };
  best_times: BestTimeWindow[];
  rating: ActivityRating;
}

export interface WeeklySolunarDay {
  date: string;
  day_of_week: string;
  rating: ActivityRating;
  moon_phase: string;
  illumination: number;
  best_times_count: number;
}

// ─── API Calls ──────────────────────────────────────────────────

/**
 * Fetch solunar data for a specific date and location from the backend.
 */
export async function getSolunarData(
  latitude: number,
  longitude: number,
  date?: string,
): Promise<SolunarData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
    if (date) params.append('date', date);

    const res = await fetch(
      `${API_BASE_URL}/api/v1/integrations/solunar?${params.toString()}`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    // Offline — use local calculation
    return getLocalSolunarData(latitude, longitude, date);
  }
}

/**
 * Fetch a multi-day solunar forecast for picking the best hunt day.
 */
export async function getWeeklySolunar(
  latitude: number,
  longitude: number,
  startDate?: string,
  days: number = 7,
): Promise<WeeklySolunarDay[]> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      days: days.toString(),
    });
    if (startDate) params.append('start_date', startDate);

    const res = await fetch(
      `${API_BASE_URL}/api/v1/integrations/solunar/week?${params.toString()}`,
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (res.ok) {
      const data = await res.json();
      return data.days || [];
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Local Fallback (Simplified) ─────────────────────────────────

/**
 * Simplified local solunar calculation for offline use.
 * Less accurate than the backend but provides basic timing data.
 */
function getLocalSolunarData(
  latitude: number,
  longitude: number,
  dateStr?: string,
): SolunarData {
  const dt = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();

  // Simplified moon phase
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const synodicMonth = 29.53058867;
  const diff = (dt.getTime() - knownNewMoon.getTime()) / (86400 * 1000);
  const phaseFraction = ((diff / synodicMonth) % 1 + 1) % 1;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phaseFraction)) / 2 * 100);

  let phaseName = 'Waxing Crescent';
  if (phaseFraction < 0.0625) phaseName = 'New Moon';
  else if (phaseFraction < 0.1875) phaseName = 'Waxing Crescent';
  else if (phaseFraction < 0.3125) phaseName = 'First Quarter';
  else if (phaseFraction < 0.4375) phaseName = 'Waxing Gibbous';
  else if (phaseFraction < 0.5625) phaseName = 'Full Moon';
  else if (phaseFraction < 0.6875) phaseName = 'Waning Gibbous';
  else if (phaseFraction < 0.8125) phaseName = 'Last Quarter';
  else if (phaseFraction < 0.9375) phaseName = 'Waning Crescent';
  else phaseName = 'New Moon';

  // Approximate sunrise/sunset for Maryland (~39.5N)
  const dayOfYear = Math.floor((dt.getTime() - new Date(dt.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear + 284));
  const latRad = (latitude * Math.PI) / 180;
  const declRad = (declination * Math.PI) / 180;
  const cosHour = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(declRad)));
  const hourAngle = (Math.acos(cosHour) * 180) / Math.PI;
  const solarNoon = 12.0 - longitude / 15.0 + 5.0; // ET offset
  const sunrise = solarNoon - hourAngle / 15.0;
  const sunset = solarNoon + hourAngle / 15.0;

  const formatTime = (h: number): string => {
    const hh = Math.floor(((h % 24) + 24) % 24);
    const mm = Math.floor(((h % 1) * 60 + 60) % 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  // Simple activity score
  const distFromPeak = Math.min(Math.abs(phaseFraction), Math.abs(phaseFraction - 0.5), Math.abs(phaseFraction - 1.0));
  const score = Math.min(100, Math.max(0, 50 + Math.round((1 - distFromPeak * 4) * 20)));
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Poor';

  return {
    date: (dateStr || dt.toISOString().split('T')[0]),
    moon: {
      phase_name: phaseName,
      illumination_pct: illumination,
      phase_fraction: Math.round(phaseFraction * 10000) / 10000,
    },
    major_periods: [
      { label: 'Major 1 (Moon Overhead)', start: formatTime(12), end: formatTime(14), duration_hours: 2 },
      { label: 'Major 2 (Moon Underfoot)', start: formatTime(0), end: formatTime(2), duration_hours: 2 },
    ],
    minor_periods: [
      { label: 'Minor 1 (Moonrise)', center: formatTime(6), duration_hours: 1 },
      { label: 'Minor 2 (Moonset)', center: formatTime(18), duration_hours: 1 },
    ],
    sun: {
      sunrise: formatTime(sunrise),
      sunset: formatTime(sunset),
      legal_start: formatTime(sunrise - 0.5),
      legal_end: formatTime(sunset + 0.5),
    },
    best_times: [
      { window: 'Dawn Feed', start: formatTime(sunrise - 0.5), end: formatTime(sunrise + 1.5), priority: 'high', reason: 'Peak feeding at first light' },
      { window: 'Dusk Feed', start: formatTime(sunset - 1.5), end: formatTime(sunset + 0.5), priority: 'high', reason: 'Evening feeding movement' },
    ],
    rating: {
      score,
      label: label as 'Excellent' | 'Good' | 'Fair' | 'Poor',
      factors: {
        moon_phase: phaseName,
        illumination,
        solunar_dawn_overlap: false,
        solunar_dusk_overlap: false,
      },
    },
  };
}
