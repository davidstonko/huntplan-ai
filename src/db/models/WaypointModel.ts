/**
 * WaypointModel — WatermelonDB model for waypoints within hunt plans.
 * Represents a single map marker with label, coordinates, and optional icon.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

class WaypointModel extends Model {
  static table = 'waypoints';

  planId!: string;
  label!: string;
  lat!: number;
  lng!: number;
  icon!: string | null;
  createdAt!: Date;
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('plan_id'), WaypointModel.prototype, 'planId');
applyDecorator(text('label'), WaypointModel.prototype, 'label');
applyDecorator(field('lat'), WaypointModel.prototype, 'lat');
applyDecorator(field('lng'), WaypointModel.prototype, 'lng');
applyDecorator(text('icon'), WaypointModel.prototype, 'icon');
applyDecorator(date('created_at'), WaypointModel.prototype, 'createdAt');
applyDecorator(readonly, WaypointModel.prototype, 'createdAt');

export default WaypointModel;
