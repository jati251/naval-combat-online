import { getStormIntensity } from '../../../../server/src/engine/StormSystem';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';

export { getStormIntensity };
export function getLocalStorm(cameraX: number, cameraZ: number): number {
  const store = useGameStore.getState();
  const ship = findShip(store.ships, store.selfId);
  return getStormIntensity(ship?.x ?? cameraX, ship?.z ?? cameraZ);
}

/** Two short, bounded intracloud flashes per storm cycle; shared by sky and water. */
export function getLightning(time: number, storm: number): number {
  if (storm < 0.28) return 0;
  const phase = ((time % 13) + 13) % 13;
  const pulse = Math.exp(-(((phase - 2.2) / 0.09) ** 2)) + 0.5 * Math.exp(-(((phase - 2.48) / 0.14) ** 2));
  return Math.min(1, pulse) * storm;
}
