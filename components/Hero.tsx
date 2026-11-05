'use client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ReactNode } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { RotateCcw, MoveHorizontal, Pause, Play, Info } from 'lucide-react';
import Island from './models/Island';
import Bird from './models/Bird';
import { ACESFilmicToneMapping, MathUtils, PerspectiveCamera } from 'three';

class SceneBoundary extends Component<
  { children: ReactNode; optional?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed && this.props.optional) return null;
    return this.state.failed ? (
      <div className="scene-fallback" role="status">
        <p>島嶼暫時無法顯示</p>
        <span>你仍可以建立或加入共聽房間。</span>
      </div>
    ) : (
      this.props.children
    );
  }
}
function FitPortrait() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !size.height) return;
    const aspect = size.width / size.height;
    camera.fov = MathUtils.radToDeg(
      2 * Math.atan(Math.tan(MathUtils.degToRad(17.5)) * Math.max(1, 1.12 / aspect)),
    );
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.width, size.height]);
  return null;
}
export default function Hero() {
  const stage = useRef<HTMLElement>(null);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [readyKey, setReadyKey] = useState(-1);
  const [birdKey, setBirdKey] = useState(-1);
  const [birdReadyKey, setBirdReadyKey] = useState(-1);
  const [sceneKey, setSceneKey] = useState(0);
  const [rotating, setRotating] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [inViewport, setInViewport] = useState(true);
  const active = documentVisible && inViewport;
  const [reduced, setReduced] = useState(true);
  const renderMode = !active ? 'never' : reduced || !rotating ? 'demand' : 'always';
  const markIslandReady = useCallback(() => setReadyKey(sceneKey), [sceneKey]);
  const markBirdReady = useCallback(() => setBirdReadyKey(sceneKey), [sceneKey]);
  useEffect(() => {
    if (readyKey !== sceneKey || !active) return;
    const delay = window.setTimeout(() => setBirdKey(sceneKey), 350);
    return () => window.clearTimeout(delay);
  }, [active, readyKey, sceneKey]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setDocumentVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting));
    if (stage.current) observer.observe(stage.current);
    motion();
    visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <section
      ref={stage}
      className="island-stage"
      data-render-mode={renderMode}
      aria-label="互動 3D 島嶼"
      data-island-ready={readyKey === sceneKey}
      data-bird-ready={birdReadyKey === sceneKey}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLCanvasElement &&
          ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
          controls.current
        ) {
          event.preventDefault();
          controls.current.setAzimuthalAngle(
            controls.current.getAzimuthalAngle() + (event.key === 'ArrowLeft' ? -0.12 : 0.12),
          );
          controls.current.update();
        }
      }}
    >
      <SceneBoundary key={sceneKey}>
        <Canvas
          className="island-canvas"
          dpr={[1, 1.5]}
          camera={{ position: [2, 0.95, 5.55], fov: 35 }}
          frameloop={renderMode}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.04,
          }}
          fallback={<div className="scene-fallback">此裝置不支援 WebGL；你仍可以加入共聽。</div>}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute('aria-label', '拖曳旋轉島嶼，方向鍵旋轉');
            gl.domElement.setAttribute('tabindex', '0');
          }}
        >
          <FitPortrait />
          <ambientLight intensity={0.73} color="#f3d9ff" />
          <directionalLight position={[-3, 5, 4]} intensity={3.1} color="#ffcea5" />
          <directionalLight position={[4, 1, -4]} intensity={2.4} color="#c4b7ff" />
          <Suspense
            fallback={
              <Html center>
                <div className="scene-progress" role="status">
                  正在準備島嶼…
                </div>
              </Html>
            }
          >
            <Island onReady={markIslandReady} />
          </Suspense>
          {birdKey === sceneKey && (
            <SceneBoundary optional>
              <Suspense fallback={null}>
                <Bird moving={!reduced && rotating} onReady={markBirdReady} />
              </Suspense>
            </SceneBoundary>
          )}
          <OrbitControls
            ref={controls}
            makeDefault
            enableZoom={false}
            enablePan={false}
            autoRotate={!reduced && rotating}
            enableDamping={!reduced}
            autoRotateSpeed={0.35}
            minPolarAngle={0.9}
            maxPolarAngle={1.65}
          />
        </Canvas>
      </SceneBoundary>
      <div className="scene-tools">
        <span>
          <MoveHorizontal size={15} /> 拖曳旋轉
        </span>
        {!reduced && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={rotating ? '暫停場景動畫' : '播放場景動畫'}
            onClick={() => setRotating((value) => !value)}
          >
            {rotating ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="重設島嶼視角"
          onClick={() => {
            if (controls.current) controls.current.reset();
            else setSceneKey((key) => key + 1);
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="3D 模型來源">
              <Info size={16} />
            </Button>
          </DialogTrigger>
          <DialogContent className="island-dialog" aria-describedby={undefined}>
            <DialogTitle>3D 模型來源</DialogTitle>
            <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">
              月球材質：NASA’s Scientific Visualization Studio
            </a>
            <a
              href="https://sketchfab.com/3d-models/foxs-islands-163b68e09fcc47618450150be7785907"
              target="_blank"
              rel="noreferrer"
            >
              島嶼：nimzu · CC BY 4.0
            </a>
            <a
              href="https://sketchfab.com/3d-models/phoenix-bird-844ba0cf144a413ea92c779f18912042"
              target="_blank"
              rel="noreferrer"
            >
              鳳凰：NORBERTO-3D · CC BY 4.0
            </a>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
