import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { assertStagingConfig } from '../staging-config';

export function adminServices() {
  assertStagingConfig(process.env);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (
    emulator &&
    (!projectId?.startsWith('demo-') ||
      (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_EMULATORS !== 'true'))
  )
    throw new Error('Unsafe emulator configuration');
  const app =
    getApps().find((app) => app.name === 'melody-server') ||
    initializeApp(
      {
        projectId,
        ...(emulator
          ? {}
          : {
              credential:
                process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
                  ? cert({
                      projectId,
                      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    })
                  : applicationDefault(),
            }),
      },
      'melody-server',
    );
  return { db: getFirestore(app), auth: getAuth(app), appCheck: getAppCheck(app) };
}
