/**
 * Type declarations for `@env` — the virtual module exposed by
 * `react-native-dotenv`. Each `export` here mirrors a key in `.env` (and
 * `.env.example` for the public template). Keep this file in sync when
 * adding new keys.
 *
 * This module is consumed by `src/config.ts`, which is the single
 * application-facing surface for environment-derived values. Components
 * should NOT import from `@env` directly — go through `Config` so the
 * runtime fallback / production-error logic in `config.ts` always runs.
 */
declare module '@env' {
  /**
   * Mapbox public access token (`pk.…`). Used to initialize @rnmapbox/maps
   * at module-load. Required at build time — `.env` must define it.
   * Rotate regularly via account.mapbox.com → Access Tokens.
   */
  export const MAPBOX_ACCESS_TOKEN: string;

  /**
   * Backend API base URL, e.g. `https://huntplan-api.onrender.com`.
   * Optional in development — `config.ts` falls back to the Render prod URL.
   */
  export const API_BASE_URL: string | undefined;
}
