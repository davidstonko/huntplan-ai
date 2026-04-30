/**
 * @file databaseService.ts
 * @description WatermelonDB database initialization and lifecycle management.
 *
 * Provides database instance and model classes for offline-first persistence.
 * Uses WatermelonDB's SQLite adapter for iOS.
 *
 * Tables:
 * - hunt_plans (Scout plans with parking, notes)
 * - waypoints, routes, drawn_areas (plan annotations)
 * - recorded_tracks (GPS recordings)
 * - deer_camps (collaborative camp maps)
 * - camp_members, shared_annotations, camp_photos, activity_feed (camp data)
 *
 * Phase 3+: Activated when backend sync is ready
 * Phase 2: Currently disabled — use AsyncStorage instead
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from '../db/schema';
import {
  HuntPlanModel,
  WaypointModel,
  RouteModel,
  DrawnAreaModel,
  RecordedTrackModel,
  DeerCampModel,
  CampMemberModel,
  SharedAnnotationModel,
  CampPhotoModel,
  ActivityFeedModel,
} from '../db/models';

// ─── Database Initialization ────────────────────────────────────

/** Shared database instance (lazy-initialized) */
let databaseInstance: Database | null = null;

/**
 * Initialize WatermelonDB database with SQLite adapter
 * Called once at app startup via DatabaseProvider or App.tsx
 *
 * Creates SQLite database at app documents folder.
 * All tables from schema.ts are automatically created on first run.
 *
 * @async
 * @returns Promise<Database> initialized database instance
 * @throws If database initialization fails (disk space, permissions, etc.)
 */
export async function initializeDatabase(): Promise<Database> {
  if (databaseInstance) {
    if (__DEV__) console.log('[DatabaseService] Database already initialized');
    return databaseInstance;
  }

  try {
    // Create SQLite adapter
    const adapter = new SQLiteAdapter({
      dbName: 'huntplan.db',
      schema,
    });

    // Initialize database
    const db = new Database({
      adapter,
      modelClasses: [
        HuntPlanModel,
        WaypointModel,
        RouteModel,
        DrawnAreaModel,
        RecordedTrackModel,
        DeerCampModel,
        CampMemberModel,
        SharedAnnotationModel,
        CampPhotoModel,
        ActivityFeedModel,
      ],
    });

    // Verify database is ready
    await db.action(async () => {
      // Perform a test query to ensure tables are created
      const plans = await (db.collections.get('hunt_plans') as any).query().fetch();
      if (__DEV__) console.log(`[DatabaseService] Database initialized with ${plans.length} plans`);
    });

    databaseInstance = db;
    return db;
  } catch (error) {
    if (__DEV__) console.error('[DatabaseService] Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the database instance
 * Must be called after initializeDatabase()
 *
 * @returns Database instance or null if not yet initialized
 */
export function getDatabase(): Database | null {
  return databaseInstance;
}

/**
 * Get a specific model collection by name
 *
 * @param modelName - One of: 'hunt_plans', 'waypoints', 'routes', 'drawn_areas',
 *                             'recorded_tracks', 'deer_camps', 'camp_members',
 *                             'shared_annotations', 'camp_photos', 'activity_feed'
 * @returns Collection instance or null if database not initialized
 * @throws If modelName is not a valid table
 */
export function getCollection(modelName: string) {
  if (!databaseInstance) {
    console.warn('[DatabaseService] Database not initialized');
    return null;
  }

  try {
    return databaseInstance.collections.get(modelName);
  } catch (error) {
    console.error(`[DatabaseService] Invalid collection name: ${modelName}`);
    throw error;
  }
}

// ─── Model Exports ──────────────────────────────────────────────

export {
  HuntPlanModel,
  WaypointModel,
  RouteModel,
  DrawnAreaModel,
  RecordedTrackModel,
  DeerCampModel,
  CampMemberModel,
  SharedAnnotationModel,
  CampPhotoModel,
  ActivityFeedModel,
};

// ─── Lifecycle & Debugging ──────────────────────────────────────

/**
 * Close database connection
 * Called at app shutdown or during cleanup
 *
 * @async
 * @returns Promise<void>
 */
export async function closeDatabase(): Promise<void> {
  if (!databaseInstance) {
    return;
  }

  try {
    await (databaseInstance as any).close?.();
    databaseInstance = null;
    if (__DEV__) console.log('[DatabaseService] Database closed');
  } catch (error) {
    if (__DEV__) console.error('[DatabaseService] Error closing database:', error);
  }
}

/**
 * Get database statistics for debugging
 * Returns count of records in each table
 *
 * @async
 * @returns Promise<Record<string, number>> with table names and counts
 */
export async function getDatabaseStats(): Promise<Record<string, number>> {
  if (!databaseInstance) {
    console.warn('[DatabaseService] Database not initialized');
    return {};
  }

  const tableNames = [
    'hunt_plans',
    'waypoints',
    'routes',
    'drawn_areas',
    'recorded_tracks',
    'deer_camps',
    'camp_members',
    'shared_annotations',
    'camp_photos',
    'activity_feed',
  ];

  const stats: Record<string, number> = {};

  try {
    for (const tableName of tableNames) {
      try {
        const collection = databaseInstance.collections.get(tableName);
        const count = await collection.query().fetchCount();
        stats[tableName] = count;
      } catch (tableError) {
        if (__DEV__) console.warn(`[DatabaseService] Failed to count ${tableName}:`, tableError);
        stats[tableName] = 0;
      }
    }
    return stats;
  } catch (error) {
    if (__DEV__) console.error('[DatabaseService] Failed to get database stats:', error);
    return {};
  }
}

/**
 * Reset database (clears all data)
 * WARNING: Destructive operation — use only for debugging or logout
 *
 * @async
 * @returns Promise<void>
 */
export async function resetDatabase(): Promise<void> {
  if (!databaseInstance) {
    if (__DEV__) console.warn('[DatabaseService] Database not initialized, cannot reset');
    return;
  }

  try {
    const tableNames = [
      'hunt_plans',
      'waypoints',
      'routes',
      'drawn_areas',
      'recorded_tracks',
      'deer_camps',
      'camp_members',
      'shared_annotations',
      'camp_photos',
      'activity_feed',
    ];

    await databaseInstance.action(async () => {
      for (const tableName of tableNames) {
        try {
          const collection = databaseInstance!.collections.get(tableName);
          const records = await collection.query().fetch();
          await Promise.all(records.map((record: any) => record.destroyPermanently()));
          if (__DEV__) console.log(`[DatabaseService] Cleared ${tableName}`);
        } catch (tableError) {
          if (__DEV__) console.warn(`[DatabaseService] Failed to clear ${tableName}:`, tableError);
        }
      }
    });

    if (__DEV__) console.log('[DatabaseService] Database reset complete');
  } catch (error) {
    if (__DEV__) console.error('[DatabaseService] Failed to reset database:', error);
    throw error;
  }
}

/**
 * Verify database integrity
 * Performs basic sanity checks on schema and tables
 *
 * @async
 * @returns Promise<{healthy: boolean; errors: string[]}>
 */
export async function verifyDatabaseIntegrity(): Promise<{ healthy: boolean; errors: string[] }> {
  if (!databaseInstance) {
    return {
      healthy: false,
      errors: ['Database not initialized'],
    };
  }

  const errors: string[] = [];
  const tableNames = [
    'hunt_plans',
    'waypoints',
    'routes',
    'drawn_areas',
    'recorded_tracks',
    'deer_camps',
    'camp_members',
    'shared_annotations',
    'camp_photos',
    'activity_feed',
  ];

  try {
    for (const tableName of tableNames) {
      try {
        const collection = databaseInstance.collections.get(tableName) as any;
        // Try to fetch a single record to verify table exists
        await collection.query().fetch();
      } catch (tableError) {
        errors.push(`Table ${tableName} inaccessible: ${tableError instanceof Error ? tableError.message : String(tableError)}`);
      }
    }
  } catch (error) {
    errors.push(`Integrity check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    healthy: errors.length === 0,
    errors,
  };
}
