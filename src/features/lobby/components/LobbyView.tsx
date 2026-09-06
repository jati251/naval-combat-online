import React, { useState, lazy, Suspense } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { useLobby } from '../hooks/useLobby';
import { LobbyHeader } from './LobbyHeader';
import { ShipSpecsCard, ShipCarousel } from './ShipSelector';
import { LobbyConsole, type LobbyConsoleTab } from './LobbyConsole';
import { RoomLobby } from './RoomLobby';
import { Swords, Eye } from 'lucide-react';

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

  // Integrated War Room Console state (Zero Modals)
  const [consoleTab, setConsoleTab] = useState<LobbyConsoleTab>('anchorages');
  const [showConsoleOnMobile, setShowConsoleOnMobile] = useState(true);

  const {
    isRefreshing,
    isDeploying,
    selfPlayer,
    isHost,
    allCaptainsReady,
    readyCount,
    totalCount,
    handleRefresh,
    handleStartGame,
    handleCreateRoom,
  } = useLobby();

  const handleOpenGateway = () => {
    setConsoleTab('gateway');
    setShowConsoleOnMobile(true);
  };

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-[#070e17] text-[#f7f0e4] flex flex-col justify-between p-1.5 sm:p-2.5 relative overflow-hidden select-none">
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
      <div className="w-full max-w-6xl mx-auto shrink-0 z-20">
        <LobbyHeader
          playerName={playerName}
          isConnected={isConnected}
          onPlayerNameChange={setPlayerName}
          onOpenGateway={handleOpenGateway}
        />
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex items-center justify-center my-1 z-20 relative pointer-events-none">
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
              onLeaveRoom={() => {
                networkClient.leaveRoom();
              }}
            />
          </div>
        ) : (
          /* Dockyard HUD: Split Cockpit Layout (No Modals) */
          <div className="w-full h-full flex flex-col justify-between pointer-events-none">
            {/* Top Stage: Left Tactical Specs & Right War Room Console */}
            <div className="w-full flex-1 min-h-0 flex items-start justify-between gap-2 sm:gap-4 pointer-events-none pt-0.5">
              {/* Left: Vessel Tactical Specs & Attributes */}
              <div className="pointer-events-auto w-[210px] sm:w-[260px] md:w-[290px] shrink-0">
                <ShipSpecsCard selectedShip={selectedShip} />
              </div>

              {/* Mobile Console Toggle Trigger */}
              <div className="pointer-events-auto block md:hidden self-start">
                <button
                  onClick={() => setShowConsoleOnMobile((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg game-dock border border-amber-500/60 text-amber-200 font-cinzel font-bold text-[10px] uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                >
                  {showConsoleOnMobile ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Inspect Ship</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-3.5 h-3.5 text-amber-400" />
                      <span>War Room</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Integrated War Room Tactical Console (NO MODALS) */}
              <div
                className={`pointer-events-auto shrink-0 transition-all duration-200 ${
                  showConsoleOnMobile ? 'flex' : 'hidden md:flex'
                }`}
              >
                <LobbyConsole
                  rooms={availableRooms}
                  isRefreshing={isRefreshing}
                  activeTab={consoleTab}
                  onTabChange={setConsoleTab}
                  onRefresh={handleRefresh}
                  onJoinRoom={(roomId) => networkClient.joinRoom(roomId)}
                  onCreateRoom={(name, maxP, tod, kills, mode, map) => {
                    return handleCreateRoom(name, maxP, tod, kills, mode, map);
                  }}
                />
              </div>
            </div>

            {/* Bottom Stage: Horizontal Fleet Carousel Strip */}
            <div className="w-full pointer-events-auto pb-0.5 shrink-0">
              <ShipCarousel
                selectedShip={selectedShip}
                onSelectShip={setSelectedShip}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer: Compact Standing Orders & High Seas Legend */}
      <footer className="w-full max-w-6xl mx-auto shrink-0 flex items-center justify-between text-amber-300/60 text-[8.5px] sm:text-[9.5px] font-fell italic z-20 pt-0.5 border-t border-amber-600/20">
        <span className="flex items-center gap-1">
          <span className="font-cinzel font-bold not-italic text-amber-400 text-[8px] sm:text-[8.5px] uppercase">
            Orders:
          </span>
          <span className="hidden sm:inline">[W/S] Sails • [A/D] Helm • [Q/E] Guns • [Space] Fire</span>
          <span className="sm:hidden">[W/S] Sails • [A/D] Helm • [Space] Fire</span>
        </span>
        <span className="font-cinzel text-[7.5px] sm:text-[8.5px] tracking-widest text-amber-400/50 uppercase hidden xs:inline">
          High Seas Fleet Warfare
        </span>
      </footer>
    </div>
  );
};
