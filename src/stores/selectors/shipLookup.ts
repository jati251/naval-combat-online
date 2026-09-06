import type { ShipSnapshot } from '@/types';

const indexes = new WeakMap<readonly ShipSnapshot[], ReadonlyMap<string, ShipSnapshot>>();

/** World updates replace the array; all animation callbacks share that snapshot's index. */
export function findShip(ships: readonly ShipSnapshot[], id: string | null | undefined) {
  if (!id) return undefined;
  let index = indexes.get(ships);
  if (!index) {
    const map = new Map<string, ShipSnapshot>();
    for (let i = 0; i < ships.length; i++) {
      const s = ships[i];
      map.set(s.id, s);
    }
    index = map;
    indexes.set(ships, index);
  }
  return index.get(id);
}
