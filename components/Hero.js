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
    <section className="night-sky relative h-dvh w-full overflow-hidden">
      <div className="star-dust pointer-events-none absolute inset-0 opacity-55" />
      <div className="aurora-ribbon pointer-events-none absolute -left-16 -right-16 top-0 h-72 opacity-80 sm:h-96" />
      <div className="pointer-events-none absolute left-[8%] top-[18%] h-3 w-3 rounded-full bg-[#fff8e1]/80 shadow-[0_0_26px_rgba(255,248,225,0.9)] sm:h-4 sm:w-4" />
      <div className="floaty pointer-events-none absolute right-[12%] top-[26%] h-16 w-16 rounded-full border border-white/20 bg-white/[0.04] shadow-[inset_0_1px_20px_rgba(255,255,255,0.18),0_0_36px_rgba(141,245,255,0.2)] backdrop-blur-md sm:h-24 sm:w-24" />
      <Canvas
        className={`relative z-10 h-dvh w-full bg-transparent ${isRotating ? 'cursor-grabbing' : 'cursor-grab'}`}
        camera={{ near: 0.1, far: 1000 }}
      >
        <Suspense fallback={<Loader />}>
          <directionalLight position={[1, 1.5, 1]} intensity={2.2} color="#fff8e1" />
          <ambientLight intensity={0.65} />
          <hemisphereLight skyColor="#8df5ff" groundColor="#05080d" intensity={1.15} />

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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-[#02080a] to-transparent" />
    </section>
  );
};

export default Hero;
