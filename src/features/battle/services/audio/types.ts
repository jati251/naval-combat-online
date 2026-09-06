export interface SpatialAudioOptions {
  worldPos?: { x: number; z: number };
  side?: 'left' | 'right';
  pan?: number;
  volumeMultiplier?: number;
  isSelf?: boolean;
}

export interface SpatialResult {
  pan: number;
  volume: number;
  filterFreq: number;
}
