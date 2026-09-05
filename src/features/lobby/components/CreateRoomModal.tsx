import React, { useState } from 'react';
import { Swords, Sun, Moon, Dices, Trophy, Users, Shield } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    roomName: string,
    maxPlayers: number,
    timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM',
    targetKills: number,
    gameMode: 'FFA' | 'TEAM'
  ) => boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [targetKills, setTargetKills] = useState(5);
  const [timeOfDay, setTimeOfDay] = useState<'DAY' | 'NIGHT' | 'RANDOM'>('DAY');
  const [gameMode, setGameMode] = useState<'FFA' | 'TEAM'>('FFA');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onCreate(roomName, maxPlayers, timeOfDay, targetKills, gameMode);
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
      icon={<Swords className="w-5 h-5" />}
    >

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fleet Anchorage Name */}
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
              Anchorage Designation
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Tortuga Buccaneers"
              className="w-full bg-[#0e1929] border border-amber-500/40 rounded-md px-3.5 py-2 font-fell text-sm text-amber-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400 transition"
              maxLength={24}
              autoFocus
            />
          </div>

          {/* Battle Engagement Mode */}
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Engagement Protocol</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGameMode('FFA')}
                className={`py-2 px-2.5 rounded-md text-xs font-cinzel font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                  gameMode === 'FFA'
                    ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                    : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-300" />
                  <span>Free For All</span>
                </span>
                <span className="text-[9px] font-fell italic text-amber-200/70 mt-0.5">Every Captain for Himself</span>
              </button>
              <button
                type="button"
                onClick={() => setGameMode('TEAM')}
                className={`py-2 px-2.5 rounded-md text-xs font-cinzel font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                  gameMode === 'TEAM'
                    ? 'bg-gradient-to-b from-cyan-800/40 to-blue-950/85 border-2 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)] ring-1 ring-cyan-300'
                    : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Armada Clash</span>
                </span>
                <span className="text-[9px] font-fell italic text-cyan-200/70 mt-0.5">Red vs Blue Fleets</span>
              </button>
            </div>
          </div>

          {/* Deathmatch Victory Goal */}
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Deathmatch Victory Goal</span>
              </span>
              <span className="text-amber-300 font-mono font-bold">First to {targetKills} Sinks</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[3, 5, 8, 10].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setTargetKills(num)}
                  className={`py-2 rounded-md text-xs font-cinzel font-bold border transition cursor-pointer flex flex-col items-center ${
                    targetKills === num
                      ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)] ring-1 ring-amber-300'
                      : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white hover:border-amber-400/60'
                  }`}
                >
                  <span className="font-mono text-sm font-black">{num}</span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-300/80">Sinks</span>
                </button>
              ))}
            </div>
          </div>

          {/* Battle Atmosphere */}
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
              Battle Atmosphere & Weather
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimeOfDay('DAY')}
                className={`py-2 px-2 rounded-md text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  timeOfDay === 'DAY'
                    ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                    : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Noon Tide</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('NIGHT')}
                className={`py-2 px-2 rounded-md text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  timeOfDay === 'NIGHT'
                    ? 'bg-gradient-to-b from-indigo-600/35 to-indigo-950/80 border-2 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-300'
                    : 'bg-[#142338]/85 border border-indigo-500/30 text-indigo-200 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Moonlit</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('RANDOM')}
                className={`py-2 px-2 rounded-md text-xs font-cinzel font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  timeOfDay === 'RANDOM'
                    ? 'bg-gradient-to-b from-amber-600/35 to-amber-950/80 border-2 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-1 ring-amber-300'
                    : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
                }`}
              >
                <Dices className="w-3.5 h-3.5 text-amber-300" />
                <span>Fortune</span>
              </button>
            </div>
          </div>

          {/* Max Warships */}
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
              Armada Warship Capacity
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {[2, 4, 6, 8, 12, 16].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setMaxPlayers(num)}
                  className={`py-1.5 rounded-md text-xs font-mono font-bold border transition cursor-pointer ${
                    maxPlayers === num
                      ? 'bg-amber-600/35 border-2 border-amber-400 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-[#142338]/85 border border-amber-500/30 text-amber-100 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-cinzel font-bold text-amber-200/80 hover:text-white transition cursor-pointer"
            >
              Withdraw
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer border border-amber-300/80 active:scale-95"
            >
              Commission Fleet
            </button>
          </div>
        </form>
    </Modal>
  );
};
