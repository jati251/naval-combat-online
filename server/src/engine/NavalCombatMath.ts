/**
 * Authoritative Naval Combat Gunnery & Ballistics Math Engine
 * Single Source of Truth for Port & Starboard broadside transformations.
 */

export type BroadsideSide = 'port' | 'starboard';

export interface BroadsideTransform {
  /** Ballistic firing angle in world radians */
  fireAngle: number;
  /** Unit lateral vector X perpendicular to ship heading pointing to battery side */
  lateralX: number;
  /** Unit lateral vector Z perpendicular to ship heading pointing to battery side */
  lateralZ: number;
  /** World spawn coordinate X for muzzle discharge */
  spawnX: number;
  /** World spawn coordinate Z for muzzle discharge */
  spawnZ: number;
}

/**
 * Calculates unified ballistic transform for broadside firing.
 * Starboard (Right): fires at heading + PI/2, lateral vector (+cosH, -sinH)
 * Port (Left): fires at heading - PI/2, lateral vector (-cosH, +sinH)
 */
export function getBroadsideTransform(
  shipX: number,
  shipZ: number,
  heading: number,
  side: BroadsideSide,
  width: number,
  offsetAlongLength: number = 0
): BroadsideTransform {
  const isRight = side === 'starboard';
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);

  // Starboard (Right) = +1, Port (Left) = -1
  const lateralSign = isRight ? 1 : -1;
  const lateralX = cosH * lateralSign;
  const lateralZ = -sinH * lateralSign;

  // Starboard (Right) = heading + PI/2, Port (Left) = heading - PI/2
  const fireAngle = heading + (isRight ? Math.PI * 0.5 : -Math.PI * 0.5);

  const halfWid = width * 0.5 + 0.2;
  const spawnX = shipX + sinH * offsetAlongLength + lateralX * halfWid;
  const spawnZ = shipZ + cosH * offsetAlongLength + lateralZ * halfWid;

  return {
    fireAngle,
    lateralX,
    lateralZ,
    spawnX,
    spawnZ,
  };
}
