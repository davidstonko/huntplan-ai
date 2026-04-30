/**
 * ActivityFeedModel — WatermelonDB model for camp activity feed entries.
 * Tracks user actions (annotations added, photos uploaded, members joined, etc.) in a camp.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface ActivityFeedModel {
  campId: string;
  userId: string;
  username: string;
  action: string;
  annotationId: string;
  photoId: string;
  createdAt: Date | number;
}

class ActivityFeedModel extends Model {
  static table = 'activity_feed';

  get actionLabel(): string {
    const labels: Record<string, string> = {
      added_waypoint: 'added a waypoint',
      added_route: 'added a route',
      added_area: 'added an area',
      added_track: 'added a track',
      uploaded_photo: 'uploaded a photo',
      joined_camp: 'joined the camp',
      left_camp: 'left the camp',
      updated_member: 'updated member settings',
    };
    return labels[this.action] || this.action;
  }
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = ActivityFeedModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('camp_id'), 'campId');
  applyDecorator(text('user_id'), 'userId');
  applyDecorator(text('username'), 'username');
  applyDecorator(text('action'), 'action');
  applyDecorator(text('annotation_id'), 'annotationId');
  applyDecorator(text('photo_id'), 'photoId');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for ActivityFeedModel');
}

export default ActivityFeedModel;
