import React from 'react';
import { Zap, Monitor, Sparkles, Check } from 'lucide-react';
import { useGraphicsQuality } from '../hooks/useGraphicsQuality';
import { GRAPHIC_QUALITY_LIST } from '../config/graphicProfiles';
import type { GraphicQuality } from '../types';

const PRESET_ICONS: Record<GraphicQuality, React.ReactNode> = {
  fast: <Zap className="w-4 h-4 text-amber-300" />,
  balanced: <Monitor className="w-4 h-4 text-amber-300" />,
  performance: <Sparkles className="w-4 h-4 text-amber-300" />,
};

const PRESET_LABELS: Record<GraphicQuality, string> = {
  fast: 'Fast',
  balanced: 'Balanced',
  performance: 'Performance',
};

export const GraphicQualitySelector: React.FC = () => {
  const { quality, setQuality } = useGraphicsQuality();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-wider">
          Graphics Quality
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {GRAPHIC_QUALITY_LIST.map((tier) => {
          const isSelected = quality === tier;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => setQuality(tier)}
              className={`py-3 px-2 rounded-lg text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1.5 border ${
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
              <div className="w-6 h-6 rounded flex items-center justify-center">
                {PRESET_ICONS[tier]}
              </div>
              <span className="font-cinzel font-bold text-xs uppercase tracking-wider">
                {PRESET_LABELS[tier]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
