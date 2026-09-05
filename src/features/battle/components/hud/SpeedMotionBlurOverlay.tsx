import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';

interface Streak {
  angle: number;
  dist: number;
  len: number;
  speed: number;
  alpha: number;
}

/**
 * Lightweight Peripheral Motion Blur & High-Speed Wind Streaks.
 * Operates purely on the DOM / 2D Compositor:
 * - 0 impact on Three.js Canvas (preserves full hardware MSAA, ACESFilmic tone mapping & deep ocean colors)
 * - 0 React re-renders (runs on direct RAF with DOM ref updates)
 * - Reticle center & ship stay 100% crisp; outer edges blur dynamically with speed & camera panning
 */
export const SpeedMotionBlurOverlay: React.FC = React.memo(() => {
  const blurRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);

  // Smooth animation tracking refs
  const smoothBlur = useRef(0);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const mouseVelocity = useRef(0);
  const lastTime = useRef(performance.now());

  // Radial wind streaks pool
  const streaks = useRef<Streak[]>([]);

  useEffect(() => {
    // Initialize 16 lightweight radial streaks
    streaks.current = [];
    for (let i = 0; i < 16; i++) {
      streaks.current.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.35 + Math.random() * 0.55,
        len: 40 + Math.random() * 80,
        speed: 0.8 + Math.random() * 1.4,
        alpha: 0.15 + Math.random() * 0.25,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Only track velocity when dragging/orbiting with right mouse button or during aim
      if (e.buttons > 0) {
        const dx = e.clientX - lastMouseX.current;
        const dy = e.clientY - lastMouseY.current;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mouseVelocity.current = Math.min(1.5, mouseVelocity.current + dist * 0.04);
      }
      lastMouseX.current = e.clientX;
      lastMouseY.current = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Render loop directly manipulating CSS styles & 2D canvas
    const update = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime.current) / 1000);
      lastTime.current = now;

      // Extract current player ship speed
      const { ships, selfId } = useGameStore.getState();
      const selfShip = ships.find((s) => s.id === selfId && !s.isSunk);
      const shipSpeed = selfShip ? Math.max(0, selfShip.speed ?? 0) : 0;

      // Decay mouse pan velocity
      mouseVelocity.current = Math.max(0, mouseVelocity.current - mouseVelocity.current * 7.0 * dt);

      // Speed ratio (kicks in above 6 knots up to 14 knots)
      const speedRatio = Math.max(0, Math.min(1.0, (shipSpeed - 5.0) / 8.5));
      const targetBlur = speedRatio * 3.8 + mouseVelocity.current * 2.2;

      // Smooth interpolation
      smoothBlur.current += (targetBlur - smoothBlur.current) * Math.min(1.0, 10 * dt);

      // Update peripheral backdrop blur
      if (blurRef.current) {
        if (smoothBlur.current > 0.15) {
          blurRef.current.style.opacity = '1';
          const px = Math.round(smoothBlur.current * 10) / 10;
          blurRef.current.style.backdropFilter = `blur(${px}px)`;
          (blurRef.current.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = `blur(${px}px)`;
        } else {
          blurRef.current.style.opacity = '0';
          blurRef.current.style.backdropFilter = 'none';
        }
      }

      // Draw high-speed wind streaks on 2D canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (speedRatio > 0.08) {
            const cx = canvas.width * 0.5;
            const cy = canvas.height * 0.46; // horizon center
            const maxRadius = Math.sqrt(cx * cx + cy * cy);

            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';

            for (let i = 0; i < streaks.current.length; i++) {
              const s = streaks.current[i];
              // Advance outward
              s.dist += s.speed * speedRatio * dt * 1.2;
              if (s.dist > 1.1) {
                s.dist = 0.30 + Math.random() * 0.15;
                s.angle = Math.random() * Math.PI * 2;
              }

              const r1 = s.dist * maxRadius;
              const r2 = r1 + s.len * speedRatio;

              const cosA = Math.cos(s.angle);
              const sinA = Math.sin(s.angle);

              const x1 = cx + cosA * r1;
              const y1 = cy + sinA * r1;
              const x2 = cx + cosA * r2;
              const y2 = cy + sinA * r2;

              // Fade in as it leaves center, fade out near screen boundary
              const fade = Math.sin(Math.min(1.0, (s.dist - 0.28) / 0.8) * Math.PI);
              const alpha = s.alpha * speedRatio * fade;

              ctx.strokeStyle = `rgba(224, 242, 254, ${alpha.toFixed(2)})`;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
      }

      rafId.current = requestAnimationFrame(update);
    };

    rafId.current = requestAnimationFrame(update);

    // Sync canvas resolution
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <>
      {/* 1. Dynamic Peripheral CSS Backdrop Blur (Center is 100% transparent & crisp) */}
      <div
        ref={blurRef}
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
        style={{
          opacity: 0,
          maskImage: 'radial-gradient(ellipse 65% 58% at 50% 46%, transparent 35%, black 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 58% at 50% 46%, transparent 35%, black 85%)',
        }}
      />

      {/* 2. High-Speed Wind Streaks (Lightweight 2D Canvas) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10"
      />
    </>
  );
});
