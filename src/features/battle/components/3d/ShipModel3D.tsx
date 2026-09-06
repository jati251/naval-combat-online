import React, { useMemo } from 'react';
import { type ShipClass, SHIP_PRESETS } from '@/types/game';
import { createWoodPlankTexture, createSailClothTexture } from './textures/proceduralTextures';
import type { ShipModelProps } from './ships';
import { shipModels } from './ships/modelRegistry';

import { ShipLanterns } from './ships/common';
import { ShipCargo } from './ships/common/ShipCargo';

export type { ShipModelProps };

/**
 * Main ShipModel3D Router Component
 * Dispatches to bespoke 3D architectures for all 8 distinct naval classes.
 * Memoized to prevent heavy mesh re-renders during high-frequency steering.
 */
export const ShipModel3D: React.FC<ShipModelProps> = React.memo(({
  config: propConfig,
  shipClass = 'brig',
  sailState = 'HALF_SAIL',
  rudderAngle = 0,
  isEnemy = false,
  shipId,
  isSelf = false,
  team,
  isFriendly,
}) => {
  const config = propConfig || SHIP_PRESETS[shipClass as ShipClass] || SHIP_PRESETS.brig;
  const { id, hullColor, sailColor } = config;

  const hullTexture = useMemo(() => createWoodPlankTexture(hullColor, '#180e07', 8), [hullColor]);
  const deckTexture = useMemo(() => createWoodPlankTexture('#9b825f', '#534434', 10), []);
  const sailTexture = useMemo(() => createSailClothTexture(sailColor), [sailColor]);

  const subProps = {
    config,
    sailState,
    rudderAngle,
    isEnemy,
    hullTexture,
    deckTexture,
    sailTexture,
    shipId,
    isSelf,
    team,
    isFriendly,
  };

  const Model = shipModels[id] ?? shipModels.brig;

  return (
    <group>
      <Model {...subProps} />
      <ShipCargo config={config} />
      <ShipLanterns shipClass={id} isEnemy={isEnemy} />
    </group>
  );
}, (prev, next) => {
  const prevId = prev.config?.id || prev.shipClass;
  const nextId = next.config?.id || next.shipClass;
  return (
    prevId === nextId && prev.config === next.config &&
    (Boolean(next.shipId) || prev.rudderAngle === next.rudderAngle) &&
    prev.sailState === next.sailState &&
    prev.isEnemy === next.isEnemy &&
    prev.team === next.team &&
    prev.isFriendly === next.isFriendly &&
    prev.shipId === next.shipId &&
    prev.isSelf === next.isSelf
  );
});
