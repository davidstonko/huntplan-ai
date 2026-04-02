/**
 * CampMemberModel — WatermelonDB model for deer camp members.
 * Represents a user within a shared camp with role and color assignment.
 */

import { Model } from '@nozbe/watermelondb';
import { text, date, readonly } from '@nozbe/watermelondb/decorators';

class CampMemberModel extends Model {
  static table = 'camp_members';

  campId!: string;
  userId!: string;
  username!: string;
  role!: string; // 'admin' | 'member'
  color!: string; // Color hex or theme key
  joinedAt!: Date;
}

// Apply decorators programmatically
const applyDecorator = (decorator: any, target: any, key: string) => {
  const descriptor = decorator(target, key, Object.getOwnPropertyDescriptor(target, key) || { configurable: true, writable: true, enumerable: true });
  if (descriptor) Object.defineProperty(target, key, descriptor);
};

applyDecorator(text('camp_id'), CampMemberModel.prototype, 'campId');
applyDecorator(text('user_id'), CampMemberModel.prototype, 'userId');
applyDecorator(text('username'), CampMemberModel.prototype, 'username');
applyDecorator(text('role'), CampMemberModel.prototype, 'role');
applyDecorator(text('color'), CampMemberModel.prototype, 'color');
applyDecorator(date('joined_at'), CampMemberModel.prototype, 'joinedAt');
applyDecorator(readonly, CampMemberModel.prototype, 'joinedAt');

export default CampMemberModel;
