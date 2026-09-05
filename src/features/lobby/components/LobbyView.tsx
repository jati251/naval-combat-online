import React from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useLobby } from '../hooks/useLobby';
import { LobbyHeader } from './LobbyHeader';
import { RoomList } from './RoomList';
import { ShipSelector } from './ShipSelector';
import { RoomLobby } from './RoomLobby';
import { CreateRoomModal } from './CreateRoomModal';
import { ServerConfigModal } from './ServerConfigModal';

export const LobbyView: React.FC = () => {
  const playerName = useGameStore((s) => s.playerName);
  const selectedShip = useGameStore((s) => s.selectedShip);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setSelectedShip = useGameStore((s) => s.setSelectedShip);
  const availableRooms = useGameStore((s) => s.availableRooms);
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const isConnected = useGameStore((s) => s.isConnected);

  const [mobileTab, setMobileTab] = React.useState<'rooms' | 'ships'>('rooms');

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
    <div className="w-full h-full h-[100dvh] max-h-[100dvh] bg-[#0b1626] text-[#f7f0e4] flex flex-col items-center justify-between p-2.5 sm:p-4 md:p-5 relative overflow-hidden select-none">
      {/* Background Ambience: Deep Regal Ocean Map Table with Officer's Lantern Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1d385c_0%,#11233a_55%,#091424_100%)] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[320px] bg-amber-500/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 cartography-grid opacity-45 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-6xl shrink-0 z-10">
        <LobbyHeader
          playerName={playerName}
          isConnected={isConnected}
          onPlayerNameChange={setPlayerName}
          onOpenServerModal={() => setShowServerModal(true)}
        />
      </div>

      {/* Mobile Navigation Tabs for small viewports (< lg) */}
      {!currentRoom && (
        <div className="lg:hidden flex items-center justify-center gap-2 mt-2 z-10 w-full max-w-sm shrink-0">
          <button
            onClick={() => setMobileTab('rooms')}
            className={`flex-1 py-1.5 px-3 rounded-md font-cinzel font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${
              mobileTab === 'rooms'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'pirate-panel border-stone-800 text-stone-400'
            }`}
          >
            ⚓ Anchorages ({availableRooms.length})
          </button>
          <button
            onClick={() => setMobileTab('ships')}
            className={`flex-1 py-1.5 px-3 rounded-md font-cinzel font-bold text-xs uppercase tracking-wider transition-all border cursor-pointer ${
              mobileTab === 'ships'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'pirate-panel border-stone-800 text-stone-400'
            }`}
          >
            🛠 Shipwright
          </button>
        </div>
      )}

      {/* Main Content Area (Strictly contained, no screen scrolling) */}
      <main className="w-full max-w-6xl flex-1 min-h-0 flex items-center justify-center my-1.5 sm:my-2.5 z-10 overflow-hidden">
        {currentRoom ? (
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
            onLeaveRoom={() => networkClient.leaveRoom()}
          />
        ) : (
          <div className="w-full h-full max-h-full flex flex-col lg:flex-row gap-3 lg:gap-5 items-stretch justify-center overflow-hidden">
            {/* Harbor Anchorages / Rooms */}
            <div className={`flex-1 ${mobileTab === 'rooms' ? 'block' : 'hidden lg:block'}`}>
              <RoomList
                rooms={availableRooms}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
                onOpenCreateModal={() => setShowCreateModal(true)}
                onJoinRoom={(roomId) => networkClient.joinRoom(roomId)}
              />
            </div>
            {/* Master Shipwright / Ship Selector */}
            <div className={`${mobileTab === 'ships' ? 'block' : 'hidden lg:block'} flex justify-center`}>
              <ShipSelector
                selectedShip={selectedShip}
                onSelectShip={setSelectedShip}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Instructions: Vintage Helmsman's Standing Orders */}
      <footer className="w-full max-w-6xl shrink-0 flex items-center justify-between text-amber-200/50 text-[10px] sm:text-[11px] font-fell italic z-10 pt-2 border-t border-amber-600/20">
        <span className="flex items-center gap-2">
          <span className="font-cinzel font-bold not-italic text-amber-400 text-[10px] tracking-wider uppercase">
            Standing Helm Orders:
          </span>
          <span>[W/S] Rig Sails • [A/D] Rudder • [Q/E] Aim Battery • [Space / LMB] Salvo Fire</span>
        </span>
        <span className="font-cinzel text-[9px] sm:text-[10px] tracking-widest text-amber-400/60 uppercase">
          Naval Combat Online • Fleet Warfare of the Golden Age
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
