'use client';
import type { ThreeElements } from '@react-three/fiber';
import { Mesh } from 'three';
/* Fox's islands — nimzu, CC-BY-4.0.
   https://sketchfab.com/3d-models/foxs-islands-163b68e09fcc47618450150be7785907 */
import { useGLTF } from '@react-three/drei';

export default function Island(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/island.glb');
  return (
    <group {...props}>
      {Object.values(nodes)
        .filter((node): node is Mesh => node instanceof Mesh)
        .map((node) => (
          <mesh
            key={node.uuid}
            geometry={node.geometry}
            material={materials.PaletteMaterial001 || node.material}
          />
        ))}
    </group>
  );
}
