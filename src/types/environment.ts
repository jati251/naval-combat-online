export interface GerstnerWaveParams {
  direction: [number, number];
  steepness: number;
  wavelength: number;
  speed: number;
}

// Global deterministic wave definition synchronized with server simulation
export const GERSTNER_WAVES: GerstnerWaveParams[] = [
  // 1. Dominant gentle Caribbean swell (long rolling crest, ~1.3m amplitude)
  { direction: [1.0, 0.25], steepness: 0.10, wavelength: 85.0, speed: 2.8 },
  // 2. Secondary diagonal swell (~0.55m amplitude)
  { direction: [0.55, 0.85], steepness: 0.08, wavelength: 44.0, speed: 2.2 },
  // 3. Surface chop wave (~0.2m amplitude)
  { direction: [-0.35, 0.92], steepness: 0.06, wavelength: 22.0, speed: 1.7 },
  // 4. Fine capillary ripple (~0.07m amplitude)
  { direction: [-0.75, -0.65], steepness: 0.04, wavelength: 11.0, speed: 1.3 },
];

export interface IslandDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  sandRadius: number;
  /** Island archetype for unique silhouette generation */
  type: 'volcanic' | 'atoll' | 'sea-stack' | 'lush-flat';
  palms: Array<[number, number, number]>; // [relX, relZ, scale]
  /** Extra vegetation clusters [relX, relZ, scale] */
  bushes: Array<[number, number, number]>;
  /** Rock formation scatter [relX, relZ, scale, yRot] */
  rocks: Array<[number, number, number, number]>;
  /** Seed for deterministic procedural variation */
  seed: number;
}
