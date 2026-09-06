import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { isObjectVisible } from '../../shared/visibility';

const flagGeometry = new THREE.PlaneGeometry(1.3, 0.7, 10, 4);
const flagVertices = flagGeometry.attributes.position;
for (let i = 0; i < flagVertices.count; i++) {
  const u = (flagVertices.getX(i) + 0.65) / 1.3;
  flagVertices.setXYZ(i, u * 1.3, flagVertices.getY(i) - u * u * 0.13,
    Math.sin(u * Math.PI * 3) * u * 0.12);
}
flagGeometry.computeVertexNormals();

interface ShipFlagProps {
  position: [number, number, number];
  isEnemy?: boolean;
  isGhost?: boolean;
  team?: 'red' | 'blue';
  isFriendly?: boolean;
  shipId?: string;
}

export const ShipFlag: React.FC<ShipFlagProps> = React.memo(({
  position,
  isEnemy,
  isGhost,
  team: propTeam,
  isFriendly: propIsFriendly,
  shipId,
}) => {
  const flagRef = useRef<THREE.Mesh>(null);
  const windAngle = useGameStore((s) => s.windAngle);
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const heading = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);

  const isTeamMode = useGameStore((s) => s.currentRoom?.gameMode === 'TEAM');
  const storeTeam = useGameStore((s) => {
    if (!shipId) return undefined;
    return s.currentRoom?.players.find((p) => p.id === shipId)?.team;
  });
  const selfId = useGameStore((s) => s.selfId);
  const selfTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === s.selfId)?.team);

  const team = propTeam ?? storeTeam ?? (shipId === selfId ? selfTeam : undefined);
  const isFriendly = propIsFriendly ?? (isTeamMode && Boolean(selfTeam && team && selfTeam === team));

  const flagMaterialProps = useMemo(() => {
    if (isTeamMode) {
      if (team === 'red') {
        return {
          color: '#ef4444',
          emissive: '#7f1d1d',
          emissiveIntensity: 0.35,
        };
      } else if (team === 'blue') {
        return {
          color: '#0ea5e9',
          emissive: '#0369a1',
          emissiveIntensity: 0.35,
        };
      } else if (isFriendly !== undefined) {
        return isFriendly
          ? { color: '#0ea5e9', emissive: '#0369a1', emissiveIntensity: 0.35 }
          : { color: '#ef4444', emissive: '#7f1d1d', emissiveIntensity: 0.35 };
      }
    }

    if (isGhost) {
      return {
        color: '#059669',
        emissive: '#065f46',
        emissiveIntensity: 0.3,
      };
    }

    if (isEnemy) {
      return {
        color: '#dc2626',
        emissive: '#7f1d1d',
        emissiveIntensity: 0.25,
      };
    }

    return {
      color: '#2563eb',
      emissive: '#1e40af',
      emissiveIntensity: 0.25,
    };
  }, [isTeamMode, team, isGhost, isEnemy]);

  useFrame((state) => {
    if (flagRef.current && isObjectVisible(flagRef.current)) {
      const t = state.clock.getElapsedTime();
      flagRef.current.parent?.getWorldQuaternion(orientation);
      const parentRotY = heading.setFromQuaternion(orientation, 'YXZ').y;
      // Wind blowing direction relative to the ship hull
      const targetRelYaw = (windAngle + Math.PI) - parentRotY;
      const flutter = Math.sin(t * 11) * 0.22;
      const ripple = Math.cos(t * 8) * 0.12;

      flagRef.current.rotation.y = targetRelYaw + flutter;
      flagRef.current.rotation.z = ripple;
    }
  });

  return (
    <mesh ref={flagRef} geometry={flagGeometry} position={position} castShadow={!isEnemy}>
      <meshStandardMaterial
        color={flagMaterialProps.color}
        emissive={flagMaterialProps.emissive}
        emissiveIntensity={flagMaterialProps.emissiveIntensity}
        side={THREE.DoubleSide}
        roughness={0.65}
      />
    </mesh>
  );
});
