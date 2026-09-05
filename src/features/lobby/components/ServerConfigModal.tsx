import React, { useState } from 'react';
import { Compass, X } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({ isOpen, onClose }) => {
  const serverUrl = useGameStore((s) => s.serverUrl);
  const [inputUrl, setInputUrl] = useState(serverUrl);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    networkClient.reconnectWithUrl(inputUrl.trim());
    onClose();
  };

  const handleSelectPreset = (url: string) => {
    setInputUrl(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="pirate-parchment border-2 border-amber-600/50 rounded-xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/80" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/80" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/80" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/80" />

        <div className="flex items-center justify-between pb-3.5 border-b border-amber-600/30 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg pirate-panel border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-black text-amber-100 text-lg tracking-wider gold-emboss">
                ADMIRALTY GATEWAY
              </h3>
              <p className="text-[10px] font-fell italic text-amber-200/60">Configure naval dispatch gateway coordinates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400/60 hover:text-amber-200 transition cursor-pointer p-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1">
              WebSocket Beacon URI
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="wss://naval-combat.cekcok.my.id/ws"
              className="w-full bg-stone-950/80 border border-amber-600/40 rounded-md px-3.5 py-2 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-cinzel font-bold text-amber-300 uppercase tracking-widest mb-1.5">
              Charted Station Presets
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('wss://naval-combat.cekcok.my.id/ws')}
                className="w-full text-left p-2.5 rounded-md pirate-panel border border-amber-600/30 hover:border-amber-400 transition cursor-pointer text-xs flex justify-between items-center group"
              >
                <span className="font-cinzel font-bold text-amber-100 group-hover:text-amber-300">
                  Admiralty Fleet Realm (Production)
                </span>
                <span className="font-mono text-[10px] text-amber-400/80">cekcok.my.id</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('ws://localhost:3000/ws')}
                className="w-full text-left p-2.5 rounded-md pirate-panel border border-amber-600/30 hover:border-amber-400 transition cursor-pointer text-xs flex justify-between items-center group"
              >
                <span className="font-cinzel font-bold text-amber-100 group-hover:text-amber-300">
                  Local Anchorage (Dev Server)
                </span>
                <span className="font-mono text-[10px] text-amber-400/80">localhost:3000</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-600/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-cinzel font-bold text-amber-200/60 hover:text-amber-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer border border-amber-300/80 active:scale-95"
            >
              Signal & Reconnect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
