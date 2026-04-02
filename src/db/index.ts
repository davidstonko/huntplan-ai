/**
 * WatermelonDB Database Initialization
 * Sets up the local SQLite database with all models for offline-first persistence.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
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
} from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: false, // JSI disabled for compatibility with RN 0.76 old architecture
  onSetUpError: (error: Error) => {
    if (__DEV__) console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
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

export default database;
