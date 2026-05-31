import React from 'react';
import { useSelector } from 'react-redux';

const Loading = () => {
  const { isLoading } = useSelector((state) => state.island);

  return isLoading ? (
    <div className="night-sky fixed z-[999] flex h-dvh w-dvw flex-col items-center justify-center overflow-hidden bg-[#03050c]/90 px-6 backdrop-blur-2xl">
      <div className="star-dust absolute inset-0 opacity-50" />
      <div className="aurora-ribbon absolute -left-20 -right-20 top-1/4 h-80 opacity-75" />
      <div className="liquid-glass relative z-10 flex w-[min(88vw,320px)] flex-col items-center gap-5 rounded-2xl border border-white/20 px-8 py-9 text-center">
        <div className="loading-orb h-20 w-20 shadow-[0_0_50px_rgba(141,245,255,0.36)]" />
        <div className="space-y-1">
          <p className="text-base font-black text-[#fff8e1]">正在點亮島嶼</p>
          <p className="text-sm text-[#dfe7dc]">把星光和音樂準備好...</p>
        </div>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8df5ff]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#fff8e1] [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#ffb8d5] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  ) : null;
};

export default Loading;
