/**
 * SharedAnnotationModel — WatermelonDB model for shared camp annotations.
 * Represents all annotation types (waypoints, routes, areas, tracks) shared in a camp.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

class SharedAnnotationModel extends Model {
  static table = 'shared_annotations';

  campId!: string;
  annotationType!: string; // 'waypoint' | 'route' | 'area' | 'track'
  createdBy!: string;
  dataJson!: string; // Full annotation payload
  importedFromPlanId!: string | null;
  createdAt!: Date;

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

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('camp_id'), SharedAnnotationModel.prototype, 'campId');
applyDecorator(text('annotation_type'), SharedAnnotationModel.prototype, 'annotationType');
applyDecorator(text('created_by'), SharedAnnotationModel.prototype, 'createdBy');
applyDecorator(text('data_json'), SharedAnnotationModel.prototype, 'dataJson');
applyDecorator(text('imported_from_plan_id'), SharedAnnotationModel.prototype, 'importedFromPlanId');
applyDecorator(date('created_at'), SharedAnnotationModel.prototype, 'createdAt');
applyDecorator(readonly, SharedAnnotationModel.prototype, 'createdAt');

export default SharedAnnotationModel;
