import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/stores/useGameStore';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';

interface ShipLanternsProps {
  shipClass: ShipClass;
  isEnemy?: boolean;
}

// Shared static geometries and base brass material to prevent memory leaks and GC stalls
const casingParts: THREE.BufferGeometry[] = [
  new THREE.CylinderGeometry(0.18, 0.22, 0.09, 6).translate(0, 0.25, 0),
  new THREE.CylinderGeometry(0.24, 0.22, 0.09, 6).translate(0, -0.25, 0),
];
for (let i = 0; i < 6; i++) {
  const a = i * Math.PI / 3;
  casingParts.push(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 4).translate(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18));
}
const lanternCasingGeo = mergeGeometries(casingParts)!;
casingParts.forEach(g => g.dispose());
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
  useEffect(() => () => {
    amberGlassMat.dispose();
    leftRedGlassMat.dispose();
    rightGreenGlassMat.dispose();
  }, [amberGlassMat, leftRedGlassMat, rightGreenGlassMat]);

  // Lantern offsets based on ship dimensions
  const sternZ = -halfLen * 0.88;
  const [depth, sheer] = { gunboat: [2.1, 0.45], sloop: [2.8, 0.95], corvette: [3, 0.85], brig: [3.3, 1.15], carrack: [3.6, 1.45], galleon: [3.8, 1.8], frigate: [3.8, 1.4], man_o_war: [4.2, 1.65] }[shipClass];
  const sternY = depth + sheer * 0.74 + 0.85;
  const bowZ = halfLen * 0.85;
  const bowY = config.length > 30 ? 4.2 : 2.5;
  const bowX = halfWid * 0.65;

  return (
    <group>
      {/* 1. Large Stern Center Transom Admiral Lantern */}
      <group position={[0, sternY, sternZ]}>
        <mesh position={[0, -0.65, 0]} material={brassMat}><cylinderGeometry args={[0.035, 0.06, 0.85, 6]} /></mesh>
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
            {!isEnemy && <pointLight
              color="#ffaa22"
              intensity={2.4}
              distance={20}
              decay={1.5}
            />}
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
