/**
 * DeerCampModel — WatermelonDB model for collaborative deer camps.
 * Represents a shared map and location for a hunting group.
 */

import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  readonly,
  children,
} from '@nozbe/watermelondb/decorators';

class DeerCampModel extends Model {
  static table = 'deer_camps';

  static associations = {
    members: { type: 'has_many' as const, foreignKey: 'camp_id' },
    annotations: { type: 'has_many' as const, foreignKey: 'camp_id' },
    photos: { type: 'has_many' as const, foreignKey: 'camp_id' },
    activityFeed: { type: 'has_many' as const, foreignKey: 'camp_id' },
  };

  name!: string;
  createdBy!: string;
  linkedLandId!: string | null;
  centerLat!: number;
  centerLng!: number;
  defaultZoom!: number;
  inviteCode!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  members!: any;
  annotations!: any;
  photos!: any;
  activityFeed!: any;
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('name'), DeerCampModel.prototype, 'name');
applyDecorator(text('created_by'), DeerCampModel.prototype, 'createdBy');
applyDecorator(text('linked_land_id'), DeerCampModel.prototype, 'linkedLandId');
applyDecorator(field('center_lat'), DeerCampModel.prototype, 'centerLat');
applyDecorator(field('center_lng'), DeerCampModel.prototype, 'centerLng');
applyDecorator(field('default_zoom'), DeerCampModel.prototype, 'defaultZoom');
applyDecorator(text('invite_code'), DeerCampModel.prototype, 'inviteCode');
applyDecorator(date('created_at'), DeerCampModel.prototype, 'createdAt');
applyDecorator(readonly, DeerCampModel.prototype, 'createdAt');
applyDecorator(date('updated_at'), DeerCampModel.prototype, 'updatedAt');

applyDecorator(children('camp_members'), DeerCampModel.prototype, 'members');
applyDecorator(children('shared_annotations'), DeerCampModel.prototype, 'annotations');
applyDecorator(children('camp_photos'), DeerCampModel.prototype, 'photos');
applyDecorator(children('activity_feed'), DeerCampModel.prototype, 'activityFeed');

export default DeerCampModel;
