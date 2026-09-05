import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { LobbyView } from '@/features/lobby';
import { NavalCanvas, BattleHUD, SpeedMotionBlurOverlay } from '@/features/battle';
import { ToastContainer } from '@/components/ui/ToastContainer';

export const App: React.FC = () => {
  const stage = useGameStore((s) => s.stage);

  // Initialize network websocket on mount
  useEffect(() => {
    networkClient.connect();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
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
