/**
 * movementForecastService — blends NOAA weather into the solunar activity score.
 *
 * Solunar (moon) rating tells you the base activity window; weather tells you
 * whether animals actually move that day. Hunters know the big levers: a cold
 * front / falling temps puts deer on their feet, while high wind and storms shut
 * movement down. This service turns a day's forecast into a score modifier and
 * blends it with the solunar score — onX's "Movement Forecast" idea, on our
 * free stack. Pure functions; the screen supplies solunar days + forecast.
 */
import type { WindPeriod } from './windCalendarService';

/** Daytime weather for one day, reduced to the movement-relevant bits. */
export interface DayWeather {
  /** NOAA period name, e.g. "Saturday" / "Today" / "This Afternoon". */
  periodName: string;
  highTemp: number;
  windMph: number;
  shortForecast: string;
}

/** Pull the daytime periods out of a forecast as per-day weather. */
export function daytimeDayWeather(periods: WindPeriod[]): DayWeather[] {
  return periods
    .filter((p) => p.isDaytime)
    .map((p) => ({
      periodName: p.name,
      highTemp: p.temperature,
      windMph: p.windMph,
      shortForecast: p.shortForecast,
    }));
}

export interface MovementModifier {
  /** Score adjustment applied to the solunar score, clamped to [-25, +20]. */
  delta: number;
  /** One-line, most-salient reason for the adjustment. */
  note: string;
}

/**
 * Turn a day's weather (and the prior day, for front detection) into a movement
 * modifier. Deltas are additive then clamped; the note is the strongest single
 * factor so the UI stays readable.
 */
export function weatherMovementModifier(
  today: DayWeather,
  prev?: DayWeather | null,
): MovementModifier {
  const reasons: { d: number; text: string }[] = [];

  if (prev) {
    const drop = prev.highTemp - today.highTemp;
    if (drop >= 12) {
      reasons.push({ d: 16, text: `Cold front — high down ${Math.round(drop)}°, strong movement day` });
    } else if (drop >= 6) {
      reasons.push({ d: 8, text: `Cooling ${Math.round(drop)}° — better movement` });
    } else if (today.highTemp - prev.highTemp >= 10) {
      reasons.push({ d: -8, text: 'Warming trend — movement slows' });
    }
  }

  if (today.windMph >= 20) {
    reasons.push({ d: -15, text: `High wind ${today.windMph} mph — movement suppressed` });
  } else if (today.windMph >= 15) {
    reasons.push({ d: -6, text: `Breezy ${today.windMph} mph` });
  }

  const sky = today.shortForecast || '';
  if (/snow|flurr/i.test(sky)) {
    reasons.push({ d: 5, text: 'Snow — feeding activity' });
  } else if (/thunder|heavy rain/i.test(sky)) {
    reasons.push({ d: -10, text: 'Storms — animals hunker down' });
  } else if (/rain|shower|drizzle/i.test(sky)) {
    reasons.push({ d: -5, text: 'Rain — variable' });
  }

  let delta = reasons.reduce((sum, r) => sum + r.d, 0);
  delta = Math.max(-25, Math.min(20, delta));

  const note = reasons.length
    ? reasons.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a)).text
    : 'Steady conditions';

  return { delta, note };
}

/** Blend a solunar score (0-100) with a weather modifier, clamped to [0,100]. */
export function blendMovementScore(
  solunarScore: number,
  mod: MovementModifier,
): number {
  return Math.max(0, Math.min(100, Math.round(solunarScore + mod.delta)));
}

export function movementLabel(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (score >= 75) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 35) return 'Fair';
  return 'Poor';
}

/**
 * Match a solunar day to its daytime weather. Future days are named by weekday
 * in NOAA output; day 0 ("today") is often "Today"/"This Afternoon"/"This Morning".
 */
export function matchDayWeather(
  dayOfWeek: string,
  index: number,
  daytime: DayWeather[],
): DayWeather | null {
  const byName = daytime.find((d) => d.periodName.includes(dayOfWeek));
  if (byName) return byName;
  if (index === 0) {
    const first = daytime.find((d) => /today|this after|this morn/i.test(d.periodName));
    if (first) return first;
  }
  return null;
}
