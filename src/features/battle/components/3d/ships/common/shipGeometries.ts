import * as THREE from 'three';

/**
 * Creates aerodynamic billowing square sail geometry with authentic 18th-century
 * camber, forward-pushing belly, and scalloped/roached lower foot (clew cutaway).
 */
export function createBillowedSailGeometry(
  width: number,
  height: number,
  depth = 0.52
): THREE.BufferGeometry {
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
    pos.setZ(i, belly * depth);

    // Scalloped roach (cutaway arc along the bottom edge v < -0.6)
    if (v < -0.3) {
      const bottomProximity = (-v - 0.3) / 0.7; // 0 at -0.3, 1 at bottom
      const roachArch = Math.cos(u * Math.PI * 0.5) * height * 0.08 * bottomProximity;
      pos.setY(i, y + roachArch);
    }
  }

  geo.computeVertexNormals();
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
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, heightY);
  shape.lineTo(spanZ, 0);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / spanZ;
    const y = pos.getY(i) / heightY;

    // Aerodynamic belly pouch in the middle of the triangular canvas
    const belly = Math.sin(Math.max(0, Math.min(1, x)) * Math.PI) *
                  Math.sin(Math.max(0, Math.min(1, y)) * Math.PI);

    pos.setZ(i, belly * depth);
  }

  geo.computeVertexNormals();
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
  const shape = new THREE.Shape();
  shape.moveTo(-lengthZ * 0.4, 0);
  shape.lineTo(0, heightY);
  shape.lineTo(lengthZ * 0.6, 0);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const normX = (pos.getX(i) + lengthZ * 0.4) / lengthZ;
    const normY = pos.getY(i) / heightY;

    const belly = Math.sin(Math.max(0, Math.min(1, normX)) * Math.PI) *
                  Math.sin(Math.max(0, Math.min(1, normY)) * Math.PI);

    pos.setZ(i, belly * depth);
  }

  geo.computeVertexNormals();
  return geo;
}

export interface CurvedHullOptions {
  length: number;
  width: number;
  depth?: number;
  sheerBow?: number;
  sheerStern?: number;
  tumblehome?: number;
  transomWidthRatio?: number;
  bowCutwaterAngle?: number;
  segmentsZ?: number;
  segmentsGirth?: number;
}

/**
 * Creates smooth hydrodynamic 18th-century curved naval hull geometry.
 * Features:
 * - Graceful sheer curve (swept up at bow and stern)
 * - Hydrodynamic waterline taper (clipper convex entrance, wide waist, transom run)
 * - Tumblehome & deadrise: rounded bilges and inward-leaning topsides
 * - Curved cutwater stem and arched transom stern
 * - Smooth vertex normals and seamless wood planking UV mapping
 */
export function createCurvedHullGeometry(options: CurvedHullOptions): THREE.BufferGeometry {
  const {
    length,
    width,
    depth = 3.6,
    sheerBow = 0.9,
    sheerStern = 1.1,
    tumblehome = 0.08,
    transomWidthRatio = 0.62,
    segmentsZ = 32,
    segmentsGirth = 22,
  } = options;

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfWidth = width * 0.5;
  const halfLength = length * 0.5;

  // Planform taper profile along normalized length u in [0, 1] (0 = stern, 1 = bow)
  const getBeamFactor = (u: number): number => {
    if (u >= 0.56) {
      const t = (u - 0.56) / 0.44; // 0 at max beam, 1 at bow
      // Clipper convex arc tapering down to narrow stem
      const arc = Math.cos(t * Math.PI * 0.5);
      return 0.04 + 0.96 * Math.pow(arc, 0.75);
    } else {
      const t = u / 0.56; // 0 at stern, 1 at max beam
      const smooth = t * t * (3 - 2 * t);
      return transomWidthRatio + (1.0 - transomWidthRatio) * smooth;
    }
  };

  // Sheer line height along u in [0, 1]
  const getSheerY = (u: number): number => {
    if (u >= 0.42) {
      const t = (u - 0.42) / 0.58;
      return depth + sheerBow * (t * t);
    }
    const t = (0.42 - u) / 0.42;
    return depth + sheerStern * (t * t);
  };

  // Keel rise profile along u in [0, 1]
  const getKeelY = (u: number): number => {
    if (u > 0.72) {
      const t = (u - 0.72) / 0.28;
      return (depth * 0.62) * (t * t);
    } else if (u < 0.12) {
      const t = (0.12 - u) / 0.12;
      return (depth * 0.32) * (t * t);
    }
    return 0;
  };

  // Generate grid: i along Z (stern to bow), j along girth (port rail to stbd rail)
  const numZ = segmentsZ;
  const numG = segmentsGirth;

  for (let i = 0; i <= numZ; i++) {
    const uZ = i / numZ; // 0 (stern) -> 1 (bow)
    const z = -halfLength + uZ * length;
    const localBeamFactor = getBeamFactor(uZ);
    const localHalfWidth = halfWidth * localBeamFactor;
    const sheerY = getSheerY(uZ);
    const keelY = getKeelY(uZ);
    const heightSpan = Math.max(0.2, sheerY - keelY);

    for (let j = 0; j <= numG; j++) {
      const s = (j / numG) * 2 - 1; // -1 (port gunwale) .. 0 (keel) .. +1 (starboard gunwale)
      const absS = Math.abs(s);
      const sign = s >= 0 ? 1 : -1;

      let x: number;
      let y: number;

      // Realistic naval cross section:
      // Keel deadrise -> rounded bilge curve -> topside tumblehome
      if (absS <= 0.6) {
        // Keel to bilge
        const t = absS / 0.6; // 0 at keel, 1 at bilge
        const bilgeFactor = Math.sin(t * Math.PI * 0.5);
        x = sign * localHalfWidth * Math.pow(bilgeFactor, 0.75);
        y = keelY + heightSpan * (0.5 * Math.pow(t, 1.35));
      } else {
        // Bilge to gunwale
        const t = (absS - 0.6) / 0.4; // 0 at bilge, 1 at rail
        // Tumblehome at midship/stern, flare at bow
        const tumblehomeAmount = uZ > 0.75
          ? -0.08 * (uZ - 0.75) / 0.25 // Bow flare pushes outward
          : tumblehome * (1 - Math.pow(uZ, 2)); // Inward tumblehome elsewhere
        
        const widthModifier = 1.0 - tumblehomeAmount * t;
        x = sign * localHalfWidth * widthModifier;
        y = keelY + heightSpan * (0.5 + 0.5 * t);
      }

      vertices.push(x, y, z);

      // UV coordinates: u along length, v along girth
      uvs.push(uZ * (length * 0.5), (j / numG) * 4);
    }
  }

  // Generate hull flank triangles
  const stride = numG + 1;
  for (let i = 0; i < numZ; i++) {
    for (let j = 0; j < numG; j++) {
      const v00 = i * stride + j;
      const v10 = (i + 1) * stride + j;
      const v01 = i * stride + (j + 1);
      const v11 = (i + 1) * stride + (j + 1);

      // Outward facing winding order
      indices.push(v00, v10, v01);
      indices.push(v10, v11, v01);
    }
  }

  // Transom Stern Cap (closing the aft end at i = 0)
  const transomBaseIdx = vertices.length / 3;
  const transomZ = -halfLength;
  const sternSheerY = getSheerY(0);
  const sternKeelY = getKeelY(0);
  const sternWidth = halfWidth * transomWidthRatio;

  // Center hub vertex for fan/grid triangulation of stern
  vertices.push(0, (sternSheerY + sternKeelY) * 0.5, transomZ);
  uvs.push(0.5, 0.5);

  for (let j = 0; j <= numG; j++) {
    const origIdx = j; // i = 0
    const x = vertices[origIdx * 3];
    const y = vertices[origIdx * 3 + 1];
    vertices.push(x, y, transomZ);
    uvs.push((x / (sternWidth * 2)) + 0.5, (y - sternKeelY) / (sternSheerY - sternKeelY));
  }

  const centerTransomIdx = transomBaseIdx;
  for (let j = 0; j < numG; j++) {
    const tA = transomBaseIdx + 1 + j;
    const tB = transomBaseIdx + 1 + (j + 1);
    // Face pointing aft (-Z)
    indices.push(centerTransomIdx, tB, tA);
  }

  // Bow Cutwater Cap (narrow forward stem closure at i = numZ)
  const bowBaseIdx = vertices.length / 3;
  const bowZ = halfLength;
  const bowSheerY = getSheerY(1);
  const bowKeelY = getKeelY(1);

  vertices.push(0, (bowSheerY + bowKeelY) * 0.5, bowZ + 0.15);
  uvs.push(0.5, 0.5);

  for (let j = 0; j <= numG; j++) {
    const origIdx = numZ * stride + j;
    const x = vertices[origIdx * 3];
    const y = vertices[origIdx * 3 + 1];
    vertices.push(x, y, bowZ);
    uvs.push((x / (width * 0.2)) + 0.5, (y - bowKeelY) / (bowSheerY - bowKeelY));
  }

  const centerBowIdx = bowBaseIdx;
  for (let j = 0; j < numG; j++) {
    const bA = bowBaseIdx + 1 + j;
    const bB = bowBaseIdx + 1 + (j + 1);
    // Face pointing forward (+Z)
    indices.push(centerBowIdx, bA, bB);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Creates authentic cambered weatherdeck geometry matching the curved hull sheer and beam taper.
 * Features slight camber crown (centerline arched higher by ~0.08m) and plank UV mapping.
 */
export function createCurvedDeckGeometry(options: CurvedHullOptions, inset = -0.06): THREE.BufferGeometry {
  const {
    length,
    width,
    depth = 3.6,
    sheerBow = 0.9,
    sheerStern = 1.1,
    tumblehome = 0.08,
    transomWidthRatio = 0.62,
    segmentsZ = 28,
  } = options;

  const segmentsX = 10;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const halfWidth = width * 0.5;
  const halfLength = length * 0.5;

  const getBeamFactor = (u: number): number => {
    if (u >= 0.56) {
      const t = (u - 0.56) / 0.44;
      const arc = Math.cos(t * Math.PI * 0.5);
      return 0.04 + 0.96 * Math.pow(arc, 0.75);
    } else {
      const t = u / 0.56;
      const smooth = t * t * (3 - 2 * t);
      return transomWidthRatio + (1.0 - transomWidthRatio) * smooth;
    }
  };

  const getSheerY = (u: number): number => {
    if (u >= 0.42) {
      const t = (u - 0.42) / 0.58;
      return depth + sheerBow * (t * t);
    }
    const t = (0.42 - u) / 0.42;
    return depth + sheerStern * (t * t);
  };

  for (let i = 0; i <= segmentsZ; i++) {
    const uZ = i / segmentsZ;
    const z = -halfLength + uZ * length;
    const localBeamFactor = getBeamFactor(uZ);
    // Tumblehome adjustment so deck intersects solidly with hull walls
    const tumbleMod = uZ > 0.75 ? 1.0 : (1.0 - tumblehome * 0.5);
    const localHalfWidth = Math.max(0.12, halfWidth * localBeamFactor * tumbleMod - inset);
    const sheerY = getSheerY(uZ) - 0.15; // Deck sits just below bulwark cap

    for (let j = 0; j <= segmentsX; j++) {
      const uX = (j / segmentsX) * 2 - 1; // -1 .. +1
      const x = uX * localHalfWidth;
      // Deck camber crown: higher in the middle
      const camber = 0.08 * Math.cos(uX * Math.PI * 0.5);
      const y = sheerY + camber;

      vertices.push(x, y, z);
      uvs.push(j / segmentsX, uZ * (length * 0.4));
    }
  }

  const stride = segmentsX + 1;
  for (let i = 0; i < segmentsZ; i++) {
    for (let j = 0; j < segmentsX; j++) {
      const v00 = i * stride + j;
      const v10 = (i + 1) * stride + j;
      const v01 = i * stride + (j + 1);
      const v11 = (i + 1) * stride + (j + 1);

      // Upward facing deck triangles
      indices.push(v00, v01, v10);
      indices.push(v10, v01, v11);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Creates continuous curved wooden gunwale sheer rails and waterway strakes
 * that trace the graceful sheer curve on port and starboard sides.
 */
export function createSheerRailGeometry(
  options: CurvedHullOptions,
  railWidth = 0.22,
  railHeight = 0.28,
  side: 'port' | 'starboard' | 'both' = 'both'
): THREE.BufferGeometry {
  const {
    length,
    width,
    depth = 3.6,
    sheerBow = 0.9,
    sheerStern = 1.1,
    transomWidthRatio = 0.62,
    segmentsZ = 28,
  } = options;

  const halfWidth = width * 0.5;
  const halfLength = length * 0.5;

  const getBeamFactor = (u: number): number => {
    if (u >= 0.56) {
      const t = (u - 0.56) / 0.44;
      return 0.04 + 0.96 * Math.pow(Math.cos(t * Math.PI * 0.5), 0.75);
    } else {
      const t = u / 0.56;
      return transomWidthRatio + (1.0 - transomWidthRatio) * (t * t * (3 - 2 * t));
    }
  };

  const getSheerY = (u: number): number => {
    if (u >= 0.42) {
      const t = (u - 0.42) / 0.58;
      return depth + sheerBow * (t * t);
    }
    const t = (0.42 - u) / 0.42;
    return depth + sheerStern * (t * t);
  };

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const addRail = (multiplier: number) => {
    const baseIdx = vertices.length / 3;

    for (let i = 0; i <= segmentsZ; i++) {
      const uZ = i / segmentsZ;
      const z = -halfLength + uZ * length;
      const localHalfWidth = halfWidth * getBeamFactor(uZ);
      const y = getSheerY(uZ);

      // Inner and outer edges of the rail
      const xIn = (localHalfWidth - railWidth * 0.5) * multiplier;
      const xOut = (localHalfWidth + railWidth * 0.5) * multiplier;

      // 4 corners of the rail cross-section
      vertices.push(xIn, y, z);
      vertices.push(xOut, y, z);
      vertices.push(xOut, y + railHeight, z);
      vertices.push(xIn, y + railHeight, z);

      for (let k = 0; k < 4; k++) {
        uvs.push(k * 0.25, uZ * 4);
      }
    }

    for (let i = 0; i < segmentsZ; i++) {
      const r0 = baseIdx + i * 4;
      const r1 = baseIdx + (i + 1) * 4;

      // 4 faces of the extruded rail
      for (let f = 0; f < 4; f++) {
        const a = r0 + f;
        const b = r0 + ((f + 1) % 4);
        const c = r1 + f;
        const d = r1 + ((f + 1) % 4);

        if (multiplier > 0) {
          indices.push(a, c, b);
          indices.push(b, c, d);
        } else {
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
    }
  };

  if (side === 'starboard' || side === 'both') addRail(1);
  if (side === 'port' || side === 'both') addRail(-1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}
