import React, { useState, lazy, Suspense } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useModalStore } from '@/stores/useModalStore';
import { networkClient } from '@/services/networkClient';
import { useLobby } from '../hooks/useLobby';
import { LobbyHeader } from './LobbyHeader';
import { RoomList } from './RoomList';
import { ShipSelector } from './ShipSelector';
import { RoomLobby } from './RoomLobby';
import { CreateRoomModal } from './CreateRoomModal';
import { ServerConfigModal } from './ServerConfigModal';
import { Swords, Anchor } from 'lucide-react';

const ShipTurntable3D = lazy(() =>
  import('./ShipTurntable3D').then((m) => ({ default: m.ShipTurntable3D }))
);

export const LobbyView: React.FC = () => {
  const playerName = useGameStore((s) => s.playerName);
  const selectedShip = useGameStore((s) => s.selectedShip);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setSelectedShip = useGameStore((s) => s.setSelectedShip);
  const availableRooms = useGameStore((s) => s.availableRooms);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const isConnected = useGameStore((s) => s.isConnected);

  const [showRoomDrawer, setShowRoomDrawer] = useState(false);

  const {
    isRefreshing,
    isDeploying,
    showCreateModal,
    showServerModal,
    setShowCreateModal,
    setShowServerModal,
    selfPlayer,
    isHost,
    allCaptainsReady,
    readyCount,
    totalCount,
    handleRefresh,
    handleStartGame,
    handleCreateRoom,
  } = useLobby();

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-[#070e17] text-[#f7f0e4] flex flex-col justify-between p-2 sm:p-3 relative overflow-hidden select-none">
      {/* Background Ambience: Deep Ocean Map Table with Golden Sun & Fog */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#12253d_0%,#0a1626_60%,#040a12_100%)] pointer-events-none" />
      <div className="absolute inset-0 cartography-grid opacity-30 pointer-events-none" />

      {/* Centerpiece 3D Ship Showcase (Visible in Dockyard mode) */}
      {!currentRoom && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-auto">
          <Suspense
            fallback={
              <div role="status" className="text-xs text-amber-200/80 font-cinzel animate-pulse">
                Rigging vessel model…
              </div>
            }
          >
            <div className="w-full h-full max-w-4xl max-h-[85dvh] flex items-center justify-center">
              <ShipTurntable3D shipClass={selectedShip} />
            </div>
          </Suspense>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl mx-auto shrink-0 z-20">
        <LobbyHeader
          playerName={playerName}
          isConnected={isConnected}
          onPlayerNameChange={setPlayerName}
          onOpenServerModal={() => setShowServerModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto flex-1 min-h-0 flex items-center justify-center my-1 z-20 relative pointer-events-none">
        {currentRoom ? (
          /* Pre-Battle Briefing Wardroom */
          <div className="w-full h-full flex items-center justify-center pointer-events-auto">
            <RoomLobby
              room={currentRoom}
              selfId={selfId}
              isHost={isHost}
              selfPlayer={selfPlayer}
              allCaptainsReady={allCaptainsReady}
              readyCount={readyCount}
              totalCount={totalCount}
              isDeploying={isDeploying}
              onStartGame={handleStartGame}
              onLeaveRoom={async () => {
                const confirmed = await useModalStore.getState().confirm({
                  title: 'ABANDON SQUADRON',
                  message: 'Depart this armada chamber and return to the fleet registry?',
                  confirmLabel: 'Abandon Fleet',
                  cancelLabel: 'Remain',
                  variant: 'danger',
                  icon: 'retreat',
                });
                if (confirmed) {
                  networkClient.leaveRoom();
                }
              }}
            />
          </div>
        ) : (
          /* Dockyard HUD Overlay */
          <div className="w-full h-full flex flex-col justify-between pointer-events-none">
            {/* Top-Left Floating Tactical Specs Card */}
            <div className="self-start pointer-events-auto max-w-[280px] sm:max-w-[340px] pt-1">
              <ShipSelector
                selectedShip={selectedShip}
                onSelectShip={setSelectedShip}
              />
            </div>

            {/* Bottom Floating Action Bar & Fleet Carousel */}
            <div className="w-full flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2 pointer-events-none pb-1">
              {/* Primary Launch / Commission CTAs */}
              <div className="pointer-events-auto flex items-center gap-2 self-end sm:self-auto order-1 sm:order-2">
                <button
                  onClick={() => setShowRoomDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg game-dock border border-amber-500/60 hover:border-amber-400 text-amber-200 font-cinzel font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg active:scale-95"
                >
                  <Anchor className="w-3.5 h-3.5 text-amber-400" />
                  <span>Anchorages ({availableRooms.length})</span>
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 game-action-glow cursor-pointer border border-amber-200/90 active:scale-95"
                >
                  <Swords className="w-4 h-4 stroke-[2.5]" />
                  <span>Commission Fleet</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Fleet Anchorages Ledger (Drawer / Overlay) */}
        {!currentRoom && showRoomDrawer && (
          <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 pointer-events-auto animate-in fade-in duration-150">
            <div className="w-full max-w-xl h-[85dvh] max-h-[440px] flex">
              <RoomList
                rooms={availableRooms}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
                onOpenCreateModal={() => {
                  setShowRoomDrawer(false);
                  setShowCreateModal(true);
                }}
                onJoinRoom={(roomId) => {
                  networkClient.joinRoom(roomId);
                  setShowRoomDrawer(false);
                }}
                onClose={() => setShowRoomDrawer(false)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer: Compact Standing Orders */}
      <footer className="w-full max-w-5xl mx-auto shrink-0 flex items-center justify-between text-amber-300/60 text-[9px] sm:text-[10px] font-fell italic z-20 pt-1 border-t border-amber-600/20">
        <span className="flex items-center gap-1">
          <span className="font-cinzel font-bold not-italic text-amber-400 text-[8px] sm:text-[9px] uppercase">
            Orders:
          </span>
          <span className="hidden sm:inline">[W/S] Sails • [A/D] Rudder • [Q/E] Aim Battery • [Space] Fire</span>
          <span className="sm:hidden">[W/S] Sails • [A/D] Helm • [Space] Fire</span>
        </span>
        <span className="font-cinzel text-[8px] sm:text-[9px] tracking-widest text-amber-400/50 uppercase hidden xs:inline">
          High Seas Fleet Warfare
        </span>
      </footer>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />

      <ServerConfigModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </div>
  );
};
