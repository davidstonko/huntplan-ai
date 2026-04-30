/**
 * CampMemberModel — WatermelonDB model for deer camp members.
 * Represents a user within a shared camp with role and color assignment.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

// TypeScript type augmentation (properties set by decorators at runtime)
interface CampMemberModel {
  campId: string;
  userId: string;
  username: string;
  role: string;
  color: string;
  joinedAt: Date | number;
}

class CampMemberModel extends Model {
  static table = 'camp_members';
}

// WatermelonDB decorators — guarded for V2 (AsyncStorage mode)
try {
  const proto = CampMemberModel.prototype as any;
  const applyDecorator = (decorator: any, key: string) => {
    const descriptor = decorator(proto, key, undefined);
    if (descriptor) Object.defineProperty(proto, key, descriptor);
  };

  applyDecorator(text('camp_id'), 'campId');
  applyDecorator(text('user_id'), 'userId');
  applyDecorator(text('username'), 'username');
  applyDecorator(text('role'), 'role');
  applyDecorator(text('color'), 'color');
  applyDecorator(date('joined_at'), 'joinedAt');
  applyDecorator(readonly, 'joinedAt');
} catch (e) {
  // WatermelonDB not active in V2 — decorators skipped
  if (__DEV__) console.log('[WatermelonDB] Decorators deferred for CampMemberModel');
}

export default CampMemberModel;
