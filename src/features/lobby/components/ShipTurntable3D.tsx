import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ShipModel3D } from '@/features/battle/components/3d/ShipModel3D';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';

interface ShipTurntable3DProps {
  shipClass: ShipClass;
}

const RotatingShip: React.FC<{ shipClass: ShipClass }> = ({ shipClass }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      <ShipModel3D shipClass={shipClass} sailState="HALF_SAIL" />
    </group>
  );
};

export const ShipTurntable3D: React.FC<ShipTurntable3DProps> = ({ shipClass }) => {
  const config = SHIP_PRESETS[shipClass] || SHIP_PRESETS.brig;
  const camDist = Math.max(16, config.length * 1.12);

  return (
    <div className="w-full h-full relative">
      <Canvas
        key={shipClass}
        camera={{ position: [0, camDist * 0.38, camDist], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[12, 22, 16]} intensity={2.6} castShadow />
        <pointLight position={[-12, 6, -10]} color="#38bdf8" intensity={1.5} />

        <RotatingShip shipClass={shipClass} />

        {/* Shadow floor disk */}
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[config.length * 0.75, 32]} />
          <meshBasicMaterial color="#020617" transparent opacity={0.6} />
        </mesh>
      </Canvas>
    </div>
  );
};
