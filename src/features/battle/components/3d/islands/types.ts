export interface IslandDefinition {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  sandRadius: number;
  /** Island archetype for unique silhouette generation */
  type: 'volcanic' | 'atoll' | 'sea-stack' | 'lush-flat' | 'verdant-hills' | 'dense-jungle';
  palms: Array<[number, number, number]>; // [relX, relZ, scale]
  /** Extra vegetation clusters [relX, relZ, scale] */
  bushes: Array<[number, number, number]>;
  /** Dense broadleaf rainforest canopy trees [relX, relZ, scale] */
  jungleTrees?: Array<[number, number, number]>;
  /** Rock formation scatter [relX, relZ, scale, yRot] */
  rocks: Array<[number, number, number, number]>;
  /** Seed for deterministic procedural variation */
  seed: number;
  /** Optional elongated island stretch and orientation */
  elongation?: {
    scaleX: number;
    scaleZ: number;
    angle: number; // yaw angle in radians
  };
}
