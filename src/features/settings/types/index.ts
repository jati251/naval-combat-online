export type GraphicQuality = 'fast' | 'balanced' | 'performance';
export type ResolutionLimit = '720p' | '1080p' | 'native';

export interface WaterShaderFeatures {
  /** Distance in meters within which capillary micro-ripples are rendered */
  capillaryDist: number;
  /** Number of harmonic capillary wave frequencies (1, 3, or 7) */
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
  /** Underwater coastal reef caustics quality (0 = off, 1 = standard, 2 = chromatic dual-layer) */
  causticsQuality?: 0 | 1 | 2;
  /** Dynamic procedural sky & cloud reflection on water swells */
  cloudReflectionEnabled?: boolean;
  /** Wind-driven Langmuir foam streaks and crest trail striations */
  windStreakFoamEnabled?: boolean;
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
  maxResolution?: { width: number; height: number };
}

export interface SettingsState {
  graphicQuality: GraphicQuality;
  resolutionLimit: ResolutionLimit;
  isSettingsOpen: boolean;
  setGraphicQuality: (quality: GraphicQuality) => void;
  setResolutionLimit: (limit: ResolutionLimit) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}


