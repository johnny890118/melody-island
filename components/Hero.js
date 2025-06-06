'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Loader from '@/components/Loader';
import Island from '@/components/models/Island';
import Bird from './models/Bird';
import Plane from './models/Plane';

const Hero = () => {
  const [isRotating, setIsRotating] = useState(false);
  const [screenSize, setScreenSize] = useState({
    islandScale: [1, 1, 1],
    islandPosition: [0, -10, -43],
    islandRotation: [-0.001, 4.7, 0],
    planeScale: [3, 3, 3],
    planePosition: [0, -3.5, -4],
  });

  useEffect(() => {
    const adjustIslandForScreenSize = () => {
      let screenScale = null;
      let screenPosition = [0, -10, -43];
      let rotation = [-0.001, 4.7, 0];

      if (window.innerHeight < 768) {
        screenScale = [0.9, 0.9, 0.9];
      } else {
        screenScale = [1, 1, 1];
      }

      return { screenScale, screenPosition, rotation };
    };

    const adjustPlaneForScreenSize = () => {
      let screenScale, screenPosition;

      if (window.innerHeight < 768) {
        screenScale = [1.5, 1.5, 1.5];
        screenPosition = [0, -1.5, 0];
      } else {
        screenScale = [3, 3, 3];
        screenPosition = [0, -3.5, -4];
      }

      return { screenScale, screenPosition };
    };

    setScreenSize({
      islandScale: adjustIslandForScreenSize().screenScale,
      islandPosition: adjustIslandForScreenSize().screenPosition,
      islandRotation: adjustIslandForScreenSize().rotation,
      planeScale: adjustPlaneForScreenSize().screenScale,
      planePosition: adjustPlaneForScreenSize().screenPosition,
    });
  }, []);

  return (
    <section className="h-dvh w-full">
      <Canvas
        className={`h-dvh w-full bg-transparent ${isRotating ? 'cursor-grabbing' : 'cursor-grab'}`}
        camera={{ near: 0.1, far: 1000 }}
      >
        <Suspense fallback={<Loader />}>
          <directionalLight position={[1, 1, 1]} intensity={2} />
          <ambientLight intensity={0.5} />
          <hemisphereLight skyColor="#b1e1ff" groundColor="#000000" intensity={1} />

          <Bird />
          <Island
            scale={screenSize.islandScale}
            position={screenSize.islandPosition}
            rotation={screenSize.islandRotation}
            isRotating={isRotating}
            setIsRotating={setIsRotating}
          />
          <Plane
            isRotating={isRotating}
            scale={screenSize.planeScale}
            position={screenSize.planePosition}
            rotation={[0, 20, 0]}
          />
        </Suspense>
      </Canvas>
    </section>
  );
};

export default Hero;
