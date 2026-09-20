import React, { useState, useEffect } from 'react';
import { MAP_LIST } from '../maps';
import { MapBaker } from '../services/mapBaker';

export const DevMapBaker: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to bake maps');
  const [isBaking, setIsBaking] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);

  const runBake = async () => {
    setIsBaking(true);
    const done: string[] = [];

    for (let i = 0; i < MAP_LIST.length; i++) {
      const mapDef = MAP_LIST[i];
      setStatus(`Baking 3D top-down map for: ${mapDef.name} (${i + 1}/${MAP_LIST.length})...`);
      // Allow DOM to update
      await new Promise((r) => setTimeout(r, 60));

      const dataUrl = MapBaker.exportMapAsDataUrl(mapDef, 1024);
      if (!dataUrl) {
        console.error(`Failed baking map ${mapDef.id}`);
        continue;
      }

      try {
        const res = await fetch('/__api/save-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapId: mapDef.id, dataUrl }),
        });
        if (res.ok) {
          done.push(mapDef.id);
          setCompleted([...done]);
        }
      } catch (err) {
        console.error(`Error saving map ${mapDef.id}:`, err);
      }
    }

    setStatus(`All ${done.length} maps successfully baked to public/maps/!`);
    setIsBaking(false);
  };

  useEffect(() => {
    // Auto-trigger if query param present
    if (typeof window !== 'undefined' && window.location.search.includes('bake-maps=true')) {
      runBake();
    }
  }, []);

  return (
    <div id="dev-map-baker" className="fixed bottom-4 right-4 z-50 bg-stone-900/95 border border-amber-500/50 p-3 rounded-lg shadow-xl text-xs font-mono text-amber-200 flex flex-col gap-2 max-w-xs">
      <div className="font-bold text-amber-400">Map Baker Utility (Dev)</div>
      <div className="text-stone-300">{status}</div>
      <div className="flex gap-1 flex-wrap">
        {completed.map((id) => (
          <span key={id} className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
            ✓ {id}
          </span>
        ))}
      </div>
      <button
        type="button"
        disabled={isBaking}
        onClick={runBake}
        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded cursor-pointer disabled:opacity-50"
      >
        {isBaking ? 'Baking in progress...' : 'Bake All 6 Maps Now'}
      </button>
    </div>
  );
};
