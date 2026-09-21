import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/** Opt-in frame pacing diagnostics for real battles: append ?perf=1 to the URL. */
export function FrameTiming() {
  const output = useRef<HTMLOutputElement | null>(null);
  const samples = useRef<number[]>([]);
  const elapsed = useRef(0);
  useEffect(() => {
    const element = document.createElement('output');
    element.style.cssText = 'position:fixed;bottom:4px;left:4px;z-index:9999;background:#000c;color:white;padding:6px;font:11px monospace;pointer-events:none';
    element.textContent = 'Collecting frame timings…';
    document.body.appendChild(element);
    output.current = element;
    return () => { element.remove(); output.current = null; };
  }, []);
  useFrame(({ viewport, gl }, delta) => {
    if (document.hidden || delta > 1) { samples.current.length = 0; elapsed.current = 0; return; }
    samples.current.push(delta * 1000);
    elapsed.current += delta;
    if (elapsed.current < 3 || !output.current) return;
    const values = samples.current.sort((a, b) => a - b);
    output.current.textContent = `${(values.length / elapsed.current).toFixed(1)} FPS · p95 ${values[Math.floor(values.length * 0.95)].toFixed(1)}ms · max ${values[values.length - 1].toFixed(1)}ms · >50ms ${values.filter(v => v > 50).length} · DPR ${viewport.dpr.toFixed(2)} · ${gl.domElement.width}×${gl.domElement.height}`;
    values.length = 0;
    elapsed.current = 0;
  });
  return null;
}
