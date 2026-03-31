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

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

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
 * Hunting-optimized weather analysis including deer activity prediction
 * @interface HuntingWeather
 * @property {WeatherForecast[]} forecasts - Array of weather periods
 * @property {number} deerActivityIndex - 1-10 scale; higher = better hunting conditions
 * @property {string} bestTimeToHunt - Text recommendation for optimal hunt timing
 * @property {string[]} alerts - Array of weather alerts (empty in V1, populated in V3+)
 */
export interface HuntingWeather {
  forecasts: WeatherForecast[];
  deerActivityIndex: number; // 1-10 scale based on pressure, temp, wind
  bestTimeToHunt: string;
  alerts: string[];
}

const WEATHER_API = 'https://api.weather.gov';

/**
 * WeatherService — Hunting Weather Analysis
 *
 * Provides 7-day forecasts and deer activity predictions for hunt planning.
 * Caches NOAA grid coordinates to reduce API calls for same location.
 *
 * @class WeatherService
 */
class WeatherService {
  // Cache grid coordinates (lat,lon) -> (gridId, gridX, gridY) to avoid repeated API calls
  private gridCache: Map<string, { gridId: string; gridX: number; gridY: number }> = new Map();

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
          headers: { 'User-Agent': 'HuntPlanAI/1.0 (dstonko1@gmail.com)' },
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
      console.error('Weather API error:', error);
      return []; // Return empty array on error; AI handles gracefully
    }
  }

  /**
   * Get hunting-optimized weather analysis with deer activity index
   * Combines weather forecast with hunting condition scoring.
   * Used by AI to advise on best hunt times.
   * @async
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<HuntingWeather>} Forecasts + activity index + hunt time recommendation
   */
  async getHuntingWeather(lat: number, lon: number): Promise<HuntingWeather> {
    const forecasts = await this.getForecast(lat, lon);

    // Calculate hunting suitability (1-10 scale)
    // Future: integrate barometric pressure trends and moon phase
    const deerActivityIndex = this.calculateDeerActivity(forecasts);
    const bestTime = this.suggestBestTime(forecasts);

    return {
      forecasts,
      deerActivityIndex,
      bestTimeToHunt: bestTime,
      alerts: [], // Populated in V3+ with severe weather alerts
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
      headers: { 'User-Agent': 'HuntPlanAI/1.0 (dstonko1@gmail.com)' },
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
   * Calculate deer activity index (1-10 scale)
   * Factors: temperature (deer active in cool weather), wind (impacts scent),
   * weather patterns (deer feed before storms).
   * Higher scores indicate better hunting conditions.
   * @private
   * @param {WeatherForecast[]} forecasts - Today's forecast periods
   * @returns {number} Deer activity index 1-10
   */
  private calculateDeerActivity(forecasts: WeatherForecast[]): number {
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

    // Weather changes: Deer feed heavily before/during storms
    // This is a simplified heuristic; real version will use pressure trends
    if (today.shortForecast.toLowerCase().includes('rain') ||
        today.shortForecast.toLowerCase().includes('storm')) {
      score += 1;
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
      const res = await axios.get(`${API_BASE_URL}/api/v1/integrations/weather`, {
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
      console.warn('[Weather] Backend unavailable, using direct API');
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
