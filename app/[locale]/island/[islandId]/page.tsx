'use client';
import { useLocale } from '@/components/LocaleProvider';
import { localizedPath } from '@/lib/locales';
import './room-controls.css';
import { RoomClock } from '@/lib/clock';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Copy,
  ArrowLeft,
  Check,
  CircleAlert,
  Ellipsis,
  Info,
  Link2,
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
  Users,
  Settings2,
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
import { displayYouTubeTitle } from '@/lib/youtube-title';
import { errorMessage } from '@/lib/errors';
import { api, ensureUser } from '@/lib/api';
import { DEFAULT_PERMISSIONS } from '@/lib/session';
import CustomDialog from '@/components/CustomDialog';
import SyncedPlayer from '@/components/SyncedPlayer';

export default function IslandPage() {
  const { t, locale } = useLocale();
  const { islandId } = useParams<{ islandId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Room | null>(null);
  const [uid, setUid] = useState('');
  const members = Object.values(session?.members || {});
  const islandOwner = members.find((member) => member.uid === session?.ownerUid);
  const residents = members.filter((member) => member.uid !== session?.ownerUid);
  const [gate, setGate] = useState('loading');
  const [connection, setConnection] = useState('connecting');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyToast, setCopyToast] = useState<{ text: string; failed?: boolean } | null>(null);
  const [muted, setMuted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerAttempt, setPlayerAttempt] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [listening, setListening] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [roomPanel, setRoomPanel] = useState<'menu' | 'info' | 'members' | null>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ text: string; failed?: boolean }>({ text: '' });
  const [resettingPassword, setResettingPassword] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const [roomClock] = useState(() => new RoomClock());
  const [clockReady, setClockReady] = useState(false);
  const [legacyDuration, setLegacyDuration] = useState<{ videoId: string; trackEpoch: number; durationMs: number }>();
  const [retry, setRetry] = useState(0);
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
        if (!quiet) setMessage(t('目前離線，重新連線後再操作。'));
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
          expectedPlaybackRevision: dataRef.current?.playbackRevision ?? 0,
          ...intent,
        });
      } catch (error) {
        if (!quiet)
          setMessage(
            error instanceof Error && error.name === 'TimeoutError'
              ? t('連線逾時，請確認目前狀態後再試。')
              : errorMessage(error),
          );
      } finally {
        if (!quiet) {
          pending.current = false;
          setBusy(false);
        }
      }
    },
    [islandId, t],
  );
  useEffect(() => {
    if (gate !== 'ready') return;
    let cancelled = false;
    let calibrating = false;
    let calibration: AbortController | undefined;
    const calibrate = async (resume = false) => {
      if (calibrating && !resume) return;
      if (resume) {
        calibration?.abort();
        roomClock.invalidate();
        setClockReady(false);
      }
      const controller = new AbortController();
      calibration = controller;
      calibrating = true;
      const timeout = setTimeout(() => controller.abort(), 15000);
      const samples: { sentAt: number; receivedAt: number; serverNow: number }[] = [];
      try {
        for (let attempt = 0; attempt < 3 && !cancelled && !controller.signal.aborted; attempt++) {
          const sentAt = performance.now();
          try {
            const result = await api<ClockResponse>('/api/time', undefined, { signal: controller.signal });
            if (Number.isFinite(result.now)) samples.push({ sentAt, receivedAt: performance.now(), serverNow: result.now });
          } catch { /* Retain successful samples if another request times out. */ }
        }
        if (cancelled || calibration !== controller) return;
        const best = samples.sort((a, b) => a.receivedAt - a.sentAt - (b.receivedAt - b.sentAt))[0];
        if (!cancelled && best) {
          roomClock.calibrate(best.serverNow, best.sentAt, best.receivedAt);
          setClockReady(true);
        } else if (!cancelled && !Number.isFinite(roomClock.uncertaintyMs)) {
          setMessage(t('無法確認房間時間，請重新整理或檢查網路。'));
        }
      } finally {
        clearTimeout(timeout);
        if (calibration === controller) calibrating = false;
      }
    };
    calibrate();
    const clockTimer = setInterval(calibrate, 60000);
    const online = () => {
      setConnection('cached');
      calibrate(true);
    };
    const offline = () => setConnection('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    const visible = () => { if (!document.hidden) void calibrate(true); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      cancelled = true;
      calibration?.abort();
      clearInterval(clockTimer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [gate, roomClock, t]);
  const admittedDuration = session?.playlist.find(song => song.videoId === session.currentVideo)?.durationMs;
  useEffect(() => {
    if (gate !== 'ready' || !session?.currentVideo || admittedDuration) return;
    const videoId = session.currentVideo;
    const trackEpoch = session.trackEpoch ?? 0;
    const controller = new AbortController();
    void api<unknown>(`/api/islands/${islandId}/playback`, undefined, { signal: controller.signal }).then(result => {
      if (!result || typeof result !== 'object' || !('videoId' in result) || result.videoId !== videoId ||
        !('trackEpoch' in result) || result.trackEpoch !== trackEpoch || !('durationMs' in result) ||
        typeof result.durationMs !== 'number' || !Number.isFinite(result.durationMs) || result.durationMs <= 0)
        throw new Error(t('無法確認影片長度；請重試或選擇其他歌曲。'));
      if (!controller.signal.aborted) setLegacyDuration({ videoId, trackEpoch, durationMs: result.durationMs });
    }).catch(error => { if (!controller.signal.aborted) setMessage(errorMessage(error)); });
    return () => controller.abort();
  }, [gate, islandId, session?.currentVideo, session?.trackEpoch, admittedDuration, t]);
  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const sequence = ++searchSequence.current;
    setSearching(true);
    setSearchError('');
    setSearched(false);
    try {
      const data = await api<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query.trim())}&islandId=${encodeURIComponent(islandId)}`,
        undefined,
        {
          signal: controller.signal,
        },
      );
      if (sequence === searchSequence.current) {
        setResults(data.items);
        setSearched(true);
      }
    } catch (error) {
      if (
        !(error instanceof Error && error.name === 'AbortError') &&
        sequence === searchSequence.current
      )
        setSearchError(errorMessage(error));
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
      if (action.type === 'leave') router.push(localizedPath(locale, '/'));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (roomPanel) panelTitle.current?.focus();
  }, [roomPanel]);

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resettingPassword || !owner) return;
    const form = event.currentTarget;
    setResettingPassword(true);
    setPasswordStatus({ text: '' });
    try {
      await api<{ id: string }>(`/api/islands/${islandId}/password`, {
        islandPassword: new FormData(form).get('islandPassword'),
      });
      form.reset();
      setPasswordStatus({ text: t('密碼已更新。') });
    } catch (error) {
      setPasswordStatus({ text: errorMessage(error), failed: true });
    } finally {
      setResettingPassword(false);
    }
  };
  const copy = async (kind: 'id' | 'invite') => {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(kind === 'id' ? islandId : new URL(localizedPath(locale, `/island/${islandId}`), window.location.origin).href);
      setCopyToast({ text: kind === 'id' ? t('已複製島嶼 ID') : t('已複製邀請連結') });
    } catch {
      setCopyToast({ text: kind === 'id' ? t('複製失敗，請手動選取島嶼 ID。') : t('複製失敗，請從網址列複製邀請連結。'), failed: true });
      copyTimer.current = setTimeout(() => setCopyToast(null), 5000);
      return;
    }
    copyTimer.current = setTimeout(() => setCopyToast(null), 3000);
  };
  if (gate !== 'ready' || !session)
    return (
      <main className="room-gate" id="main-content">
        <h1>
          {gate === 'loading'
            ? t('正在靠近島嶼…')
            : gate === 'join'
              ? t('朋友在島上等你')
              : gate === 'legacy'
                ? t('這座島嶼需要更新')
                : gate === 'missing'
                  ? t('找不到這座島嶼')
                  : t('暫時無法連上島嶼')}
        </h1>
        <p>
          {gate === 'join'
            ? t('輸入島嶼密碼，加入這段旋律。')
            : gate === 'legacy'
              ? t('為了保護房間與島民，舊版島嶼需要完成安全遷移。請聯絡島主。')
              : gate === 'loading'
                ? t('正在確認你的連線與加入資格。')
                : t('請確認邀請連結，或稍後重新嘗試。')}
        </p>
        {gate === 'join' && (
          <CustomDialog
            title={t('一起登島')}
            description={t('島嶼 ID {id}', { id: islandId })}
            inputs={[{ label: 'islandPassword', placeholder: t('島嶼密碼'), type: 'password' }]}
            onConfirm={async (values) => {
              await api(`/api/islands/${islandId}/join`, values);
              setRetry((value) => value + 1);
            }}
            triggerLabel={t('輸入密碼加入')}
            confirmLabel={t('加入島嶼')}
          />
        )}
        {gate === 'error' && (
          <Button
            variant="ghost"
            className="action-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t('重新連線')}
            <RefreshCw size={16} />
          </Button>
        )}
        {gate !== 'loading' && (
          <Link href={localizedPath(locale, '/')} className="action-button">
            {t('回到首頁')}
            <ArrowUpRight size={16} />
          </Link>
        )}
      </main>
    );
  const current = session.playlist.find((song) => song.videoId === session.currentVideo);
  const needsListening = session.isPlaying && (blocked || !listening);
  return (
    <main className="room-page" id="main-content">
      {copyToast && createPortal(
        <div className="room-copy-toast" aria-hidden="true">
          {copyToast.failed ? <CircleAlert size={17} /> : <Check size={17} />}
          <span>{t(copyToast.text)}</span>
        </div>,
        document.body,
      )}
      <div className="room-heading">
        <div>
          <h1>{session.name}</h1>
          {connection !== 'synced' && (
            <p role="status">{connection === 'offline' ? t('離線') : t('正在重新連線')}</p>
          )}
        </div>
      </div>
      {busy && (
        <p role="status" className="quiet-notice">
          {t('正在更新島嶼…')}
        </p>
      )}
      {message && (
        <p role="alert" className="room-message">
          {t(message)}
        </p>
      )}
      <div className="room-grid">
        <section className="listening-stage" aria-label={t('正在共聽')}>
          <SyncedPlayer
            key={playerAttempt}
            ref={player}
            session={session}
            clock={roomClock}
            durationMs={admittedDuration ?? (legacyDuration?.videoId === session.currentVideo && legacyDuration.trackEpoch === (session.trackEpoch ?? 0) ? legacyDuration.durationMs : undefined)}
            canRelay={connection === 'synced'}
            onReady={() => setPlayerReady(true)}
            onError={(error) => { setMessage(error); setPlayerReady(false); }}
            onBlocked={() => setBlocked(true)}
            onPlaying={() => {
              setBlocked(false);
              setListening(true);
            }}
            onAdvance={(data) => {
              if (!endedPending.current) {
                endedPending.current = true;
                return command(
                  {
                    type: 'advance',
                    videoId: data.currentVideo,
                    expectedVersion: data.version,
                    expectedPlaybackRevision: data.playbackRevision ?? 0,
                    trackEpoch: data.trackEpoch ?? 0,
                  },
                  true,
                ).then(result => Boolean(result)).finally(() => {
                  endedPending.current = false;
                });
              }
              return Promise.resolve(false);
            }}
          />
          <div className="track-details">
          <h2 className="now-playing-title">
            {displayYouTubeTitle(current?.title ?? '') || (session.playlist.length ? t('歌單準備好了。') : t('讓第一首歌登島。'))}
          </h2>
          {!current && (
            <p className="quiet-notice">
              {session.playlist.length ? t('按下播放，一起開始聽。') : t('搜尋喜歡的歌，加入大家的播放佇列。')}
            </p>
          )}
          {needsListening && (
            <div className="listening-prompt" id="listening-help">
              <p>{t('此裝置尚未開啟聲音，請按下方「開始聆聽」。')}</p>
            </div>
          )}
          {!playerReady && (
            <Button
              variant="ghost"
              className="resync"
              onClick={() => setPlayerAttempt((value) => value + 1)}
            >
              {t('重試播放器')}
            </Button>
          )}
          </div>
        </section>
        <aside className="listening-sidebar" aria-label={t('共用歌單')}>
          <section className="room-section">
            <Button ref={searchTrigger} variant="ghost" className="queue-search-entry" disabled={!canEdit} onClick={() => setSearchOpen(true)}>
              <Search size={16} />{t('搜尋歌曲')}
            </Button>
            <div className="queue-heading"><h2>{t('歌單')}</h2></div>
            {!canEdit && <p className="quiet-notice">{t('島主尚未開放加歌。')}</p>}
            {!session.playlist.length ? (
              <p className="room-empty">
                {t('島上還很安靜。')}
                <br />
                {t('搜尋一首喜歡的歌，邀請大家一起聽。')}
              </p>
            ) : (
              <ol className="queue-list">
                {session.playlist.map((song, index) => (
                  <li
                    key={song.videoId}
                    className={`queue-row ${song.videoId === session.currentVideo ? 'current' : ''}`}
                  >
                    <span className="queue-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
                      aria-label={displayYouTubeTitle(song.title)}
                      aria-current={song.videoId === session.currentVideo ? 'true' : undefined}
                      disabled={!canControl || busy}
                      onClick={() => command({ type: 'select', videoId: song.videoId })}
                    >
                      <span>{displayYouTubeTitle(song.title)}</span>
                      {song.videoId === session.currentVideo && session.isPlaying && <span className="playing-label">{t('播放中')}</span>}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="icon-button"
                      aria-label={t('移除 {song}', { song: displayYouTubeTitle(song.title) })}
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
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogContent className="song-search-dialog" aria-describedby="song-search-description" onCloseAutoFocus={(event) => { event.preventDefault(); searchTrigger.current?.focus(); }}>
            <DialogTitle>{t('找一段旋律')}</DialogTitle>
            <DialogDescription id="song-search-description">{t('找到喜歡的歌，放進大家的下一段旋律。')}</DialogDescription>
            <form onSubmit={search} className="room-search">
              <Input
                aria-label={t('搜尋歌曲或歌手')}
                placeholder={t('搜尋歌曲或歌手')}
                maxLength={100}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  request.current?.abort();
                  searchSequence.current++;
                  setSearching(false);
                  setSearched(false);
                  setSearchError('');
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="icon-button"
                type="submit"
                aria-label={t('搜尋')}
                disabled={searching}
              >
                <Search size={18} />
              </Button>
            </form>
            {searching && (
              <p role="status" className="quiet-notice">
                {t('正在尋找音樂…')}
              </p>
            )}
            {searchError && <p role="alert" className="form-error">{t(searchError)}</p>}
            {message && <p role="status" className="quiet-notice">{t(message)}</p>}
            {searched && !searching && !results.length && <p className="room-empty" role="status">{t('找不到這首歌，試試歌手名稱或其他關鍵字。')}</p>}
            <ul className="queue-list">
              {results.map((song) => (
                <li className="queue-row" key={song.videoId}>
                  <Image className="queue-art" src={song.thumbnail} width={60} height={40} alt="" />
                  <span className="queue-song">{displayYouTubeTitle(song.title)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="icon-button"
                    aria-label={t('加入 {song}', { song: displayYouTubeTitle(song.title) })}
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
            </DialogContent>
          </Dialog>
          <Dialog open={roomPanel !== null} onOpenChange={open => { if (!open) setRoomPanel(null); }}>
            <DialogContent className={`room-members-dialog ${roomPanel === 'members' ? '' : 'room-menu-dialog'}`} onCloseAutoFocus={event => { event.preventDefault(); moreTrigger.current?.focus(); }}>
              <div className="room-panel-heading">
                {roomPanel && roomPanel !== 'menu' && (
                  <Button variant="ghost" size="icon" className="room-menu-back" aria-label={t('返回更多')} onClick={() => setRoomPanel('menu')}>
                    <ArrowLeft size={16} />
                  </Button>
                )}
                <DialogTitle ref={panelTitle} tabIndex={-1}>
                  {roomPanel === 'info' ? t('島嶼資訊') : roomPanel === 'members' ? t('島民與權限') : t('房間選單')}
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">{session.name}</DialogDescription>
              {roomPanel === 'menu' && <div className="room-menu-actions">
                <Button variant="ghost" onClick={() => setRoomPanel('info')}><Info size={17} />{t('島嶼資訊')}</Button>
                <Button variant="ghost" onClick={() => setRoomPanel('members')}><Users size={17} />{t('島民與權限')} <span>{t('{count} 位', { count: members.length })}</span></Button>
                <Button variant="ghost" onClick={() => void copy('invite')}><Link2 size={17} />{t('複製邀請連結')}</Button>
                <Button variant="ghost" disabled={!playerReady} onClick={() => {
                  player.current?.sync();
                  setRoomPanel(null);
                }}><RefreshCw size={17} />{t('重新同步播放')} <span>{t('僅此裝置')}</span></Button>
              </div>}
              {roomPanel === 'info' && <>
                <dl className="room-info">
                  <dt>{t('島嶼名稱')}</dt><dd>{session.name}</dd>
                  <dt>{t('島嶼 ID')}</dt>
                  <dd className="room-info-id">
                    <code>{islandId}</code>
                    <Button variant="ghost" size="icon" aria-label={t('複製島嶼 ID')} onClick={() => void copy('id')}>
                      <Copy size={16} />
                    </Button>
                  </dd>
                </dl>
                {owner && <form className="room-password-form" onSubmit={resetPassword}>
                  <label htmlFor="room-new-password">{t('新登島密碼')}</label>
                  <p id="room-password-help">{t('8–128 字。只影響之後加入的聽友。')}</p>
                  <Input id="room-new-password" name="islandPassword" type="password" autoComplete="new-password"
                    aria-describedby="room-password-help" minLength={8} maxLength={128} required disabled={resettingPassword} />
                  <Button type="submit" disabled={resettingPassword}>{resettingPassword ? t('更新中…') : t('重設密碼')}</Button>
                  {passwordStatus.text && <p role={passwordStatus.failed ? 'alert' : 'status'}>{t(passwordStatus.text)}</p>}
                </form>}
              </>}
              <span role="status" className="sr-only">{t(copyToast?.text ?? '')}</span>
              {roomPanel === 'members' && <>
                {message && <p role="alert" className="form-error">{t(message)}</p>}
                {busy && <p role="status" className="quiet-notice">{t('正在更新島民設定…')}</p>}
                <section className="room-section" aria-label={t('島民名單')}>
                  {islandOwner && (
                    <div className="member-group">
                      <h3>{t('島主')}</h3>
                      <p className="member-name">{islandOwner.displayName}{islandOwner.uid === uid ? t('（你）') : ''}</p>
                    </div>
                  )}
                  <div className="member-group">
                    <h3>{t('島民')}</h3>
                    {residents.length ? (
                      <ul className="resident-list">
                        {residents.map((member) => (
                          <li key={member.uid}>
                            <span className="member-name">{member.displayName}{member.uid === uid ? t('（你）') : ''}</span>
                            {owner && member.uid !== uid && (
                              <span className="member-actions">
                                <Button
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => manageMember({ type: 'transfer', targetUid: member.uid })}
                                >
                                  {t('交接島主')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => manageMember({ type: 'kick', targetUid: member.uid })}
                                >
                                  {t('移出')}
                                </Button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="quiet-notice">{t('目前還沒有島民。')}</p>}
                  </div>
                  {owner && (
                    <fieldset className="permission-options">
                      <legend><Settings2 size={16} />{t('訪客權限')}</legend>
                      {Object.entries({
                        guestsCanControlPlayback: t('控制播放與暫停'),
                        guestsCanEditQueue: t('新增與移除歌曲'),
                        guestsCanSkip: t('切換上一首／下一首'),
                      }).map(([key, label]) => (
                        <label key={key}>
                          <Checkbox
                            checked={permissions[key as keyof Permissions]}
                            disabled={busy}
                            onCheckedChange={(checked) =>
                              command({
                                type: 'permissions',
                                permission: key as keyof Permissions,
                                enabled: checked === true,
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
                      {t('離開這座島嶼')}
                    </Button>
                  )}
                </section>
              </>}
            </DialogContent>
          </Dialog>
        </aside>
      </div>
      <div className="transport" aria-label={t('播放控制')}>
        <Button
          ref={moreTrigger}
          variant="ghost"
          size="icon"
          className="room-more-button"
          aria-label={t('更多')}
          aria-haspopup="dialog"
          onClick={() => {
            setPasswordStatus({ text: '' });
            setRoomPanel('menu');
          }}
        >
          <Ellipsis size={20} />
        </Button>
        <div className="transport-track">{current && <Image src={current.thumbnail} width={64} height={48} alt="" className="transport-art" />}<div className="transport-title"><span>{displayYouTubeTitle(current?.title ?? '') || (session.playlist.length ? t('歌單準備好了') : t('等待音樂登島'))}</span></div></div>
        <div className="transport-buttons">
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label={t('隨機播放')}
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
            aria-label={t('上一首')}
            disabled={!canSkip || busy || !session.playlist.length}
            onClick={() => command({ type: 'prev' })}
          >
            <SkipBack size={19} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button transport-play"
            aria-label={session.isPlaying ? t('暫停') : t('播放')}
            title={session.isPlaying ? t('暫停全房播放') : t('開始全房播放')}
            disabled={!canControl || busy || !clockReady || !session.playlist.length}
            onClick={() => command({ type: session.isPlaying ? 'pause' : 'play' })}
          >
            {session.isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label={t('下一首')}
            disabled={!canSkip || busy || !session.playlist.length}
            onClick={() => command({ type: 'next' })}
          >
            <SkipForward size={19} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label={muted ? t('取消靜音') : t('靜音')}
            title={t('只影響這台裝置的聲音')}
            aria-pressed={muted}
            onClick={() => {
              player.current?.toggleMute();
              setMuted((value) => !value);
            }}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </Button>
        </div>
        {needsListening && (
          <Button
            variant="ghost"
            className="transport-listen"
            aria-describedby="listening-help"
            disabled={!playerReady || !clockReady}
            onClick={() => { player.current?.enableAudio(); setMuted(false); }}
          >
            {t('開始聆聽')} <Volume2 size={16} />
          </Button>
        )}
      </div>
    </main>
  );
}
