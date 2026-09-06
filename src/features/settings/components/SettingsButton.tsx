import React from 'react';
import { Sliders } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface SettingsButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  className = '',
  showLabel = true,
}) => {
  const openSettings = useSettingsStore((s) => s.openSettings);

  return (
    <button
      type="button"
      onClick={openSettings}
      className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 border border-amber-600/40 text-amber-200/90 hover:text-amber-100 hover:border-amber-400 transition cursor-pointer text-xs group active:scale-95 ${className}`}
      title="Admiralty Shipwright Settings (Graphic Quality, Audio)"
      aria-label="Open Settings"
    >
      <Sliders className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
      {showLabel && (
        <span className="text-[9px] font-mono tracking-wider text-amber-200/80 font-bold uppercase hidden sm:inline">
          SETTINGS
        </span>
      )}
    </button>
  );
};
