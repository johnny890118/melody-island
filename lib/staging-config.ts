/** Build and server guard. Pass platform variables explicitly in tests. */
export function assertStagingConfig(env: Readonly<Record<string, string | undefined>>) {
  const staging =
    env.VERCEL_ENV === 'preview' ||
    env.VERCEL_TARGET_ENV === 'staging' ||
    env.MELODY_DEPLOYMENT === 'staging';
  if (!staging) return;

  const project = env.STAGING_FIREBASE_PROJECT_ID;
  if (
    !project ||
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) ||
    project === 'melody-island' ||
    project.startsWith('demo-')
  ) {
    throw new Error('Preview requires an explicit, dedicated STAGING_FIREBASE_PROJECT_ID.');
  }
  if (
    env.FIREBASE_PROJECT_ID !== project ||
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== project ||
    env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== `${project}.firebaseapp.com`
  ) {
    throw new Error(
      'Preview Firebase client, Admin and Auth domain must match the staging project.',
    );
  }
  if (
    env.NEXT_PUBLIC_USE_EMULATORS === 'true' ||
    env.ALLOW_TEST_EMULATORS === 'true' ||
    env.FIRESTORE_EMULATOR_HOST ||
    env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    throw new Error('Hosted staging cannot use local emulator configuration.');
  }
  if (
    !env.FIREBASE_CLIENT_EMAIL?.endsWith(`@${project}.iam.gserviceaccount.com`) ||
    !env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error('Preview requires a dedicated staging service account.');
  }
  if (!env.NEXT_PUBLIC_FIREBASE_API_KEY || !env.NEXT_PUBLIC_FIREBASE_APP_ID) {
    throw new Error('Preview requires the staging Firebase web app configuration.');
  }
  const origin = env.APP_ORIGIN;
  if (!origin || !URL.canParse(origin))
    throw new Error('Preview requires an explicit HTTPS APP_ORIGIN.');
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
    throw new Error('Preview APP_ORIGIN must be a canonical HTTPS origin.');
  }
}
