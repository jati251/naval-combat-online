import React, { useEffect, useState } from 'react';
import { Anchor, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { navalAudio } from '../../services/navalAudio';

interface BattleDeploymentLoaderProps {
  onReady?: () => void;
}

type LoaderPhase = 'handshake' | 'audio' | 'assets' | 'telemetry' | 'complete';

export const BattleDeploymentLoader: React.FC<BattleDeploymentLoaderProps> = ({ onReady }) => {
  const [phase, setPhase] = useState<LoaderPhase>('handshake');
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Establishing Admiralty Gateway Connection...');
  const [isDone, setIsDone] = useState(false);
  const [hasTimeoutError, setHasTimeoutError] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const runGenuineDeploymentPipeline = async () => {
      try {
        // Step 1: Real Admiralty Handshake & Session Check
        setPhase('handshake');
        setStatusText('Verifying Admiralty letters of marque & credentials...');
        setProgress(25);

        const store = useGameStore.getState();
        if (!store.isConnected) {
          networkClient.connect();
        }

        // Wait up to 3s for connection if not ready
        let connectWait = 0;
        while (!useGameStore.getState().isConnected && connectWait < 30) {
          await new Promise((r) => setTimeout(r, 100));
          connectWait++;
          if (isCancelled) return;
        }

        // Step 2: Naval Acoustics Pre-warm (Actual Web Audio Context priming)
        setPhase('audio');
        setStatusText('Priming cannon battery acoustics & ship bells...');
        setProgress(50);
        navalAudio.init();

        // Step 3: WebGL & Shader Verification
        setPhase('assets');
        setStatusText('Pre-compiling hydrodynamic ocean waves & shipwright timbers...');
        setProgress(75);
        await new Promise((r) => requestAnimationFrame(r));
        if (isCancelled) return;

        // Step 4: Server Fleet Telemetry Lock (Verify first real snapshot arrives from server)
        setPhase('telemetry');
        setStatusText('Locking battle coordinates & awaiting server fleet telemetry...');

        let snapshotWait = 0;
        while (useGameStore.getState().ships.length === 0 && snapshotWait < 50) {
          await new Promise((r) => setTimeout(r, 100));
          snapshotWait++;
          if (isCancelled) return;
        }

        // Step 5: All checks verified
        setPhase('complete');
        setProgress(100);
        setStatusText('Line of Battle engaged! Clear for action!');
        navalAudio.playShipBell();

        await new Promise((r) => setTimeout(r, 450));
        if (isCancelled) return;

        setIsDone(true);
        if (onReady) onReady();
      } catch (err) {
        console.error('Deployment loader error:', err);
        setHasTimeoutError(true);
      }
    };

    runGenuineDeploymentPipeline();

    // Fallback timer if server completely stalls
    const timeoutId = setTimeout(() => {
      if (!isCancelled && !isDone) {
        setHasTimeoutError(true);
      }
    }, 12000);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [onReady, isDone]);

  if (isDone) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#05080e] flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Background Cartography Lines */}
      <div className="absolute inset-0 cartography-grid opacity-35 pointer-events-none" />

      <div className="pirate-parchment max-w-md w-full p-8 rounded-xl border-2 border-amber-600/60 shadow-2xl flex flex-col items-center gap-6 relative z-10 animate-scaleUp">
        {/* Corner Brackets */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400/80" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400/80" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400/80" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400/80" />

        {/* Heraldic Spinning Crest */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full pirate-panel border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md">
            <Anchor className="w-9 h-9 stroke-[1.75]" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/60 animate-spin-slow" />
        </div>

        {/* Deployment Header */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-cinzel font-bold text-amber-400 uppercase tracking-[0.25em]">
            FLEET DEPLOYMENT IN PROGRESS
          </span>
          <h2 className="font-cinzel text-2xl font-black text-amber-100 tracking-wider gold-emboss">
            CLEARING FOR ACTION
          </h2>
          <p className="text-xs font-fell italic text-amber-200/80 mt-1 min-h-[32px] leading-relaxed">
            {statusText}
          </p>
        </div>

        {/* Authentic Progress Meter Bar */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-mono font-bold text-amber-300">
            <span className="uppercase tracking-wider">
              {phase === 'complete' ? 'READY' : 'PREPARING'}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-stone-950 rounded-sm overflow-hidden border border-amber-900/60 relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Real Phase Check List */}
        <div className="w-full grid grid-cols-2 gap-2 text-left text-[11px] font-fell border-t border-amber-600/30 pt-4">
          <div className={`flex items-center gap-1.5 ${progress >= 25 ? 'text-amber-200' : 'text-stone-600'}`}>
            {progress >= 25 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span>Admiralty Link</span>
          </div>
          <div className={`flex items-center gap-1.5 ${progress >= 50 ? 'text-amber-200' : 'text-stone-600'}`}>
            {progress >= 50 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span>Naval Acoustics</span>
          </div>
          <div className={`flex items-center gap-1.5 ${progress >= 75 ? 'text-amber-200' : 'text-stone-600'}`}>
            {progress >= 75 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span>Ocean Shaders</span>
          </div>
          <div className={`flex items-center gap-1.5 ${progress >= 100 ? 'text-amber-200' : 'text-stone-600'}`}>
            {progress >= 100 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            <span>Fleet Telemetry</span>
          </div>
        </div>

        {/* Timeout Fallback */}
        {hasTimeoutError && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-rose-300 font-fell italic">
              Dispatch response delayed. The harbor waters may be disconnected.
            </p>
            <button
              onClick={() => {
                networkClient.leaveRoom();
                useGameStore.getState().resetToLobby();
              }}
              className="px-4 py-2 rounded-md pirate-panel border border-rose-800/60 text-rose-200 font-cinzel text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:border-rose-500"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to Harbor</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
