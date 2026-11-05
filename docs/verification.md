# Verification — 2026-11-04

First implementation candidate; no production deployment or legacy data migration.

- Unit/component: 54 passed across ten suites, including actual player-adapter cue/load/clear behavior with a fake YouTube target.
- Firestore Rules Emulator: 5 passed. Client writes, secret reads, self-membership and non-member reads are rejected.
- Playwright: 11 Chromium end-to-end scenarios passed in 50.2 seconds after the accessibility/security follow-up. Includes real homepage WebGL, two-client playback state, refresh, concurrency, roles, ownership transfer, interrupted search and short-viewport keyboard focus.
- After the full suite, the 20-client scenario passed twice more consecutively (22.5 and 22.4 seconds) following the lease/counter compare-and-set change. The 21st member is refused. These are emulator state tests with mock playback, not audio-drift measurements.
- WebKit: 10 scenarios passed in 1.1 minutes; the Chromium CDP-specific touch scenario is explicitly skipped. This is the Playwright engine, not Safari/iPhone hardware certification.
- Synthetic migration rehearsal passed: backup, atomic room/secret conversion, hash verification, rollback and cleanup, restricted to local demo emulators.
- Strict TypeScript checking, ESLint and git diff whitespace check passed. Application, API, Redux, tests and scripts use TS/TSX. PostCSS retains its build-tool MJS entry; vendored skill tooling is unchanged.
- Local shadcn/ui Button, Input, Dialog and Checkbox replace the former primitives; Lucide is the sole icon library. ESLint enforces wrapper/import boundaries. Runtime parsers reject malformed commands and external room/provider data.
- Production build passed with demo/emulator client configuration, avoiding production Firebase access during verification.
- Dependency audit: production 7 moderate, 0 high/critical; entire-tree findings were 30 moderate, 0 high/critical at the prior milestone. Remaining findings are not represented as fixed or automatically exploitable. Next remains on the patched 15.5 line; PostCSS and gRPC have explicit patched resolutions.

Earlier repeated load tests exposed transaction-lock timeouts even after one successful run. The final layout uses a bounded roster in the room and optimistic updateTime preconditions for leases/counters; canonical playback plus command receipts remain atomic transactions. See sync.md for the resulting tradeoffs.

Visual finish review: disposition **ship**, limited to the five scored fixes (framing, login/create entry, mobile task order, placeholder contrast, focused transport clearance). It does not establish award quality. Captures are local under `.impeccable/review/`; management and search focus were checked at 390×600.

Local production baseline is in `measurements/home-local.json`. Unthrottled localhost and software WebGL are not real-device/field performance evidence. Desktop observed scene/fonts readiness was about 1.29 seconds, phone-size viewport about 0.60 seconds. Canvas readiness is separate from LCP. At that baseline, homepage fonts totaled about 257 KB, and only the main island model loads (bird/plane assets are preserved but not requested).

Still required for a production release: Admin identity/origin/auth-provider configuration, edge abuse protection/App Check, remaining-advisory review, coordinated rules rollout, backed-up legacy migration, real YouTube/Safari checks, actual audio-drift and device/network performance tests.

Player follow-up: tests now cover paused audio activation, canonical position-only corrections, hidden-tab polling, foreground/online resync, listener cleanup and readiness timeouts. Fixed unconditional play during audio activation and a missing position dependency. Added offline → remote mutation → reconnect → reload E2E coverage; offline status takes precedence over cached snapshots. These remain mock-player state checks. See `remaining-work.md` for outstanding acceptance work and `dependency-review.md` for unresolved advisory disposition.

App Check integration and missing/invalid attestation tests are included, with no implicit emulator enforcement bypass. Real reCAPTCHA/domain attestation is not configured or verified. Search now enforces room membership and per-user/shared budgets; join has a per-room derivation budget. Hosting-specific edge enforcement still needs configuration.

The covered axe scans pass for home, dialog, room, expanded permissions, invalid-ID gate and model failure. Real Chromium CDP touch reproduced and verified the scroll/rotation fix. Source detector: 0 primary findings and 55 token-ramp advisories, left visible; see ui-audit.md.

Cold-cache synthetic performance: three runs per viewport, 4× CPU slowdown, 1.6Mbps down/0.75Mbps up and 150ms latency. After splitting fonts by Unicode range and preloading the homepage island, median observed scene/fonts readiness fell from 6.19s to 5.92s on desktop and 6.20s to 5.90s on mobile. Transfer fell from about 925 KB to 807 KB; each run transferred one island model. Text LCP was 0.56s and does not measure Canvas readiness. See `measurements/home-throttled-before-font-split.json` and `measurements/home-throttled.json`.

The opt-in `npm run smoke:youtube` loaded the real iframe and cued the official sample in Chromium and WebKit using demo room data. It verifies readiness only; it does not verify audible playback, autoplay recovery, ads, or inter-device drift. See `measurements/youtube-smoke.json`.

Linux CI for `0b5992c` failed the concurrent 19-guest join stage. A local delayed-counter regression separately reproduced premature retry exhaustion: 11 of 20 operations passed with the old retry budget. The counter now uses bounded exponential jitter and up to 32 attempts; the test requires all 20 operations to pass and the 21st to be rejected without exceeding the budget. The E2E reports individual response statuses and errors if joins fail again.

Remote CI for the prior pushed milestone d0b3144 passed: https://github.com/johnny890118/melody-island/actions/runs/41681329765. This does not establish the result for any newer commit.

Remote run [41815834496](https://github.com/johnny890118/melody-island/actions/runs/41815834496) passed Chromium, including the 20-member scenario, but Linux WebKit rejected the Chromium-only `--enable-webgl` launch flag. Playwright now declares separate browser projects and applies SwiftShader arguments only to Chromium. The WebKit assertions remain enabled.

Cloud Current homepage follow-up: Chromium (12 scenarios) and WebKit (11 scenarios, one Chromium-only touch skip) passed locally against demo emulators. The original phoenix is loaded after the main scene; tests check both models' readiness, pause/reset, and continued boarding access when the optional phoenix download fails. The historical performance baselines above predate this change and exclude the optional 1.63 MB phoenix. Desktop and mobile visual inspection used the real models. The Impeccable verdict resolved the two review findings: the cloud bank/trace placement and control clearance with a simulated status notice at 1024 px.

Moon Pass production-build profiling with demo emulators records island and fonts separately from the complete scene. With a cold cache, 4× CPU slowdown, 1.6 Mbps download and 150 ms latency, the three-run medians were 5.92 s / 11.72 s at 1440×960 and 5.91 s / 11.73 s at 390×844. The bird transferred 1,042,944 bytes and took about 5.37 s from request to response completion. The request followed island load and scene commit. It could start just before the script's later sample that waits for fonts and two browser frames. The main scene median stayed near the earlier 5.9 s synthetic baseline. These measurements use software WebGL and reduced motion. They do not measure on-device frame rates or field performance. Raw results are in `measurements/home-moon-pass-local.json` and `measurements/home-moon-pass-throttled.json`.

Host GPU follow-up on installed Chrome used Apple M4 Pro Metal, a production build, localhost and reduced motion. One run per viewport measured island and fonts / full scene at 1.60 s / 2.47 s for 1440×960 and 0.88 s / 1.68 s for 390×844. The second viewport uses the same desktop hardware. Reproduce with `MELODY_NATIVE_CHROME=true npm run measure:home` against the isolated demo preview. See `measurements/home-moon-pass-host-chrome.json`. Native Safari WebDriver could not start because Allow Remote Automation is disabled. No phone GPU or Safari result was collected.

Player and security follow-up: 56 unit/component tests, 12 Chromium E2E, 11 WebKit E2E (one Chromium-only touch skip), 5 Firestore rules tests, demo migration rehearsal and isolated production build passed. Two adapter tests exercise stale ended events after a track change and a same-track replay. The current production dependency audit still reports 7 moderate findings and no high/critical findings. Real staging App Check and edge enforcement remain unverified.

Real YouTube recheck: the initial dev-preview run crashed in both browsers and is recorded in `measurements/youtube-smoke-initial-recheck.json`. That run did not capture the underlying browser exception. An isolated production build then passed play and pause in two independent contexts per engine, using a real YouTube iframe and a synthetic demo room. Across five samples, absolute media timeline difference was 201–202 ms in Chromium and 135 ms in Playwright WebKit. No browser exceptions were recorded in the successful run. These are same-host media-clock differences over a short run, not audible drift across devices. The actual end-of-track callback, mobile Safari, ad/buffer recovery and real staging still need separate evidence. See `measurements/youtube-timeline.json`.

Development preview crash reproduced with the real iframe in both engines. Chromium reported a null iframe `src`, and WebKit reported a null `this.h.src`. The earlier React wrapper initialized and destroyed the player during React's development mount/cleanup probe. Simply deferring the wrapper's render reproduced the crash. The replacement adapter owns a stable host and only constructs the IFrame API player after the committed effect, ignoring callbacks from a discarded setup. The Strict Mode regression asserts one iframe construction and one actual teardown. Both engines subsequently loaded the real iframe without a recorded page exception in development. Chromium also verified exactly one automatic advance with two viewers. The development WebKit transition run lost its shared emulator when the parallel test suite restarted it, so that result is inconclusive. See `measurements/youtube-dev-before-fix.json` and `measurements/youtube-transition-dev.json`.

Moon Pass now reuses the original WebGL Canvas when the viewer resets the camera, with an E2E identity assertion. A short installed-Chrome interaction check on the Mac captured 90 animation frame intervals with a 16.7 ms median and p95 while the scene was running and a drag was issued. This is host browser frame cadence, not a GPU frame-time benchmark or iPhone measurement. Scene controls have a solid night surface so the moon cannot wash out the instructions. The primary hover state preserves a dark label over a light background throughout the transition.

The isolated production transition probe then passed in both Chromium and Playwright WebKit with the replacement adapter. An emulator-only fixture moved the paused first video to nine seconds before its observed duration. The host then pressed Play through the regular UI. Both clients switched to the second real video, and the room version advanced exactly twice for the play and one natural completion. There were no page errors. The five same-host timeline samples were 268 ms in Chromium and 221–263 ms in WebKit. See `measurements/youtube-transition.json`.

Vercel reported a successful Preview deployment for `be21743`. An unauthenticated GET redirected to Vercel Authentication. That confirms hosting protection and leaves application-level staging App Check, edge limits, and the Firebase project mapping unverified. No writes were sent to the remote preview.

Media delivery hold follow-up ran the same production transition while delaying the guest's Googlevideo media requests. Chromium observed one delayed request, guest media readyState 0 while held, then playback on both clients after release. WebKit did not reach the expected next-track heading in this variant. Its ordinary natural transition passed in the separate unthrottled run. The delayed-media WebKit case remains unresolved. See `measurements/youtube-media-hold.json`.

Login and offscreen rendering follow-up: both browser engines completed the Google Auth Emulator popup flow, including cancellation, retry from the second entry point, a synthetic account sign-in, reload persistence, and sign-out. This does not establish native Safari or the deployed Google OAuth provider configuration. The two entry points share a pending state. Impeccable's source detector reported zero non-advisory findings on the changed screens.

The homepage suspends continuous WebGL rendering while the scene is fully outside the viewport. Installed Chrome on the Mac at 390×360 counted 330 draw calls over 500 ms with the visible animated scene, 0 after the offscreen transition settled, and 330 after returning. The same Canvas remained mounted. This is a host browser sample, not a phone battery measurement.

The owner-led media hold recheck passed in both engines in an isolated production build. The fixture disabled guest skipping and verified the owner held the advance lease before intentionally delaying the guest. Chromium held one real Googlevideo request and WebKit held two. Both observed media readyState 0 during the hold and resumed playback after release. The room version advanced exactly twice for play and one automatic transition. Five pre-hold timeline samples were 199–200 ms in Chromium and 136–169 ms in WebKit on the same Mac. The prior inconclusive WebKit run remains recorded separately. See `measurements/youtube-media-hold-owner-leader.json`.

With the production build running locally against demo emulators and `ENFORCE_APP_CHECK=true`, an HTTP probe sent a valid demo Auth token. Missing App Check, malformed App Check, and a foreign Origin were each rejected with the expected 403 response. This verifies fail-closed runtime behavior. It does not establish issuance or acceptance of real attestations, deployed edge limits, or staging project isolation.

## Staging Google sign-in repair — 2026-11-05

The Chrome session reproduced an immediate Firebase `auth/popup-blocked` response after the login button's click handler ran. The Chrome Console contained no additional messages. The dedicated staging Google provider and authorized hostname were enabled.

Staging now uses same-tab Google redirect with a same-origin Firebase helper proxy. The Google callback was registered in the dedicated staging project. The helper iframe responds with HTTP 200 and `frame-ancestors 'self'`. An unauthenticated request to the Preview hostname still redirects to Vercel authentication (302), and the custom API still rejects requests without App Check (403).

Using the real Google provider, Chrome reached the Google account chooser. The owner selected their account and reported returning to the application. Browser inspection confirmed the authenticated “登出” control, persistence after reload, successful room creation, real YouTube search, queue insertion, playback (including Chrome's audio-playing indicator), and pause. App Check enforcement remained enabled during these room commands.

These observations cover one signed-in owner on one computer. The in-app browser shared that identity and therefore was not counted as an independent guest. Independent staging guest membership, cross-device audio drift and native iPhone Safari remain pending.

Two prior UI-dependent E2E checks needed shorter viewports after the homepage footer was removed. Their assertions still require actual vertical scrolling and an offscreen scene that stops rendering.

## Independent native Safari and reconnect acceptance — 2026-11-05

On the dedicated staging deployment of 68dd613, macOS Safari opened the acceptance room with a separate anonymous Firebase identity. The room first presented its password gate. A wrong password was rejected. The verified test password then admitted the guest, and both Safari and the Google-authenticated Chrome owner displayed two members with their distinct guest/owner interfaces.

Safari initiated playback of a real YouTube track and Chrome converged to the same track and playing state. Chrome's pause propagated to Safari. With both players paused, their accessible YouTube controls displayed 29 seconds and 30 seconds. This is a coarse integer-second observation on one Mac, not an acoustic measurement or a cross-device latency result. Adding a second YouTube search result and switching tracks from Chrome also propagated to native Safari and resumed playback.

For network recovery, Chrome DevTools put only the owner tab into Offline mode. The owner interface displayed offline and Firestore/YouTube requests reported ERR_INTERNET_DISCONNECTED. The connected Safari guest paused the room. Restoring Chrome to No throttling made it reconnect and adopt the shared paused state. DevTools was then closed and throttling left disabled.

The physical iPhone check was requested separately. The owner reported inability to join or play, and the exact failure and iOS version remain under investigation. It has not passed.

GitHub's verify check for 68dd613 completed successfully at https://github.com/johnny890118/melody-island/actions/runs/42014915843/job/127202922505 . The Vercel Preview Comments check also completed successfully.

## Targeted Safari redirect diagnostic — 2026-11-05

Native macOS Safari completed the real staging Google redirect and showed the authenticated logout control and existing-room entry. Reload preserved the session.

A new phone-mode WebKit emulator test initially returned to the app without an authenticated session when the Auth Emulator helper ran on port 9099, a different origin from the app on port 3100. This harness did not reproduce staging's same-origin helper architecture. The explicit redirect/emulator configuration now proxies only the fixed local Auth Emulator helper and token endpoints through port 3100. The test passed with mobile and touch modes enabled after this configuration change, covering sign-in, callback, reload persistence and logout. CI runs this targeted regression with npm run test:e2e:redirect. Existing desktop scenarios were not manually rerun for this diagnostic.

Available Vercel join records showed the native macOS Safari rejection and subsequent successful join. No matching iPhone user-agent request was found in the available request query. The owner's earlier physical-phone failure report has no exact error, operating-system version or reproducible step yet. Classify it as reported/unreproduced, while physical iPhone Safari and cross-device audio measurements remain unverified.

This Mac has Command Line Tools but no installed iOS Simulator or connected physical-iPhone control surface. Phone-mode Playwright WebKit is browser emulation and does not establish physical-device acceptance.

## Synchronization and listening activation repair — 2026-11-05

The owner confirmed successful physical iPhone Safari/Mac sign-in, create, join, play, pause, skip and reload, then reported intermittent seek oscillation and gesture-required audio.

Source review found no media-position writeback from local player correction. Shared progression still comes from authenticated commands or the lease holder's version-checked ended command. The old adapter nevertheless issued playVideo every five seconds and sought during buffering. It could also replay an ended local player before authority advanced the track. These client behaviors were changed.

The adapter now waits during buffering, confirms persistent drift, applies a seek cooldown, aligns startup once, and waits on an ended track for authoritative advancement. A listener gesture directly unmutes and aligns that local player to the latest room timeline. It does not publish play/pause/seek commands. Only confirmed playing hides the listening prompt. Repeated blocked-autoplay attempts are suppressed until another listener gesture.

Cold-start-biased clock calibration was also reproduced during comparison. Calibration now selects the shortest of three round trips. Concurrent calibration calls are coalesced.

The final paired real-player evidence and its limitations are recorded in docs/measurements/sync-comparison.md. Final buffering recovery used one guest seek in each engine. Room version increments remained exactly one for the next-track scenario.

The next-stage Impeccable Critique and larger homepage/room redesign are recorded in remaining-work.md. Only the required listening prompt was changed visually in this patch.

Final local checks for this patch: strict typecheck, lint, production build, 82 unit tests, 5 Rules tests and the migration rehearsal passed. Chromium E2E completed with 14 passed and 1 configured skip. The initial WebKit suite had 12 passed, 2 configured skips and a Google-emulator popup timeout; a targeted retry of popup login, reconnect and local listening passed all 3. The staging-style same-tab phone-mode redirect test passed separately. The popup timeout is retained as intermittent test evidence, not silently counted as a clean first-run suite.

The earlier phone failure paragraphs above are historical diagnostics. The owner's subsequent physical iPhone/Mac success report supersedes that basic-flow status. The synchronization patch's physical-device follow-up remains unverified.

After the final prompt acknowledgement change, the targeted local-listening regression passed again in both Chromium and WebKit (2/2): clicking activation and local resync did not change the authoritative room version, playback timestamp or position, and the prompt remained visible without a playing acknowledgement.
