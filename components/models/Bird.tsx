'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AnimationMixer, Group, MathUtils } from 'three';
import { SkeletonUtils } from 'three-stdlib';

// Phoenix bird — NORBERTO-3D, CC BY 4.0. See the homepage credits.
export default function Bird({ moving, onReady }: { moving: boolean; onReady(): void }) {
  const { scene, animations } = useGLTF('/models/bird.glb');
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const mixer = useMemo(() => new AnimationMixer(model), [model]);
  const flight = useRef<Group>(null);
  const phase = useRef(2.12);

  useEffect(() => {
    const clip = animations.find(({ name }) => name === 'Take 001');
    if (clip) {
      mixer.clipAction(clip).play();
      mixer.update(0);
    }
    onReady();
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [animations, mixer, model, onReady]);

  useFrame((_, delta) => {
    const bird = flight.current;
    if (!bird) return;
    // Cap the first delta after returning from a hidden tab.
    const step = Math.min(delta, 0.05);
    if (moving) {
      phase.current = (phase.current + step * 0.42) % (2 * Math.PI);
      mixer.update(step);
    }
    const t = phase.current;
    bird.position.set(1.65 * Math.cos(t), 0.68 + 0.16 * Math.sin(t * 2), 1.2 * Math.sin(t));
    bird.rotation.set(
      0,
      Math.atan2(-1.65 * Math.sin(t), 1.2 * Math.cos(t)),
      MathUtils.degToRad(12),
    );
  });

  return (
    <group ref={flight}>
      <group scale={0.00125} rotation={[0, Math.PI / 2, 0]}>
        <primitive object={model} />
      </group>
    </group>
  );
}
