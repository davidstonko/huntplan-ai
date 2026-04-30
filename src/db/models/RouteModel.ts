/**
 * RouteModel — WatermelonDB model for drawn routes within hunt plans.
 * Represents a polyline with label, ordered points, and optional color.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface RouteModel {
  planId: string;
  label: string;
  pointsJson: string;
  color: string;
  createdAt: Date | number;
}

class RouteModel extends Model {
  static table = 'routes';

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

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = RouteModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('plan_id'), 'planId');
  applyDecorator(text('label'), 'label');
  applyDecorator(text('points_json'), 'pointsJson');
  applyDecorator(text('color'), 'color');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for RouteModel');
}

export default RouteModel;
