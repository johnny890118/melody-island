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
