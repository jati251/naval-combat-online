import React, { useMemo } from 'react';
import { type ShipClass, SHIP_PRESETS } from '@/types/game';
import { createWoodPlankTexture, createSailClothTexture } from './textures/proceduralTextures';
import {
  type ShipModelProps,
  GunboatModel,
  SloopModel,
  CorvetteModel,
  BrigModel,
  CarrackModel,
  GalleonModel,
  FrigateModel,
  ManOWarModel,
} from './ships';

import { ShipLanterns } from './ships/common';

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
}) => {
  const config = propConfig || SHIP_PRESETS[shipClass as ShipClass] || SHIP_PRESETS.brig;
  const { id, hullColor, sailColor } = config;

  const hullTexture = useMemo(() => createWoodPlankTexture(hullColor, '#180e07', 8), [hullColor]);
  const deckTexture = useMemo(() => createWoodPlankTexture('#a16207', '#451a03', 10), []);
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
  };

  const renderModel = () => {
    switch (id) {
      case 'gunboat':
        return <GunboatModel {...subProps} />;
      case 'sloop':
        return <SloopModel {...subProps} />;
      case 'corvette':
        return <CorvetteModel {...subProps} />;
      case 'carrack':
        return <CarrackModel {...subProps} />;
      case 'galleon':
        return <GalleonModel {...subProps} />;
      case 'frigate':
        return <FrigateModel {...subProps} />;
      case 'man_o_war':
        return <ManOWarModel {...subProps} />;
      case 'brig':
      default:
        return <BrigModel {...subProps} />;
    }
  };

  return (
    <group>
      {renderModel()}
      <ShipLanterns shipClass={id} isEnemy={isEnemy} />
    </group>
  );
}, (prev, next) => {
  const prevId = prev.config?.id || prev.shipClass;
  const nextId = next.config?.id || next.shipClass;
  return (
    prevId === nextId &&
    prev.sailState === next.sailState &&
    prev.isEnemy === next.isEnemy &&
    prev.shipId === next.shipId &&
    prev.isSelf === next.isSelf
  );
});
