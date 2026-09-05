import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import { navalAudio } from '../services/navalAudio';
import type { SailState, AimDirection } from '@/types';
import type { ShipActions } from '../types/controls';

/**
 * Lightweight, zero-overhead action dispatchers for HUD components.
 * Does NOT register any event listeners or requestAnimationFrame loops.
 */
export function useShipActions(): ShipActions {
  const setLocalSail = useGameStore((s) => s.setLocalSail);
  const setLocalRudder = useGameStore((s) => s.setLocalRudder);
  const cycleSailState = useGameStore((s) => s.cycleSailState);
  const setAimDirection = useGameStore((s) => s.setAimDirection);

  const changeSail = useCallback((sail: SailState) => {
    navalAudio.playSailShift();
    setLocalSail(sail);
    const { localRudder } = useGameStore.getState();
    networkClient.sendInput(-localRudder, sail);
  }, [setLocalSail]);

  const cycleSail = useCallback((dir: 'up' | 'down') => {
    cycleSailState(dir);
    const { localRudder, localSail } = useGameStore.getState();
    networkClient.sendInput(-localRudder, localSail);
  }, [cycleSailState]);

  const setRudder = useCallback((rudder: number) => {
    setLocalRudder(rudder);
    const { localSail } = useGameStore.getState();
    networkClient.sendInput(-rudder, localSail);
  }, [setLocalRudder]);

  const setAim = useCallback((direction: AimDirection, isAiming: boolean) => {
    setAimDirection(direction, isAiming);
  }, [setAimDirection]);

  const fireBattery = useCallback((side: 'port' | 'starboard') => {
    const store = useGameStore.getState();
    const selfShip = store.ships.find((s) => s.id === store.selfId);
    if (selfShip?.isSunk) return;

    const progress = side === 'port' ? store.portReloadProgress : store.starboardReloadProgress;

    if (progress >= 1.0) {
      navalAudio.playCannonFire();
      if (selfShip) {
        store.triggerFireEvent(selfShip.id, side);
      }
      store.triggerCameraShake(0.48, side);
      // networkClient.fireBroadside internally dispatches FIRE_BROADSIDE packet and triggers cooldown
      networkClient.fireBroadside(side);
    }
  }, []);

  return {
    changeSail,
    cycleSail,
    setRudder,
    fireBattery,
    setAim,
  };
}
