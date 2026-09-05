export interface GerstnerWaveParams {
  direction: [number, number];
  steepness: number;
  wavelength: number;
  speed: number;
}

// Global deterministic wave definition synchronized with server simulation
export const GERSTNER_WAVES: GerstnerWaveParams[] = [
  { direction: [1.0, 0.3], steepness: 0.32, wavelength: 52.0, speed: 3.4 },
  { direction: [0.6, 0.8], steepness: 0.22, wavelength: 28.0, speed: 2.6 },
  { direction: [-0.3, 0.95], steepness: 0.18, wavelength: 16.0, speed: 2.0 },
  { direction: [-0.7, -0.7], steepness: 0.12, wavelength: 8.0, speed: 1.4 },
];

export interface IslandDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  sandRadius: number;
  palms: Array<[number, number, number]>; // [relX, relZ, scale]
}
