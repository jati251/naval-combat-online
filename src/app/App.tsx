import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { LobbyView } from '@/features/lobby';
import { NavalCanvas, BattleHUD, SpeedMotionBlurOverlay } from '@/features/battle';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { OrientationLockOverlay } from '@/components/ui/OrientationLockOverlay';

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
      {stage === 'LOBBY' && <LobbyView />}

      {(stage === 'BATTLE' || stage === 'DEBRIEF') && (
        <>
          <NavalCanvas />
          <SpeedMotionBlurOverlay />
          <BattleHUD />
        </>
      )}
    </div>
  );
};
