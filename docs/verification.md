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
