/**
 * Weather Service Module — HuntPlan AI
 *
 * Provides weather data and hunting condition analysis for hunt planning.
 * Uses the free weather.gov API (no API key required for US locations).
 *
 * Architecture:
 * 1. Query weather.gov/points/{lat},{lon} to get grid coordinates
 * 2. Cache grid coordinates for same location (to reduce API calls)
 * 3. Use grid forecast URL to get 7-day forecast periods
 * 4. Calculate deer activity index and optimal hunt times
 *
 * Future enhancements:
 * - Integrate barometric pressure trends for pre-storm feeding activity
 * - Add moon phase calculations for rut prediction
 * - Include wind chill and dew point for scent conditions
 * - Integrate historical weather patterns for region-specific analysis
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

/**
 * Barometric pressure reading with timestamp
 * @interface PressureReading
 * @property {number} value - Pressure in mb/hPa
 * @property {number} timestamp - Unix timestamp (ms)
 */
export interface PressureReading {
  value: number;
  timestamp: number;
}

/**
 * Hunting conditions returned by the backend AI analysis
 */
export interface HuntingConditions {
  deer_activity?: string;
  wind_assessment?: string;
  overall_rating?: string;
  pressure_trend?: string;
  short_summary?: string;
}

/**
 * Pressure trend type
 * @typedef PressureTrend
 */
export type PressureTrend = 'rising' | 'falling' | 'stable' | 'unknown';

/**
 * Single forecast period from weather.gov API
 * Represents a time window (e.g., "Saturday", "Saturday Night")
 * @interface WeatherForecast
 * @property {string} name - Period name (e.g., "Saturday", "Saturday Night")
 * @property {number} temperature - Temperature in specified unit
 * @property {string} temperatureUnit - "F" or "C"
 * @property {string} windSpeed - Wind description (e.g., "10 to 15 mph")
 * @property {string} windDirection - Cardinal direction (N, NE, S, etc.)
 * @property {string} shortForecast - Brief condition (e.g., "Partly Cloudy")
 * @property {string} detailedForecast - Extended forecast text with conditions
 * @property {boolean} isDaytime - True if this period is daytime
 * @property {string} icon - URL to weather icon image from NOAA
 */
export interface WeatherForecast {
  name: string;        // e.g., "Saturday", "Saturday Night"
  temperature: number;
  temperatureUnit: string; // "F" or "C"
  windSpeed: string;   // e.g., "10 to 15 mph"
  windDirection: string;
  shortForecast: string; // e.g., "Partly Cloudy"
  detailedForecast: string;
  isDaytime: boolean;
  icon: string;        // URL to weather icon
}

/**
 * Scent condition evaluation for hunters
 * @typedef ScentCondition
 */
export type ScentCondition = 'excellent' | 'good' | 'moderate' | 'poor';

/**
 * Hunting-optimized weather analysis including deer activity prediction and scent conditions
 * @interface HuntingWeather
 * @property {WeatherForecast[]} forecasts - Array of weather periods
 * @property {number} deerActivityIndex - 1-10 scale; higher = better hunting conditions
 * @property {string} bestTimeToHunt - Text recommendation for optimal hunt timing
 * @property {string[]} alerts - Array of weather alerts (empty in V1, populated in V3+)
 * @property {number | null} pressureValue - Current barometric pressure in mb/hPa
 * @property {PressureTrend} pressureTrend - Rising/falling/stable pressure trend
 * @property {number | null} dewPoint - Dew point temperature in °F
 * @property {number} scentRisk - 1-10 scale; 1 = excellent (scent dissipates), 10 = poor (scent carries far)
 * @property {ScentCondition} scentCondition - Categorical assessment: excellent/good/moderate/poor
 * @property {string} scentTip - Hunting advice based on scent conditions
 */
export interface HuntingWeather {
  forecasts: WeatherForecast[];
  deerActivityIndex: number; // 1-10 scale based on pressure, temp, wind
  bestTimeToHunt: string;
  alerts: string[];
  pressureValue: number | null;
  pressureTrend: PressureTrend;
  dewPoint: number | null;
  scentRisk: number; // 1-10 scale
  scentCondition: ScentCondition;
  scentTip: string;
}

const WEATHER_API = 'https://api.weather.gov';

/**
 * WeatherService — Hunting Weather Analysis
 *
 * Provides 7-day forecasts and deer activity predictions for hunt planning.
 * Caches NOAA grid coordinates to reduce API calls for same location.
 * Tracks barometric pressure history to calculate trend (rising/falling/stable).
 *
 * @class WeatherService
 */
class WeatherService {
  // Cache grid coordinates (lat,lon) -> (gridId, gridX, gridY) to avoid repeated API calls
  private gridCache: Map<string, { gridId: string; gridX: number; gridY: number }> = new Map();
  // Pressure history storage key
  private readonly PRESSURE_HISTORY_KEY = 'weather_pressure_history';

  /**
   * Get 7-day weather forecast for a location
   * Fetches grid point coordinates, then queries forecast endpoint.
   * @async
   * @param {number} lat - Latitude (decimal degrees)
   * @param {number} lon - Longitude (decimal degrees)
   * @returns {Promise<WeatherForecast[]>} Array of forecast periods (typically 14 items for 7 days)
   * @throws Silently catches errors and returns empty array
   */
  async getForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
    try {
      // Get grid coordinates for this location
      const grid = await this.getGridPoint(lat, lon);
      // Query forecast using grid coordinates (more efficient than lat/lon)
      const res = await axios.get(
        `${WEATHER_API}/gridpoints/${grid.gridId}/${grid.gridX},${grid.gridY}/forecast`,
        {
          headers: { 'User-Agent': 'MDHuntFishOutdoors/2.0 (contact@outdoorsmaryland.com)' },
          timeout: 10000,
        }
      );
      // Map response to WeatherForecast interface
      return res.data.properties.periods.map((p: any) => ({
        name: p.name,
        temperature: p.temperature,
        temperatureUnit: p.temperatureUnit,
        windSpeed: p.windSpeed,
        windDirection: p.windDirection,
        shortForecast: p.shortForecast,
        detailedForecast: p.detailedForecast,
        isDaytime: p.isDaytime,
        icon: p.icon,
      }));
    } catch (error) {
      if (__DEV__) console.error('[Weather] API error:', error);
      return []; // Return empty array on error; AI handles gracefully
    }
  }

  /**
   * Get hunting-optimized weather analysis with deer activity index and scent conditions
   * Combines weather forecast with hunting condition scoring, barometric pressure trends, and dew point analysis.
   * Used by AI to advise on best hunt times and scent management.
   * @async
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<HuntingWeather>} Forecasts + activity index + scent conditions + hunt time recommendation + pressure data
   */
  async getHuntingWeather(lat: number, lon: number): Promise<HuntingWeather> {
    const forecasts = await this.getForecast(lat, lon);
    let pressureValue: number | null = null;
    let pressureTrend: PressureTrend = 'unknown';
    let dewPoint: number | null = null;
    let scentRisk = 5;
    let scentCondition: ScentCondition = 'moderate';
    let scentTip = 'Moderate scent conditions.';

    // Attempt to get current pressure and dew point from backend weather endpoint
    try {
      const result = await this.getBackendWeather(lat, lon);
      if (result.current) {
        if (result.current.barometric_pressure_mb) {
          pressureValue = result.current.barometric_pressure_mb;
          if (pressureValue !== null) {
            pressureTrend = await this.calculatePressureTrend(pressureValue);
          }
        }

        // Extract dew point if available (may be provided as dewpoint, dew_point, etc.)
        if (result.current.dew_point_f !== undefined) {
          dewPoint = result.current.dew_point_f;
        } else if (result.current.dewpoint_f !== undefined) {
          dewPoint = result.current.dewpoint_f;
        } else if (result.current.dewPoint !== undefined) {
          dewPoint = result.current.dewPoint;
        }
      }
    } catch (error) {
      if (__DEV__) console.warn('[Weather] Could not fetch current pressure/dew point');
    }

    // Calculate scent conditions if we have temperature and dew point
    const today = forecasts[0];
    if (today && dewPoint !== null) {
      const scent = this.calculateScentConditions(today.temperature, dewPoint, today.shortForecast);
      scentRisk = scent.scentRisk;
      scentCondition = scent.scentCondition;
      scentTip = scent.scentTip;
    } else if (today) {
      // Fallback: calculate scent based on forecast text only
      const scent = this.calculateScentConditions(today.temperature, null, today.shortForecast);
      scentRisk = scent.scentRisk;
      scentCondition = scent.scentCondition;
      scentTip = scent.scentTip;
    }

    // Calculate hunting suitability (1-10 scale)
    // Incorporates barometric pressure trends, scent conditions, and weather patterns
    const deerActivityIndex = this.calculateDeerActivity(forecasts, pressureTrend, scentRisk);
    const bestTime = this.suggestBestTime(forecasts);

    return {
      forecasts,
      deerActivityIndex,
      bestTimeToHunt: bestTime,
      alerts: [], // Populated in V3+ with severe weather alerts
      pressureValue,
      pressureTrend,
      dewPoint,
      scentRisk,
      scentCondition,
      scentTip,
    };
  }

  /**
   * Get NOAA grid coordinates for a lat/lon point
   * Caches results to avoid redundant API calls for same location.
   * @private
   * @async
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<{gridId: string; gridX: number; gridY: number}>} Grid info
   */
  private async getGridPoint(lat: number, lon: number) {
    // Round to 4 decimals for cache key (~11m precision, good enough for weather)
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (this.gridCache.has(key)) {
      return this.gridCache.get(key)!;
    }

    // Query weather.gov points endpoint to get grid coordinates
    const res = await axios.get(`${WEATHER_API}/points/${lat},${lon}`, {
      headers: { 'User-Agent': 'MDHuntFishOutdoors/2.0 (contact@outdoorsmaryland.com)' },
      timeout: 10000,
    });

    // Extract grid info from response
    const grid = {
      gridId: res.data.properties.gridId,
      gridX: res.data.properties.gridX,
      gridY: res.data.properties.gridY,
    };
    this.gridCache.set(key, grid);
    return grid;
  }

  /**
   * Store barometric pressure reading and keep last 3 readings in AsyncStorage
   * @private
   * @async
   * @param {number} pressure - Pressure in mb/hPa
   * @returns {Promise<PressureReading[]>} Updated pressure history
   */
  private async storePressureReading(pressure: number): Promise<PressureReading[]> {
    try {
      const stored = await AsyncStorage.getItem(this.PRESSURE_HISTORY_KEY);
      let history: PressureReading[] = stored ? JSON.parse(stored) : [];

      // Add new reading
      history.push({
        value: pressure,
        timestamp: Date.now(),
      });

      // Keep last 3 readings
      if (history.length > 3) {
        history = history.slice(-3);
      }

      await AsyncStorage.setItem(this.PRESSURE_HISTORY_KEY, JSON.stringify(history));
      return history;
    } catch (error) {
      if (__DEV__) console.error('[Weather] Error storing pressure:', error);
      return [];
    }
  }

  /**
   * Calculate pressure trend based on history
   * @private
   * @async
   * @param {number} currentPressure - Current pressure in mb/hPa
   * @returns {Promise<PressureTrend>} Trend: rising/falling/stable/unknown
   */
  private async calculatePressureTrend(currentPressure: number): Promise<PressureTrend> {
    try {
      const history = await this.storePressureReading(currentPressure);

      // Need at least 2 readings to determine trend
      if (history.length < 2) {
        return 'unknown';
      }

      // Compare current to oldest reading in history (roughly 3+ hours apart)
      const oldest = history[0];
      const newest = history[history.length - 1];
      const pressureDelta = newest.value - oldest.value;

      // Thresholds (in mb/hPa)
      const risingThreshold = 1.0;
      const fallingThreshold = -1.0;

      if (pressureDelta > risingThreshold) {
        return 'rising';
      } else if (pressureDelta < fallingThreshold) {
        return 'falling';
      } else {
        return 'stable';
      }
    } catch (error) {
      if (__DEV__) console.error('[Weather] Error calculating pressure trend:', error);
      return 'unknown';
    }
  }

  /**
   * Calculate scent risk and conditions based on temperature and dew point
   * Dew point close to air temp (within 3°F) = high humidity = scent carries far (bad for hunter)
   * Dew point far below air temp (>15°F spread) = dry air = scent dissipates quickly (good)
   * Rain/mist suppresses scent (good)
   * @private
   * @param {number} temperature - Air temperature in °F
   * @param {number | null} dewPoint - Dew point temperature in °F (null if unavailable)
   * @param {string} forecast - Short forecast text (may mention rain/mist)
   * @returns {Object} { scentRisk: 1-10, scentCondition, scentTip }
   */
  private calculateScentConditions(
    temperature: number,
    dewPoint: number | null,
    forecast: string
  ): {
    scentRisk: number;
    scentCondition: ScentCondition;
    scentTip: string;
  } {
    let scentRisk = 5; // Baseline neutral

    // If dew point available, calculate humidity-based scent risk
    if (dewPoint !== null) {
      const tempDewpointSpread = temperature - dewPoint;

      // Dew point spread formula: wider spread = drier = better for hunter
      // Formula: scentRisk = 10 - Math.min(10, Math.floor(spread / 2))
      scentRisk = 10 - Math.min(10, Math.floor(tempDewpointSpread / 2));

      // Clamp to valid range
      scentRisk = Math.max(1, Math.min(10, scentRisk));
    }

    // Rain or mist suppresses scent (bonus for hunter)
    const forecastLower = forecast.toLowerCase();
    if (forecastLower.includes('rain') || forecastLower.includes('mist') || forecastLower.includes('drizzle')) {
      scentRisk = Math.max(1, scentRisk - 2);
    }

    // Determine categorical condition and tip
    let scentCondition: ScentCondition;
    let scentTip: string;

    if (scentRisk <= 2) {
      scentCondition = 'excellent';
      scentTip = 'Excellent scent conditions. Dry air and low humidity — scent dissipates quickly. Ideal for a stand hunt.';
    } else if (scentRisk <= 4) {
      scentCondition = 'good';
      scentTip = 'Good scent conditions. Moderate humidity — your scent control efforts will be effective.';
    } else if (scentRisk <= 7) {
      scentCondition = 'moderate';
      scentTip = 'Moderate scent conditions. Higher humidity — be extra careful with wind direction and scent control.';
    } else {
      scentCondition = 'poor';
      scentTip = 'Poor scent conditions. High humidity — your scent will carry far. Hunt with great caution to the wind.';
    }

    return { scentRisk, scentCondition, scentTip };
  }

  /**
   * Calculate deer activity index (1-10 scale)
   * Factors: temperature (deer active in cool weather), wind (impacts scent),
   * barometric pressure (deer feed before storms), weather patterns, scent conditions.
   * Higher scores indicate better hunting conditions.
   * @private
   * @param {WeatherForecast[]} forecasts - Today's forecast periods
   * @param {PressureTrend} pressureTrend - Current pressure trend
   * @param {number} scentRisk - Scent risk (1-10); lower is better for deer activity
   * @returns {number} Deer activity index 1-10
   */
  private calculateDeerActivity(
    forecasts: WeatherForecast[],
    pressureTrend: PressureTrend = 'unknown',
    scentRisk: number = 5
  ): number {
    if (forecasts.length === 0) return 5; // Default neutral score

    const today = forecasts[0];
    let score = 5; // Baseline score

    // Temperature: Deer are most active in cool conditions (30-50°F ideal for fall/winter)
    // Active less during warm midday heat (>70°F)
    if (today.temperature >= 30 && today.temperature <= 50) score += 2;
    else if (today.temperature >= 20 && today.temperature <= 60) score += 1;
    else if (today.temperature > 70) score -= 1;

    // Wind: Light wind favors hunting (scent control easier)
    // Heavy wind (>20 mph) makes hunting difficult and can spook deer
    const windMph = parseInt(today.windSpeed) || 10;
    if (windMph < 10) score += 1;
    else if (windMph > 20) score -= 1;

    // Barometric pressure trend: Major factor in deer activity
    // Rising pressure: +2 activity bonus (stable, active feeding)
    // Falling pressure: -1 (unsettled, less activity)
    // Rapidly falling: +3 (pre-storm feeding frenzy!)
    if (pressureTrend === 'rising') {
      score += 2;
    } else if (pressureTrend === 'falling') {
      score -= 1;
    }

    // Scent conditions: Excellent/good conditions boost deer activity (hunter has advantage)
    // Poor conditions reduce activity (hunter at disadvantage, deer spook easier)
    if (scentRisk <= 3) {
      score += 1; // Bonus for excellent/good scent dissipation
    } else if (scentRisk >= 8) {
      score -= 1; // Penalty for poor scent conditions
    }

    // Weather changes: Deer feed heavily before/during storms
    if (today.shortForecast.toLowerCase().includes('rain') ||
        today.shortForecast.toLowerCase().includes('storm')) {
      // If falling pressure + storm: pre-storm feeding frenzy
      if (pressureTrend === 'falling') {
        score += 3;
      } else {
        score += 1;
      }
    }

    // Clamp score to valid range
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Get enhanced weather from backend API (includes hunting condition analysis).
   * Falls back to direct Weather.gov if backend is unavailable.
   */
  async getBackendWeather(lat: number, lon: number): Promise<{
    forecast: WeatherForecast[];
    huntingConditions: HuntingConditions;
    current: Record<string, any> | null;
    location: Record<string, any> | null;
  }> {
    try {
      const res = await axios.get(`${Config.API_BASE_URL}/api/v1/integrations/weather`, {
        params: { latitude: lat, longitude: lon },
        timeout: 15000,
      });

      if (res.data.status === 'ok') {
        // Map backend forecast format to our WeatherForecast interface
        const forecasts: WeatherForecast[] = (res.data.forecast || []).map((p: any) => ({
          name: p.name || '',
          temperature: p.temperature || 0,
          temperatureUnit: p.temperature_unit || 'F',
          windSpeed: p.wind_speed || '',
          windDirection: p.wind_direction || '',
          shortForecast: p.short_forecast || '',
          detailedForecast: p.detailed_forecast || '',
          isDaytime: p.is_daytime ?? true,
          icon: '',
        }));

        return {
          forecast: forecasts,
          huntingConditions: res.data.hunting_conditions || {},
          current: res.data.current || null,
          location: res.data.location || null,
        };
      }
    } catch (error) {
      if (__DEV__) console.warn('[Weather] Backend unavailable, using direct API');
    }

    // Fallback: direct Weather.gov + local analysis
    const forecasts = await this.getForecast(lat, lon);
    return {
      forecast: forecasts,
      huntingConditions: {},
      current: null,
      location: null,
    };
  }

  /**
   * Suggest optimal hunt times based on forecast
   * Used by AI to recommend when to hunt for best success.
   * @private
   * @param {WeatherForecast[]} forecasts - Today's forecast periods
   * @returns {string} Human-readable hunt time recommendation
   */
  private suggestBestTime(forecasts: WeatherForecast[]): string {
    if (forecasts.length === 0) return 'Dawn and dusk are generally best.';

    const today = forecasts[0];
    // Hot weather: Deer move only at dawn/dusk to avoid midday heat
    if (today.temperature > 60) {
      return 'First and last light — deer will move early/late to avoid heat.';
    }
    // Cold weather: Deer feed throughout day to maintain body heat
    if (today.temperature < 25) {
      return 'Midday may be productive — deer feeding to stay warm.';
    }
    // Moderate temps: Standard dawn/dusk plus rut opportunity
    return 'Dawn and dusk remain your best windows. All-day sits can pay off in rut.';
  }
}

// Singleton instance exported for use throughout the app
const weatherService = new WeatherService();
export default weatherService;
