// Synthetic data only; there is deliberately no production/apply switch.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { prepareLegacyRoom } from '../lib/server/migration';
import { parseRoom } from '../lib/validation';
import { verifyPassword } from '../lib/server/password';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
if (
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw new Error('Only the local demo emulators may be used.');
const app = initializeApp({ projectId: 'demo-melody-island' }, 'migration-rehearsal');
const db = getFirestore(app);
const auth = getAuth(app);
const id = randomBytes(8).toString('base64url').slice(0, 10);
const ref = db.doc(`islands/${id}`);
const secretRef = db.doc(`islandSecrets/${id}`);
const legacy = {
  name: 'Synthetic migration room',
  password: 'synthetic-only-123',
  createdBy: 'migration@example.test',
  playlist: [{ videoId: 'abcdefghijk', title: 'Synthetic song' }],
  currentVideo: 'abcdefghijk',
  positionMs: 12000,
  isPlaying: true,
};
const owner = await auth.createUser({ email: legacy.createdBy, emailVerified: true });
try {
  await ref.create(legacy);
  const backup = await ref.get();
  const converted = await prepareLegacyRoom(
    id,
    backup.data(),
    await auth.getUserByEmail(legacy.createdBy),
    Date.now(),
  );
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    assert(current.updateTime?.isEqual(backup.updateTime!), 'Room changed after backup');
    transaction.set(ref, converted.room);
    transaction.create(secretRef, converted.secret);
  });
  const migrated = (await ref.get()).data();
  assert.equal(parseRoom(migrated).ownerUid, owner.uid);
  assert.equal(migrated?.isPlaying, false);
  assert.equal('password' in (migrated || {}), false);
  assert(await verifyPassword(legacy.password, (await secretRef.get()).data()?.passwordHash));
  const rollback = db.batch();
  rollback.set(ref, backup.data()!);
  rollback.delete(secretRef);
  await rollback.commit();
  assert.deepEqual((await ref.get()).data(), legacy);
  assert.equal((await secretRef.get()).exists, false);
  console.log(
    'PASS: synthetic backup, atomic conversion, secret verification and rollback; demo emulators only.',
  );
} finally {
  await Promise.all([ref.delete(), secretRef.delete(), auth.deleteUser(owner.uid)]);
}
