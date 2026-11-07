export interface Permissions {
  guestsCanControlPlayback: boolean;
  guestsCanEditQueue: boolean;
  guestsCanSkip: boolean;
}
export interface SongInput {
  videoId: string;
  title: string;
  thumbnail?: string;
  /** Server-admitted metadata; parseCommand never accepts it from a browser. */
  durationMs?: number;
}
export interface Song extends SongInput {
  thumbnail: string;
  addedByUid?: string;
}
export interface Member {
  uid: string;
  role: 'owner' | 'guest';
  displayName: string;
  joinedAt: number;
}
export interface Playback {
  currentVideo: string;
  positionMs: number;
  isPlaying: boolean;
  playbackUpdatedAt: number;
  playbackRevision?: number;
  trackEpoch?: number;
}
export interface Room extends Playback {
  id: string;
  name: string;
  ownerUid: string;
  schemaVersion: 2;
  memberCount: number;
  memberUids: string[];
  members: Record<string, Member>;
  playlist: Song[];
  permissions: Permissions;
  shuffle: boolean;
  shuffleSeed?: number;
  version: number;
  updatedAt: number;
  lastChangedBy?: string;
  leaderUid?: string;
  leaderClientId?: string;
  leaseExpiresAt?: number;
  leaseTerm?: number;
}
interface CommandMetadata {
  commandId?: string;
  expectedVersion?: number;
  expectedPlaybackRevision?: number;
}
export type RoomCommand = CommandMetadata &
  (
    | { type: 'add'; song: SongInput }
    | { type: 'remove' | 'select'; videoId: string }
    | { type: 'play' | 'pause' | 'next' | 'prev' }
    | { type: 'ended'; clientId: string; videoId: string; trackEpoch?: number; leaseTerm?: number }
    | { type: 'advance'; videoId: string; trackEpoch?: number }
    | { type: 'lease'; clientId: string }
    | { type: 'mode'; shuffle: boolean }
    | { type: 'permissions'; permission: keyof Permissions; enabled: boolean }
    | { type: 'permissions'; permissions: Permissions }
  );
export type MemberCommand = { type: 'leave' } | { type: 'kick' | 'transfer'; targetUid: string };
export interface Identity {
  uid: string;
}
export interface CreateRoomInput {
  islandName: string;
  islandPassword: string;
}
export interface JoinRoomInput {
  islandPassword: string;
}
export interface JoinFormInput extends JoinRoomInput {
  islandId: string;
}
export interface RoomResponse {
  id: string;
}
export interface CommandResponse {
  version: number;
}
export interface SearchResponse {
  items: Song[];
}
export interface ClockResponse {
  now: number;
}
export interface PlayerHandle {
  sync(): void;
  toggleMute(): void;
  enableAudio(): void;
}
export interface PlayerTarget {
  loadVideoById(id: string, seconds: number): void;
  cueVideoById(id: string, seconds: number): void;
  stopVideo(): void;
  getCurrentTime(): number;
  getPlayerState?(): number;
  getVideoUrl?(): string;
  getDuration?(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  addEventListener?(event: string, listener: () => void): void;
}
export interface ApiFailure {
  error: string;
}
export type RouteContext = { params: Promise<{ islandId: string }> };
