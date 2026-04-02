/**
 * CampPhotoModel — WatermelonDB model for geotagged photos in deer camps.
 * Represents a photo with coordinates, thumbnail, and metadata.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

class CampPhotoModel extends Model {
  static table = 'camp_photos';

  campId!: string;
  uploadedBy!: string;
  username!: string;
  uri!: string;
  thumbnailUri!: string | null;
  lat!: number;
  lng!: number;
  caption!: string | null;
  createdAt!: Date;
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('camp_id'), CampPhotoModel.prototype, 'campId');
applyDecorator(text('uploaded_by'), CampPhotoModel.prototype, 'uploadedBy');
applyDecorator(text('username'), CampPhotoModel.prototype, 'username');
applyDecorator(text('uri'), CampPhotoModel.prototype, 'uri');
applyDecorator(text('thumbnail_uri'), CampPhotoModel.prototype, 'thumbnailUri');
applyDecorator(field('lat'), CampPhotoModel.prototype, 'lat');
applyDecorator(field('lng'), CampPhotoModel.prototype, 'lng');
applyDecorator(text('caption'), CampPhotoModel.prototype, 'caption');
applyDecorator(date('created_at'), CampPhotoModel.prototype, 'createdAt');
applyDecorator(readonly, CampPhotoModel.prototype, 'createdAt');

export default CampPhotoModel;
