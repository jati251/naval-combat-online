export type GraphicQuality = 'fast' | 'balanced' | 'performance';

export interface WaterShaderFeatures {
  /** Distance in meters within which capillary micro-ripples are rendered */
  capillaryDist: number;
  /** Number of harmonic capillary wave frequencies (1, 3, or 5) */
  capillaryHarmonics: number;
  /** Distance in meters within which Subsurface Scattering (SSS) is calculated */
  sssDist: number;
  /** Distance in meters within which cellular froth foam is calculated */
  foamDist: number;
  /** Whether dynamic ship Kelvin wake calculation is enabled */
  wakesEnabled: boolean;
  /** Extra specular glitter glints enabled (sun/moon sparkling facets) */
  glitterEnabled: boolean;
  /** Distance in meters where water surface directly transitions to horizon fog */
  horizonLODCutoff: number;
}

export interface GraphicProfile {
  id: GraphicQuality;
  label: string;
  subtitle: string;
  badge: string;
  recommendedFor: string;
  fpsTarget: string;
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  waterSegments: number;
  waveCount: number;
  waterShader: WaterShaderFeatures;
  atmosphereParticles: number;
  fogDensityDay: number;
  fogDensityNight: number;
  fogNear: number;
  fogFar: number;
  maxViewDistance: number;
  islandDetailDistance: number;
  toneMappingExposureDay: number;
  toneMappingExposureNight: number;
}

export interface SettingsState {
  graphicQuality: GraphicQuality;
  isSettingsOpen: boolean;
  setGraphicQuality: (quality: GraphicQuality) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}
