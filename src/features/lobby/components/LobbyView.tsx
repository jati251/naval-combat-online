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
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 relative overflow-x-hidden">
      {/* Background Ambience / Radial Ocean Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0c2538_0%,#020617_70%)] pointer-events-none" />

      {/* Top Header Bar */}
      <LobbyHeader
        playerName={playerName}
        isConnected={isConnected}
        onPlayerNameChange={setPlayerName}
        onOpenServerModal={() => setShowServerModal(true)}
      />

      {/* Main Content Area */}
      <main className="w-full max-w-6xl my-auto py-6 flex items-center justify-center z-10">
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
          <div className="w-full flex gap-6 items-stretch justify-center">
            <RoomList
              rooms={availableRooms}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
              onOpenCreateModal={() => setShowCreateModal(true)}
              onJoinRoom={(roomId) => networkClient.joinRoom(roomId)}
            />
            <ShipSelector
              selectedShip={selectedShip}
              onSelectShip={setSelectedShip}
            />
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="w-full max-w-6xl flex items-center justify-between text-slate-500 text-[11px] font-mono z-10 pt-4 border-t border-slate-900">
        <span>Controls: W/S Sails • A/D Steer • Q/E Aim Broadside • Space/Click Fire</span>
        <span>Naval Combat Online v2.4 • WebGL & uWebSockets</span>
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
