/**
 * RecordedTrackModel — WatermelonDB model for GPS-recorded tracks.
 * Represents a saved track with distance, duration, and elevation metrics.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

class RecordedTrackModel extends Model {
  static table = 'recorded_tracks';

  name!: string;
  pointsJson!: string; // JSON-serialized track points with time/elevation
  distanceMeters!: number;
  durationSeconds!: number;
  elevationGain!: number | null;
  elevationLoss!: number | null;
  visible!: boolean;
  createdAt!: Date;

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

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('name'), RecordedTrackModel.prototype, 'name');
applyDecorator(text('points_json'), RecordedTrackModel.prototype, 'pointsJson');
applyDecorator(field('distance_meters'), RecordedTrackModel.prototype, 'distanceMeters');
applyDecorator(field('duration_seconds'), RecordedTrackModel.prototype, 'durationSeconds');
applyDecorator(field('elevation_gain'), RecordedTrackModel.prototype, 'elevationGain');
applyDecorator(field('elevation_loss'), RecordedTrackModel.prototype, 'elevationLoss');
applyDecorator(field('visible'), RecordedTrackModel.prototype, 'visible');
applyDecorator(date('created_at'), RecordedTrackModel.prototype, 'createdAt');
applyDecorator(readonly, RecordedTrackModel.prototype, 'createdAt');

export default RecordedTrackModel;
