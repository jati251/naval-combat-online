import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';

interface ShipLanternsProps {
  shipClass: ShipClass;
  isEnemy?: boolean;
}

// Shared static geometries and base brass material to prevent memory leaks and GC stalls
const lanternCasingGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.55, 6);
const lanternGlassGeo = new THREE.CylinderGeometry(0.14, 0.19, 0.42, 6);
const brassMat = new THREE.MeshStandardMaterial({
  color: '#291d10',
  metalness: 0.85,
  roughness: 0.35,
});

/**
 * 18th-Century Historical Naval Lanterns & Maritime Navigation Lights
 * - Stern Transom Admiral Lantern: Emits a warm amber lantern glow over the quarterdeck & sea wake.
 * - Bow Cathead Navigation Lights: Left (Red) & Right (Green) running lights.
 * - Dynamic: Lights illuminate brilliantly at Night and stay unlit/quiet during Day.
 */
export const ShipLanterns: React.FC<ShipLanternsProps> = React.memo(({ shipClass, isEnemy = false }) => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  const config = SHIP_PRESETS[shipClass] || SHIP_PRESETS.brig;
  const halfLen = config.length * 0.5;
  const halfWid = config.width * 0.5;

  // Shared reusable night/day materials
  const { amberGlassMat, leftRedGlassMat, rightGreenGlassMat } = useMemo(() => {
    return {
      amberGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#ffb703' : '#b47b2c',
        emissive: isNight ? '#ff9e00' : '#000000',
        emissiveIntensity: isNight ? 1.6 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
      leftRedGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#ef4444' : '#7f1d1d',
        emissive: isNight ? '#dc2626' : '#000000',
        emissiveIntensity: isNight ? 1.8 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
      rightGreenGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#22c55e' : '#14532d',
        emissive: isNight ? '#16a34a' : '#000000',
        emissiveIntensity: isNight ? 1.8 : 0,
        transparent: true,
        opacity: 0.88,
        roughness: 0.15,
      }),
    };
  }, [isNight]);

  // Lantern offsets based on ship dimensions
  const sternZ = -halfLen * 0.88;
  const sternY = config.length > 30 ? 5.8 : 3.8;
  const bowZ = halfLen * 0.85;
  const bowY = config.length > 30 ? 4.2 : 2.5;
  const bowX = halfWid * 0.65;

  return (
    <group>
      {/* 1. Large Stern Center Transom Lantern */}
      <group position={[0, sternY, sternZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} />
        <mesh geometry={lanternGlassGeo} material={amberGlassMat} />
        {isNight && !isEnemy && (
          <pointLight
            color="#ffaa00"
            intensity={1.4}
            distance={14}
            decay={2}
          />
        )}
      </group>

      {/* 2. Bow Left Running Light (Red, Left side of ship) */}
      <group position={[-bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={leftRedGlassMat} scale={[0.7, 0.7, 0.7]} />
        {isNight && !isEnemy && (
          <pointLight
            color="#ef4444"
            intensity={0.6}
            distance={8}
            decay={2}
          />
        )}
      </group>

      {/* 3. Bow Right Running Light (Green, Right side of ship) */}
      <group position={[bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={rightGreenGlassMat} scale={[0.7, 0.7, 0.7]} />
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
