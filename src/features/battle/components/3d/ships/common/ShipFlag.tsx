import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { isObjectVisible } from '../../shared/visibility';

const flagGeometry = new THREE.PlaneGeometry(1.3, 0.7, 10, 4);
const flagVertices = flagGeometry.attributes.position;
for (let i = 0; i < flagVertices.count; i++) {
  const u = (flagVertices.getX(i) + 0.65) / 1.3;
  flagVertices.setXYZ(i, u * 1.3, flagVertices.getY(i) - u * u * 0.13,
    Math.sin(u * Math.PI * 3) * u * 0.12);
}
flagGeometry.computeVertexNormals();

const flagTimeUniform = { value: 0 };
const flagMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getOrCreateFlagMaterial(color: string, emissive: string, emissiveIntensity: number): THREE.MeshStandardMaterial {
  const key = `${color}_${emissive}_${emissiveIntensity}`;
  let mat = flagMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      side: THREE.DoubleSide,
      roughness: 0.65,
    });
    mat.customProgramCacheKey = () => 'ship-flag-wave-v1';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFlagTime = flagTimeUniform;
      shader.vertexShader = `uniform float uFlagTime;\n` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float flagU = clamp(transformed.x / 1.3, 0.0, 1.0);
        float wave = sin(flagU * 9.5 - uFlagTime * 9.0) * 0.09 + cos(flagU * 5.0 - uFlagTime * 6.2 + transformed.y * 2.5) * 0.04;
        transformed.z += wave * flagU;
        transformed.y += sin(flagU * 6.0 - uFlagTime * 7.5) * 0.025 * flagU;`
      );
    };
    flagMaterialCache.set(key, mat);
  }
  return mat;
}

const _tempOrientation = new THREE.Quaternion();
const _tempHeading = new THREE.Euler(0, 0, 0, 'YXZ');

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

  const isTeamMode = useGameStore((s) => s.currentRoom?.gameMode === 'TEAM');
  const storeTeam = useGameStore((s) => {
    if (!shipId) return undefined;
    return s.currentRoom?.players.find((p) => p.id === shipId)?.team;
  });
  const selfId = useGameStore((s) => s.selfId);
  const selfTeam = useGameStore((s) => s.currentRoom?.players.find((p) => p.id === s.selfId)?.team);

  const team = propTeam ?? storeTeam ?? (shipId === selfId ? selfTeam : undefined);
  const isFriendly = propIsFriendly ?? (isTeamMode && Boolean(selfTeam && team && selfTeam === team));

  const flagMaterial = useMemo(() => {
    if (isTeamMode) {
      if (team === 'red') {
        return getOrCreateFlagMaterial('#ef4444', '#7f1d1d', 0.35);
      } else if (team === 'blue') {
        return getOrCreateFlagMaterial('#0ea5e9', '#0369a1', 0.35);
      } else if (isFriendly !== undefined) {
        return isFriendly
          ? getOrCreateFlagMaterial('#0ea5e9', '#0369a1', 0.35)
          : getOrCreateFlagMaterial('#ef4444', '#7f1d1d', 0.35);
      }
    }

    if (isGhost) {
      return getOrCreateFlagMaterial('#059669', '#065f46', 0.3);
    }

    if (isEnemy) {
      return getOrCreateFlagMaterial('#dc2626', '#7f1d1d', 0.25);
    }

    return getOrCreateFlagMaterial('#2563eb', '#1e40af', 0.25);
  }, [isTeamMode, team, isFriendly, isGhost, isEnemy]);

  const flagFrame = useRef(Math.floor(Math.random() * 6));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    flagTimeUniform.value = t;

    if (!flagRef.current) return;
    if (isEnemy) {
      flagFrame.current++;
      if (flagFrame.current % 6 !== 0) return;
    }
    if (isObjectVisible(flagRef.current)) {
      let parentRotY = 0;
      if (isEnemy && shipId) {
        const ship = findShip(useGameStore.getState().ships, shipId);
        parentRotY = ship ? ship.rotationY : 0;
      } else if (flagRef.current.parent) {
        flagRef.current.parent.getWorldQuaternion(_tempOrientation);
        parentRotY = _tempHeading.setFromQuaternion(_tempOrientation, 'YXZ').y;
      }
      // Wind blowing direction relative to the ship hull
      const targetRelYaw = (windAngle + Math.PI) - parentRotY;
      const flutter = Math.sin(t * 11) * 0.22;
      const ripple = Math.cos(t * 8) * 0.12;

      flagRef.current.rotation.y = targetRelYaw + flutter;
      flagRef.current.rotation.z = ripple;
    }
  });

  return (
    <mesh
      ref={flagRef}
      geometry={flagGeometry}
      material={flagMaterial}
      position={position}
      castShadow={!isEnemy}
    />
  );
});
