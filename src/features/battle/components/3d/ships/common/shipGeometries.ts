import * as THREE from 'three';

/**
 * Creates aerodynamic billowing sail geometry with natural forward-pushing parabolic belly.
 */
export function createBillowedSailGeometry(width: number, height: number, depth = 0.45): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 8, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (width * 0.5);
    const v = pos.getY(i) / (height * 0.5);
    const belly = Math.cos(u * Math.PI * 0.5) * Math.cos(v * Math.PI * 0.5);
    pos.setZ(i, belly * depth);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates triangular bowsprit staysail (flying jib).
 */
export function createJibSailGeometry(spanZ: number, heightY: number, depth = 0.35): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, heightY);
  shape.lineTo(spanZ, 0);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / spanZ;
    const y = pos.getY(i) / heightY;
    const belly = Math.sin(Math.max(0, Math.min(1, x)) * Math.PI) * Math.sin(Math.max(0, Math.min(1, y)) * Math.PI);
    pos.setZ(i, belly * depth);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates triangular/trapezoidal Lateen sail geometry.
 */
export function createLateenSailGeometry(lengthZ: number, heightY: number, depth = 0.4): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-lengthZ * 0.4, 0);
  shape.lineTo(0, heightY);
  shape.lineTo(lengthZ * 0.6, 0);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const normX = (pos.getX(i) + lengthZ * 0.4) / lengthZ;
    const normY = pos.getY(i) / heightY;
    const belly = Math.sin(Math.max(0, Math.min(1, normX)) * Math.PI) * Math.sin(Math.max(0, Math.min(1, normY)) * Math.PI);
    pos.setZ(i, belly * depth);
  }
  geo.computeVertexNormals();
  return geo;
}
