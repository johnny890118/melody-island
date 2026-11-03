import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
export const projectId = 'demo-melody-island';
export function adminDb() {
  if (
    process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
  )
    throw new Error('Refusing to access production');
  const app = getApps().find((item) => item.name === 'e2e') || initializeApp({ projectId }, 'e2e');
  return getFirestore(app);
}
export async function identity(request) {
  const email = `friend-${crypto.randomUUID()}@example.test`;
  const result = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    { data: { email, password: 'private-test-123', returnSecureToken: true } },
  );
  const user = await result.json();
  if (!user.idToken) throw new Error(JSON.stringify(user));
  return { ...user, email };
}
export async function login(page, user) {
  // Seed the same IndexedDB persistence Firebase uses; this is test-side only.
  await page.addInitScript(async (user) => {
    const key = 'firebase:authUser:demo-api-key:[DEFAULT]';
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('firebaseLocalStorageDb', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('firebaseLocalStorage', 'readwrite');
      transaction
        .objectStore('firebaseLocalStorage')
        .put({
          fbase_key: key,
          value: {
            uid: user.localId,
            email: user.email,
            emailVerified: false,
            isAnonymous: false,
            providerData: [
              {
                providerId: 'password',
                uid: user.email,
                email: user.email,
                displayName: null,
                photoURL: null,
              },
            ],
            stsTokenManager: {
              refreshToken: user.refreshToken,
              accessToken: user.idToken,
              expirationTime: Date.now() + 3600000,
            },
            createdAt: String(Date.now()),
            lastLoginAt: String(Date.now()),
            apiKey: 'demo-api-key',
            appName: '[DEFAULT]',
          },
        });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, user);
}
export async function post(request, path, user, body) {
  return request.post(`http://127.0.0.1:3100${path}`, {
    headers: { Authorization: `Bearer ${user.idToken}` },
    data: body,
  });
}
