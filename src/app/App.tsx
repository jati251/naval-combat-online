import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { LobbyView } from '@/features/lobby';
import { NavalCanvas, BattleHUD, SpeedMotionBlurOverlay } from '@/features/battle';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { OrientationLockOverlay } from '@/components/ui/OrientationLockOverlay';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const App: React.FC = () => {
  const stage = useGameStore((s) => s.stage);

  // Initialize network websocket on mount
  useEffect(() => {
    networkClient.connect();
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] overflow-hidden bg-[#0b1626] text-[#f5eedf] select-none touch-none">
      <OrientationLockOverlay />
      <ToastContainer />
      <ConfirmDialog />
      {stage === 'LOBBY' && <LobbyView />}

      {(stage === 'BATTLE' || stage === 'DEBRIEF') && (() => {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;
        return (
          <>
            <NavalCanvas />
            {/* Skip backdrop-filter blur overlay on mobile — extremely expensive on mobile WebKit */}
            {!isMobile && <SpeedMotionBlurOverlay />}
            <BattleHUD />
          </>
        );
      })()}
    </div>
  );
};
