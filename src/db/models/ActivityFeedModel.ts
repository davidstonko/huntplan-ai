/**
 * ActivityFeedModel — WatermelonDB model for camp activity feed entries.
 * Tracks user actions (annotations added, photos uploaded, members joined, etc.) in a camp.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

class ActivityFeedModel extends Model {
  static table = 'activity_feed';

  campId!: string;
  userId!: string;
  username!: string;
  action!: string; // 'added_waypoint' | 'added_route' | 'uploaded_photo' | 'joined_camp' etc.
  annotationId!: string | null;
  photoId!: string | null;
  createdAt!: Date;

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

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('camp_id'), ActivityFeedModel.prototype, 'campId');
applyDecorator(text('user_id'), ActivityFeedModel.prototype, 'userId');
applyDecorator(text('username'), ActivityFeedModel.prototype, 'username');
applyDecorator(text('action'), ActivityFeedModel.prototype, 'action');
applyDecorator(text('annotation_id'), ActivityFeedModel.prototype, 'annotationId');
applyDecorator(text('photo_id'), ActivityFeedModel.prototype, 'photoId');
applyDecorator(date('created_at'), ActivityFeedModel.prototype, 'createdAt');
applyDecorator(readonly, ActivityFeedModel.prototype, 'createdAt');

export default ActivityFeedModel;
