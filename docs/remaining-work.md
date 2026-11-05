# Completion ledger — 2026-11-05

A pushed milestone is not completion of the entire modernization request.

| Original request | Implemented and verified locally | Remaining acceptance work |
| --- | --- | --- |
| Impeccable redesign; preserve 3D; award-level ambition | Moon Pass homepage with real 3D island and original phoenix, matching room and transport theme, local shadcn/ui primitives and Lucide icons | Covered interface/axe review, reduced-motion, model-failure and synthesized touch checks are implemented. Assistive technology and real-device polish remain. No award-quality certification claimed. |
| Performance, race and security review | Authenticated commands, private password hashes, deny-write rules, versioning/deduplication, bounded roster, lease/counter contention fix, local performance baseline | Transitive advisory review and synthetic throttled profiling are recorded. App Check, member-only search, shared search budget and room join limits are implemented. Provider/edge configuration and real-device profiling remain. Local timing is not field performance. |
| Unit and E2E testing | Strict TS, component/domain tests, Rules Emulator, 13 Chromium E2E scenarios, 12 WebKit scenarios, repeated 20-client test, CI definition | Network-loss/rejoin, axe, keyboard, narrow/long-content and real Chromium touch checks now pass. Physical devices, assistive technology and actual audio drift remain. The remote verify check for 68dd613 passed. Inspect subsequent commits independently. |
| Multiplayer design | Canonical server state, ownership and permissions, stable queue IDs, leases and reconnect correction; documented limits | Real Google owner sign-in, independent anonymous native Safari joining, real YouTube play/pause, track switching and owner-tab network recovery passed against isolated staging on one Mac. The owner subsequently confirmed physical iPhone Safari and Mac login, room creation/join, play, pause, skip and reload. Follow-up acceptance now targets intermittent drift/seek oscillation and gesture-gated iPhone playback. Native Safari real Google redirect and a phone-mode WebKit same-origin redirect regression passed. Ads and measured cross-device audible drift remain; full-background room progression is intentionally unsupported. |
| Better features | Invite URL, shuffle, member removal, ownership transfer, leave, permission controls | Prioritize vote-to-skip and temporary guest requests after reliability acceptance. Online presence requires a defined heartbeat/expiry model; joined count must not be described as online. AI curation is optional, not a release dependency. |
| AI markdown guidance | AGENTS.md, PRODUCT.md, DESIGN.md, architecture and verification documents; CI enforces mechanical rules | Keep guidance synchronized with actual behavior; avoid duplicating rules in multiple AI-specific files. |
| TypeScript, UI foundation, push | TS/TSX application, API, store, tests/scripts; shadcn/ui + Lucide import restrictions; verified milestones pushed | Continue pushing verified milestones. Build-tool/vendor code may retain its required original format. |

## Current next steps

Player lifecycle/reconnect coverage, dependency notes, covered UI/keyboard/touch checks, abuse-control integration and a concrete migration/rollback runbook plus demo rehearsal are completed locally.

1. Continue profiling on actual devices. The same synthetic slow profile improved from about 6.2s to 5.9s after font subsetting and model preload; real YouTube iframe readiness also passed in Chromium and WebKit.
2. Verify assistive technology and text scaling on real devices. The shared Moon Pass colors are documented in DESIGN.md.
3. Isolated Firebase and Vercel staging are configured. Real room commands passed with custom-API App Check enforcement. Missing/invalid attestation and cross-origin requests were rejected. Firebase-service enforcement and hosting edge rate-limit acceptance still require evidence.
4. Real-device/YouTube acceptance, then deployment review with verified backups. No production deployment or data mutation is authorized by this ledger.

Local implementation work can proceed without asking the user to repeat existing authorization. Real environment validation requires suitable runtime access; unavailable evidence remains explicitly unverified.


## Release gate

The six original requests have implementation coverage in the ledger above. The owner has confirmed core physical iPhone/Mac operations. Intermittent sync/seek oscillation and iPhone listening activation are the current reported issues; the new fix still needs device follow-up. Real-device performance, cross-device audible drift, Firebase-service App Check enforcement and edge throttling must retain their actual verification status in release review. The production configuration and legacy-room backup/conversion/recovery requirements are recorded in production-runbook.md. No new optional features are required for this acceptance phase.

## Next design phase requested on 2026-11-05

After synchronization and iPhone listening acceptance, use Impeccable Critique for both homepage and room. The homepage needs stronger cosmic depth, immersion, visual impact and composition. The room needs a more developed layout, hierarchy and shared-listening experience. Propose stronger alternatives against top Awwwards visual quality while retaining Melody Island, the 06 Moon Pass art direction, real interactive 3D island and phoenix. Composition and interface may change substantially. Record-only for the current phase; do not implement this redesign during the synchronization fix.

### Direction selected

The owner subsequently selected A, Lunar Approach, authorizing implementation of the proposal. The homepage and room are being adapted within direction 06; this supersedes the record-only instruction above. The synchronization controller, authoritative server commands and production Firebase remain unchanged. Physical iPhone acceptance of the synchronization patch remains with the owner. See the Lunar Approach section in verification.md for actual UI evidence and remaining risks; do not infer a project-wide release pass from a design review.
