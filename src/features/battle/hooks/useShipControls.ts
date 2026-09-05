import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { networkClient } from '@/services/networkClient';
import type { SailState } from '@/types/game';

/**
 * Handles keyboard input for vessel steering, sails, and broadside cannons.
 * Note: Window event listener lifecycle is standard in React for browser key input hooks.
 */
export function useShipControls() {
  const localSail = useGameStore((s) => s.localSail);
  const localRudder = useGameStore((s) => s.localRudder);
  const setLocalRudder = useGameStore((s) => s.setLocalRudder);
  const setLocalSail = useGameStore((s) => s.setLocalSail);

  useEffect(() => {
    const keysPressed = new Set<string>();

    const updateControls = () => {
      let rudder = 0;
      if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) rudder -= 1.0;
      if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) rudder += 1.0;

      const currentStoreRudder = useGameStore.getState().localRudder;
      if (rudder !== currentStoreRudder) {
        setLocalRudder(rudder);
        networkClient.sendInput(rudder, useGameStore.getState().localSail);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keysPressed.add(e.code);

      // Rudder
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        updateControls();
      }

      // Sail changes (W / S)
      const currentSail = useGameStore.getState().localSail;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        let nextSail: SailState = currentSail;
        if (currentSail === 'ANCHOR') nextSail = 'HALF_SAIL';
        else if (currentSail === 'HALF_SAIL') nextSail = 'FULL_SAIL';

        if (nextSail !== currentSail) {
          setLocalSail(nextSail);
          networkClient.sendInput(useGameStore.getState().localRudder, nextSail);
        }
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        let nextSail: SailState = currentSail;
        if (currentSail === 'FULL_SAIL') nextSail = 'HALF_SAIL';
        else if (currentSail === 'HALF_SAIL') nextSail = 'ANCHOR';

        if (nextSail !== currentSail) {
          setLocalSail(nextSail);
          networkClient.sendInput(useGameStore.getState().localRudder, nextSail);
        }
      }

      // Cannons (Q: Port side, E: Starboard side)
      if (e.code === 'KeyQ') {
        networkClient.fireBroadside('port');
      } else if (e.code === 'KeyE') {
        networkClient.fireBroadside('starboard');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        updateControls();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setLocalRudder, setLocalSail]);

  const changeSail = (sail: SailState) => {
    setLocalSail(sail);
    networkClient.sendInput(localRudder, sail);
  };

  const setRudder = (rudder: number) => {
    setLocalRudder(rudder);
    networkClient.sendInput(rudder, localSail);
  };

  return { changeSail, setRudder };
}
