import { Html } from '@react-three/drei';
import React from 'react';

const Loader = () => {
  return (
    <Html>
      <div className="flex items-center justify-self-center">
        <div className="h-20 w-20 animate-spin rounded-full border-2 border-[#f5d77a]/30 border-t-[#f5d77a]"></div>
      </div>
    </Html>
  );
};

export default Loader;
