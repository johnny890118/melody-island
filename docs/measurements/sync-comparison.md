# Playback synchronization comparison — 2026-11-05

Both runs used the real YouTube iframe on one Mac, with separate owner/guest browser contexts and room data exclusively in demo-melody-island emulators. The baseline player is from 6688178. The final run includes the buffered-playback controller and shortest-round-trip clock calibration in this change.

Each engine played and paused the official iframe fixture, then used the normal next-track command to load a second real video. Guest media requests were held for 10 seconds. After release, nine observations covered approximately eight seconds of playback. The runner observed incoming iframe API commands and actual HTML media clocks. The automatic-correction counts below exclude seeks before the transition checkpoint, including fixture setup. Unused near-end fixture metadata was omitted from the manual-switch baseline record.

| Measurement | Chromium before | Chromium after | WebKit before | WebKit after |
| --- | --- | --- | --- | --- |
| Guest seekTo commands, transition and recovery | 2 | 1 | 3 | 1 |
| Guest playVideo commands, transition and recovery | 3 | 0 | 4 | 0 |
| First observation with both players playing within 1.5 seconds, after media release | 388 ms | 376 ms | 4,122 ms | 124 ms |
| Final recovered media-clock difference | 423 ms | 241 ms | 55 ms | 11 ms |
| Normal-play media-clock difference, five observations | 178 ms | 11 ms | 134–189 ms | 208–209 ms |
| Shared room version increments during the next-track scenario | 1 | 1 | 1 | 1 |

The normal WebKit sample was slightly less precise in this pair of runs. Its buffered recovery improved substantially. This is one controlled comparison per engine, with network and decoder variation, rather than a population-level latency claim. A 1.5-second deadband prevents chasing brief small drift; startup uses a separate one-time 0.35-second alignment. A 10-second seek cooldown bounds repeated corrections.

The post-release samples show no further seek commands after the single catch-up in either final run. Shared version increments remained exactly one, from the explicit next-track command. Local correction and audio activation did not add shared playback writes.

The first API time sample can contain cold-start or client token preparation delay. Calibration now takes three samples and uses the shortest round trip before updating the offset. Unit coverage includes a cold-start-biased sample and an actual device-clock offset.

An additional real WebKit natural-end/held-media probe passed during controller iteration. The final comparison above uses explicit track switching to keep the before/after timing scenario consistent. Earlier incomplete near-end probes were not included as successful measurements.

The owner confirmed core physical iPhone Safari/Mac operations before this patch and reported intermittent seeking and gesture-required audio. These new measurements are same-host media clocks. They do not measure physical-device speaker output, acoustic drift, or the exact iPhone's behavior after this patch.

Data is in sync-buffer-before.json and sync-buffer-after.json. The opt-in runner is:
MELODY_SYNC_MANUAL_SWITCH=true MELODY_REAL_TIMELINE=true MELODY_REAL_TRANSITION=true MELODY_REAL_BUFFER=true npm run smoke:youtube
It requires the isolated real-player demo preview described in production-runbook.md, with the mock-player flag disabled.
