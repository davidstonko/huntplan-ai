/**
 * Weather Service — HuntPlan AI
 *
 * Provides weather data for hunt planning.
 * Uses the free weather.gov API (no API key needed for US locations).
 *
 * Flow:
 * 1. Get grid point from lat/lon: https://api.weather.gov/points/{lat},{lon}
 * 2. Get forecast from grid: response.properties.forecast URL
 *
 * Future: integrate wind, pressure, moon phase for deer movement prediction.
 */

import axios from 'axios';

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

export interface HuntingWeather {
  forecasts: WeatherForecast[];
  deerActivityIndex: number; // 1-10 scale based on pressure, temp, wind
  bestTimeToHunt: string;
  alerts: string[];
}

const WEATHER_API = 'https://api.weather.gov';

class WeatherService {
  private gridCache: Map<string, { gridId: string; gridX: number; gridY: number }> = new Map();

  /**
   * Get 7-day forecast for a location
   */
  async getForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
    try {
      const grid = await this.getGridPoint(lat, lon);
      const res = await axios.get(
        `${WEATHER_API}/gridpoints/${grid.gridId}/${grid.gridX},${grid.gridY}/forecast`,
        {
          headers: { 'User-Agent': 'HuntPlanAI/1.0 (dstonko1@gmail.com)' },
          timeout: 10000,
        }
      );
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
      return [];
    }
  }

  /**
   * Get hunting-optimized weather analysis
   * Factors: barometric pressure changes, temperature drops, wind speed, moon phase
   */
  async getHuntingWeather(lat: number, lon: number): Promise<HuntingWeather> {
    const forecasts = await this.getForecast(lat, lon);

    // Simple deer activity heuristic
    // Real version will use barometric pressure data from weather.gov observations
    const deerActivityIndex = this.calculateDeerActivity(forecasts);
    const bestTime = this.suggestBestTime(forecasts);

    return {
      forecasts,
      deerActivityIndex,
      bestTimeToHunt: bestTime,
      alerts: [],
    };
  }

  private async getGridPoint(lat: number, lon: number) {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (this.gridCache.has(key)) {
      return this.gridCache.get(key)!;
    }

    const res = await axios.get(`${WEATHER_API}/points/${lat},${lon}`, {
      headers: { 'User-Agent': 'HuntPlanAI/1.0 (dstonko1@gmail.com)' },
      timeout: 10000,
    });

    const grid = {
      gridId: res.data.properties.gridId,
      gridX: res.data.properties.gridX,
      gridY: res.data.properties.gridY,
    };
    this.gridCache.set(key, grid);
    return grid;
  }

  /**
   * Calculate deer activity score (1-10)
   * Higher scores = better hunting conditions
   */
  private calculateDeerActivity(forecasts: WeatherForecast[]): number {
    if (forecasts.length === 0) return 5;

    const today = forecasts[0];
    let score = 5; // baseline

    // Temperature: Deer are more active in cooler temps (30-50°F ideal)
    if (today.temperature >= 30 && today.temperature <= 50) score += 2;
    else if (today.temperature >= 20 && today.temperature <= 60) score += 1;
    else if (today.temperature > 70) score -= 1;

    // Wind: Light wind is better for hunting (scent control)
    const windMph = parseInt(today.windSpeed) || 10;
    if (windMph < 10) score += 1;
    else if (windMph > 20) score -= 1;

    // Weather change: Deer feed heavily before storms
    if (today.shortForecast.toLowerCase().includes('rain') ||
        today.shortForecast.toLowerCase().includes('storm')) {
      score += 1; // Pre-storm feeding activity
    }

    return Math.max(1, Math.min(10, score));
  }

  private suggestBestTime(forecasts: WeatherForecast[]): string {
    if (forecasts.length === 0) return 'Dawn and dusk are generally best.';

    const today = forecasts[0];
    if (today.temperature > 60) {
      return 'First and last light — deer will move early/late to avoid heat.';
    }
    if (today.temperature < 25) {
      return 'Midday may be productive — deer feeding to stay warm.';
    }
    return 'Dawn and dusk remain your best windows. All-day sits can pay off in rut.';
  }
}

const weatherService = new WeatherService();
export default weatherService;
