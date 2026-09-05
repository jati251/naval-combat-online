import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { navalAudio } from '@/features/battle/services/navalAudio';
import { SHIP_PRESETS, type SailState } from '@/types/game';

/**
 * Handles keyboard & mouse input for Black Flag naval combat.
 * - Smooth rudder steering (A / D, Left / Right) with continuous lerp
 * - Rigging speed control (W / S, Up / Down) with audio whoosh
 * - Broadside battery aiming (Hold Q: Port, Hold E: Starboard)
 * - Salvo fire (Space bar or Left Mouse Click) with instant cannon thunder
 */
export function useShipControls() {
  const setLocalRudder = useGameStore((s) => s.setLocalRudder);
  const setLocalSail = useGameStore((s) => s.setLocalSail);
  const cycleSailState = useGameStore((s) => s.cycleSailState);
  const setAimDirection = useGameStore((s) => s.setAimDirection);
  const triggerFireCooldown = useGameStore((s) => s.triggerFireCooldown);

  const keys = useRef<{ [key: string]: boolean }>({});
  const currentRudder = useRef(0);
  const lastSentRudder = useRef(0);
  const animFrameId = useRef<number | null>(null);
  const lastNetworkSync = useRef(0);
  const keyPressTimers = useRef<{ [key: string]: number }>({});

  const fireBattery = useCallback((side: 'port' | 'starboard') => {
    const store = useGameStore.getState();
    const selfShip = store.ships.find((s) => s.id === store.selfId);
    if (selfShip?.isSunk) return;

    const config = selfShip ? SHIP_PRESETS[selfShip.shipClass] : SHIP_PRESETS.brig;
    const progress = side === 'port' ? store.portReloadProgress : store.starboardReloadProgress;

    if (progress >= 1.0) {
      navalAudio.playCannonFire();
      if (selfShip) {
        store.triggerFireEvent(selfShip.id, side);
      }
      networkClient.fireBroadside(side);
      triggerFireCooldown(side, config.reloadTime);
    }
  }, [triggerFireCooldown]);

  useEffect(() => {
    // 1. Smooth Rudder Loop (Runs every frame for fluid wheel response)
    let lastTime = performance.now();

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

      // Unlock Audio
      navalAudio.init();

      // Sail Rigging changes (W / S)
      if (key === 'w' || e.key === 'ArrowUp') {
        cycleSailState('up');
        networkClient.sendInput(-currentRudder.current, useGameStore.getState().localSail);
      } else if (key === 's' || e.key === 'ArrowDown') {
        cycleSailState('down');
        networkClient.sendInput(-currentRudder.current, useGameStore.getState().localSail);
      }

      // Broadside Battery Aiming (Hold Q for Port, Hold E for Starboard)
      if (key === 'q') {
        setAimDirection('port', true);
      } else if (key === 'e') {
        setAimDirection('starboard', true);
      }

      // Salvo Fire (Space Bar)
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const store = useGameStore.getState();
        const sideToFire = store.aimDirection !== 'none' ? store.aimDirection : 'port';
        fireBattery(sideToFire);
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
          fireBattery('port');
        }
        setAimDirection('none', false);
      } else if (key === 'e') {
        const pressDuration = performance.now() - (keyPressTimers.current['e'] || 0);
        // Quick tap (< 220ms) fires immediately
        if (pressDuration < 220) {
          fireBattery('starboard');
        }
        setAimDirection('none', false);
      }
    };

    // 3. Pointer Handlers (Left Click to fire aimed battery)
    const handlePointerDown = (e: MouseEvent) => {
      // Don't intercept clicks on interactive buttons or modals
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('a')) {
        return;
      }

      if (e.button === 0) {
        navalAudio.init();
        const store = useGameStore.getState();
        const sideToFire = store.aimDirection !== 'none' ? store.aimDirection : 'port';
        fireBattery(sideToFire);
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
  }, [setLocalRudder, cycleSailState, setAimDirection, triggerFireCooldown]);

  const changeSail = useCallback((sail: SailState) => {
    navalAudio.playSailShift();
    setLocalSail(sail);
    networkClient.sendInput(-currentRudder.current, sail);
  }, [setLocalSail]);

  const setRudder = useCallback((rudder: number) => {
    currentRudder.current = rudder;
    setLocalRudder(rudder);
    networkClient.sendInput(-rudder, useGameStore.getState().localSail);
  }, [setLocalRudder]);

  return { changeSail, setRudder, fireBattery };
}

