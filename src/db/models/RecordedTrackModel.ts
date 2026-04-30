/**
 * RecordedTrackModel — WatermelonDB model for GPS-recorded tracks.
 * Represents a saved track with distance, duration, and elevation metrics.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface RecordedTrackModel {
  name: string;
  pointsJson: string;
  distanceMeters: number;
  durationSeconds: number;
  elevationGain: number;
  elevationLoss: number;
  visible: boolean;
  createdAt: Date | number;
}

class RecordedTrackModel extends Model {
  static table = 'recorded_tracks';

  get points(): Array<any> {
    try {
      return JSON.parse(this.pointsJson);
    } catch (e) {
      return [];
    }
  }

  setPoints(points: Array<any>): void {
    this.pointsJson = JSON.stringify(points);
  }

  get durationFormatted(): string {
    const totalSeconds = this.durationSeconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  }

  get speedMph(): number {
    if (this.durationSeconds === 0) return 0;
    const miles = this.distanceMeters / 1609.34;
    const hours = this.durationSeconds / 3600;
    return miles / hours;
  }
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = RecordedTrackModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('name'), 'name');
  applyDecorator(text('points_json'), 'pointsJson');
  applyDecorator(field('distance_meters'), 'distanceMeters');
  applyDecorator(field('duration_seconds'), 'durationSeconds');
  applyDecorator(field('elevation_gain'), 'elevationGain');
  applyDecorator(field('elevation_loss'), 'elevationLoss');
  applyDecorator(field('visible'), 'visible');
  applyDecorator(date('created_at'), 'createdAt');
  applyDecorator(readonly, 'createdAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for RecordedTrackModel');
}

export default RecordedTrackModel;
