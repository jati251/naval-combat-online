import React, { useState } from 'react';
import {
  Swords,
  Sun,
  Moon,
  Dices,
  Trophy,
  Users,
  Shield,
  Compass,
  Anchor,
  Landmark,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { MapId } from '@/types';
import { MAP_LIST } from '@/features/battle/maps';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    roomName: string,
    maxPlayers: number,
    timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM',
    targetKills: number,
    gameMode: 'FFA' | 'TEAM',
    mapId: MapId
  ) => boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [roomName, setRoomName] = useState('');
  const maxPlayers = 16;
  const [targetKills, setTargetKills] = useState(20);
  const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT' | 'RANDOM'>('DAY');
  const [gameMode, setGameMode] = useState<'FFA' | 'TEAM'>('FFA');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('caribbean');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onCreate(roomName, maxPlayers, timeOfDay, targetKills, gameMode, selectedMapId);
    if (success) {
      setRoomName('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LETTERS OF MARQUE"
      subtitle="Commission a naval fleet for deathmatch combat"
      icon={<Swords className="w-5 h-5 text-amber-300" />}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 text-amber-100">
        {/* Fleet Anchorage Designation */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
            Anchorage Designation
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Tortuga Buccaneers"
            className="w-full bg-[#0c1726] border border-amber-500/50 rounded-lg px-3.5 py-2 font-fell text-sm sm:text-base text-amber-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition shadow-inner"
            maxLength={24}
            autoFocus
          />
        </div>

        {/* Naval Theater & Charted Waters (Full-Width High-Legibility Cards) */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Naval Theater & Charted Waters</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400/90 font-bold uppercase tracking-wider">
              {MAP_LIST.find((m) => m.id === selectedMapId)?.tacticalTag}
            </span>
          </label>

          <div className="flex flex-col gap-2">
            {MAP_LIST.map((m) => {
              const isSelected = selectedMapId === m.id;
              const isCaribbean = m.id === 'caribbean';
              const isKingston = m.id === 'kingston';
              const isMexico = m.id === 'mexico';

              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedMapId(m.id)}
                  className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 sm:gap-3 group relative overflow-hidden ${
                    isSelected
                      ? isKingston
                        ? 'bg-gradient-to-r from-sky-950/90 via-[#0d2238]/90 to-[#091829]/95 border-2 border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.35)] ring-1 ring-sky-300'
                        : isMexico
                        ? 'bg-gradient-to-r from-emerald-950/90 via-[#0a2822]/90 to-[#081e1a]/95 border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.35)] ring-1 ring-emerald-300'
                        : 'bg-gradient-to-r from-amber-950/90 via-[#26170a]/90 to-[#140e06]/95 border-2 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-300'
                      : 'bg-[#0e1a2b]/80 border border-amber-500/30 hover:border-amber-400/60 hover:bg-[#13233a]/80'
                  }`}
                >
                  {/* Left: Map Thematic Icon & Details */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? isKingston
                            ? 'bg-sky-900/80 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                            : isMexico
                            ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                            : 'bg-amber-900/80 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-[#142338] border-amber-500/30 text-amber-400/70 group-hover:text-amber-200'
                      }`}
                    >
                      {isCaribbean && <Anchor className="w-5 h-5" />}
                      {isKingston && <Shield className="w-5 h-5" />}
                      {isMexico && <Landmark className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel font-black text-xs sm:text-sm tracking-wide text-amber-100 group-hover:text-white">
                          {m.name}
                        </span>
                        <span
                          className={`text-[8px] sm:text-[9px] font-cinzel font-bold px-1.5 py-0.2 rounded border ${
                            isKingston
                              ? 'bg-sky-950/80 text-sky-300 border-sky-600/60'
                              : isMexico
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                              : 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                          }`}
                        >
                          {m.tacticalTag}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-fell italic text-amber-200/85 mt-0.5 line-clamp-1">
                        {m.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Island Specs & Radio Checkmark */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="hidden xs:flex flex-col items-end text-right">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300/90">
                        {m.islands.length} Islands
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-fell italic text-amber-200/60">
                        {m.shipwrecks.length} Shipwrecks
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? isKingston
                            ? 'border-sky-400 bg-sky-500 text-stone-950 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                            : isMexico
                            ? 'border-emerald-400 bg-emerald-500 text-stone-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                            : 'border-amber-400 bg-amber-500 text-stone-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                          : 'border-stone-600 bg-stone-900/60'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Battle Engagement Mode */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1 sm:mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Engagement Protocol</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGameMode('FFA')}
              className={`py-2 px-3 rounded-lg text-xs font-cinzel font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                gameMode === 'FFA'
                  ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                  : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-300" />
                <span>Free For All</span>
              </span>
              <span className="text-[9px] font-fell italic text-amber-200/70 mt-0.5">
                Every Captain for Himself
              </span>
            </button>
            <button
              type="button"
              onClick={() => setGameMode('TEAM')}
              className={`py-2 px-3 rounded-lg text-xs font-cinzel font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                gameMode === 'TEAM'
                  ? 'bg-gradient-to-b from-cyan-800/40 to-blue-950/85 border-2 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)] ring-1 ring-cyan-300'
                  : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Armada Clash</span>
              </span>
              <span className="text-[9px] font-fell italic text-cyan-200/70 mt-0.5">
                Red vs Blue Fleets
              </span>
            </button>
          </div>
        </div>

        {/* Deathmatch Victory Goal */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1 sm:mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Deathmatch Victory Goal</span>
            </span>
            <span className="text-amber-300 font-mono font-bold text-xs">First to {targetKills} Sinks</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[20, 50, 100].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => setTargetKills(num)}
                className={`py-1.5 sm:py-2 rounded-lg text-xs font-cinzel font-bold border transition cursor-pointer flex flex-col items-center ${
                  targetKills === num
                    ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                    : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white hover:border-amber-400/60'
                }`}
              >
                <span className="font-mono text-xs sm:text-sm font-black">{num}</span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-amber-300/80">Sinks</span>
              </button>
            ))}
          </div>
        </div>

        {/* Battle Atmosphere & Weather */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
            Battle Atmosphere & Weather
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTimeOfDay('DAY')}
              className={`py-2 px-2 rounded-lg text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                timeOfDay === 'DAY'
                  ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                  : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Noon Tide</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeOfDay('NIGHT')}
              className={`py-2 px-2 rounded-lg text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                timeOfDay === 'NIGHT'
                  ? 'bg-gradient-to-b from-indigo-600/35 to-indigo-950/80 border-2 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-300'
                  : 'bg-[#142338]/85 border border-indigo-500/30 text-indigo-200 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Moonlit</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeOfDay('RANDOM')}
              className={`py-2 px-2 rounded-lg text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                timeOfDay === 'RANDOM'
                  ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                  : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
              }`}
            >
              <Dices className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Fortune</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-cinzel font-bold text-amber-200/80 hover:text-white transition cursor-pointer"
          >
            Withdraw
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer border border-amber-300/80 active:scale-95"
          >
            Commission Fleet
          </button>
        </div>
      </form>
    </Modal>
  );
};
