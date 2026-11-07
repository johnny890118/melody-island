'use client';

import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import { Box3, Vector3 } from 'three';

/* Fox's islands — nimzu, CC BY 4.0.
   https://sketchfab.com/3d-models/foxs-islands-163b68e09fcc47618450150be7785907 */
export default function Island({ onReady }: { onReady(): void }) {
  const { scene } = useGLTF('/models/island.glb');
  const { model, scale } = useMemo(() => {
    const model = scene.clone();
    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    model.position.sub(bounds.getCenter(new Vector3()));
    return { model, scale: 3.15 / Math.max(size.x, size.y, size.z) };
  }, [scene]);
  useLayoutEffect(onReady, [onReady]);

  return (
    <group rotation={[0, 4.72, 0]} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
