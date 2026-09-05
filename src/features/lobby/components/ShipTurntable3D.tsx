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
  const config = SHIP_PRESETS[shipClass];

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45; // gentle showcase rotation
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      <ShipModel3D config={config} sailState="HALF_SAIL" />
    </group>
  );
};

export const ShipTurntable3D: React.FC<ShipTurntable3DProps> = ({ shipClass }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 8, 22], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 15]} intensity={2.5} castShadow />
        <pointLight position={[-10, 5, -10]} color="#38bdf8" intensity={1.5} />

        <RotatingShip shipClass={shipClass} />

        {/* Shadow floor disk */}
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[12, 32]} />
          <meshBasicMaterial color="#020617" transparent opacity={0.6} />
        </mesh>
      </Canvas>
    </div>
  );
};
