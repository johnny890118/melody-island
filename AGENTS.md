# Project rules

- Keep the real interactive 3D island central to the homepage. A fallback is for loading failure or unavailable WebGL, not the default experience.
- Read PRODUCT.md and DESIGN.md for product and visual decisions. UI quality is verified in a browser at desktop and mobile sizes.
- Canonical room mutations go through authenticated server commands. UID and membership establish identity; Redux, email and room passwords in client-readable documents do not.
- Queue operations use stable IDs. Playback commands carry a version and are idempotent; stale ended events must not advance a newer song.
- Never expose room secrets, Admin credentials or YouTube server keys through NEXT_PUBLIC variables or logs.
- All integration/E2E data lives in the demo-melody-island emulator project. Never run automated room tests against production.
- Keep build, tests and runtime claims separate: passing mock-player tests is not evidence of real YouTube synchronization.
- Do not deploy rules or migrate existing rooms without a verified backup, migration plan and deployment review.
