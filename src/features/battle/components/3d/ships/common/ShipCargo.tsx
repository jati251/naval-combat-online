import { useMemo } from 'react';
import type { ShipConfig, ShipClass } from '@/types/game';
import { MaritimeCargo } from '../../props/MaritimeCargo';
import type { InstanceTransform } from '../../shared/StaticInstances';

const deckHeight: Record<ShipClass, number> = {
  gunboat: 2.1, sloop: 2.8, corvette: 3, brig: 3.3,
  carrack: 3.6, galleon: 3.8, frigate: 3.8, man_o_war: 4.2,
};

export function ShipCargo({ config }: { config: ShipConfig }) {
  const { id, length, width } = config;
  const placements = useMemo(() => {
    const count = length < 16 ? 2 : length < 30 ? 4 : 6;
    return Array.from({ length: count }, (_, i): InstanceTransform => ({
      position: [(i % 2 === 0 ? -1 : 1) * width * 0.23,
        deckHeight[id] - 0.08, (Math.floor(i / 2) - 1) * 1.15],
      rotation: [0, i * 0.7, 0],
      scale: [0.85, 0.85, 0.85],
    }));
  }, [id, length, width]);
  return <MaritimeCargo placements={placements} />;
}
