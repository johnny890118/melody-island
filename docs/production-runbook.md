# Production rollout and recovery

No production deployment or data migration has been performed. This runbook is a release procedure, not evidence that a deployment is safe.

## Abuse controls

The API supports Firebase App Check attestation in addition to ID tokens. Register the web app with reCAPTCHA Enterprise, allow staging/production domains and configure `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` at build time. Confirm real browser token delivery in staging before setting server-only `ENFORCE_APP_CHECK=true`. Missing/invalid tokens then fail closed; there is no automatic emulator bypass. Disable enforcement explicitly for isolated demo tests. The client never sends a request without attestation if its configured provider fails.

Enable Firebase service enforcement separately in the Firebase console after reviewing request metrics. The custom API switch does not automatically protect direct Firestore/Auth traffic. App Check is attestation, not user authorization or an absolute bot barrier. Membership and server permissions still apply. See [web setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [custom backend token delivery](https://firebase.google.com/docs/app-check/web/custom-resource), and [Admin token verification](https://firebase.google.com/docs/app-check/custom-resource-backend).

Search requires a room ID and verified membership. It has a per-UID limit plus a shared budget: `YOUTUBE_SEARCH_DAILY_LIMIT` defaults to 80 search calls per fixed 24-hour window starting with the first call. This is a call cap, not a quota-unit estimate or a UTC-midnight reset. It applies across all rooms/identities. Set it from the project's actual YouTube quota and retain headroom for other API consumers. Failed upstream calls still spend budget conservatively. A shared cap can be exhausted by abusive valid members; it limits exposure rather than guaranteeing availability.

Join has per-UID and per-room limits before password derivation. Configure an edge rate limit for auth/join/create/search on the actual hosting platform; do not trust arbitrary `X-Forwarded-For` as a client identity. No generic IP limiter is presented as safe without a trusted proxy configuration. Set `APP_ORIGIN` to the public HTTPS origin and restrict the YouTube key to its API/server environment. Verify only intended Firebase auth providers are enabled.

## Migration gate

1. Schedule maintenance and deny all legacy client writes. Do not allow old and new writers simultaneously.
2. Export the production database to restricted backup storage. Include rooms, secrets if present, and any child collections; record timestamp, project/database ID, document counts and the exact deployed application/rules revisions. Treat legacy exports as plaintext-secret material. Do not put them in Git or logs.
3. Restore the export to an isolated staging database and confirm counts and sample data. A completed export job alone is not a verified recovery path.
4. Inventory legacy rooms. Resolve `createdBy` via trusted Admin Auth lookup. Require the Auth record's verified email to match; never accept a browser-supplied owner UID. Resolve missing owners, invalid/short passwords, duplicate/invalid videos, oversized queues and invalid playback manually. Do not silently discard data.
5. Use the reviewed offline converter `prepareLegacyRoom`. It emits an allowlisted v2 room and a separate salted password hash. It pauses playback, retains stored position, replaces thumbnail URLs with canonical YouTube URLs and starts an owner-only roster. Former guests rejoin. It never copies plaintext passwords, old email identities, leases or arbitrary legacy fields into the room.
6. In each migration transaction, re-read the room and compare its updateTime with the backed-up/planned revision. Abort changes on concurrent edits. Write the room and secret atomically. Persist an encrypted/restricted per-room migration manifest outside the public application. Existing v2 rooms must not be converted again.
7. Deploy the reviewed deny-client-write rules with the v2 application during maintenance. Verify owner/guest access, password rejection, queue/playback, refresh, transfer, kick and rules denial using dedicated staging accounts. Reopen traffic only after those checks pass.

## Recovery gate

Keep maintenance and deny-client-write rules in place. Capture a post-migration snapshot before rollback. If v2 accepted new commands/members, reconcile those writes before restoring older data; a blind export restore can lose them. Restore the tested backup plus its compatible application/rules revision, confirm counts and owner access, then reopen traffic. Never restore the insecure old rules just to make old clients work without an explicit security decision.

`npm run test:migration` rehearses synthetic backup → atomic conversion → hash verification → rollback → cleanup in `demo-melody-island` only. The script refuses any emulator hosts other than the local expected pair, fixes the demo project ID, and exposes no production/apply option. It is not a production migration tool. Its passing result verifies document-level mechanics, not managed-export disaster recovery or actual production identity mapping.

## Final acceptance still needs environment evidence

- Real YouTube on Safari/iOS and Chromium: user-gesture autoplay, blocked audio, unavailable videos, ads/buffering, reconnect and measured inter-device audio drift.
- Actual phone/GPU/network performance. Synthetic CPU/network measurements and software WebGL are diagnostic evidence only.
- App Check provider/domain/metrics verification, edge controls, Admin identity, quota configuration, remote CI, backup restore and coordinated deployment review.
