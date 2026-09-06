import React, { useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import { networkClient } from '@/services/networkClient';
import type { RoomPlayer, ShipClass } from '@/types';
import { SHIP_PRESETS } from '@/types';

interface RoomLobbyBottomBarProps {
  isHost: boolean;
  isTeamMode: boolean;
  isDeploying: boolean;
  selfPlayer: RoomPlayer | undefined;
  allCaptainsReady: boolean | undefined;
  readyCount: number;
  totalCount: number;
  onStartGame: () => void;
}

export const RoomLobbyBottomBar: React.FC<RoomLobbyBottomBarProps> = ({
  isHost,
  isTeamMode,
  isDeploying,
  selfPlayer,
  allCaptainsReady,
  readyCount,
  totalCount,
  onStartGame,
}) => {
  const [showShipPicker, setShowShipPicker] = useState(false);

  const currentShipClass = selfPlayer?.shipClass || 'brig';
  const currentShipConfig = SHIP_PRESETS[currentShipClass] || SHIP_PRESETS.brig;

  const handleSelectShip = (cls: ShipClass) => {
    networkClient.selectShip(cls);
    setShowShipPicker(false);
  };

  return (
    <div className="pointer-events-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl game-dock border border-amber-500/50 bg-[#060e18]/95 backdrop-blur-md shadow-2xl shrink-0">
      {/* Left / Top Mobile: Warship Picker & Ready Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
        {/* Warship Picker Dropdown */}
        <div className="relative shrink min-w-0">
          <button
            onClick={() => setShowShipPicker((prev) => !prev)}
            disabled={selfPlayer?.isReady}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg border transition-all cursor-pointer ${
              selfPlayer?.isReady
                ? 'bg-black/40 border-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-black/50 border-amber-500/40 hover:border-amber-400 text-amber-100 hover:bg-[#122238] shadow active:scale-95'
            }`}
            title="Change your chosen warship before readying up"
          >
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-[7px] sm:text-[8px] font-cinzel font-bold text-amber-400/80 uppercase">Active Vessel</div>
              <div className="font-cinzel font-black text-[11px] sm:text-xs text-white capitalize truncate max-w-[80px] sm:max-w-none">
                {currentShipConfig.name}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0 ml-0.5" />
          </button>

          {/* Quick Ship Selection Popover */}
          {showShipPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 p-1.5 sm:p-2 rounded-xl game-dock border border-amber-500/60 bg-[#071322]/98 shadow-2xl z-50 flex flex-col gap-1 max-h-48 sm:max-h-56 overflow-y-auto scrollbar-thin">
              <div className="text-[8.5px] sm:text-[9px] font-cinzel font-bold text-amber-300 uppercase pb-1 border-b border-amber-500/30">
                Select Fleet Vessel
              </div>
              {(Object.keys(SHIP_PRESETS) as ShipClass[]).map((cls) => {
                const cfg = SHIP_PRESETS[cls];
                const isSelected = cls === currentShipClass;
                return (
                  <button
                    key={cls}
                    onClick={() => handleSelectShip(cls)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600/40 border-amber-400 text-white shadow'
                        : 'bg-black/30 border-amber-600/20 hover:border-amber-400 text-amber-100 hover:bg-white/5'
                    }`}
                  >
                    <span className="font-cinzel font-bold text-[11px] sm:text-xs capitalize">{cfg.name}</span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-amber-300 font-bold">{cfg.cannonsPerSide * 2} Guns</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Switch & Ready Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isTeamMode && (
            <button
              onClick={() => networkClient.switchTeam()}
              disabled={isDeploying}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider transition border shadow active:scale-95 cursor-pointer ${
                selfPlayer?.team === 'red'
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 hover:bg-rose-900/80'
                  : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200 hover:bg-cyan-900/80'
              }`}
              title="Switch fleet color"
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{selfPlayer?.team === 'red' ? 'Blue' : 'Red'}</span>
            </button>
          )}

          <button
            onClick={() => networkClient.setReady(!selfPlayer?.isReady)}
            disabled={isDeploying}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-6 py-1 sm:py-2 rounded-lg font-cinzel font-black text-[10.5px] sm:text-xs uppercase tracking-wider transition-all border shadow-lg cursor-pointer active:scale-95 ${
              selfPlayer?.isReady
                ? 'bg-emerald-600/40 hover:bg-emerald-600/60 border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-emerald-300'
                : 'bg-gradient-to-b from-amber-600/40 to-amber-950/90 hover:from-amber-500/50 hover:to-amber-900 border-amber-400/80 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
            }`}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${selfPlayer?.isReady ? 'text-emerald-300' : 'text-amber-400'}`} />
            <span>{selfPlayer?.isReady ? 'Ready!' : 'Sign Ready'}</span>
          </button>
        </div>
      </div>

      {/* Right / Bottom Mobile: Host Launch Battle CTA */}
      {isHost ? (
        <div className="flex flex-col sm:items-end gap-0.5 w-full sm:w-auto">
          <button
            onClick={onStartGame}
            disabled={isDeploying}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-1.5 sm:py-2.5 rounded-lg font-cinzel font-black text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all shadow-xl cursor-pointer border active:scale-95 ${
              isDeploying
                ? 'bg-amber-900 text-stone-950 cursor-wait opacity-90 border-amber-700'
                : allCaptainsReady
                ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 hover:from-amber-200 hover:to-amber-600 text-stone-950 border-amber-200/90 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
                : 'bg-stone-900/90 text-stone-400 border-stone-800 hover:border-amber-600/40 hover:text-amber-200'
            }`}
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-950" />
                <span>Deploying…</span>
              </>
            ) : (
              <>
                <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>WEIGH ANCHOR & ENGAGE</span>
              </>
            )}
          </button>
          <span className="text-[7.5px] sm:text-[8.5px] font-fell italic text-amber-200/60 text-center sm:text-right">
            {readyCount} of {totalCount} Captains Prepared
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-fell italic text-amber-300/80 px-2.5 py-1 rounded-lg border border-amber-600/30 bg-black/40 w-full sm:w-auto">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
          <span>Awaiting Commodore's signal gun…</span>
        </div>
      )}
    </div>
  );
};
