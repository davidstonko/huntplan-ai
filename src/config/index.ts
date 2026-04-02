/**
 * @file config/index.ts
 * @description Centralized application configuration.
 * Manages environment-specific settings, API endpoints, Mapbox token, and feature flags.
 *
 * Environment:
 * - Development: localhost API, development mode enabled
 * - Production: Render-hosted API, production mode disabled
 *
 * All sensitive tokens (Mapbox, API) are read from .env file.
 * Feature flags control optional capabilities (WebSocket, push notifications, etc.).
 */

export const Config = {
  /**
   * API Base URL — Development vs. Production
   * Development: http://localhost:8000 (iOS Simulator/device with Mac's LAN IP)
   * Production: https://huntplan-api.onrender.com
   */
  API_BASE_URL: __DEV__
    ? 'http://localhost:8000'
    : 'https://huntplan-api.onrender.com',

  /**
   * WebSocket Base URL — For real-time collaboration in Deer Camp
   * Development: ws://localhost:8000
   * Production: wss://huntplan-api.onrender.com
   */
  WS_BASE_URL: __DEV__
    ? 'ws://localhost:8000'
    : 'wss://huntplan-api.onrender.com',

  /**
   * Mapbox Access Token — Loaded from .env file
   * Used for Mapbox GL Native initialization
   * Token scopes: maps:read, styles:read
   */
  MAPBOX_ACCESS_TOKEN: 'pk.eyJ1IjoiZHN0b25rbzEiLCJhIjoiY21uYXJva3dqMG40MzJycHRreGg0NHp5diJ9.FjYw8WPexpiugKmhZqQiww',

  /**
   * Feature Flags — Enable/disable optional features
   */
  ENABLE_WEBSOCKET_SYNC: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_PHOTO_UPLOAD: true,
  ENABLE_OFFLINE_MAPS: true,
  ENABLE_AI_CHAT: true,

  /**
   * Debug mode flag
   */
  IS_DEVELOPMENT: __DEV__,
};

export default Config;
