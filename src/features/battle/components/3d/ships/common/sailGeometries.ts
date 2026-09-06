import * as THREE from 'three';
import { createTriangularSailGeometry } from './triangularSailGeometry';

const geometryCache = new Map<string, THREE.BufferGeometry>();

/**
 * Creates aerodynamic billowing square sail geometry with authentic 18th-century
 * camber, forward-pushing belly, and scalloped/roached lower foot (clew cutaway).
 */
export function createBillowedSailGeometry(
  width: number,
  height: number,
  depth = 0.52
): THREE.BufferGeometry {
  const cacheKey = `billowed_${width.toFixed(2)}_${height.toFixed(2)}_${depth.toFixed(2)}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const segmentsX = 14;
  const segmentsY = 12;
  const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    const u = x / (width * 0.5); // -1 .. 1
    const v = y / (height * 0.5); // -1 (bottom) .. 1 (top)

    // Horizontal belly curve: cos(u * pi/2) drops to 0 at edges (pinned to leeches)
    const spanCamber = Math.cos(Math.max(-1, Math.min(1, u)) * Math.PI * 0.5);

    // Vertical belly curve: maximum forward belly around upper-mid (v ≈ 0.15)
    // pinned firmly at yardarm (v = 1) and billowing outward towards foot
    const vertProfile = Math.sin((v + 1) * 0.5 * Math.PI) * Math.cos(v * 0.5);

    // Forward wind pouch displacement
    const belly = Math.max(0, spanCamber * vertProfile);
    const folds = Math.sin(u * Math.PI * 9 + v * 1.4) * 0.022 * (1 - v * v) * spanCamber;
    pos.setZ(i, belly * depth + folds);
    pos.setX(i, x * (0.86 + 0.14 * (v + 1) * 0.5));

    // Scalloped roach (cutaway arc along the bottom edge v < -0.3)
    if (v < -0.3) {
      const bottomProximity = (-v - 0.3) / 0.7; // 0 at -0.3, 1 at bottom
      const roachArch = Math.cos(u * Math.PI * 0.5) * height * 0.08 * bottomProximity;
      pos.setY(i, y + roachArch);
    }
  }

  geo.computeVertexNormals();
  geometryCache.set(cacheKey, geo);
  return geo;
}

/**
 * Creates triangular bowsprit staysail (flying jib) with aerodynamic side-belly pouch.
 */
export function createJibSailGeometry(
  spanZ: number,
  heightY: number,
  depth = 0.42
): THREE.BufferGeometry {
  const cacheKey = `jib_${spanZ.toFixed(2)}_${heightY.toFixed(2)}_${depth.toFixed(2)}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const geo = createTriangularSailGeometry(0, spanZ, heightY, depth);
  geometryCache.set(cacheKey, geo);
  return geo;
}

/**
 * Creates triangular/trapezoidal Lateen sail geometry with authentic yard hang and wind pocket.
 */
export function createLateenSailGeometry(
  lengthZ: number,
  heightY: number,
  depth = 0.46
): THREE.BufferGeometry {
  const cacheKey = `lateen_${lengthZ.toFixed(2)}_${heightY.toFixed(2)}_${depth.toFixed(2)}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const geo = createTriangularSailGeometry(-lengthZ * 0.4, lengthZ * 0.6, heightY, depth);
  geometryCache.set(cacheKey, geo);
  return geo;
}
