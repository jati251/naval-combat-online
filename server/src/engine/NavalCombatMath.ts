/**
 * Authoritative Naval Combat Gunnery & Ballistics Math Engine
 * Single Source of Truth for Left & Right broadside transformations.
 */

export type BroadsideSide = 'left' | 'right';

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
 * Left: fires at heading + PI/2, lateral vector (+cosH, -sinH)
 * Right: fires at heading - PI/2, lateral vector (-cosH, +sinH)
 */
export function getBroadsideTransform(
  shipX: number,
  shipZ: number,
  heading: number,
  side: BroadsideSide,
  width: number,
  offsetAlongLength: number = 0
): BroadsideTransform {
  const isLeft = side === 'left';
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);

  // Left = +1, Right = -1
  const lateralSign = isLeft ? 1 : -1;
  const lateralX = cosH * lateralSign;
  const lateralZ = -sinH * lateralSign;

  // Left = heading + PI/2, Right = heading - PI/2
  const fireAngle = heading + (isLeft ? Math.PI * 0.5 : -Math.PI * 0.5);

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
