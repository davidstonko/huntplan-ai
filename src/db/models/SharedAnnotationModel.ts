/**
 * SharedAnnotationModel — WatermelonDB model for shared camp annotations.
 * Represents all annotation types (waypoints, routes, areas, tracks) shared in a camp.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface SharedAnnotationModel {
  campId: string;
  annotationType: string;
  createdBy: string;
  dataJson: string;
  importedFromPlanId: string;
  createdAt: Date | number;
}

class SharedAnnotationModel extends Model {
  static table = 'shared_annotations';

  get data(): any {
    try {
      return JSON.parse(this.dataJson);
    } catch (e) {
      return {};
    }
  }

  setData(data: any): void {
    this.dataJson = JSON.stringify(data);
  }
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = SharedAnnotationModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('camp_id'), 'campId');
  applyDecorator(text('annotation_type'), 'annotationType');
  applyDecorator(text('created_by'), 'createdBy');
  applyDecorator(text('data_json'), 'dataJson');
  applyDecorator(text('imported_from_plan_id'), 'importedFromPlanId');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for SharedAnnotationModel');
}

export default SharedAnnotationModel;
