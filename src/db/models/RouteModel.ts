/**
 * RouteModel — WatermelonDB model for drawn routes within hunt plans.
 * Represents a polyline with label, ordered points, and optional color.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

class RouteModel extends Model {
  static table = 'routes';

  planId!: string;
  label!: string;
  pointsJson!: string; // JSON-serialized array of {lat, lng}
  color!: string | null;
  createdAt!: Date;

  get points(): Array<{ lat: number; lng: number }> {
    try {
      return JSON.parse(this.pointsJson);
    } catch (e) {
      return [];
    }
  }

  setPoints(points: Array<{ lat: number; lng: number }>): void {
    this.pointsJson = JSON.stringify(points);
  }
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('plan_id'), RouteModel.prototype, 'planId');
applyDecorator(text('label'), RouteModel.prototype, 'label');
applyDecorator(text('points_json'), RouteModel.prototype, 'pointsJson');
applyDecorator(text('color'), RouteModel.prototype, 'color');
applyDecorator(date('created_at'), RouteModel.prototype, 'createdAt');
applyDecorator(readonly, RouteModel.prototype, 'createdAt');

export default RouteModel;
