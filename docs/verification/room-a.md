# Room A implementation acceptance — 2026-11-07

## Approved scope and resulting behavior

The owner explicitly retained the incumbent homepage, real interactive island and phoenix; only its tagline alignment and action labels change. The homepage now uses「加入島嶼」and, depending on authenticated ownership,「開闢島嶼」or「我的島嶼」. Google sign-in remains the create prerequisite. A new emulator E2E exercises returning through My Island; existing sign-in/cancel/retry/refresh and guest joining coverage retains the renamed controls.

Only room A was selected. It now has a larger real player/current song left, shared queue right, joined-member recognition above, and persistent own-site transport below. The member/permissions dialog uses local shadcn primitives, returns focus, and retains authenticated transfer, removal, leave and permission commands. Search returns focus to the actual entry that opened it. Membership is not called online presence. Queue display puts subsequent items first, with a clearly labelled current/other group retaining all select/remove actions and stable IDs. Display order does not rewrite the canonical queue; shuffle is explicitly described. Local player status remains separate from room intent. No RadioPlayer, clock, SyncedPlayer, server command or Firebase-rule changes are included.

## Reproduced layout issue and fix

An initial Chromium full run had20 passes,1 configured skip and1 narrow-layout failure. Reducing transport spacing alone did not fix it. DOM measurements at320px found document width375px and video-frame right edge374.734px. The new200px player minimum, combined with16:9 aspect ratio and auto width, derived a355px minimum width. Explicit width100%/min-width0 preserves the provider's minimum height using a narrow letterboxed frame rather than forcing horizontal overflow. The focused320px long-title/member/search accessibility scenario then passed. No overflow-hidden mask was added to hide the fault.

## Regression results

- Typecheck, lint and121 unit/component tests passed.
- Rules5 passed; synthetic backup/conversion/secret verification/rollback rehearsal passed in demo emulators.
- Production build passed, including a clean exact-source build ofa35caa9 used for real-provider verification.
- Final full Chromium:22 passed,1 configured skip. Full WebKit:21 passed,2 configured skips. Phone-mode same-tab Google redirect:1 passed.
- Existing authorization, queue removal contention, deadline fencing,20-member operations, reconnect, local listening and player lifecycle coverage remains. New checks cover My Island navigation, actual-trigger search focus restoration, member-dialog focus return and preserved mounted player across UI dialogs.
- Source Impeccable detector returned0 findings. Independent finish review first requested recapture because a supplied390x844 image was incorrectly described as390x600. Correct actual-viewport images were supplied; the fresh complete review returned **ship**, scoped to room A and narrow homepage changes. It is not a real-media/device certification.

## Real YouTube and Staging

A new real YouTube Chromium-host/WebKit-listener probe completed six settled/rapid pause-resume cycles with the new room UI, without recovery listening clicks after the initial gesture. [Raw observations](../measurements/room-a-real-resume.json) include iframe effects and canonical revision/epoch checks. It uses actual iframes, demo-only rooms and the explicit independently observed duration fixture; media-clock observations are not audible latency or a physical iPhone claim. The earlier ten-minute/natural-queue physical acceptance is preserved, not endlessly repeated for UI changes.

Ready independent Preview deployment dpl_J6ZJyp127woMG5rjcUR1C4pKcQ8H deploys runtimea35caa9. Stable [Staging homepage](https://melody-island-stage-20261105-preview.vercel.app/) and [existing test room](https://melody-island-stage-20261105-preview.vercel.app/island/4fQLYehbH-) remain protected; production Firebase and main are untouched. Real signed-in Chrome loaded the updated room, retained Google membership and four existing tracks, opened/closed the real member panel with focus return, and successfully used the site's play/pause controls against actual YouTube. The room was left paused. Homepage visually retained its actual models, showed a left tagline and My Island, and that button returned to the existing room. Mac Safari was not operated.

On the stale pre-update Chrome tab, an existing room-time message was visible after hours inactive; reloading loaded the new app, cleared it and enabled controls after calibration. This is observed recovery, not proof that every long-suspension/provider condition is solved. No synchronization tuning was made in this UI phase.

## Captures, documentation and remaining limits

[Implemented captures](../design/2026-11-07/implemented-a/) identify mock E2E material versus actual YouTube. Mock initial-room images have queued songs but no selected track and do not certify playback; the real-provider images use an actual selected video. Captures include1440x960,390x844,390x600 and320x640 viewports. The unchanged homepage models/fonts/texture retain their existing attributions; no new generated raster or icon kit is introduced. DESIGN.md and the room surface contract record the approved extension, preserving existing tokens rather than adopting another identity.

New room UI on a physical iPhone remains owner acceptance; desktop WebKit/phone viewports do not replace it. Physical network interruption remains deliberately **not tested**. Production rollout still requires the existing configuration/backup/migration review and explicit owner approval. Draft PR stays unmerged.

## Remote CI and cleanup

Exact runtimea35caa9 full [push CI42323389978](https://github.com/johnny890118/melody-island/actions/runs/42323389978) completed successfully: lint, typecheck, unit, Rules, migration, production build, Chromium, WebKit and phone-mode redirect. Duplicate PR run42323394675 had a successful job and was finishing when recorded. Later evidence-only documentation commits do not change the deployed runtime and are not claimed as independently CI-passed.

All temporary local app/emulator listeners3100/3200/8080/9099 were confirmed closed; temporary capture/probe scripts were removed. Runtime is pushed; Draft PR remains unmerged. New room UI physical iPhone acceptance and intentionally skipped physical network interruption retain their statuses above.
