'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { ArrowUpRight, AudioLines, ChevronRight, Headphones, Link2, ListMusic, MoreHorizontal, Pause, Play, Plus, Search, Settings2, Shuffle, SkipBack, SkipForward, Users, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Island from '@/components/models/Island';
import Bird from '@/components/models/Bird';
import './proposal.css';

type Concept = 'a' | 'b' | 'c';
type Surface = 'home' | 'room';
const options = { a: { name: '月影抵岸', english: 'The Lunar Threshold', thesis: '把抵達一座島，變成首頁的主角。' }, b: { name: '月背劇場', english: 'The Far Side', thesis: '先走進一個世界，再開始一場共聽。' }, c: { name: '共聽座標', english: 'Shared Latitude', thesis: '遙遠的地方，也能有共同的所在。' } } satisfies Record<Concept, { name: string; english: string; thesis: string }>;
const songs = [
  { title: '楓', artist: '周杰倫', id: 'qzwsQTY-99o', length: '4:46' },
  { title: '蒲公英的約定', artist: '周杰倫', id: 'VitJnr3IySc', length: '4:08' },
  { title: '給我一首歌的時間', artist: '周杰倫', id: 'wt0RKW3aC84', length: '4:13' },
  { title: '簡單愛', artist: '周杰倫', id: 'Y4xCVlyCvX4', length: '4:30' },
];
const ready = () => undefined;
function Moon({ variant }: { variant: Concept }) {
  const texture = useTexture('/moon-surface.jpg');
  const positions: Record<Concept, [number, number, number]> = { a: [2.6, 4, -14], b: [-1, -15, -20], c: [-5, 5, -20] };
  return <mesh position={positions[variant]} rotation={[0, 1.8, 0]}><sphereGeometry args={[variant === 'b' ? 9 : 6.5, 64, 48]} /><meshStandardMaterial map={texture} color="#756879" roughness={1} /></mesh>;
}
function Scene({ variant }: { variant: Concept }) {
  const [moving, setMoving] = useState(false);
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setMoving(!media.matches);
    const visibility = () => setVisible(!document.hidden);
    motion(); media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <div className="dr-scene" aria-label="真實互動 3D 島嶼與鳳凰" data-ready={loaded}>
    <Canvas dpr={[1, 1.5]} camera={{ position: variant === 'b' ? [-2.8, 0.9, 6.2] : variant === 'c' ? [2.7, 2.1, 7.8] : [2.2, 1.3, 6.5], fov: 36 }} frameloop={!visible ? 'never' : moving ? 'always' : 'demand'} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.25} color="#a29bbc" /><directionalLight position={[4, 6, -4]} intensity={3.2} color="#ffe1b3" /><directionalLight position={[-3, 1, 4]} intensity={0.9} color="#a6b6e2" />
      <Suspense fallback={null}><Moon variant={variant} /><group position={[0, variant === 'b' ? 0.2 : 0, 0]}><Island onReady={() => setLoaded(true)} />{loaded && <group scale={0.7}><Bird moving={moving} onReady={ready} /></group>}</group></Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={moving} autoRotateSpeed={0.18} minPolarAngle={0.8} maxPolarAngle={1.65} />
    </Canvas>
    <div className="dr-scene-tools"><span>拖曳探索島嶼</span><Button variant="ghost" size="icon" aria-label={moving ? '暫停場景' : '播放場景'} onClick={() => setMoving(!moving)}>{moving ? <Pause size={15} /> : <Play size={15} />}</Button></div>
  </div>;
}
function Brand() { return <span className="dr-brand"><AudioLines size={25} strokeWidth={1.4} /><span>Melody Island</span></span>; }
function Home({ variant, board }: { variant: Concept; board(): void }) {
  return <div className="dr-home">
    <nav className="dr-nav"><Brand /><Button variant="ghost" onClick={board}>登入 <ArrowUpRight size={16} /></Button></nav>
    <main className="dr-arrival">
      <div className="dr-stars" aria-hidden="true" />
      <Scene key={variant} variant={variant} />
      <div className="dr-intro"><h1>Melody<br /><em>Island</em></h1><p>不同的地方，同一首歌。</p><div className="dr-entry"><Button onClick={board}>加入朋友的島嶼 <ArrowUpRight size={18} /></Button><Button variant="outline" onClick={board}>建立島嶼 <Plus size={17} /></Button></div></div>
      <div className="dr-home-note"><Headphones size={17} /><span>你的島嶼，你們的歌單。</span></div>
    </main>
  </div>;
}
function People({ manage }: { manage(): void }) {
  return <button className="dr-people" onClick={manage} aria-label="查看已加入的 4 位成員"><span className="dr-avatars"><b>J</b><b>L</b><b>Y</b><b>M</b></span><span>4 位已加入</span><ChevronRight size={14} /></button>;
}
function Room({ variant }: { variant: Concept }) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState(false);
  const [members, setMembers] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'queue' | 'members'>('queue');
  const song = songs[index];
  const change = (step: number) => setIndex((n) => (n + step + songs.length) % songs.length);
  return <div className="dr-room">
    <nav className="dr-nav"><Brand /><Button variant="ghost" onClick={() => setMembers(true)}><Users size={17} /><span>島嶼設定</span></Button></nav>
    <header className="dr-room-head"><div><span className="dr-room-state"><i /> 已連線</span><h1>月光停靠處</h1></div><div className="dr-room-social"><People manage={() => setMembers(true)} /><Button variant="outline" onClick={() => setMembers(true)}><Link2 size={16} /> 邀請朋友</Button></div></header>
    <main className="dr-deck">
      <section className="dr-now" aria-label="正在共聽">
        <div className="dr-now-title"><span className="dr-state-label"><AudioLines size={16} /> {playing ? '正在共聽' : '全房已暫停'}</span><span>YouTube</span></div>
        <figure className="dr-video"><Image unoptimized width={1280} height={720} src={`https://i.ytimg.com/vi/${song.id}/sddefault.jpg`} alt={`${song.title}官方影片縮圖，用於版面示意`} /><figcaption>YouTube 播放器區域 · 畫面示意</figcaption></figure>
        <div className="dr-song-heading"><div><h2>{song.title}</h2><p>{song.artist} <span>Official Music Video</span></p></div><Button variant="ghost" size="icon" aria-label="歌曲資訊" onClick={() => setMembers(true)}><MoreHorizontal size={23} /></Button></div>
        <div className="dr-local-state"><Headphones size={15} /><span>本機聲音已啟用</span><span>音量只影響這台裝置</span></div>
      </section>
      <section className="dr-queue" data-collapsed={variant === 'b' && !expanded} aria-label="共用歌單">
        <div className="dr-queue-top"><div className="dr-tabs"><button aria-pressed={tab === 'queue'} onClick={() => setTab('queue')}>接下來</button><button aria-pressed={tab === 'members'} onClick={() => setTab('members')}>島上成員</button></div><Button variant="ghost" size="icon" aria-label="搜尋加歌" onClick={() => setSearch(true)}><Plus size={23} /></Button></div>
        {tab === 'queue' ? <><p className="dr-queue-caption">一起選，下一首想聽的歌。</p><div className="dr-track-list">{songs.slice(index + 1).map((s, n) => <button className="dr-track" key={s.id} onClick={() => setIndex(index + n + 1)}><span className="dr-order">{n + 1}</span><Image unoptimized width={128} height={96} src={`https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`} alt="" /><span className="dr-track-copy"><strong>{s.title}</strong><small>{s.artist}</small></span><span className="dr-length">{s.length}</span></button>)}{index === songs.length - 1 && <p className="dr-queue-caption">這是最後一首。再加一首喜歡的歌。</p>}</div>{variant === 'b' && <Button className="dr-queue-expand" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收合歌單' : '展開全部歌單'}<ChevronRight size={15} /></Button>}<Button className="dr-add" variant="outline" onClick={() => setSearch(true)}><Search size={16} /> 搜尋 YouTube 加入歌單</Button><div className="dr-session-note"><span>共用歌單</span><span>由島主開放共同控制</span></div></> : <div className="dr-member-list">{['Johnny · 島主', 'Luna', 'Yuki', 'Ming'].map(name => <p key={name}><Users size={16} /> {name}</p>)}<small>已加入成員；不代表即時在線。</small><Button variant="outline" onClick={() => setMembers(true)}><Settings2 size={15} /> 管理權限</Button></div>}
      </section>
    </main>
    <footer className="dr-transport"><div className="dr-mini-song"><Image unoptimized width={128} height={96} src={`https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`} alt="" /><div><strong>{song.title}</strong><span>{song.artist}</span></div></div><div className="dr-play-controls"><Button variant="ghost" size="icon" aria-label="隨機播放示意"><Shuffle size={17} /></Button><Button variant="ghost" size="icon" aria-label="上一首示意" onClick={() => change(-1)}><SkipBack size={21} /></Button><Button className="dr-main-play" size="icon" aria-label={playing ? '暫停示意' : '播放示意'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={24} /> : <Play size={24} />}</Button><Button variant="ghost" size="icon" aria-label="下一首示意" onClick={() => change(1)}><SkipForward size={21} /></Button><Button variant="ghost" size="icon" aria-label="本機音量示意"><Volume2 size={20} /></Button></div><button className="dr-transport-extra" onClick={() => setSearch(true)}><ListMusic size={20} /><span>加一首歌</span><Plus size={15} /></button><span className="dr-room-live">{playing ? '全房播放中' : '全房已暫停'}</span></footer>
    <Dialog open={search || members} onOpenChange={open => { if (!open) { setSearch(false); setMembers(false); } }}><DialogContent className="dr-sheet"><DialogTitle className="sr-only">{search ? '搜尋加歌 · 提案' : '成員與權限 · 提案'}</DialogTitle><DialogDescription className="sr-only">僅有本機示意互動，不變更真實房間。</DialogDescription><div className="dr-sheet-head"><h2>{search ? '下一首，想聽什麼？' : '一起停靠在這裡'}</h2><Button variant="ghost" size="icon" aria-label="關閉" onClick={() => { setSearch(false); setMembers(false); }}><X size={22} /></Button></div>{search ? <><label htmlFor="dr-query">搜尋 YouTube</label><input id="dr-query" value={query} onChange={e => setQuery(e.target.value)} placeholder="歌名、歌手或 YouTube 連結" /><p className="dr-queue-caption">提案互動示意，沒有送出搜尋或房間指令。</p>{songs.filter(s => !query || `${s.title}${s.artist}`.includes(query)).map(s => <div className="dr-search-result" key={s.id}><Image unoptimized width={128} height={96} src={`https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`} alt="" /><span>{s.title}<small>{s.artist}</small></span><Button variant="outline" aria-label={`加入${s.title}示意`} onClick={() => setSearch(false)}><Plus size={17} /></Button></div>)}</> : <><People manage={() => undefined} /><p>已加入成員；不代表即時在線。</p><div className="dr-member-list">{['Johnny · 島主', 'Luna', 'Yuki', 'Ming'].map(name => <p key={name}>{name}</p>)}</div><h3>共同控制</h3><p>播放與切歌權限、加歌權限及主持權交接，實作時沿用現有伺服器授權。</p></>}</DialogContent></Dialog>
  </div>;
}
export default function Proposal() {
  const [variant, setVariant] = useState<Concept>('a');
  const [surface, setSurface] = useState<Surface>('home');
  useEffect(() => { const params = new URLSearchParams(location.search); const c = params.get('concept'); if (c === 'a' || c === 'b' || c === 'c') setVariant(c); if (params.get('surface') === 'room') setSurface('room'); }, []);
  return <div className="design-review" data-concept={variant}><aside className="dr-review-bar"><Link href="/">回到網站</Link><span>設計提案 · 示意資料 · 未套用至網站</span><div>{(['a', 'b', 'c'] as const).map(c => <button key={c} aria-pressed={variant === c} onClick={() => setVariant(c)}>{c.toUpperCase()}<span> {options[c].name}</span></button>)}</div><div><button aria-pressed={surface === 'home'} onClick={() => setSurface('home')}>首頁</button><button aria-pressed={surface === 'room'} onClick={() => setSurface('room')}>房間</button></div></aside>{surface === 'home' ? <Home variant={variant} board={() => setSurface('room')} /> : <Room variant={variant} />}<div className="dr-proposal-caption"><strong>{options[variant].name}</strong><span>{options[variant].thesis}</span></div></div>;
}
