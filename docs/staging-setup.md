# Isolated staging setup

Keep the production Firebase project, production Vercel variables and production branch unchanged. GitHub deployment metadata proves the branch has a protected Vercel Preview. It does not identify the Firebase project that Preview uses. Treat existing previews as unverified and avoid signing in or creating rooms there until the configuration is checked.

## Account access and project creation

1. Sign in to Firebase with an account allowed to create a project. In this workspace run `npx --no-install firebase login` and finish the browser prompt. Run `npx --no-install firebase login:list` to confirm the session. Do not send tokens or key files in chat.
2. In the Firebase console, create a dedicated project with a globally unique ID, for example `melody-island-stage-<suffix>`. If a separate project already exists, confirm it is reserved for staging and has no production data or shared service account. Record the actual ID and intended Firestore region before setup.
3. Open the existing Melody Island Vercel project as a team member with Preview settings access. Use protected, branch-specific Preview variables for `codex/modernize-island`. Choose a stable HTTPS staging hostname on that branch for OAuth and origin checks. Keep protection enabled.

## Bind the dedicated Firebase project

1. Register a web app in the staging project and copy its own Firebase web configuration. Create an empty Firestore database with restrictive rules. Enable Google sign-in and anonymous sign-in there. Register the staging hostname as an Auth authorized domain.
2. Provision a dedicated Admin service account in the staging project with only the permissions the app requires for Firestore, Auth and App Check. Verify it has no grants in the production project. Store its private key directly in protected Vercel Preview variables. Use a separate, restricted YouTube key or leave search unavailable until its test quota is configured.
3. Set the branch-specific variables below. Verify the Firebase web API key and App ID together against the staging web app in the Firebase console. The build guard checks environment consistency but cannot verify the provider project behind a copied API key.

| Variable | Staging value |
| --- | --- |
| `STAGING_FIREBASE_PROJECT_ID`, `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same dedicated Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dedicated project's `.firebaseapp.com` auth domain |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Staging web app values |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Dedicated staging account only |
| `APP_ORIGIN` | Canonical staging HTTPS origin with no trailing slash |
| `MELODY_DEPLOYMENT` | Set to `staging` as an explicit marker; Vercel Preview also uses its system marker |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` | Key registered only for the staging app/domain |
| `ENFORCE_APP_CHECK` | Enable after confirming the browser can obtain a real staging token, before acceptance |

Keep emulator host and emulator override variables unset. Make sure Vercel exposes system variables. A Preview build without the dedicated configuration now fails intentionally. Older Preview deployments do not gain this guard retroactively.

## Acceptance order

- Confirm the Firebase Console project ID, web app configuration, Vercel branch and staging URL match before any data operation. Confirm Firestore is new/empty before installing reviewed rules using the explicit staging project target. Do not run a migration or import production data.
- With two synthetic test users, run Google sign-in, joining, real YouTube playback, track transition, network recovery, and iPhone Safari. Record device/browser versions and separate actual audible synchronization from browser media clocks.
- Run the positive and negative security checks in [production-runbook.md](production-runbook.md#staging-evidence-to-collect). Verify the expected staging project receives the test writes. Record statuses only, never credentials.
- Complete acceptance before opening the PR. Keep main and production untouched pending review.
