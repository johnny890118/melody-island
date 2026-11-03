import { beforeAll, afterAll, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';
let environment;
beforeAll(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080')
    throw new Error('Tests require the local emulator');
  environment = await initializeTestEnvironment({
    projectId: 'demo-melody-island',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'islands/abcdefghij'), {
      ownerUid: 'owner',
      schemaVersion: 2,
      memberUids: ['owner', 'guest'],
    });
    await setDoc(doc(db, 'islands/abcdefghij/members/guest'), { uid: 'guest' });
    await setDoc(doc(db, 'islandSecrets/abcdefghij'), { passwordHash: 'not-public' });
  });
});
afterAll(async () => {
  await environment?.cleanup();
});
it('rejects unauthenticated reads and writes', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'islands/abcdefghij')));
  await assertFails(setDoc(doc(db, 'islands/newroom123'), { ownerUid: 'fake' }));
});
it('rejects non-member room reads and self-membership', async () => {
  const db = environment.authenticatedContext('stranger').firestore();
  await assertFails(getDoc(doc(db, 'islands/abcdefghij')));
  await assertFails(setDoc(doc(db, 'islands/abcdefghij/members/stranger'), { uid: 'stranger' }));
});
it('lets members read the room but not secrets or canonical writes', async () => {
  const db = environment.authenticatedContext('guest').firestore();
  await assertSucceeds(getDoc(doc(db, 'islands/abcdefghij')));
  await assertFails(getDoc(doc(db, 'islandSecrets/abcdefghij')));
  await assertFails(setDoc(doc(db, 'islands/abcdefghij'), { ownerUid: 'guest' }));
});
it('lets owners query their own rooms, never the whole collection', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(query(collection(db, 'islands'), where('ownerUid', '==', 'owner'))));
  await assertFails(getDocs(collection(db, 'islands')));
});
it('does not let the owner read the secret hash', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  await assertFails(getDoc(doc(db, 'islandSecrets/abcdefghij')));
});
