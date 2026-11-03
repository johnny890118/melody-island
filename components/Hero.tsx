'use client';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import React, { Component, Suspense, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, useProgress } from '@react-three/drei';
import { RotateCcw, MoveHorizontal, Pause, Play } from 'lucide-react';
import Island from './models/Island';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
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
function Progress({ onProgress }: { onProgress(value: number): void }) {
  const { progress } = useProgress();
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  return null;
}
export default function Hero() {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [progress, setProgress] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);
  const [rotating, setRotating] = useState(true);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setActive(!document.hidden);
    motion();
    visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <section
      className="island-stage"
      aria-label="互動 3D 島嶼"
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
      <div className="island-orbit" aria-hidden="true" />
      <div className="scene-coordinate" aria-hidden="true">
        A PLACE BETWEEN SONGS
      </div>
      <SceneBoundary key={sceneKey}>
        <Canvas
          className="island-canvas"
          dpr={[1, 1.5]}
          camera={{ position: [0, 8, 45], fov: 38 }}
          frameloop={!active ? 'never' : reduced || !rotating ? 'demand' : 'always'}
          gl={{ antialias: true, alpha: true }}
          fallback={<div className="scene-fallback">此裝置不支援 WebGL；你仍可以加入共聽。</div>}
          onCreated={({ gl }) => {
            gl.domElement.setAttribute('aria-label', '拖曳旋轉島嶼，方向鍵旋轉');
            gl.domElement.setAttribute('tabindex', '0');
          }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[15, 25, 12]} intensity={2.8} color="#fff1d5" />
          <hemisphereLight args={['#f9f3df', '#578b7a', 1.2]} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.4} maxDuration={0}>
              <Center>
                <Island rotation={[0.08, 4.7, 0]} />
              </Center>
            </Bounds>
          </Suspense>
          <Progress onProgress={setProgress} />
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
      {progress < 100 && (
        <div className="scene-progress" role="status">
          正在準備島嶼 <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="scene-tools">
        <span>
          <MoveHorizontal size={15} /> 拖曳，換個角度聽
        </span>
        {!reduced && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={rotating ? '暫停島嶼旋轉' : '開始島嶼旋轉'}
            onClick={() => setRotating((value) => !value)}
          >
            {rotating ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="重設島嶼視角"
          onClick={() => setSceneKey((key) => key + 1)}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    </section>
  );
}
