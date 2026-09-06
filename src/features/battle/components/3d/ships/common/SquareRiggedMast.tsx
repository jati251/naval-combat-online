import React from 'react';
import * as THREE from 'three';
import type { SailState } from '@/types/game';
import { ShipSail } from './ShipSail';
import { ShipFlag } from './ShipFlag';

interface SquareRiggedMastProps {
  position: [number, number, number];
  mastHeight: number;
  yardWidthLower: number;
  yardWidthUpper: number;
  lowerGeo: THREE.BufferGeometry;
  upperGeo: THREE.BufferGeometry;
  sailTexture: THREE.CanvasTexture;
  sailState: SailState;
  mastIndex: number;
  mastColor?: string;
  yardColor?: string;
  includeFlag?: boolean;
  isEnemy?: boolean;
  team?: 'red' | 'blue';
  isFriendly?: boolean;
  shipId?: string;
  lowerDepthOffset?: number;
  upperDepthOffset?: number;
}

export const SquareRiggedMast: React.FC<SquareRiggedMastProps> = React.memo(({
  position,
  mastHeight,
  yardWidthLower,
  yardWidthUpper,
  lowerGeo,
  upperGeo,
  sailTexture,
  sailState,
  mastIndex,
  mastColor = '#382013',
  yardColor = '#2d1c12',
  includeFlag = false,
  isEnemy = false,
  team,
  isFriendly,
  shipId,
  lowerDepthOffset = 0.22,
  upperDepthOffset = 0.16,
}) => {
  return (
    <group position={position}>
      {/* Lower Main Mast Spar */}
      <mesh position={[0, mastHeight * 0.5, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.16, 0.28, mastHeight, 8]} />
        <meshStandardMaterial color={mastColor} roughness={0.8} />
      </mesh>

      {/* Fighting Top (Crow's Nest Observation Platform) */}
      <mesh position={[0, mastHeight * 0.66, 0]} castShadow={!isEnemy}>
        <cylinderGeometry args={[0.55, 0.42, 0.48, 8]} />
        <meshStandardMaterial color="#1a110a" roughness={0.88} />
      </mesh>

      {/* Lower Course Yard & Billowing Square Sail */}
      <group position={[0, mastHeight * 0.46, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.08, 0.08, yardWidthLower, 8]} />
          <meshStandardMaterial color={yardColor} roughness={0.8} />
        </mesh>
        <ShipSail
          geometry={lowerGeo}
          texture={sailTexture}
          sailState={sailState}
          height={mastHeight * 0.35}
          depthOffset={lowerDepthOffset}
          type="square"
          mastIndex={mastIndex * 2}
          isEnemy={isEnemy}
        />
      </group>

      {/* Upper Topsail Yard & Billowing Square Sail */}
      <group position={[0, mastHeight * 0.83, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow={!isEnemy}>
          <cylinderGeometry args={[0.06, 0.06, yardWidthUpper, 8]} />
          <meshStandardMaterial color={yardColor} roughness={0.8} />
        </mesh>
        <ShipSail
          geometry={upperGeo}
          texture={sailTexture}
          sailState={sailState}
          height={mastHeight * 0.26}
          depthOffset={upperDepthOffset}
          type="square"
          mastIndex={mastIndex * 2 + 1}
          isEnemy={isEnemy}
        />
      </group>

      {/* National Flag / Battle Ensign at Topmost Mast Truck */}
      {includeFlag && (
        <ShipFlag
          position={[0, mastHeight + 0.48, -0.65]}
          isEnemy={isEnemy}
          team={team}
          isFriendly={isFriendly}
          shipId={shipId}
        />
      )}
    </group>
  );
});
