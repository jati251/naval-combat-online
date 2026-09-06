import * as THREE from 'three';

// ─── CROSSED BILLBOARD GEOMETRIES ───
// Compact, realistically-proportioned vegetation (dense without being oversized)
export const palmPlaneGeo = new THREE.PlaneGeometry(5.4, 7.4);
palmPlaneGeo.translate(0, 3.7, 0);

export const junglePlaneGeo = new THREE.PlaneGeometry(6.4, 7.2);
junglePlaneGeo.translate(0, 3.6, 0);

// Compact, ground-hugging tropical bush geometry (2.6m wide x 1.8m tall)
export const bushPlaneGeo = new THREE.PlaneGeometry(2.6, 1.8);
bushPlaneGeo.translate(0, 0.9, 0);

// Optimized small undergrowth bush sprite geometry (1.8m wide x 1.3m tall)
export const smallBushPlaneGeo = new THREE.PlaneGeometry(1.8, 1.3);
smallBushPlaneGeo.translate(0, 0.65, 0);
