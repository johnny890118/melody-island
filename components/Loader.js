import { Html } from '@react-three/drei';
import React from 'react';

const Loader = () => {
  return (
    <Html center>
      <div className="liquid-glass flex items-center gap-3 rounded-full border border-white/20 px-4 py-3 text-[#fff8e1] shadow-2xl backdrop-blur-2xl">
        <div className="loading-orb h-9 w-9 shadow-[0_0_26px_rgba(141,245,255,0.38)]" />
        <p className="whitespace-nowrap text-xs font-bold">載入星空島嶼...</p>
      </div>
    </Html>
  );
};

export default Loader;
