/**
 * WatermelonDB Schema Definition
 * Defines all tables for offline-first persistence of hunt plans, deer camps, and related data.
 * Version: 1
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'hunt_plans',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'visible', type: 'boolean' },
        { name: 'parking_lat', type: 'number', isOptional: true },
        { name: 'parking_lng', type: 'number', isOptional: true },
        { name: 'parking_label', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'waypoints',
      columns: [
        { name: 'plan_id', type: 'string', isIndexed: true },
        { name: 'label', type: 'string' },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'routes',
      columns: [
        { name: 'plan_id', type: 'string', isIndexed: true },
        { name: 'label', type: 'string' },
        { name: 'points_json', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'drawn_areas',
      columns: [
        { name: 'plan_id', type: 'string', isIndexed: true },
        { name: 'label', type: 'string' },
        { name: 'points_json', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'recorded_tracks',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'points_json', type: 'string' },
        { name: 'distance_meters', type: 'number' },
        { name: 'duration_seconds', type: 'number' },
        { name: 'elevation_gain', type: 'number', isOptional: true },
        { name: 'elevation_loss', type: 'number', isOptional: true },
        { name: 'visible', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'deer_camps',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'linked_land_id', type: 'string', isOptional: true },
        { name: 'center_lat', type: 'number' },
        { name: 'center_lng', type: 'number' },
        { name: 'default_zoom', type: 'number' },
        { name: 'invite_code', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'camp_members',
      columns: [
        { name: 'camp_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'joined_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'shared_annotations',
      columns: [
        { name: 'camp_id', type: 'string', isIndexed: true },
        { name: 'annotation_type', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'data_json', type: 'string' },
        { name: 'imported_from_plan_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'camp_photos',
      columns: [
        { name: 'camp_id', type: 'string', isIndexed: true },
        { name: 'uploaded_by', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'uri', type: 'string' },
        { name: 'thumbnail_uri', type: 'string', isOptional: true },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'activity_feed',
      columns: [
        { name: 'camp_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'annotation_id', type: 'string', isOptional: true },
        { name: 'photo_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
