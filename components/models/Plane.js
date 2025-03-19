import { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

const Plane = ({ isRotating, ...props }) => {
  const planeRef = useRef();

  const { scene, animations } = useGLTF('/models/plane.glb');
  const { actions } = useAnimations(animations, planeRef);

  useEffect(() => {
    if (isRotating) {
      actions['Take 001'].play();
    } else {
      actions['Take 001'].stop();
    }
  }, [actions, isRotating]);

  return (
    <mesh {...props} ref={planeRef}>
      <primitive object={scene} />
    </mesh>
  );
};

export default Plane;
