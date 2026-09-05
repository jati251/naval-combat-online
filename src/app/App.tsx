import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { LobbyView } from '@/features/lobby/components/LobbyView';
import { NavalCanvas } from '@/features/battle/components/3d/NavalCanvas';
import { BattleHUD } from '@/features/battle/components/hud/BattleHUD';
import { DebriefModal } from '@/features/battle/components/hud/DebriefModal';

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
          <BattleHUD />
          {stage === 'DEBRIEF' && <DebriefModal />}
        </>
      )}
    </div>
  );
};
