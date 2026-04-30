/**
 * HuntPlanModel — WatermelonDB model for hunt plans.
 * Represents a single hunt planning session with parking, notes, and annotations.
 */

import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  readonly,
  children,
} from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface HuntPlanModel {
  name: string;
  color: string;
  visible: boolean;
  parkingLat: number;
  parkingLng: number;
  parkingLabel: string;
  notes: string;
  createdAt: Date | number;
  updatedAt: Date | number;
  waypoints: any;
  routes: any;
  drawnAreas: any;
}

class HuntPlanModel extends Model {
  static table = 'hunt_plans';

  static associations = {
    waypoints: { type: 'has_many' as const, foreignKey: 'plan_id' },
    routes: { type: 'has_many' as const, foreignKey: 'plan_id' },
    drawn_areas: { type: 'has_many' as const, foreignKey: 'plan_id' },
  };
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = HuntPlanModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('name'), 'name');
  applyDecorator(text('color'), 'color');
  applyDecorator(field('visible'), 'visible');
  applyDecorator(field('parking_lat'), 'parkingLat');
  applyDecorator(field('parking_lng'), 'parkingLng');
  applyDecorator(text('parking_label'), 'parkingLabel');
  applyDecorator(text('notes'), 'notes');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
  applyDecorator(date('updated_at'), 'updatedAt');

  applyDecorator(children('waypoints'), 'waypoints');
  applyDecorator(children('routes'), 'routes');
  applyDecorator(children('drawn_areas'), 'drawnAreas');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for HuntPlanModel');
}

export default HuntPlanModel;
