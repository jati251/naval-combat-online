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
        emissiveIntensity: isNight ? 2.8 : 0,
        transparent: true,
        opacity: 0.92,
        roughness: 0.15,
      }),
      leftRedGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#ef4444' : '#7f1d1d',
        emissive: isNight ? '#dc2626' : '#000000',
        emissiveIntensity: isNight ? 2.6 : 0,
        transparent: true,
        opacity: 0.92,
        roughness: 0.15,
      }),
      rightGreenGlassMat: new THREE.MeshStandardMaterial({
        color: isNight ? '#22c55e' : '#14532d',
        emissive: isNight ? '#16a34a' : '#000000',
        emissiveIntensity: isNight ? 2.6 : 0,
        transparent: true,
        opacity: 0.92,
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
      {/* 1. Large Stern Center Transom Admiral Lantern */}
      <group position={[0, sternY, sternZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} />
        <mesh geometry={lanternGlassGeo} material={amberGlassMat} />
        {isNight && (
          <>
            {/* Luminous soft halo corona around lantern glass */}
            <mesh scale={[1.8, 1.8, 1.8]}>
              <sphereGeometry args={[0.22, 10, 8]} />
              <meshBasicMaterial
                color="#ffaa00"
                transparent
                opacity={0.35}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <pointLight
              color="#ffaa22"
              intensity={isEnemy ? 1.5 : 2.4}
              distance={isEnemy ? 14 : 20}
              decay={1.5}
            />
          </>
        )}
      </group>

      {/* 2. Quarterdeck / Main Deck Binnacle Lantern (Illuminates player ship deck, helm & cannons) */}
      {isNight && !isEnemy && (
        <group position={[0, sternY * 0.75 + 1.2, sternZ + halfLen * 0.4]}>
          <pointLight
            color="#ffba3b"
            intensity={2.8}
            distance={22}
            decay={1.3}
          />
        </group>
      )}

      {/* 3. Bow Left Running Light (Red, Port side) */}
      <group position={[-bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={leftRedGlassMat} scale={[0.7, 0.7, 0.7]} />
        {isNight && !isEnemy && (
          <pointLight
            color="#ef4444"
            intensity={1.0}
            distance={10}
            decay={1.8}
          />
        )}
      </group>

      {/* 4. Bow Right Running Light (Green, Starboard side) */}
      <group position={[bowX, bowY, bowZ]}>
        <mesh geometry={lanternCasingGeo} material={brassMat} scale={[0.7, 0.7, 0.7]} />
        <mesh geometry={lanternGlassGeo} material={rightGreenGlassMat} scale={[0.7, 0.7, 0.7]} />
        {isNight && !isEnemy && (
          <pointLight
            color="#22c55e"
            intensity={1.0}
            distance={10}
            decay={1.8}
          />
        )}
      </group>
    </group>
  );
});
