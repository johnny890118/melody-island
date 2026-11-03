import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
declare global {
  var __melodyAppCheck: AppCheck | undefined;
  var __melodyEmulatorsConnected: boolean | undefined;
}
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
const emulator = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
const firebaseConfig = {
  apiKey: emulator ? 'demo-api-key' : process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: emulator
    ? 'demo-melody-island.firebaseapp.com'
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: emulator ? 'demo-melody-island' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: emulator ? 'demo-app' : process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
if (!emulator && typeof window !== 'undefined' && siteKey && !globalThis.__melodyAppCheck) {
  globalThis.__melodyAppCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
export const appCheck =
  !emulator && typeof window !== 'undefined' ? globalThis.__melodyAppCheck : undefined;
export const auth = getAuth(app);
export const db = getFirestore(app);
if (emulator && typeof window !== 'undefined' && !globalThis.__melodyEmulatorsConnected) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  globalThis.__melodyEmulatorsConnected = true;
}
