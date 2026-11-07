import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { parseRoom } from '../validation';
import { SessionError } from '../session';
export function requireRoom(snapshot: DocumentSnapshot) {
  if (!snapshot.exists) throw new SessionError('島嶼不存在。', 404);
  return parseRoom(snapshot.data());
}
