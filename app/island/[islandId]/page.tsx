'use client';
import { estimateClockOffset, type ClockSample } from '@/lib/clock';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Copy,
  Check,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Trash2,
  Search,
  Plus,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { db } from '@/app/config/firebase';
import type { FormEvent } from 'react';
import type {
  ClockResponse,
  CommandResponse,
  MemberCommand,
  Permissions,
  PlayerHandle,
  Room,
  RoomCommand,
  SearchResponse,
  Song,
} from '@/lib/types';
import { parseRoom } from '@/lib/validation';
import { errorMessage } from '@/lib/errors';
import { api, ensureUser } from '@/lib/api';
import { DEFAULT_PERMISSIONS } from '@/lib/session';
import CustomDialog from '@/components/CustomDialog';
import SyncedPlayer from '@/components/SyncedPlayer';

export default function IslandPage() {
  const { islandId } = useParams<{ islandId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Room | null>(null);
  const [uid, setUid] = useState('');
  const members = Object.values(session?.members || {});
  const [gate, setGate] = useState('loading');
  const [connection, setConnection] = useState('connecting');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [listening, setListening] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const clientId = useRef('');
  const player = useRef<PlayerHandle | null>(null);
  const dataRef = useRef<Room | null>(null);
  dataRef.current = session;
  const request = useRef<AbortController | null>(null);
  const searchSequence = useRef(0);
  const pending = useRef(false);
  const endedPending = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const owner = Boolean(uid) && session?.ownerUid === uid;
  const permissions = { ...DEFAULT_PERMISSIONS, ...session?.permissions };
  const canEdit = owner || permissions.guestsCanEditQueue;
  const canControl = owner || permissions.guestsCanControlPlayback;
  const canSkip = owner || permissions.guestsCanSkip;
  useEffect(() => {
    let cancelled = false;
    let offRoom = () => {};
    clientId.current ||= crypto.randomUUID();
    if (!/^[A-Za-z0-9_-]{10}$/.test(islandId || '')) {
      setGate('missing');
      return;
    }
    setGate('loading');
    setSession(null);
    setPlayerReady(false);
    ensureUser()
      .then((user) => {
        if (cancelled) return;
        setUid(user.uid);
        offRoom = onSnapshot(
          doc(db, 'islands', islandId),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (!snapshot.exists()) {
              setGate('missing');
              return;
            }
            if (snapshot.data().schemaVersion !== 2) {
              setGate('legacy');
              return;
            }
            try {
              setSession(parseRoom(snapshot.data()));
            } catch {
              setGate('error');
              return;
            }
            setGate('ready');
            setConnection(
              !navigator.onLine ? 'offline' : snapshot.metadata.fromCache ? 'cached' : 'synced',
            );
          },
          (error) => {
            setGate(error.code === 'permission-denied' ? 'join' : 'error');
          },
        );
      })
      .catch(() => {
        if (!cancelled) setGate('error');
      });
    return () => {
      cancelled = true;
      offRoom();
    };
  }, [islandId, retry]);
  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(copyTimer.current);
    },
    [],
  );
  const command = useCallback(
    async (intent: RoomCommand, quiet = false) => {
      if (!quiet && pending.current) return;
      if (!navigator.onLine) {
        if (!quiet) setMessage('目前離線，重新連線後再操作。');
        return;
      }
      if (!quiet) {
        pending.current = true;
        setBusy(true);
        setMessage('');
      }
      try {
        return await api<CommandResponse>(`/api/islands/${islandId}/commands`, {
          commandId: crypto.randomUUID(),
          expectedVersion: dataRef.current?.version,
          ...intent,
        });
      } catch (error) {
        if (!quiet)
          setMessage(
            error instanceof Error && error.name === 'TimeoutError'
              ? '連線逾時，請確認目前狀態後再試。'
              : errorMessage(error),
          );
      } finally {
        if (!quiet) {
          pending.current = false;
          setBusy(false);
        }
      }
    },
    [islandId],
  );
  useEffect(() => {
    if (gate !== 'ready') return;
    let cancelled = false;
    let calibrating = false;
    const calibrate = async () => {
      if (calibrating) return;
      calibrating = true;
      const samples: ClockSample[] = [];
      try {
        for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
          const sentAt = Date.now();
          try {
            const result = await api<ClockResponse>('/api/time');
            samples.push({ sentAt, receivedAt: Date.now(), serverNow: result.now });
          } catch { /* Retain successful samples if another request times out. */ }
        }
        const estimate = estimateClockOffset(samples);
        if (!cancelled && estimate !== undefined) setOffset(estimate);
      } finally {
        calibrating = false;
      }
    };
    calibrate();
    const heartbeat = () => {
      const latest = dataRef.current;
      if (latest && latest.ownerUid !== uid && !latest.permissions?.guestsCanSkip) return;
      if (
        latest?.leaderClientId !== clientId.current &&
        (latest?.leaseExpiresAt ?? 0) > Date.now() + offsetRef.current
      )
        return;
      if (!document.hidden && navigator.onLine)
        command({ type: 'lease', clientId: clientId.current }, true);
    };
    heartbeat();
    const leaseTimer = setInterval(heartbeat, 10000);
    const clockTimer = setInterval(calibrate, 60000);
    const online = () => {
      setConnection('cached');
      calibrate();
      heartbeat();
    };
    const offline = () => setConnection('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      cancelled = true;
      clearInterval(leaseTimer);
      clearInterval(clockTimer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [gate, command, uid]);
  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const sequence = ++searchSequence.current;
    setSearching(true);
    setMessage('');
    try {
      const data = await api<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query.trim())}&islandId=${encodeURIComponent(islandId)}`,
        undefined,
        {
          signal: controller.signal,
        },
      );
      if (sequence === searchSequence.current) setResults(data.items);
    } catch (error) {
      if (
        !(error instanceof Error && error.name === 'AbortError') &&
        sequence === searchSequence.current
      )
        setMessage(errorMessage(error));
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  };
  const manageMember = async (action: MemberCommand) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await api<{ ok: boolean }>(`/api/islands/${islandId}/members`, action);
      if (action.type === 'leave') router.push('/');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/island/${islandId}`);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage('複製失敗，請從網址列複製邀請連結。');
    }
  };
  if (gate !== 'ready' || !session)
    return (
      <main className="room-gate" id="main-content">
        <h1>
          {gate === 'loading'
            ? '正在靠近島嶼…'
            : gate === 'join'
              ? '朋友在島上等你'
              : gate === 'legacy'
                ? '這座島嶼需要更新'
                : gate === 'missing'
                  ? '找不到這座島嶼'
                  : '暫時無法連上島嶼'}
        </h1>
        <p>
          {gate === 'join'
            ? '輸入島嶼密碼，加入這段旋律。'
            : gate === 'legacy'
              ? '為了保護房間與成員，舊版島嶼需要完成安全遷移。請聯絡島主。'
              : gate === 'loading'
                ? '正在確認你的連線與加入資格。'
                : '請確認邀請連結，或稍後重新嘗試。'}
        </p>
        {gate === 'join' && (
          <CustomDialog
            title="一起登島"
            description={`島嶼 ID：${islandId}`}
            inputs={[{ label: 'islandPassword', placeholder: '島嶼密碼', type: 'password' }]}
            onConfirm={async (values) => {
              await api(`/api/islands/${islandId}/join`, values);
              setRetry((value) => value + 1);
            }}
            triggerLabel="輸入密碼加入"
            confirmLabel="加入島嶼"
          />
        )}
        {gate === 'error' && (
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            重新連線
            <RefreshCw size={16} />
          </Button>
        )}
        {gate !== 'loading' && (
          <Link href="/" className="action-button">
            回到首頁
            <ArrowUpRight size={16} />
          </Link>
        )}
      </main>
    );
  const current = session.playlist.find((song) => song.videoId === session.currentVideo);
  const status =
    connection === 'synced' ? '已連線' : connection === 'offline' ? '離線' : '正在重新連線';
  return (
    <main className="room-page" id="main-content">
      <div className="room-heading">
        <div>
          <h1>{session.name}</h1>
          <p>
            <span className="status-dot" />
            {status} · {members.length} 位成員 · {owner ? '你是島主' : '一起共聽'}
          </p>
        </div>
        <Button variant="ghost" className="room-invite" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? '邀請連結已複製' : '邀請朋友登島'}
        </Button>
      </div>
      {busy && (
        <p role="status" className="quiet-notice">
          正在更新島嶼…
        </p>
      )}
      {message && (
        <p role="alert" className="room-message">
          {message}
        </p>
      )}
      <div className="room-grid">
        <div>
          <SyncedPlayer
            key={playerAttempt}
            ref={player}
            session={session}
            clockOffset={offset}
            onReady={() => setPlayerReady(true)}
            onError={setMessage}
            onBlocked={() => setBlocked(true)}
            onPlaying={() => {
              setBlocked(false);
              setListening(true);
            }}
            onEnded={(data) => {
              if (data.leaderClientId === clientId.current && !endedPending.current) {
                endedPending.current = true;
                void command(
                  {
                    type: 'ended',
                    videoId: data.currentVideo,
                    expectedVersion: data.version,
                    clientId: clientId.current,
                  },
                  true,
                ).finally(() => {
                  endedPending.current = false;
                });
              }
            }}
          />
          <h2 className="now-playing-title">
            {current?.title || (session.playlist.length ? '歌單準備好了。' : '讓第一首歌登島。')}
          </h2>
          <p className="quiet-notice">
            {current
              ? 'YouTube 共聽 · 各裝置的音量可獨立調整'
              : session.playlist.length
                ? '按下播放，一起開始聽。'
                : '搜尋喜歡的歌，加入大家的播放佇列。'}
          </p>
          {session.isPlaying && (blocked || !listening) && (
            <div className="listening-prompt">
              <p>在這台裝置開啟聲音，接上島上目前的旋律。</p>
              <Button
                variant="ghost"
                className="action-button"
                disabled={!playerReady}
                onClick={() => {
                  player.current?.enableAudio();
                }}
              >
                開始聆聽
                <Volume2 size={16} />
              </Button>
            </div>
          )}
          {!playerReady && (
            <Button
              variant="ghost"
              className="resync"
              onClick={() => setPlayerAttempt((value) => value + 1)}
            >
              重試播放器
            </Button>
          )}
          <Button variant="ghost" className="resync" onClick={() => player.current?.sync()}>
            重新同步播放
          </Button>
        </div>
        <div>
          <section className="room-section">
            <h2>
              接下來聽什麼<span className="queue-count">{session.playlist.length} / 100 首</span>
            </h2>
            {!session.playlist.length ? (
              <p className="room-empty">
                島上還很安靜。
                <br />
                搜尋一首喜歡的歌，邀請大家一起聽。
              </p>
            ) : (
              <ol className="queue-list">
                {session.playlist.map((song) => (
                  <li
                    key={song.videoId}
                    className={`queue-row ${song.videoId === session.currentVideo ? 'current' : ''}`}
                  >
                    <Image
                      className="queue-art"
                      src={song.thumbnail}
                      alt=""
                      width={60}
                      height={40}
                    />
                    <Button
                      variant="ghost"
                      className="queue-song"
                      disabled={!canControl || busy}
                      onClick={() => command({ type: 'select', videoId: song.videoId })}
                    >
                      {song.title}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="icon-button"
                      aria-label={`移除 ${song.title}`}
                      disabled={!canEdit || busy}
                      onClick={() => command({ type: 'remove', videoId: song.videoId })}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="room-section">
            <h2>找一段旋律</h2>
            <form onSubmit={search} className="room-search">
              <Input
                aria-label="搜尋歌曲或歌手"
                placeholder="搜尋歌曲或歌手"
                maxLength={100}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  request.current?.abort();
                  searchSequence.current++;
                  setSearching(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="icon-button"
                type="submit"
                aria-label="搜尋"
                disabled={searching}
              >
                <Search size={18} />
              </Button>
            </form>
            {searching && (
              <p role="status" className="quiet-notice">
                正在尋找音樂…
              </p>
            )}
            <ul className="queue-list">
              {results.map((song) => (
                <li className="queue-row" key={song.videoId}>
                  <Image className="queue-art" src={song.thumbnail} width={60} height={40} alt="" />
                  <span className="queue-song">{song.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="icon-button"
                    aria-label={`加入 ${song.title}`}
                    disabled={
                      !canEdit ||
                      busy ||
                      session.playlist.some((item) => item.videoId === song.videoId)
                    }
                    onClick={() => command({ type: 'add', song })}
                  >
                    <Plus size={18} />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <details className="room-management">
            <summary>島嶼成員與權限</summary>{' '}
            <section className="room-section">
              <h2>島上的聽友</h2>
              <div className="members-line">
                {members.map((member) => (
                  <span key={member.uid}>
                    {member.displayName}
                    {member.uid === session.ownerUid ? ' · 島主' : ''}
                    {member.uid === uid ? '（你）' : ''}
                    {owner && member.uid !== uid && (
                      <span className="member-actions">
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => manageMember({ type: 'transfer', targetUid: member.uid })}
                        >
                          交接島主
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => manageMember({ type: 'kick', targetUid: member.uid })}
                        >
                          移出
                        </Button>
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <p className="quiet-notice">顯示已加入的成員；不代表即時在線狀態。</p>
              {owner && (
                <fieldset className="permission-options">
                  <legend>訪客權限</legend>
                  {Object.entries({
                    guestsCanControlPlayback: '控制播放與暫停',
                    guestsCanEditQueue: '新增與移除歌曲',
                    guestsCanSkip: '切換上一首／下一首',
                  }).map(([key, label]) => (
                    <label key={key}>
                      <Checkbox
                        checked={permissions[key as keyof Permissions]}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          command({
                            type: 'permissions',
                            permissions: {
                              ...permissions,
                              [key as keyof Permissions]: checked === true,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              )}
              {!owner && (
                <Button
                  variant="ghost"
                  className="resync"
                  disabled={busy}
                  onClick={() => manageMember({ type: 'leave' })}
                >
                  離開這座島嶼
                </Button>
              )}
            </section>
          </details>
        </div>
      </div>
      <div className="transport" aria-label="播放控制">
        <span className="transport-title">{current?.title || '等待音樂登島'}</span>
        <div className="transport-buttons">
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label="隨機播放"
            aria-pressed={session.shuffle}
            disabled={!canControl || busy}
            onClick={() => command({ type: 'mode', shuffle: !session.shuffle })}
          >
            <Shuffle size={17} color={session.shuffle ? 'var(--accent)' : 'currentColor'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label="上一首"
            disabled={!canSkip || busy || !session.playlist.length}
            onClick={() => command({ type: 'prev' })}
          >
            <SkipBack size={19} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button transport-play"
            aria-label={session.isPlaying ? '暫停' : '播放'}
            disabled={!canControl || busy || !playerReady || !session.playlist.length}
            onClick={() => command({ type: session.isPlaying ? 'pause' : 'play' })}
          >
            {session.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label="下一首"
            disabled={!canSkip || busy || !session.playlist.length}
            onClick={() => command({ type: 'next' })}
          >
            <SkipForward size={19} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label={muted ? '取消靜音' : '靜音'}
            aria-pressed={muted}
            onClick={() => {
              player.current?.toggleMute();
              setMuted((value) => !value);
            }}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </Button>
        </div>
        <span className="transport-status">
          {status} · {session.isPlaying ? '正在共聽' : '已暫停'}
        </span>
      </div>
    </main>
  );
}
