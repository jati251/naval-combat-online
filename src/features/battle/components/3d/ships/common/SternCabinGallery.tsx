import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ShipHelm } from './ShipHelm';
import { useGameStore } from '@/stores/useGameStore';

interface SternCabinGalleryProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  tierCount?: 1 | 2 | 3;
  windowCount?: number;
  trimColor?: string;
  hullTexture: THREE.CanvasTexture;
  rudderAngle?: number;
  shipId?: string;
  isSelf?: boolean;
  isEnemy?: boolean;
  includeHelm?: boolean;
  helmZOffset?: number;
  helmYOffset?: number;
  lanternCount?: 2 | 3;
  hasBalcony?: boolean;
}

export const SternCabinGallery: React.FC<SternCabinGalleryProps> = React.memo(({
  position,
  width,
  depth,
  height,
  tierCount = 1,
  windowCount = 3,
  trimColor = '#f59e0b',
  hullTexture,
  rudderAngle = 0,
  shipId,
  isSelf = false,
  isEnemy = false,
  includeHelm = true,
  helmZOffset = 0.08,
  helmYOffset = 0.25,
  lanternCount = 3,
  hasBalcony = false,
}) => {
  const isNight = useGameStore((s) => s.timeOfDay === 'NIGHT');
  const windowPositions = useMemo(() => {
    const list: number[] = [];
    if (windowCount === 1) return [0];
    const span = width * 0.58;
    const step = span / (windowCount - 1);
    for (let i = 0; i < windowCount; i++) {
      list.push(-span * 0.5 + i * step);
    }
    return list;
  }, [width, windowCount]);

  const windowWidth = (width * 0.45) / Math.max(1, windowCount);

  return (
    <group position={position}>
      {/* Main Cabin Bulkhead */}
      <mesh castShadow={!isEnemy} receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial map={hullTexture} roughness={0.68} />
      </mesh>

      {/* Gilded Transom Arch Molding along Top */}
      <mesh position={[0, height * 0.5 + 0.06, -depth * 0.505]} castShadow={!isEnemy}>
        <boxGeometry args={[width * 1.02, 0.12, 0.08]} />
        <meshStandardMaterial color={trimColor} metalness={0.75} roughness={0.28} />
      </mesh>

      {/* Lower Transom Counter Strake */}
      <mesh position={[0, -height * 0.5 + 0.07, -depth * 0.505]} castShadow={!isEnemy}>
        <boxGeometry args={[width, 0.14, 0.08]} />
        <meshStandardMaterial color="#2d170b" roughness={0.75} />
      </mesh>

      {/* Stern Balcony / Walkway if enabled */}
      {hasBalcony && (
        <group position={[0, -height * 0.35, -depth * 0.5 - 0.45]}>
          <mesh castShadow={!isEnemy} receiveShadow>
            <boxGeometry args={[width * 0.96, 0.16, 0.9]} />
            <meshStandardMaterial color="#2b1a11" roughness={0.8} />
          </mesh>
          {/* Balustrade railing */}
          <mesh position={[0, 0.4, -0.42]} castShadow={!isEnemy}>
            <boxGeometry args={[width * 0.96, 0.65, 0.06]} />
            <meshStandardMaterial color={trimColor} metalness={0.65} roughness={0.35} />
          </mesh>
        </group>
      )}

      {/* Leaded Stern Windows across tiers */}
      {Array.from({ length: tierCount }).map((_, tierIdx) => {
        const tierY = tierCount === 1
          ? 0.1
          : tierCount === 2
            ? -height * 0.2 + tierIdx * (height * 0.45)
            : -height * 0.28 + tierIdx * (height * 0.32);
        const tierHeight = (height * 0.5) / tierCount;

        return (
          <React.Fragment key={`tier-${tierIdx}`}>
            {/* Mid-tier separator trim */}
            {tierIdx > 0 && (
              <mesh position={[0, tierY - tierHeight * 0.55, -depth * 0.505]}>
                <boxGeometry args={[width * 0.98, 0.08, 0.06]} />
                <meshStandardMaterial color={trimColor} metalness={0.7} roughness={0.3} />
              </mesh>
            )}

            {windowPositions.map((wx, wIdx) => (
              <group key={`win-${tierIdx}-${wIdx}`} position={[wx, tierY, -depth * 0.508]}>
                {/* Leaded Window Glass Pane (illuminated warm cabin glow at night, antique leaded glass in day) */}
                <mesh rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[windowWidth, tierHeight]} />
                  <meshStandardMaterial
                    color={isNight ? '#fef08a' : '#2b3846'}
                    emissive={isNight ? '#f59e0b' : '#000000'}
                    emissiveIntensity={isNight ? 1.4 : 0}
                    roughness={0.2}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                {/* Mullion frame border (Player only for LOD) */}
                {!isEnemy && (
                  <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[windowWidth * 1.12, tierHeight * 1.08, 0.025]} />
                    <meshStandardMaterial color="#1a0e06" roughness={0.9} />
                  </mesh>
                )}
              </group>
            ))}
          </React.Fragment>
        );
      })}

      {/* Heavy Ornamental Stern Lanterns (Antique brass by day, warm amber fire at night) */}
      {(lanternCount === 3 ? [-width * 0.36, 0, width * 0.36] : [-width * 0.34, width * 0.34]).map((lx, lIdx) => (
        <group key={`lan-${lIdx}`} position={[lx, height * 0.5 + 0.15, -depth * 0.52]}>
          <mesh castShadow={!isEnemy}>
            <cylinderGeometry args={[0.12, 0.18, 0.46, 6]} />
            <meshStandardMaterial
              color={isNight ? '#ffb703' : '#4a3820'}
              emissive={isNight ? '#f59e0b' : '#000000'}
              emissiveIntensity={isNight ? 1.8 : 0}
              metalness={isNight ? 0.7 : 0.85}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.24, 0.05]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.28, 4]} />
            <meshStandardMaterial color="#2d1c12" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Steering Helm (Player/Self only) */}
      {includeHelm && !isEnemy && (
        <ShipHelm
          position={[0, height * 0.5 + helmYOffset, helmZOffset]}
          rudderAngle={rudderAngle}
          shipId={shipId}
          isSelf={isSelf}
        />
      )}
    </group>
  );
});
