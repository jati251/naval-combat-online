import type { ShipSnapshot } from '@/types';

const indexes = new WeakMap<readonly ShipSnapshot[], ReadonlyMap<string, ShipSnapshot>>();

/** World updates replace the array; all animation callbacks share that snapshot's index. */
export function findShip(ships: readonly ShipSnapshot[], id: string | null | undefined) {
  if (!id) return undefined;
  let index = indexes.get(ships);
  if (!index) {
    index = new Map(ships.map((ship) => [ship.id, ship]));
    indexes.set(ships, index);
  }
  return index.get(id);
}
