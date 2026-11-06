# Pause/resume regression — 2026-11-07

## Device report and acceptance status

The owner reported two-minute uninterrupted playback and no obvious audible difference as normal. Mac transport following failed: after pause, play could not resume. Network reconnect and natural completion were explicitly untested in that report. Preserve these distinctions; prior mock or desktop WebKit passes do not override a physical iPhone failure.

The owner provided iPhone Mirroring (physical Safari, 4G) and Mac Chrome for follow-up; do not operate the owner's Mac Safari. A mirrored room showing “playing” is not evidence its media clock advances. Mirroring can affect video presentation and audio routing, so this is not an acoustic latency benchmark.

## Reproduced controller defects

Two deterministic tests failed on d032781 before the change:

1. A resume snapshot could arrive while the iframe still reported PLAYING from before the earlier pause. The controller classified that cached observation as success and omitted the new play intent. The delayed PAUSED observation then caused a local blocked latch.
2. After an actual play request, another transient PAUSED observation immediately became an autoplay rejection. There was no pending transport acknowledgement to distinguish asynchronous completion from a real failure.

The new controller latches an authoritative paused-to-playing transition until it can issue a local play. It tracks the in-flight play until matching content actually progresses; stale paused observations do not initiate another play or classify it as blocked. Explicit provider autoplay rejection still exposes the local listening gesture immediately. An unacknowledged request has a bounded watchdog; buffering and mismatched media suspend that acknowledgement budget. No polling play storm or new canonical position writes are introduced. Same-video replay invalidates the older transport generation and cannot emit a duplicate resume. Clock calibration cannot consume and lose the pending resume intent.

The adapter reports confirmed playing transitions from the controller, including confirmation on a later tick, rather than relying solely on one native state callback. This changes functional acknowledgement, not visual direction or room permissions.

## Evidence before physical follow-up

- Unit/component: 119 passed (16 files), including both red regressions, clock-unavailable resume, ten-second buffering, delayed acknowledgements and replaced same-video epochs.
- Typecheck, lint and clean isolated production build passed.
- Rules: 5 passed; migration/rollback rehearsal passed.
- Initial Chromium full run: 19 passed, 1 configured skip, 2 homepage/model readiness failures. The two unchanged 3D scenarios passed on a focused rerun. Their initial failure is retained; resource contention is not established as a root cause.
- Full WebKit: 20 passed, 2 configured skips; same-tab redirect: 1 passed.
- Real YouTube Chromium host + WebKit listener: six settled/rapid pause-resume cycles passed both before and after. Each player loaded its resource once. These ordinary desktop runs did not naturally reproduce the physical-device failure; do not present them as proof that the iPhone problem is resolved. Raw [before](../measurements/radio-resume-before.json) and [after](../measurements/radio-resume-after.json).

Physical acceptance of the candidate patch remains pending at this commit. Use only Chrome and the mirrored iPhone, perform the initial listening gesture once, then check subsequent Mac-controlled resumes without silently clicking a phone play/activation prompt. No production changes or main merge are authorized.

## Native-control activation follow-up

Physical mirroring showed a further discrepancy: content was visibly playing after the owner's initial activation, while the page still offered “開始聆聽”. Code review and a new failing regression established that the blocked latch ignored successful native iframe activation: even matching content progressing on two later observations could not clear it, so a later remote resume could remain suppressed.

The follow-up observes matching content progress while blocked. Two distinct advancing observations clear the stale latch, invalidate older local pending operations and notify confirmed playback. This sends no play/seek/room command merely to clear the latch. It does not infer permission from a single cached PLAYING value, and mismatched/advertising-like media cannot establish this proof. New epochs/resources reset that observation history.

Validation: 121 unit/component tests, typecheck, lint and isolated production build passed; six focused Chromium/WebKit membership, reconnect and local-listening E2E scenarios passed. Both full CI runs for the preceding 119-test commit 7965a7a passed; the new follow-up CI is assessed separately.

Mirroring input limitations were also observed: programmatic taps did not reliably activate even Safari's address field. The owner's explicit initial tap must not be counted as automated success. Bring the mirrored window to the foreground before inspecting video, since a background/occluded video layer can yield stale screenshots. Device build reload and actual media progression require confirmation. The owner declined physical network interruption; keep that item **not tested**, do not toggle cellular/network settings. Mac Safari is outside the authorized test surfaces.

## Bottom-control request

The owner additionally requested that playback operations be performed from the application's bottom controls. The supported implementation sets YouTube `controls=0`, `disablekb=1` and `fs=0`. The official API does not provide a complete interaction lock, and its policies prohibit disabling player links/advertising functionality; no pointer-blocking overlay is added. References: [player parameters](https://developers.google.com/youtube/player_parameters), [developer policies](https://developers.google.com/youtube/terms/developer-policies).

Impeccable was used for a focused Operate/hardening pass: the local activation action moves to the fixed bottom transport while shared controls retain their permissions. On mobile it is a full-width labelled row, with added document/focus clearance. The body notice identifies the bottom action. The palette and all other layout/art direction remain unchanged. Detector returned no findings. A real rendered mock-player mobile capture was visually inspected; it is UI evidence, not media synchronization evidence. Four Chromium/WebKit room accessibility and local activation checks passed, with the activation action asserted inside the viewport. 121 unit/component tests, typecheck, lint and isolated production build passed. Fresh physical verification still requires the owner to reload the phone document and perform one initial local listening gesture because automated taps through mirroring were unreliable.

With these native-control parameters, a further real YouTube Chromium-host/WebKit-listener run completed all six settled/rapid pause-resume cycles through site controls, without native-player recovery clicks. [Raw result](../measurements/radio-resume-site-controls.json). This uses demo emulator data and independently measured duration fixtures on one Mac, and does not supersede physical iPhone acceptance.

## Latest deployment and physical follow-up

Runtime `6f1bdb1` is Ready on independent Staging, deployment `dpl_FHaterZrDUZVLwQ1mXHwxhagRUEi`; the stable Preview alias was updated. The owner confirmed reloading physical iPhone Safari and performing the initial bottom listening action. Mac Chrome's iframe URL independently showed `controls=0&disablekb=1&fs=0`.

Two consecutive Mac-controlled pause/resume cycles were observed through foreground iPhone Mirroring. Each pause showed the phone's paused room transport, and each resume showed actual content frames advancing on subsequent observations without another phone click or a stale listening prompt. A Mac next-track command changed the phone from Maple Leaf to Dandelion's Promise; successive frames of that actual video advanced without another activation. These are bounded qualitative physical-device observations, not continuous screen recording, measured audio latency, or evidence of every future autoplay condition. No Mac Safari interaction or device network changes were performed.

The last queued track was then allowed to run to its natural end without transport changes. Mac Chrome was refreshed once mid-track and required its own bottom listening gesture; foreground phone content continued through later portions. At completion, both room transports showed paused and both providers showed an ended/replay state, without starting the song again. This verifies one physical finite-queue terminal stop, not a physical first-to-next natural transition, multi-hour playback, or a frame-accurate jump count. Both full CI runs for `6f1bdb1` passed (42267986850 and 42267994963). Physical offline/reconnect is **not tested**, explicitly skipped by the owner. The Draft PR remains unmerged.
