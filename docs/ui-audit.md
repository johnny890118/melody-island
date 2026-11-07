# Interface audit — 2026-11-04

Scope: homepage, join dialog, room/management, long room/song names, invalid-ID gate, failed model load, 320px mobile layout, reduced motion, keyboard focus, and synthesized Chromium touch. Mock-player room screenshots are labelled. This is a technical quality audit of the current design, not an award assessment or full screen-reader/device certification.

## Implementation integrity

The real island remains central; local shadcn/ui controls, Lucide icons and the ivory/sea-green palette remain coherent. The source detector completed with **0 primary findings and 55 advisories**: 49 font-size occurrences and 6 literal colors not represented in the documented token ramps. These indicate existing documentation/token drift; they were not hidden by ignores or relabelled as automatically fixed. Thematic consistency should be aligned in a dedicated design-system pass.

| Dimension | Score / 4 | Evidence / limit |
| --- | --- | --- |
| Accessibility | 3 | Axe WCAG A/AA tags and keyboard checks pass on covered Chromium surfaces; manual assistive-technology validation remains. |
| Performance | 3 | Bounded DPR, lazy 3D, hidden-tab stop; reduced-motion/paused scene renders on demand. Synthetic throttled measurements are separate evidence. |
| Theming | 2 | Stable palette and tokens; detector reports unrepresented type/color values. No dark theme is promised. |
| Responsive | 3 | Narrow/long-content checks, keyboard and synthesized touch; physical device gestures and 200% text scaling remain separate acceptance items. |
| Integrity | 3 | No primary detector findings; token documentation drift remains. |
| Total | 14 / 20 | Good technical baseline; not a completeness or award certificate. |

## Confirmed findings and remediation

- **P1 — Scene swallowed mobile scrolling.** `Hero.tsx` / `globals.css`: OrbitControls applies inline `touch-action:none` to the Canvas event wrapper. Styling the canvas alone does not restore ancestor gesture permission. The wrapper and canvas now explicitly allow `pan-y`. Chromium CDP touch reproduces horizontal real-model rotation, native vertical scroll and rotation after pointer cancellation. Physical Safari/iOS touch remains unverified. Refinement: harden/adapt.
- **P1 — Ongoing scene motion lacked a page-level pause.** `Hero.tsx`: added a labelled pause/resume control. Reduced motion disables auto-rotation and damping; paused/reduced scenes draw on demand. Refinement: animate/harden.
- **P2 — Dialog close target and language.** `components/ui/dialog.tsx`: increased to 44px and localized the accessible name. Refinement: adapt/clarify.
- **P2 — Management disclosure focus.** `globals.css`: explicit keyboard outline for summary. Refinement: harden.
- **P2 — Misleading queued-but-unstarted copy.** Room now distinguishes an empty queue from a populated queue waiting to play. Removed desktop-only directional search instructions. Refinement: clarify.
- **P2 — Token documentation drift remains.** Detector advisories above are not individual demonstrated contrast failures. Align real component roles/type steps with DESIGN.md in a dedicated pass; do not mechanically add every literal to the palette. Refinement: extract/document, then polish.

A first axe scan during dialog entrance reported transient title contrast. The harness now waits for finite animations to finish before measuring stable-state contrast; it does not suppress contrast rules. Initial movement and reduced-motion behavior are checked separately. An early WebKit keyboard run exposed its native macOS link traversal preference; tests use Option+Tab on macOS WebKit rather than changing semantic link behavior.

## Evidence boundaries

Automated tests cannot establish every WCAG criterion, real audio synchronization, physical-device GPU performance or Awwwards quality. Synthetic touch is Chromium CDP input, not merely a resized viewport and not a physical phone. Finish the release with actual device/assistive-technology checks and a final visual polish pass.
