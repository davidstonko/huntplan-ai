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

class HuntPlanModel extends Model {
  static table = 'hunt_plans';

  static associations = {
    waypoints: { type: 'has_many' as const, foreignKey: 'plan_id' },
    routes: { type: 'has_many' as const, foreignKey: 'plan_id' },
    drawn_areas: { type: 'has_many' as const, foreignKey: 'plan_id' },
  };

  name!: string;
  color!: string;
  visible!: boolean;
  parkingLat!: number | null;
  parkingLng!: number | null;
  parkingLabel!: string | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  waypoints!: any;
  routes!: any;
  drawnAreas!: any;
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('name'), HuntPlanModel.prototype, 'name');
applyDecorator(text('color'), HuntPlanModel.prototype, 'color');
applyDecorator(field('visible'), HuntPlanModel.prototype, 'visible');
applyDecorator(field('parking_lat'), HuntPlanModel.prototype, 'parkingLat');
applyDecorator(field('parking_lng'), HuntPlanModel.prototype, 'parkingLng');
applyDecorator(text('parking_label'), HuntPlanModel.prototype, 'parkingLabel');
applyDecorator(text('notes'), HuntPlanModel.prototype, 'notes');
applyDecorator(date('created_at'), HuntPlanModel.prototype, 'createdAt');
applyDecorator(readonly, HuntPlanModel.prototype, 'createdAt');
applyDecorator(date('updated_at'), HuntPlanModel.prototype, 'updatedAt');

applyDecorator(children('waypoints'), HuntPlanModel.prototype, 'waypoints');
applyDecorator(children('routes'), HuntPlanModel.prototype, 'routes');
applyDecorator(children('drawn_areas'), HuntPlanModel.prototype, 'drawnAreas');

export default HuntPlanModel;
