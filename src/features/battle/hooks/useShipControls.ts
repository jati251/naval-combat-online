import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { navalAudio } from '../services/navalAudio';
import { useShipActions } from './useShipActions';

/**
 * Global Keyboard & Mouse Input Manager for Black Flag naval combat.
 * Mount ONCE at the top-level Battle component.
 * - Smooth rudder steering (A / D, Left / Right) with continuous lerp
 * - Rigging speed control (W / S, Up / Down) with audio whoosh
 * - Broadside battery aiming (Hold Q: Port, Hold E: Starboard)
 * - Salvo fire (Space bar or Left Mouse Click) with instant cannon thunder
 */
export function useShipControls() {
  const actions = useShipActions();
  const setLocalRudder = useGameStore((s) => s.setLocalRudder);

  const keys = useRef<{ [key: string]: boolean }>({});
  const currentRudder = useRef(0);
  const lastSentRudder = useRef(0);
  const animFrameId = useRef<number | null>(null);
  const lastNetworkSync = useRef(0);
  const keyPressTimers = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    let lastTime = performance.now();

    // 1. Smooth Rudder Loop (Runs every frame for fluid wheel response)
    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      let steerTarget = 0;
      if (keys.current['a'] || keys.current['arrowleft']) steerTarget -= 1.0;
      if (keys.current['d'] || keys.current['arrowright']) steerTarget += 1.0;

      // Smooth interpolation towards steer target
      currentRudder.current = THREE.MathUtils.lerp(currentRudder.current, steerTarget, dt * 6.0);

      // Continuous, rock-solid network sync (~20Hz) when steering
      if (now - lastNetworkSync.current >= 50) {
        const isActivelySteering = steerTarget !== 0 || Math.abs(currentRudder.current) > 0.005;
        const rudderChanged = Math.abs(currentRudder.current - lastSentRudder.current) > 0.004;

        if (isActivelySteering && rudderChanged) {
          lastNetworkSync.current = now;
          if (steerTarget === 0 && Math.abs(currentRudder.current) < 0.015) {
            currentRudder.current = 0;
          }
          lastSentRudder.current = currentRudder.current;
          setLocalRudder(currentRudder.current);
          // Inverted sign sent to server physics to correctly turn Port on A and Starboard on D
          networkClient.sendInput(-currentRudder.current, useGameStore.getState().localSail);
        } else if (!isActivelySteering && lastSentRudder.current !== 0) {
          lastNetworkSync.current = now;
          currentRudder.current = 0;
          lastSentRudder.current = 0;
          setLocalRudder(0);
          networkClient.sendInput(0, useGameStore.getState().localSail);
        }
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    // 2. Keyboard Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.repeat) return;
      keys.current[key] = true;
      keyPressTimers.current[key] = performance.now();

      // Unlock Audio context on first interaction
      navalAudio.init();

      // Sail Rigging changes (W / S)
      if (key === 'w' || e.key === 'ArrowUp') {
        actions.cycleSail('up');
      } else if (key === 's' || e.key === 'ArrowDown') {
        actions.cycleSail('down');
      }

      // Broadside Battery Aiming (Hold Q for Port, Hold E for Starboard)
      if (key === 'q') {
        actions.setAim('port', true);
      } else if (key === 'e') {
        actions.setAim('starboard', true);
      }

      // Salvo Fire (Space Bar)
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const store = useGameStore.getState();
        const sideToFire = store.aimDirection !== 'none' ? store.aimDirection : 'port';
        actions.fireBattery(sideToFire);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key] = false;

      // Disengage aim on Q or E release
      if (key === 'q') {
        const pressDuration = performance.now() - (keyPressTimers.current['q'] || 0);
        // Quick tap (< 220ms) fires immediately
        if (pressDuration < 220) {
          actions.fireBattery('port');
        }
        actions.setAim('none', false);
      } else if (key === 'e') {
        const pressDuration = performance.now() - (keyPressTimers.current['e'] || 0);
        // Quick tap (< 220ms) fires immediately
        if (pressDuration < 220) {
          actions.fireBattery('starboard');
        }
        actions.setAim('none', false);
      }
    };

    // 3. Pointer Handlers (Left Click to fire aimed battery - Desktop only)
    const handlePointerDown = (e: MouseEvent) => {
      // Ignore on touch devices to prevent double-firing collision with mobile touch controls
      if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        return;
      }

      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.touch-none')) {
        return;
      }

      if (e.button === 0) {
        navalAudio.init();
        const store = useGameStore.getState();
        const sideToFire = store.aimDirection !== 'none' ? store.aimDirection : 'port';
        actions.fireBattery(sideToFire);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [actions, setLocalRudder]);

  return actions;
}
