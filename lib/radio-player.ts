import type { Playback, Room } from './types';
import { expectedSeconds } from './session';

export type RadioAuthority = Playback & Partial<Room> & { durationMs?: number };
export interface MediaObservation {
  state: number;
  seconds: number;
  duration: number;
  videoId: string;
}
export type RadioTrigger = 'snapshot' | 'tick' | 'state' | 'activate' | 'reconnect' | 'resync';
export type RadioPhase = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'blocked' | 'interrupted' | 'ended';
export type RadioAction =
  | { type: 'load' | 'cue'; videoId: string; seconds: number; reason: string }
  | { type: 'seek'; seconds: number; reason: string }
  | { type: 'play' | 'pause' | 'stop' | 'blocked'; reason: string }
  | { type: 'complete'; authority: RadioAuthority; key: string; reason: string };
export interface RadioTrace { at: number; revision: number; epoch: number; phase: RadioPhase; reason: string; action?: RadioAction['type']; seconds?: number }
interface PendingSeek { at: number; target: number; playing: boolean }
interface Progress { at: number; seconds: number; duration: number }

/** Single-writer local adapter policy. It emits effects; it never writes a room or infers authority from media. */
export class RadioPlayer {
  phase: RadioPhase = 'idle';
  private accepted: RadioAuthority | undefined;
  private identity = '';
  private revision = -1;
  private loaded = '';
  private epoch = -1;
  private blocked = false;
  private progress: Progress[] = [];
  private pending: PendingSeek | undefined;
  private requestedPlaying: boolean | undefined;
  private resumeNeeded = false;
  private pendingPlay: { at: number; seconds: number } | undefined;
  private pausePending = false;
  private alignmentNeeded = false;
  private restartNeeded = false;
  private correctionUsed = false;
  private lastReason = '';
  private completion: { key: string; pending: boolean; accepted: boolean; retryAt: number; attempts: number } | undefined;
  private readonly trace: RadioTrace[] = [];
  private readonly counts: Partial<Record<RadioAction['type'], number>> = {};

  diagnostics() { return { phase: this.phase, counts: { ...this.counts }, trace: this.trace.slice() }; }
  block(now: number) { this.blocked = true; this.pendingPlay = undefined; this.phase = 'blocked'; this.note(now, 'autoplay-blocked'); }
  providerError(code: number, now: number) { this.phase = 'interrupted'; this.note(now, `youtube-provider-error-${code}`); }
  completionResult(key: string, accepted: boolean, now: number) {
    if (this.completion?.key !== key) return;
    this.completion.pending = false;
    this.completion.accepted = accepted;
    this.completion.retryAt = now + Math.min(30000, 1000 * 2 ** Math.min(this.completion.attempts++, 5));
    this.note(now, accepted ? 'completion-command-acknowledged' : 'completion-command-retry-pending');
  }
  private note(now: number, reason: string, action?: RadioAction) {
    if (!action && reason === this.lastReason) return;
    this.lastReason = reason;
    if (action) this.counts[action.type] = (this.counts[action.type] ?? 0) + 1;
    this.trace.push({ at: now, revision: this.revision, epoch: this.epoch, phase: this.phase,
      reason, ...(action ? { action: action.type } : {}), ...(action && 'seconds' in action ? { seconds: action.seconds } : {}) });
    if (this.trace.length > 256) this.trace.shift();
  }
  decide(incoming: RadioAuthority, media: MediaObservation, serverNow: number, mono: number,
    uncertaintyMs: number, trigger: RadioTrigger, canRelay = true, attached = true): RadioAction[] {
    const actions: RadioAction[] = [];
    const emit = (action: RadioAction) => { actions.push(action); this.note(mono, action.reason, action); };
    const revision = incoming.playbackRevision ?? incoming.version ?? 0;
    const identity = `${incoming.currentVideo}:${incoming.positionMs}:${incoming.playbackUpdatedAt}:${incoming.isPlaying}:${incoming.trackEpoch ?? 0}`;
    if (revision < this.revision) { this.note(mono, 'stale-snapshot-ignored'); return actions; }
    if (revision === this.revision && identity !== this.identity) {
      this.note(mono, 'conflicting-same-revision-snapshot-ignored'); return actions;
    }
    const changed = revision > this.revision || !this.accepted;
    if (incoming.isPlaying && this.accepted?.isPlaying === false) this.resumeNeeded = true;
    if (changed) { this.pending = undefined; this.correctionUsed = false; this.pausePending = false; }
    this.accepted = incoming;
    this.identity = identity;
    this.revision = revision;
    if (trigger === 'reconnect') {
      this.progress = []; this.pending = undefined;
      this.alignmentNeeded = true; this.correctionUsed = false;
    }
    if (!Number.isFinite(serverNow) || !Number.isFinite(uncertaintyMs)) {
      this.note(mono, 'awaiting-server-clock'); return actions;
    }
    const duration = incoming.durationMs ?? incoming.playlist?.find(song => song.videoId === incoming.currentVideo)?.durationMs;
    const expected = Math.max(0, Math.min(expectedSeconds(incoming, serverNow), duration ? duration / 1000 : Infinity));
    const epoch = incoming.trackEpoch ?? 0;
    if (!incoming.currentVideo) {
      if (this.loaded) emit({ type: 'stop', reason: 'authoritative-track-cleared' });
      this.loaded = ''; this.epoch = epoch; this.phase = 'idle'; this.progress = []; this.pending = undefined;
      return actions;
    }
    // Any connected member can relay a server-verified deadline. Neither its media
    // events nor a lease holder can decide or stall the authoritative room timeline.
    if (duration && expectedSeconds(incoming, serverNow - uncertaintyMs) * 1000 >= duration && incoming.isPlaying) {
      this.phase = 'ended';
      if (!canRelay) { this.note(mono, 'expired-timeline-awaits-advance-authority'); return actions; }
      const key = `${epoch}:${revision}`;
      if (this.completion?.key !== key) this.completion = { key, pending: false, accepted: false, retryAt: 0, attempts: 0 };
      if (!this.completion.pending && !this.completion.accepted && mono >= this.completion.retryAt) {
        this.completion.pending = true;
        emit({ type: 'complete', authority: incoming, key, reason: 'authoritative-content-deadline' });
      }
      return actions;
    }
    if (!attached) { this.note(mono, 'awaiting-player-attachment'); return actions; }
    if (this.loaded !== incoming.currentVideo) {
      this.loaded = incoming.currentVideo; this.epoch = epoch; this.progress = []; this.pending = undefined;
      this.resumeNeeded = false;
      this.pendingPlay = incoming.isPlaying && !this.blocked ? { at: mono, seconds: expected } : undefined;
      this.completion = undefined;
      this.restartNeeded = false;
      this.alignmentNeeded = true; this.correctionUsed = false; this.requestedPlaying = incoming.isPlaying;
      this.phase = this.blocked ? 'blocked' : 'loading';
      emit({ type: incoming.isPlaying && !this.blocked ? 'load' : 'cue', videoId: this.loaded, seconds: expected, reason: 'authoritative-resource-change' });
      return actions;
    }
    if (epoch !== this.epoch) {
      this.epoch = epoch; this.progress = []; this.pending = undefined; this.completion = undefined;
      this.pendingPlay = undefined;
      this.correctionUsed = false; this.alignmentNeeded = true; this.requestedPlaying = undefined;
      this.restartNeeded = true;
      this.note(mono, 'new-playback-instance-same-resource');
    }
    if (![media.seconds, media.duration, media.state].every(Number.isFinite) || media.seconds < 0 || media.duration < 0) {
      this.phase = 'interrupted'; this.note(mono, 'invalid-media-observation'); return actions;
    }
    const resourceMatches = media.videoId === incoming.currentVideo;
    const contentMatches = resourceMatches && !!duration && media.duration > 0 && Math.abs(media.duration * 1000 - duration) <= 1500;
    if (trigger === 'activate') this.blocked = false;
    if (!incoming.isPlaying) {
      this.pendingPlay = undefined; this.resumeNeeded = false;
      this.phase = 'paused'; this.progress = [];
      if (media.state === 1 || media.state === 3) {
        if (!this.pausePending) { emit({ type: 'pause', reason: 'authoritative-pause' }); this.pausePending = true; }
      }
      if (media.state === 2 || media.state === 5) this.pausePending = false;
      this.requestedPlaying = false;
      if (contentMatches && !this.pending && (changed || trigger === 'resync') && Math.abs(media.seconds - expected) > 0.35) {
        this.pending = { at: mono, target: expected, playing: false };
        emit({ type: 'seek', seconds: expected, reason: 'authoritative-paused-position' });
      }
      this.restartNeeded = false;
      // A paused seek acknowledgement must not remain latched until the next play.
      if (this.pending && Math.abs(media.seconds - this.pending.target) <= 0.5) this.pending = undefined;
      return actions;
    }
    if (this.blocked && trigger !== 'activate') { this.phase = 'blocked'; this.note(mono, 'awaiting-local-listening-gesture'); return actions; }
    const seek = (reason: string) => {
      if (this.pending) return;
      this.pending = { at: mono, target: expected, playing: true };
      this.progress = []; this.alignmentNeeded = false;
      emit({ type: 'seek', seconds: expected, reason });
    };
    const play = (reason: string) => {
      emit({ type: 'play', reason });
      this.pendingPlay = { at: mono, seconds: this.pending?.target ?? media.seconds };
      this.requestedPlaying = true; this.phase = 'loading';
    };
    // Cached iframe state may still say PLAYING while its earlier pause command
    // is in flight. A new authoritative resume must deliver its own play intent.
    if (this.resumeNeeded && !this.restartNeeded && (contentMatches || (resourceMatches && media.duration === 0))) {
      this.resumeNeeded = false;
      if (contentMatches && media.state !== 3 && Math.abs(media.seconds - expected) > 0.6)
        seek('authoritative-resume-position');
      play('authoritative-resume');
      return actions;
    }
    // The public iframe API cannot identify ads. Unknown/mismatched media is quarantined,
    // never treated as content progress or completion; canonical room time keeps running.
    if (media.state === 3) {
      if (this.pendingPlay) this.pendingPlay.at = mono;
      this.phase = 'buffering'; this.progress = []; this.alignmentNeeded = true;
      this.note(mono, 'buffering-no-media-command'); return actions;
    }
    if (media.duration > 0 && !contentMatches) {
      if (this.pendingPlay) this.pendingPlay.at = mono;
      this.phase = 'interrupted'; this.progress = []; this.alignmentNeeded = true;
      this.note(mono, 'resource-or-duration-mismatch'); return actions;
    }
    if (this.restartNeeded && contentMatches) {
      this.restartNeeded = false; this.resumeNeeded = false;
      seek('explicit-authoritative-playback-instance');
      if (media.state !== 1) play('explicit-authoritative-restart');
      this.requestedPlaying = true;
      return actions;
    }
    if (trigger === 'activate') {
      if (contentMatches && Math.abs(media.seconds - expected) > 0.35) seek('local-gesture-joins-live-timeline');
      this.resumeNeeded = false;
      play('explicit-local-listening-gesture');
      this.requestedPlaying = true;
      return actions;
    }
    if (media.state === 0) {
      this.pendingPlay = undefined;
      this.phase = 'ended';
      this.note(mono, 'local-ended-awaits-authoritative-deadline');
      return actions;
    }
    if (this.pendingPlay) {
      if (media.state === 1 && contentMatches && media.seconds > this.pendingPlay.seconds + 0.05) {
        this.pendingPlay = undefined;
        this.note(mono, 'play-request-acknowledged-by-content-progress');
      } else if (mono - this.pendingPlay.at > 8000) {
        this.pendingPlay = undefined; this.blocked = true; this.phase = 'blocked';
        emit({ type: 'blocked', reason: 'play-request-unacknowledged-needs-gesture' });
        return actions;
      } else {
        this.phase = 'loading'; this.note(mono, 'awaiting-play-acknowledgement'); return actions;
      }
    }
    if (this.pending) {
      const target = this.pending.target + (this.pending.playing ? (mono - this.pending.at) / 1000 : 0);
      if (media.state === 1 && Math.abs(media.seconds - target) <= 0.65) {
        this.pending = undefined; this.progress = [];
        this.note(mono, 'seek-acknowledged');
      } else if (mono - this.pending.at > 8000) {
        this.pending = undefined; this.correctionUsed = true; this.alignmentNeeded = false;
        this.note(mono, 'seek-unacknowledged-preserve-continuity');
      } else { this.note(mono, 'awaiting-seek-acknowledgement'); return actions; }
    }
    if (media.state === 1 && contentMatches) {
      this.phase = 'playing'; this.requestedPlaying = true;
      const previous = this.progress.at(-1);
      if (!previous || mono - previous.at >= 400) {
        if (previous) {
          const advance = media.seconds - previous.seconds;
          const elapsed = (mono - previous.at) / 1000;
          if (advance < -0.25 || Math.abs(advance - elapsed) > Math.max(0.75, elapsed * 0.3)) {
            this.progress = []; this.alignmentNeeded = true;
            this.note(mono, 'media-discontinuity-observed');
          }
        }
        this.progress.push({ at: mono, seconds: media.seconds, duration: media.duration });
        if (this.progress.length > 6) this.progress.shift();
      }
      const stable = this.progress.length >= 3 && mono - this.progress[0].at >= 1500;
      const drift = Math.abs(media.seconds - expected);
      if (stable && this.alignmentNeeded) {
        this.alignmentNeeded = false;
        if (drift > Math.max(0.6, uncertaintyMs / 1000 + 0.35)) seek('stable-content-joins-authoritative-timeline');
      } else if (stable && !this.correctionUsed && drift > Math.max(1.5, uncertaintyMs / 1000 + 1)) {
        this.correctionUsed = true;
        seek('persistent-healthy-content-drift');
      } else if (trigger === 'resync' && contentMatches) {
        this.correctionUsed = false;
        if (drift > Math.max(0.6, uncertaintyMs / 1000 + 0.35)) seek('explicit-local-resync');
      }
      if (drift < 0.6 && !this.pending) this.correctionUsed = false;
      this.note(mono, 'continuous-content-observed');
      return actions;
    }
    // One play request per authoritative transition, not every polling interval.
    if (changed || this.requestedPlaying !== true) {
      if (contentMatches && Math.abs(media.seconds - expected) > 0.6) seek('authoritative-resume-position');
      play('authoritative-resume');
    } else if (media.state === 2) {
      this.blocked = true; this.phase = 'blocked';
      emit({ type: 'blocked', reason: 'local-playback-paused-needs-gesture' });
    } else this.note(mono, 'awaiting-player-content');
    return actions;
  }
}
