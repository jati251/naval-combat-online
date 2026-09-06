import React, { useEffect, lazy, Suspense } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { LobbyView } from '@/features/lobby';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { OrientationLockOverlay } from '@/components/ui/OrientationLockOverlay';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SettingsModal } from '@/features/settings';

const BattleView = lazy(() => import('@/features/battle/components/BattleView'));

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
      <SettingsModal />
      {stage === 'LOBBY' && <LobbyView />}

      {(stage === 'BATTLE' || stage === 'DEBRIEF') && (
        <Suspense fallback={<div role="status" className="grid h-full place-items-center text-amber-100">Preparing the battle scene…</div>}>
          <BattleView />
        </Suspense>
      )}
    </div>
  );
};
