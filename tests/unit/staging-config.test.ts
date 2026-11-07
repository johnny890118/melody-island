import { describe, expect, it } from 'vitest';
import { assertStagingConfig } from '../../lib/staging-config';

const project = 'melody-stage-fixture';
const preview = {
  VERCEL_ENV: 'preview',
  STAGING_FIREBASE_PROJECT_ID: project,
  FIREBASE_PROJECT_ID: project,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: project,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture-api-key',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'fixture-app-id',
  FIREBASE_CLIENT_EMAIL: `test@${project}.iam.gserviceaccount.com`,
  FIREBASE_PRIVATE_KEY: 'fixture-only',
  APP_ORIGIN: 'https://staging.example.test',
};

describe('staging isolation', () => {
  it('permits explicit dedicated preview and leaves local and production configuration alone', () => {
    expect(() => assertStagingConfig(preview)).not.toThrow();
    expect(() => assertStagingConfig({ VERCEL_ENV: 'production' })).not.toThrow();
    expect(() => assertStagingConfig({ NEXT_PUBLIC_USE_EMULATORS: 'true' })).not.toThrow();
  });

  it.each([
    { STAGING_FIREBASE_PROJECT_ID: undefined },
    { STAGING_FIREBASE_PROJECT_ID: 'melody-island' },
    { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'melody-island' },
    { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'melody-island.firebaseapp.com' },
    { FIREBASE_PROJECT_ID: 'melody-island' },
    { FIREBASE_CLIENT_EMAIL: 'admin@melody-island.iam.gserviceaccount.com' },
    { FIREBASE_PRIVATE_KEY: undefined },
    { NEXT_PUBLIC_USE_EMULATORS: 'true' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    { APP_ORIGIN: 'https://staging.example.test/path' },
  ])('rejects an unsafe staging override %o', (override) => {
    expect(() => assertStagingConfig({ ...preview, ...override })).toThrow();
  });
});
