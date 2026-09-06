import React from 'react';
import { Sliders, Volume2, VolumeX } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSettingsStore } from '../stores/useSettingsStore';
import { GraphicQualitySelector } from './GraphicQualitySelector';
import { useGameStore } from '@/stores/useGameStore';

export const SettingsModal: React.FC = () => {
  const isOpen = useSettingsStore((s) => s.isSettingsOpen);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const isMuted = useGameStore((s) => s.isMuted);
  const setMuted = useGameStore((s) => s.setMuted);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeSettings}
      title="SETTINGS"
      subtitle="Graphics and naval audio preferences"
      icon={<Sliders className="w-4 h-4 text-amber-400" />}
      maxWidth="max-w-lg"
      footer={
        <button
          type="button"
          onClick={closeSettings}
          className="w-full sm:w-auto px-5 py-1.5 rounded bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs uppercase tracking-wider shadow cursor-pointer border border-amber-300 active:scale-95 transition"
        >
          Apply & Close
        </button>
      }
    >
      <div className="space-y-3.5 py-1">
        {/* Graphic Quality 3-Tier Selector */}
        <GraphicQualitySelector />

        {/* Audio Section */}
        <div className="pt-2 border-t border-amber-600/25">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-950/60 border border-amber-600/30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-stone-900 border border-amber-600/30 flex items-center justify-center text-amber-300 shrink-0">
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
              </div>
              <div>
                <span className="text-xs font-cinzel font-bold text-amber-100 block leading-tight">
                  Master Sound & Sea Bell
                </span>
                <span className="text-[9.5px] font-fell text-amber-200/60 italic block">
                  {isMuted ? 'Acoustics muted' : 'Cannons, waves & wind ambience'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMuted(!isMuted)}
              className={`px-3 py-1 rounded text-[10px] font-cinzel font-bold uppercase transition cursor-pointer border ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              {isMuted ? 'Muted' : 'Sound On'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
