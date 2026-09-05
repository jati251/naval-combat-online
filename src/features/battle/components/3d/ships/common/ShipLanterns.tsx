import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';

interface ShipLanternsProps {
  shipClass: ShipClass;
  isEnemy?: boolean;
}

/**
 * 18th-Century Historical Naval Lanterns & Maritime Navigation Lights
 * - Stern Transom Admiral Lantern: Emits a warm amber lantern glow over the quarterdeck & sea wake.
 * - Bow Cathead Navigation Lights: Port (Red) & Starboard (Green) running lights.
 * - Dynamic: Lights illuminate brilliantly at Night and stay unlit/quiet during Day.
 */
export const ShipLanterns: React.FC<ShipLanternsProps> = React.memo(({ shipClass, isEnemy = false }) => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  const config = SHIP_PRESETS[shipClass] || SHIP_PRESETS.brig;
  const halfLen = config.length * 0.5;
  const halfWid = config.width * 0.5;

  // Shared reusable geometries and materials
  const { lanternCasingGeo, lanternGlassGeo, brassMat, amberGlassMat, portRedGlassMat, stbdGreenGlassMat } = useMemo(() => {
    return {
      lanternCasingGeo: new THREE.CylinderGeometry(0.18, 0.24, 0.55, 6),
      lanternGlassGeo: new THREE.CylinderGeometry(0.14, 0.19, 0.42, 6),
      brassMat: new THREE.MeshStandardMaterial({
        color: '#291d10',
        metalness: 0.85,
        roughness: 0.35,
      }),
      amberGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#ffb703' : '#b47b2c',
        emissive: isNight ? '#ff9e00' : '#000000',
        emissiveIntensity: isNight ? 1.6 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
      portRedGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#ef4444' : '#7f1d1d',
        emissive: isNight ? '#dc2626' : '#000000',
        emissiveIntensity: isNight ? 1.8 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
      stbdGreenGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#22c55e' : '#14532d',
        emissive: isNight ? '#16a34a' : '#000000',
        emissiveIntensity: isNight ? 1.8 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
    };
  }, [isNight]);

  // Positions based on hull dimensions
  const sternZ = -halfLen * 0.94;
  const sternY = 3.2;

  const bowZ = halfLen * 0.85;
  const bowY = 2.4;
  const bowX = halfWid * 0.72;

  return (
    <group>
      {/* 1. Grand Stern Transom Cabin Lantern (Traditional Admiral Light) */}
      <group position={[0, sternY, sternZ]}>
        {/* Ornate Frame */}
        <mesh geometry={lanternCasingGeo} material={brassMat} castShadow={false} />
        {/* Glowing Amber Glass */}
        <mesh geometry={lanternGlassGeo} material={amberGlassMat} />

        {/* Localized Warm Amber Point Light on Deck and Ocean Wake at Night (Player ship only) */}
        {isNight && !isEnemy && (
          <pointLight
            color="#ffaa33"
            intensity={1.8}
            distance={16}
            decay={2}
          />
        )}
      </group>

      {/* 2. Bow Port Running Light (Red, Left side of ship) */}
      <group position={[-bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={portRedGlassMat} scale={[0.7, 0.7, 0.7]} />
        {isNight && !isEnemy && (
          <pointLight
            color="#ef4444"
            intensity={0.6}
            distance={8}
            decay={2}
          />
        )}
      </group>

      {/* 3. Bow Starboard Running Light (Green, Right side of ship) */}
      <group position={[bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={stbdGreenGlassMat} scale={[0.7, 0.7, 0.7]} />
        {isNight && !isEnemy && (
          <pointLight
            color="#22c55e"
            intensity={0.6}
            distance={8}
            decay={2}
          />
        )}
      </group>
    </group>
  );
});
