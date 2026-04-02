/**
 * DrawnAreaModel — WatermelonDB model for polygonal areas within hunt plans.
 * Represents a closed-shape annotation with label, points, and optional color.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

class DrawnAreaModel extends Model {
  static table = 'drawn_areas';

  planId!: string;
  label!: string;
  pointsJson!: string; // JSON-serialized polygon coordinates
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

applyDecorator(text('plan_id'), DrawnAreaModel.prototype, 'planId');
applyDecorator(text('label'), DrawnAreaModel.prototype, 'label');
applyDecorator(text('points_json'), DrawnAreaModel.prototype, 'pointsJson');
applyDecorator(text('color'), DrawnAreaModel.prototype, 'color');
applyDecorator(date('created_at'), DrawnAreaModel.prototype, 'createdAt');
applyDecorator(readonly, DrawnAreaModel.prototype, 'createdAt');

export default DrawnAreaModel;
