import React, { useState } from 'react';
import { Compass } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scaleUp">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cinzel font-black text-amber-200 text-lg tracking-wider">
              SERVER ENDPOINT
            </h3>
            <p className="text-xs text-slate-400">Configure WebSocket gateway address</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              WebSocket URL
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="wss://naval-combat.cekcok.my.id/ws"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Switch Presets
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('wss://naval-combat.cekcok.my.id/ws')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer text-xs flex justify-between items-center"
              >
                <span className="font-bold text-slate-300">Live Production Server</span>
                <span className="font-mono text-[10px] text-cyan-400">cekcok.my.id</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('ws://localhost:3000/ws')}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer text-xs flex justify-between items-center"
              >
                <span className="font-bold text-slate-300">Local Dev Server</span>
                <span className="font-mono text-[10px] text-amber-400">localhost:3000</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              Save & Reconnect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
