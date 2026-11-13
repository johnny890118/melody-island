# Project rules

- Keep the real interactive 3D island central to the homepage. A fallback is for loading failure or unavailable WebGL, not the default experience.
- Read PRODUCT.md and DESIGN.md for product and visual decisions. UI quality is verified in a browser at desktop and mobile sizes.
- Canonical room mutations go through authenticated server commands. UID and membership establish identity; Redux, email and room passwords in client-readable documents do not.
- Queue operations use stable IDs. Playback commands carry a version and are idempotent; stale ended events must not advance a newer song.
- Never expose room secrets, Admin credentials or YouTube server keys through NEXT_PUBLIC variables or logs.
- All integration/E2E data lives in the demo-melody-island emulator project. Never run automated room tests against production.
- Keep build, tests and runtime claims separate: passing mock-player tests is not evidence of real YouTube synchronization.
- Do not deploy rules or migrate existing rooms without a verified backup, migration plan and deployment review.
- Application, tests and project scripts use strict TypeScript/TSX (`allowJs: false`). Do not use `any`, `@ts-ignore` or disable checking to hide migration errors. Validate external Firestore/YouTube data at runtime.
- When a feature needs a UI component, check the full official shadcn/ui catalog first. Prefer a suitable shadcn/ui component whether or not it is already in this repository. Reuse the local copy or add the component to `components/ui` on demand. Use semantic native HTML when the catalog has no suitable component. Add components only when a feature needs them. Import Radix primitives only in `components/ui`. Use Lucide for all interface icons. Impeccable owns visual direction. Use shadcn/ui and Lucide as the project's UI and icon kits.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, `npm run test:migration`, `npm run build`, `npm run test:e2e` and `npm run test:e2e:webkit` for substantial changes. Push verified milestones to the task branch as requested; do not imply that local commits have been pushed.

- Keep App Check attestation separate from user authentication/room authorization. Do not add an implicit emulator bypass to an enabled enforcement policy or trust arbitrary forwarded IP headers.
