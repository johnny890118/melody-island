# Dependency follow-up — 2026-11-04

`npm audit --omit=dev --json` reports seven moderate entries and zero high/critical. The seven entries are dependency propagation, not seven independently demonstrated exploits.

| Dependency path | Finding | Current disposition |
| --- | --- | --- |
| firebase-admin → Firestore → google-gax / gaxios → rimraf → glob → minimatch | Glob cancellation traversal and minimatch resource amplification | No route accepts a filesystem glob from a user. That observation does not prove the entire upstream code path unreachable. Keep the advisory open pending an upstream-compatible patch and regression verification. |
| tailwindcss-animate → Tailwind → sucrase → glob | Same filesystem-pattern advisories | Application source/configuration is trusted build input. Runtime room/search input is not supplied to the compiler. Moving a dependency category does not fix its vulnerability. |

An `npm audit fix --omit=dev --dry-run` still reported these seven moderate entries. No forced major-version override was applied. A minimatch/glob major override needs upstream API compatibility verification; it must not be used just to produce a green audit count.

This is a dependency-tree and application-input review, not a penetration test or a claim of zero exploitable vulnerabilities. Re-run the audit before release because registry advisories change. Exact advisory URLs and affected ranges are available in npm audit output.
