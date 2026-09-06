import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ShipModel3D } from '@/features/battle/components/3d/ShipModel3D';
import { SHIP_PRESETS, type ShipClass } from '@/types/game';

interface ShipTurntable3DProps {
  shipClass: ShipClass;
}

function PreviewCamera({ length }: { length: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    const halfFov = THREE.MathUtils.degToRad(perspective.fov / 2);
    const aspect = size.width / Math.max(1, size.height);
    const distance = length * 0.72 / Math.tan(halfFov) / Math.min(1, aspect);
    camera.position.set(distance * 0.35, length * 0.55, distance);
    camera.lookAt(0, length * 0.4, 0);
    perspective.updateProjectionMatrix();
  }, [camera, size.width, size.height, length]);
  return null;
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
        camera={{ position: [0, camDist * 0.38, camDist], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      >
        <PreviewCamera length={config.length} />
        <hemisphereLight args={['#dce9ee', '#715844', 1.8]} />
        <directionalLight position={[12, 22, 16]} intensity={2.6} />
        <directionalLight position={[-12, 10, -16]} color="#d5e5ed" intensity={1.8} />

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
