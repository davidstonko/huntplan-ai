/**
 * CampPhotoModel — WatermelonDB model for geotagged photos in deer camps.
 * Represents a photo with coordinates, thumbnail, and metadata.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface CampPhotoModel {
  campId: string;
  uploadedBy: string;
  username: string;
  uri: string;
  thumbnailUri: string;
  lat: number;
  lng: number;
  caption: string;
  createdAt: Date | number;
}

class CampPhotoModel extends Model {
  static table = 'camp_photos';
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = CampPhotoModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('camp_id'), 'campId');
  applyDecorator(text('uploaded_by'), 'uploadedBy');
  applyDecorator(text('username'), 'username');
  applyDecorator(text('uri'), 'uri');
  applyDecorator(text('thumbnail_uri'), 'thumbnailUri');
  applyDecorator(field('lat'), 'lat');
  applyDecorator(field('lng'), 'lng');
  applyDecorator(text('caption'), 'caption');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for CampPhotoModel');
}

export default CampPhotoModel;
