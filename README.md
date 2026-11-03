# Melody Island

A private music island for 2–20 friends. Next.js 15, React 19, strict TypeScript, Firebase, Three.js and YouTube. UI primitives use local shadcn/ui components; icons use Lucide. Impeccable defines the visual direction.

## Local development

Use Node 22 and Java 21 (Firebase Emulator). `npm ci`, then copy `.env.example` to `.env.local` and configure Firebase's web app, Google sign-in and anonymous sign-in. Start with `npm run dev`.

New room operations require Firebase Admin credentials through Application Default Credentials, or server-only `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Music search requires server-only `YOUTUBE_API_KEY`; the previous public YouTube key is no longer used. Restrict that key to the YouTube Data API and rotate it if previously unrestricted. Set `APP_ORIGIN` to the public origin when running behind a reverse proxy.

Never expose Admin keys through `NEXT_PUBLIC_`. Never point automated tests at an actual Firebase project.

## Isolated preview

Run `npx firebase emulators:start --project demo-melody-island --only auth,firestore`. In another terminal, run:

```sh
NEXT_PUBLIC_USE_EMULATORS=true FIREBASE_PROJECT_ID=demo-melody-island FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run dev
```

The homepage uses the real WebGL island. Firebase's auth emulator supports a simulated Google login. No real YouTube key is needed to inspect the homepage. Search needs a configured key and consumes real YouTube quota; automated tests do not exercise that external service.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run test:migration
npm run build
npm run test:e2e
npm run test:e2e:webkit
```

Rules and E2E commands start and stop demo emulators themselves, so stop manually started emulators first. Playwright needs `npx playwright install chromium webkit`. Tests include actual homepage WebGL rendering, membership/security rules, two-client operations, 20 isolated browser clients, command deduplication, stale versions, leadership and member management. Playback is mocked in E2E; real YouTube autoplay, buffering, ads, Safari behavior and audio drift require separate manual verification.

CI runs the same checks and preserves failure traces. A Java runtime installed only under `/tmp` during development is not a project dependency; install Java 21 on your own machine or use CI.

## App attestation and quota protection

Set `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` after registering the app with Firebase App Check. Verify real staging tokens before enabling server-only `ENFORCE_APP_CHECK=true`; missing/invalid tokens then fail closed. The demo tests explicitly leave enforcement off; there is no automatic bypass when it is on. Search requires room membership and has a shared 24-hour search-call budget (`YOUTUBE_SEARCH_DAILY_LIMIT`, default 80), in addition to per-UID limits. Deployment-specific edge controls and Firebase service enforcement still require setup. See [production runbook](docs/production-runbook.md).

To repeat synthetic cold-cache performance checks against a local production server, run `npm run measure:home:throttled`. It uses 4× CPU slowdown, 1.6 Mbps download/0.75 Mbps upload and 150ms latency, three runs at each viewport. It is not a real-device performance certificate.

## Release boundary

This is a schema-v2 implementation, not a live deployment. Before deployment:

- Configure and verify Admin identity, auth providers, production origin and YouTube quota controls.
- Configure the edge/IP abuse limit and enable/verify the included App Check integration before opening anonymous join/search publicly. Per-UID and shared budgets do not replace deployment-specific controls.
- Review `firestore.rules` together with server endpoints: client writes are denied, while Admin operations independently enforce membership and permissions.
- Back up legacy rooms. They cannot be opened with the former plaintext-password flow; follow `docs/architecture/sync.md` for migration boundaries.
- Run real-device and real-YouTube playback checks, measure production performance and inspect remaining dependency advisories.
- Deploy rules and app in a coordinated maintenance window. Do not deploy the new app against old permissive rules.

## Project guidance

See `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `docs/modernization-plan.md` and `docs/architecture/sync.md`. Impeccable is installed in `.agents/skills/impeccable` (v4.8.0); its launcher may need `sh` when installed from an archive.

## Assets

Fox's islands by nimzu, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): [source](https://sketchfab.com/3d-models/foxs-islands-163b68e09fcc47618450150be7785907). Cormorant Garamond and Manrope are self-hosted under OFL; licenses are in `public/fonts/`.
