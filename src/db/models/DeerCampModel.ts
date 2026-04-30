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

// TypeScript type augmentation (properties set by decorators at runtime)
interface DeerCampModel {
  name: string;
  createdBy: string;
  linkedLandId: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  inviteCode: string;
  createdAt: Date | number;
  updatedAt: Date | number;
  members: any;
  annotations: any;
  photos: any;
  activityFeed: any;
}

class DeerCampModel extends Model {
  static table = 'deer_camps';

  static associations = {
    members: { type: 'has_many' as const, foreignKey: 'camp_id' },
    annotations: { type: 'has_many' as const, foreignKey: 'camp_id' },
    photos: { type: 'has_many' as const, foreignKey: 'camp_id' },
    activityFeed: { type: 'has_many' as const, foreignKey: 'camp_id' },
  };
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = DeerCampModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('name'), 'name');
  applyDecorator(text('created_by'), 'createdBy');
  applyDecorator(text('linked_land_id'), 'linkedLandId');
  applyDecorator(field('center_lat'), 'centerLat');
  applyDecorator(field('center_lng'), 'centerLng');
  applyDecorator(field('default_zoom'), 'defaultZoom');
  applyDecorator(text('invite_code'), 'inviteCode');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
  applyDecorator(date('updated_at'), 'updatedAt');

  applyDecorator(children('camp_members'), 'members');
  applyDecorator(children('shared_annotations'), 'annotations');
  applyDecorator(children('camp_photos'), 'photos');
  applyDecorator(children('activity_feed'), 'activityFeed');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for DeerCampModel');
}

export default DeerCampModel;
