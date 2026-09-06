import React from 'react';
import { Tv, Monitor, Maximize2, Check } from 'lucide-react';
import { useGraphicsQuality } from '../hooks/useGraphicsQuality';
import type { ResolutionLimit } from '../types';

interface ResolutionOption {
  id: ResolutionLimit;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  hint: string;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: '720p',
    label: '720p HD',
    sublabel: 'Max 720p',
    icon: <Tv className="w-4 h-4 text-amber-300" />,
    hint: 'Ultra-cool & battery saving for hot laptops',
  },
  {
    id: '1080p',
    label: '1080p FHD',
    sublabel: 'Max 1080p',
    icon: <Monitor className="w-4 h-4 text-amber-300" />,
    hint: 'Recommended balance of crisp visuals & stable 60 FPS',
  },
  {
    id: 'native',
    label: 'Native',
    sublabel: 'Retina / 4K',
    icon: <Maximize2 className="w-4 h-4 text-amber-300" />,
    hint: 'Uncapped panel resolution for dedicated gaming GPUs',
  },
];

export const ResolutionSelector: React.FC = () => {
  const { resolutionLimit, setResolutionLimit } = useGraphicsQuality();

  return (
    <div className="space-y-1.5 pt-2 border-t border-amber-600/25">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-wider">
          Resolution Limit
        </span>
        <span className="text-[9.5px] font-fell text-amber-200/60 italic">
          {RESOLUTION_OPTIONS.find((r) => r.id === resolutionLimit)?.hint}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {RESOLUTION_OPTIONS.map((opt) => {
          const isSelected = resolutionLimit === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setResolutionLimit(opt.id)}
              className={`py-2.5 px-2 rounded-lg text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1 border ${
                isSelected
                  ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/80 text-amber-100'
                  : 'bg-stone-950/70 border-amber-600/30 hover:border-amber-400/50 hover:bg-stone-900/60 text-stone-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className="w-5 h-5 rounded flex items-center justify-center">
                {opt.icon}
              </div>
              <span className="font-cinzel font-bold text-xs uppercase tracking-wider leading-tight">
                {opt.label}
              </span>
              <span className="text-[9px] font-fell text-amber-200/50 block -mt-0.5">
                {opt.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
