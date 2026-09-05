import React, { useMemo } from 'react';
import * as THREE from 'three';

interface StandingRiggingProps {
  mastPosition: [number, number, number];
  mastHeight: number;
  hullWidth: number;
  shroudSpread?: number;
  includeRatlines?: boolean;
  color?: string;
}

/**
 * Creates authentic tall-ship Standing Rigging (Shrouds, Ratlines, Deadeyes)
 * connecting the mast tops to the port and starboard hull chainplates.
 */
export const StandingRigging: React.FC<StandingRiggingProps> = React.memo(({
  mastPosition,
  mastHeight,
  hullWidth,
  shroudSpread = 1.6,
  includeRatlines = true,
  color = '#27201c',
}) => {
  const [mX, mY, mZ] = mastPosition;
  const topY = mY + mastHeight * 0.65; // Attachment at lower masthead / trestletrees
  const baseChainY = mY + 0.2; // Chainplate height at gunwale
  const chainX = hullWidth * 0.52; // Tucked onto outer hull rail

  // Generate shroud line pairs and ratline rungs
  const { shroudCylinders, ratlineSteps } = useMemo(() => {
    const shrouds: { pos: [number, number, number]; rot: [number, number, number]; len: number }[] = [];
    const rungs: { pos: [number, number, number]; rot: [number, number, number]; width: number }[] = [];

    const offsetsZ = [-shroudSpread * 0.5, 0, shroudSpread * 0.5];

    [-chainX, chainX].forEach((sideX) => {
      offsetsZ.forEach((offZ) => {
        const pA = new THREE.Vector3(sideX, baseChainY, mZ + offZ);
        const pB = new THREE.Vector3(mX, topY, mZ);

        const dir = new THREE.Vector3().subVectors(pB, pA);
        const len = dir.length();
        const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);

        // Rotation from vertical [0, 1, 0] to dir
        const orientation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize()
        );
        const euler = new THREE.Euler().setFromQuaternion(orientation);

        shrouds.push({
          pos: [mid.x, mid.y, mid.z],
          rot: [euler.x, euler.y, euler.z],
          len,
        });
      });

      // Horizontal ratline rungs (rope ladder steps)
      if (includeRatlines) {
        const numRungs = 7;
        for (let r = 1; r <= numRungs; r++) {
          const t = 0.15 + (r / (numRungs + 1)) * 0.72; // Fraction from base to top
          const curY = THREE.MathUtils.lerp(baseChainY, topY, t);
          const curX = THREE.MathUtils.lerp(sideX, mX, t);
          const curSpanZ = THREE.MathUtils.lerp(shroudSpread, shroudSpread * 0.2, t);

          rungs.push({
            pos: [curX, curY, mZ],
            rot: [0, 0, 0],
            width: Math.max(0.25, curSpanZ),
          });
        }
      }
    });

    return { shroudCylinders: shrouds, ratlineSteps: rungs };
  }, [mastPosition, mastHeight, hullWidth, shroudSpread, includeRatlines, topY, baseChainY, chainX, mX, mY, mZ]);

  return (
    <group>
      {/* Shroud Ropes */}
      {shroudCylinders.map((sh, idx) => (
        <mesh key={`sh-${idx}`} position={sh.pos} rotation={sh.rot as [number, number, number]}>
          <cylinderGeometry args={[0.02, 0.02, sh.len, 4]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}

      {/* Ratline Cross-Rungs */}
      {ratlineSteps.map((rg, idx) => (
        <mesh key={`rg-${idx}`} position={rg.pos} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, rg.width, 4]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}

      {/* Wooden Deadeyes at Chainplates (Port & Starboard) */}
      {[-chainX, chainX].map((dx, sideIdx) => (
        <group key={`deadeyes-${sideIdx}`} position={[dx, baseChainY, mZ]}>
          {[-shroudSpread * 0.5, 0, shroudSpread * 0.5].map((dz, dIdx) => (
            <group key={`de-${dIdx}`} position={[0, 0, dz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
                <meshStandardMaterial color="#451a03" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.22, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.35, 4]} />
                <meshStandardMaterial color="#27272a" metalness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
});
