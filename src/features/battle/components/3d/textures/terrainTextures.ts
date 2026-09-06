/**
 * Procedural Terrain Textures Barrel
 * Modularized into rockTextures.ts and groundTextures.ts.
 */

export {
  createCliffRockTexture,
  createCliffRockBumpTexture,
  createCliffRockRoughnessTexture,
  createDarkRockTexture,
} from './rockTextures';

export {
  createBeachSandTexture,
  createBeachSandBumpTexture,
  createVegetationTexture,
  createHillGrassTexture,
} from './groundTextures';

export {
  hashNoise,
  smoothNoise,
  fbmNoise,
  terrainTextureCache,
} from './noiseUtils';
