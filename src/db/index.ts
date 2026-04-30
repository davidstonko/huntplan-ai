/**
 * WatermelonDB Database — DISABLED for V2
 *
 * WatermelonDB schema is defined but NOT active until Phase 3 backend sync.
 * This module exports a null database to prevent model decorator errors.
 * Contexts (ScoutDataContext, DeerCampContext) use AsyncStorage in V2.
 */

// Database not initialized in V2 — export null placeholder
export const database: any = null;

export default database;
