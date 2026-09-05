import React, { useEffect, useState, useCallback } from 'react';
import { Compass, RotateCw, Maximize } from 'lucide-react';

export const OrientationLockOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width < height and viewport is a mobile/tablet device (<= 1024px)
      const isMobileDevice =
        window.innerWidth <= 1024 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

      const isCurrentPortrait =
        window.matchMedia('(orientation: portrait)').matches ||
        window.innerHeight > window.innerWidth;

      setIsPortrait(isMobileDevice && isCurrentPortrait);
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Try auto-locking screen orientation if API is supported
    const tryAutoLock = async () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientation?.lock) {
          await orientation.lock('landscape');
        }
      } catch {
        // Many mobile browsers require a user gesture or fullscreen to lock orientation
      }
    };

    tryAutoLock();

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestFullscreenLock = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientation?.lock) {
        await orientation.lock('landscape');
      }
    } catch (e) {
      console.warn('Orientation lock request failed:', e);
    }
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-[#05080e] text-[#f4ebd0] flex flex-col items-center justify-center p-6 text-center select-none cartography-grid">
      <div className="pirate-parchment max-w-sm w-full p-8 rounded-xl border-2 border-amber-600/60 shadow-2xl flex flex-col items-center gap-5 relative">
        {/* Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/80" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/80" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/80" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/80" />

        {/* Animated Rotate Device Graphic */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full pirate-panel border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md animate-spin-slow">
            <Compass className="w-9 h-9 stroke-[1.5]" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-2 rounded-full wax-seal-gold animate-bounce">
            <RotateCw className="w-4 h-4 text-stone-950 stroke-[2.5]" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-cinzel font-bold text-amber-400 uppercase tracking-[0.2em]">
            ADMIRALTY STANDING ORDERS
          </span>
          <h2 className="font-cinzel text-xl font-black text-amber-100 tracking-wider gold-emboss">
            ROTATE TO LANDSCAPE
          </h2>
          <p className="text-xs font-fell italic text-amber-200/80 mt-1 leading-relaxed">
            Please turn your vessel horizontally. The High Seas line of battle demands a wide horizontal quarterdeck for helm steering and broadside gunnery.
          </p>
        </div>

        <button
          onClick={handleRequestFullscreenLock}
          className="px-5 py-2.5 rounded-md bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer flex items-center gap-2 border border-amber-300/80 active:scale-95"
        >
          <Maximize className="w-4 h-4 stroke-[2.5]" />
          <span>Lock Landscape</span>
        </button>
      </div>
    </div>
  );
};
