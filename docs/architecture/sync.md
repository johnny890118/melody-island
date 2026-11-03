# Session protocol v2

## Authority and storage

`islands/{id}` contains room metadata, a bounded queue (100 unique video IDs), permissions and playback. With 20 members this keeps deletion/current-track updates atomic and avoids premature queue-ordering complexity. `memberUids` and the bounded `members` map in the same room document establish membership; email is never the identity. `islandSecrets/{id}` is server-only and stores a salted scrypt hash. No client may write canonical state. The Admin endpoints verify an ID token, origin, membership, capabilities and schemas independently of Rules.

`version` increments for playback, permissions and queue changes. Play/pause/select/skip/ended/mode require the version observed by the caller. This conservatively rejects conflicting intent, including an intervening queue edit; the UI invites retry. Add/remove operate by stable video ID and read the latest queue in a transaction. Duplicate queue entries are not supported in v2; introduce a queueItemId before allowing repeats.

Non-lease commands use a random command ID. In the same transaction as the state change, a receipt records UID/version. Retries from the same actor return the receipt; other actors cannot claim it. Receipts currently remain stored; introduce a reviewed retention policy before high-volume operation. Deleting receipts changes replay semantics and must not be treated as housekeeping.

## Timeline and player

Playback is anchored by backend `playbackUpdatedAt` (milliseconds) and `positionMs`. Clients estimate backend clock offset from an authenticated round trip every minute. Network asymmetry and server differences remain a source of error. A player adapter exclusively owns load/cue/seek/play/pause. Paused new tracks use cue; clearing a queue stops the old video. State updates and periodic foreground checks correct drift above two seconds. Hidden tabs skip periodic work and resync on return.

YouTube may block audio until a user gesture and can show ads or refuse a video. The UI provides error, activation and resync actions. Emulator tests verify state behavior, not sample-accurate or real-world audio synchronization.

## Leadership

Each page has a random client ID. Members request a 25-second lease every 10 seconds while visible. A different page cannot replace an unexpired lease. The server validates leader UID as well as client ID for ended events: a readable client ID is not a credential. Ended also carries the current video and version; stale or duplicate events cannot skip two songs. Lease changes do not increment playback version.

On a suspended/offline leader another foreground member takes over after expiration. This is not an audio server: progression still depends on a foreground player's YouTube ended event. An entire room in background or all clients offline has no guaranteed automatic progression. A server scheduler would be needed to guarantee progression without any active player; that is outside this client-driven v2 design.

## Membership and permissions

Join verifies a password on the server, then atomically enforces 20 joined members. Joined is not the same as online; the UI states that explicitly. Non-owners can leave, freeing a slot. The owner can remove a guest or transfer ownership to an existing member; the owner must transfer before leaving. Removing a lease holder expires their lease. Live presence is not implemented or fabricated.

## Deployment and migration

Do not run a migration implicitly at request time. Export a backup, inventory schema-v1 rooms and map `createdBy` emails to verified Auth UIDs using a trusted Admin identity. Do not accept a UID supplied by an untrusted browser. For each room, migrate in a transaction: ownerUid, schemaVersion 2, sanitized bounded queue and canonical timeline; hash the existing password into `islandSecrets`, delete plaintext from the room, and create the owner roster entry. Missing owners, malformed passwords or oversized queues need manual resolution. Restore/recovery must be exercised before removing old data. No production migration was run by this change.

App and deny-client-write rules must be rolled out together. Prefer ADC/workload identity; no production credentials are supplied in this repository. Per-UID limits are distributed through Firestore. Join also has a room budget; search requires membership and has a shared 24-hour call cap. The App Check client/server integration must be configured and enabled in staging/production, alongside deployment-specific edge controls. None of these replaces authorization. Public Firebase config is expected to be public, not a secret; Admin credentials and room secrets are not.

When guest skip permission is disabled, only the owner may hold/renew an automatic-advance lease. Changing that permission expires an existing guest lease. This prevents a guest from bypassing a skip restriction by claiming leadership and fabricating an ended event. The tradeoff is intentional: an owner-only room cannot automatically transfer advance authority to guests while the owner is away.

Lease requests already held by another page return before a write transaction; the client also avoids requesting a healthy foreign lease. Multi-document transaction reads use `getAll` so the room and receipt are acquired together; membership is verified from that same room snapshot. This reduces lock-order contention compared with launching parallel reads in a single transaction.


## Contention findings from the 20-client test

Repeated emulator runs exposed transaction lock-upgrade timeouts when heartbeat writes overlapped playback and distributed rate-limit counters. The final implementation does not hold transactions for leases or counters. Each reads a snapshot, then updates with its `lastUpdateTime` precondition; competing leases harmlessly lose the compare-and-set, and counter conflicts retry with small randomized backoff. Room commands still use a transaction for the room+receipt atomicity.

The bounded room roster also removes cross-document membership lookups from client snapshot authorization. Rules evaluate the requesting UID against the returned room's roster. This keeps membership revocation atomic with room changes and avoids a second listener per participant. Only the server can modify the roster; members cannot add themselves. This layout is intentionally limited to small private rooms, not a design for thousands of members.
