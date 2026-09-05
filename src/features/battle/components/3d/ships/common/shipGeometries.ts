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
