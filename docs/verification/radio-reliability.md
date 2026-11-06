# Radio reliability review — 2026-11-06

Production Firebase, rules and main remain untouched. UI redesign is paused. The existing Draft PR still requires staging and physical-device approval. See [protocol design](../architecture/sync.md).

## Reproduced causes

1. Natural completion used modulo next even for one song. Real iframe completion on frozen `ede93b0` returned the same song to zero and playing=true: an application replay bug.
2. Repeated play reanchored an already-running timeline. Queue/permission and playback changes shared one version, obscuring playback freshness and causing unnecessary competing intent.
3. Completion depended on player-reported duration/state and a client lease, without admitted content length or an instance fence. Premature ended observations could advance; a disconnected/buffering lease holder could stall progress.
4. Correction lacked explicit seek acknowledgement and stable-content phases. Polling could repeatedly request play after interruption; device wall-clock changes affected target positions.
5. Separately, an official YouTube sample reset to zero/readyState=0 and displayed a provider error despite only one load and one seek. The old adapter subsequently sent 32 play calls during that failed six-minute run. This remains an upstream failure observation, not proof all resets originate in the app.

Four regression assertions failed before changes (39 passed). The replacement separates resource identity, playback epoch, timeline revision, monotonic clock and local media phases. Only server-verified deadlines advance automatically; no peer media observation writes shared position.

## Measurement method

Before: frozen `ede93b0`. After: isolated checkout with radio changes, excluding pending homepage subtitle CSS. Real YouTube iframes use separate Next servers and exact local demo emulators. After-run metadata admission uses explicit independently observed duration fixtures because Vercel cannot export its sensitive server key. Real video playback is not mocked; live videos.list admission needs separate Staging verification.

Same-host HTML media clocks do not measure physical-device or acoustic delay. Offline browsing may continue buffered content; deliberate download interception is a distinct experiment. No forced real advertisement or physical iPhone pass is fabricated.

## Evidence status

- Unit: 112 tests in 16 files passed, including lifecycle, epoch fences, simulated ten-second buffering, seek acknowledgement, early ended, clock and metadata checks.
- Initial four emulator API scenarios passed: twenty simultaneous deadline relays had one success and nineteen stale conflicts; receipts, manual permissions and ownership transfer also passed. A legacy metadata/replay regression is added to the final suite.
- Real late join, ten-second offline/reconnect and refresh passed without changing shared revision/anchor. Nine media-clock samples each: join 64–81ms difference; reconnect 64–65ms; refresh 35–36ms. No seeks during these probes. These are not audio-output latency figures.
- First reconnect attempt encountered a harness click race when successful autoplay removed the prompt. It was not counted as passed. A readiness-observer correction and rerun passed.
- Whole-content natural completion comparison, real media hold, final suites, CI and updated Staging: pending; append actual results before marking the milestone verified.

## Acceptance boundaries

New-protocol physical iPhone Safari + Mac follow-up remains required; the owner's earlier confirmation covered the prior version. Multi-hour sessions, heterogeneous networks, real ads, acoustic alignment and all-tabs-suspended operation remain unverified. This protocol supports finite VOD and rejects unknown/live length.

Before production: verify videos.list key restrictions/quota, legacy duration fallback, refresh old clients, reviewed schema-v1 backup/migration where applicable, and Staging Auth/App Check. No bulk migration or rule deployment belongs to this patch.

## Real download hold results

[Before](../measurements/radio-buffer-before.json) and [after](../measurements/radio-buffer-after.json) both intercepted actual googlevideo requests for ten seconds at a demo-accelerated transition. This is a real media stall but not whole-duration natural completion. Both advanced exactly once (play + advance, room version delta 2).

| Observation | Before | After |
| --- | ---: | ---: |
| Initial two-context media difference | 199ms | 165–166ms |
| Media resumed after download release | 379ms | 118ms |
| First sampled convergence within 1.5s | 383ms | 3159ms |
| Final sampled media difference | 42ms | 82ms |
| Owner/guest seek calls in transition window | 1 / 2 | 1 / 2 |

The new policy intentionally observes healthy content before aligning, so convergence in this run was slower, not faster. It preserved continuous playback after release rather than issuing seeks while buffering. These are single runs, not statistical benchmarks; the transition window includes accelerated-fixture synchronization, so seek counts cannot isolate buffer-only corrections. The result does not establish reduced acoustic delay or universally better media alignment. [Reconnect evidence](../measurements/radio-reconnect.json) independently shows unchanged canonical state during local recovery.

## Whole-content result

The same 634.601-second Big Buck Bunny video ran from initial start to real natural completion in both isolated checkouts; no accelerated anchor was used. [Before raw samples](../measurements/radio-whole-before.json), [after raw samples](../measurements/radio-whole-after.json).

| Observation | Before | After |
| --- | ---: | ---: |
| Backward jumps >750ms | 1 at completion | 0 |
| Resource load calls | 1 | 1 |
| Seek calls | 2 | 1 |
| Play calls | 2 | 0 |
| Final room playing | true | false |
| Final canonical position | 0ms | 634601ms |
| Final media | restarted, 0.853s | ended/paused, 634.601s |

Both runs had a startup alignment seek; the old extra seek/play followed erroneous automatic replay. This validates this concrete replay defect and one whole-content session, not multi-hour reliability or every provider failure.

The failed provider attempts are retained as [six-minute interrupted observation](../measurements/radio-provider-unavailable-before.json) and [explicit provider-error observation](../measurements/radio-provider-failure-before.json). Neither is a passed long-play test. Successful whole-content evidence does not erase these failures.

## Final local regression evidence

Typecheck and lint passed. The clean isolated production build passed using explicit demo public configuration; a first isolated attempt without Firebase public configuration failed with invalid-api-key and is not counted as a successful build. No sensitive Vercel values were exported to make the build pass.

Rules: 5 passed. Migration rehearsal: synthetic backup, conversion, secret verification and rollback passed. Initial Chromium full run: 18 passed, 1 configured skip, 1 failure because a forged legacy ended command returned 422 before the expected stale-state 409. The server now rejects inactive/mismatched state before provider lookup. Targeted Chromium rerun: 7 passed, including that regression, all six protocol API scenarios and the new read-only member-metadata gate. WebKit full run: 19 passed, 2 configured skips. Phone-sized same-tab redirect: 1 passed. A fresh full Chromium CI result must be assessed separately.

A final review added explicit wake/reconnect clock invalidation and cancellation of obsolete calibration requests: monotonic time may omit sleep on some platforms, so slowly slewing a large missing interval is inappropriate. New unit regressions verify trusted rebase and renewal of local alignment after an unacknowledged correction. Audio continues while calibration is unavailable; local correction/deadline relay waits for verified server time. Final focused browser and real-provider reruns cover this change separately from the earlier whole-content experiment.

Final wake-clock reruns: focused Chromium + WebKit reconnect/listening checks **4 passed**; real YouTube late join, ten-second offline/reconnect and refresh **passed in both engines**, with canonical revision/anchor unchanged. Latest raw [Chromium](../measurements/radio-reconnect-final-chromium.json) and [WebKit](../measurements/radio-reconnect-final-webkit.json) measurements supersede the earlier reconnect probe for this final clock change. These still run on one host, not physical iPhone/Mac. Final unit suite: **112 passed**. The whole-content and media-hold experiments preceded the wake-only change; those paths were not rerun indefinitely.

## Staging follow-up — 2026-11-06

Both CI runs for runtime commit `c049dac` completed successfully: [push](https://github.com/johnny890118/melody-island/actions/runs/42100485206) and [PR](https://github.com/johnny890118/melody-island/actions/runs/42100496980). Each includes 112 unit tests, 5 Rules tests, migration rehearsal, production build, Chromium 20 passes / 1 configured skip, WebKit 19 passes / 2 configured skips, and redirect 1 pass.

After the Mac became available, real authenticated Staging metadata acceptance **failed**, revealing a search-only YouTube key method restriction. The staging-only configuration was corrected to allow videos.list as well as search.list, retaining method restrictions and all other protections. Browser verification then **passed**: metadata endpoint 200, persisted Google session, connected room, real YouTube playback progression and acknowledged shared pause. See [staging setup](../staging-setup.md#radio-metadata-acceptance--2026-11-06) and [acceptance record](../measurements/radio-staging-acceptance.json). This resolves the previously blocked desktop/provider-admission check. New-protocol physical iPhone + Mac and acoustic acceptance remain pending; no project-wide release approval is implied.
