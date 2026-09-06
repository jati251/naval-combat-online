/**
 * Ship Geometries Barrel
 * Modularized into sailGeometries.ts and curvedHullGeometries.ts.
 */

export {
  createBillowedSailGeometry,
  createJibSailGeometry,
  createLateenSailGeometry,
} from './sailGeometries';

export {
  type CurvedHullOptions,
  createCurvedHullGeometry,
  createCurvedDeckGeometry,
  createSheerRailGeometry,
} from './curvedHullGeometries';
