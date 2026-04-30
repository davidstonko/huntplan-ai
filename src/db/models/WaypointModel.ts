/**
 * WaypointModel — WatermelonDB model for waypoints within hunt plans.
 * Represents a single map marker with label, coordinates, and optional icon.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface WaypointModel {
  planId: string;
  label: string;
  lat: number;
  lng: number;
  icon: string;
  createdAt: number;
}

class WaypointModel extends Model {
  static table = 'waypoints';
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = WaypointModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('plan_id'), 'planId');
  applyDecorator(text('label'), 'label');
  applyDecorator(field('lat'), 'lat');
  applyDecorator(field('lng'), 'lng');
  applyDecorator(text('icon'), 'icon');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for WaypointModel');
}

export default WaypointModel;
