# Private radio protocol (v3, schema-v2 compatible)

## Authority

A room is a finite, shared YouTube VOD timeline, not a network of players voting on position. Only authenticated server commands write canonical state. Firestore rules deny client writes. UID, membership and capabilities authorize commands; client IDs, Redux, email, passwords and App Check do not establish room authority.

`positionMs + max(0, serverNow - playbackUpdatedAt)` defines the running position. Pausing freezes `positionMs`. `playbackRevision` increments only when this timeline changes; queue, permissions and roster changes do not invalidate playback intent. `trackEpoch` increments on track changes and explicit same-video restarts. `version` remains the general room mutation counter for compatibility. Legacy documents read missing counters as zero. A timeline update with an older revision, or conflicting fields at the same revision, is ignored locally.

Playback commands include the observed playback revision. Automatic `advance` additionally includes video ID and track epoch. Room and receipt are read together and committed atomically. Receipts bind actor and a SHA-256 fingerprint of the normalized intent: same ID/same intent returns its receipt; same ID/different intent or actor conflicts. Receipt lookup precedes external metadata calls so acknowledged retries do not depend on provider availability. Receipts have no automatic expiry; any retention change requires replay analysis.

Repeated play on a playing room and pause on a paused room are no-ops. Manual next/previous retain wraparound and permission checks. Natural completion advances forward and stops at the end of the queue, including a one-song queue. Explicit play after completion starts a new epoch; no implicit single-song repeat exists. Shuffle selects another item deterministically across transaction retries.

## Server deadlines replace player leadership

YouTube content length is admitted on the server using `videos.list(contentDetails,status)`. Browser-supplied duration is discarded. Metadata requests are bounded, cached and coalesced. Unknown/zero/live duration, unavailable or non-embeddable media fails explicitly; this protocol currently supports finite VOD, not live streams. The public iframe duration is used only to establish local content confidence, never to authorize an advance.

Any connected member may relay an elapsed deadline. The server independently checks membership, revision, epoch, current video, admitted duration and server time. An early relay cannot skip. Twenty concurrent relays have one winning transaction; stale competitors conflict. Disabling guest manual skip/control does not prevent a guest from relaying an already elapsed server deadline. Owner handover does not change the timeline.

The next track starts at the prior scheduled deadline, not request arrival. A transaction catches up through at most 100 elapsed items after suspension. A final elapsed item pauses at its duration. Missing durations on legacy later items stop catch-up at that item until metadata is available. This avoids adding network and loading delays to every transition. An entirely offline room has no cloud scheduler: state catches up when a connected member returns. This is not a guarantee of uninterrupted background execution or gapless YouTube audio.

New clients do not acquire/renew leases. Legacy lease endpoints remain fenced by UID/client/term; legacy `ended` also requires current revision, epoch and trusted server deadline. Unmodified old clients cannot safely emit the new proof and must reload after deployment. A lease holder's buffering, advertisements, suspension or disconnection cannot stall the new deadline protocol. Public player ENDED events never choose the room's next track.

## Local player ownership

`RadioPlayer` is a pure state machine emitting local effects; it has no Firestore/API access. `SyncedPlayer` is the only media adapter. It calls load/cue only for a new video resource or a genuinely new iframe instance. Ordinary snapshots, leases, queue edits and clock refreshes do not reload content. Explicit replay of the same resource uses an epoch-fenced seek/play.

A monotonic clock is calibrated from three authenticated round trips, selecting the shortest RTT and accounting for sample age. Periodic corrections slew rather than exposing device wall-clock jumps to playback. Foreground/online recovery invalidates the old calibration, aborts obsolete sampling and obtains a fresh bounded set of server samples before enabling corrections again. This rebases a clock that may not have advanced through device sleep; local audio is not paused and canonical state is not rewritten. RTT uncertainty is an estimate, not proof of symmetric networking or output latency.

Buffering produces no seek/play storm. On healthy content progression, local alignment may issue one seek; the adapter waits for acknowledgement before another. Failed acknowledgement preserves continuity instead of repeatedly chasing position. Resource/duration mismatch quarantines advertising-like or unknown media observations. Healthy sustained drift can trigger bounded correction; explicit local resync remains available. Correction, activation, buffering, mute and reconnect never publish a room position.

Safari and other browsers may require a real listening gesture. “開始聆聽” unmutes, seeks locally to the latest authoritative position and requests play without changing the room. A locally paused or failed player has a clear activation/retry path. Provider errors retain their numeric code. The public API cannot reliably identify every advertisement, guarantee successful seeks, control device audio pipelines or prevent upstream provider failures; no acoustic synchronization claim is made.

## Diagnostics and verification

`?syncDebug=1` exposes `window.__melodySyncDiagnostics`: phase, lifetime local effect counts and a bounded 256-entry decision trace with monotonic time, revision, epoch, reason and optional target seconds. No credentials, room password, member identity or song title is recorded. Reason codes distinguish authoritative transitions, local alignment, buffering, stale snapshots, seek acknowledgement and provider errors. Inspect iframe commands and canonical mutations alongside these traces; player currentTime is not audible output timing.

Unit tests verify policy and clock semantics. Emulator API tests verify transactions, permissions, receipts and twenty-member contention. Fake-player browser tests verify flows only. Opt-in real-iframe probes exercise actual YouTube content against demo emulator room state, and explicitly identify metadata fixtures when live provider admission is unavailable. Same-host browser contexts are not two physical devices; desktop WebKit is not iPhone Safari. Physical-device follow-up and provider/advertisement limits must remain separate from passing automated checks.

## Compatibility, security and rollout

All integration/E2E rooms are confined to `demo-melody-island` with exact local emulator endpoints. Explicit fake/real-duration fixture environment variables fail closed outside that configuration. Never configure them in Vercel. The real iframe fixture uses observed content lengths and cannot validate live YouTube Data API admission.

Existing schema-v2 queue entries may lack duration. An authenticated, member-only, no-store playback metadata endpoint reads provider metadata for the current video without migrating room documents. Normal commands enrich only their relevant metadata. A first play/resume also admits missing current-song duration before deciding whether a paused legacy position is terminal; repeated play of an already-running timeline remains a no-op without a provider dependency. There is no bulk migration or rule deployment in this change. Existing schema-v1 rooms still require the previously documented backup, UID mapping, secret hashing and reviewed migration; never infer UID from untrusted input.

Private rooms retain a maximum of 20 joined members and 100 unique video IDs. Server-only salted password hashes, atomic membership removal, ownership transfer, distributed request budgets, origin checks and App Check enforcement remain independent controls. Joined count is not online presence. Duplicate queue entries still require a future queue-item identity design.

Before production: verify a backup and migration review where needed, `YOUTUBE_API_KEY` API restrictions/quota and videos.list availability, App Check/auth domains, independent staging acceptance, and user approval. Existing tabs need a refresh. No production Firebase/rules change or main merge is authorized.

## Design references

- [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference): distinct load/cue/seek/state/autoplay/error semantics; provider events are observations, not room authority.
- [Apple coordinated playback](https://developer.apple.com/documentation/avfoundation/supporting-coordinated-media-playback): local suspension and rejoining a coordinated timeline inform the separation of local buffering from shared intent. Melody Island uses a radio policy and does not pause all peers for one listener.

These are protocol design references, not a claim of implementing SharePlay, Spotify Jam internals, or equivalent acoustic guarantees.
