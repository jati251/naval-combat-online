import type { AudioContextManager } from './audioContext';
import type { SpatialAudioOptions, SpatialResult } from './types';

export class SpatialAudioCalculator {
  private listenerX: number = 0;
  private listenerZ: number = 0;
  private listenerHeading: number = 0;
  private readonly scratchResult: SpatialResult = { pan: 0, volume: 1, filterFreq: 18000 };

  constructor(private audioMgr: AudioContextManager) {}

  public updateListener(x: number, z: number, rotationY: number): void {
    this.listenerX = x;
    this.listenerZ = z;
    this.listenerHeading = rotationY;
  }

  public calculateSpatial(options?: SpatialAudioOptions): SpatialResult {
    const out = this.scratchResult;
    if (!options) {
      out.pan = 0;
      out.volume = 1;
      out.filterFreq = 18000;
      return out;
    }

    let pan = options.pan ?? 0;
    let volume = options.volumeMultiplier ?? 1;
    let filterFreq = 18000;

    // Direct broadside side assignment for local ship
    if (options.side === 'left') {
      pan = -0.76;
    } else if (options.side === 'right') {
      pan = 0.76;
    }

    // World position spatial calculation relative to local ship heading
    if (options.worldPos) {
      const dx = options.worldPos.x - this.listenerX;
      const dz = options.worldPos.z - this.listenerZ;
      const dist = Math.hypot(dx, dz);

      // Max hearing distance in naval deathmatch arena
      const maxAudibleDist = 220;
      if (dist > maxAudibleDist) {
        out.pan = 0;
        out.volume = 0;
        out.filterFreq = 300;
        return out;
      }

      // Convert world delta into listener's local coordinates
      // In our coordinate system: forward is (sin(H), cos(H)), right is (cos(H), -sin(H))
      const heading = this.listenerHeading;
      const rightX = Math.cos(heading);
      const rightZ = -Math.sin(heading);
      const fwdX = Math.sin(heading);
      const fwdZ = Math.cos(heading);

      const dotRight = dx * rightX + dz * rightZ;
      const dotFwd = dx * fwdX + dz * fwdZ;

      // Calculate stereo pan based on relative lateral direction
      const angle = Math.atan2(dotRight, dotFwd);
      pan = Math.max(-1, Math.min(1, Math.sin(angle)));

      // Distance attenuation:
      // Sub-20m: intimate, full volume
      // 20m - 120m: realistic inverse falloff
      // 120m+: rolling decay towards arena boundary
      if (!options.isSelf) {
        const refDist = 20;
        const distFalloff = refDist / (refDist + dist * 0.95);
        const cutoffFalloff = Math.max(0, 1 - (dist / maxAudibleDist) ** 1.6);
        volume *= Math.max(0, Math.min(1, distFalloff * cutoffFalloff));

        // Atmospheric air absorption: high frequencies roll off smoothly over ocean distance
        filterFreq = Math.max(420, 16000 - dist * 72);
      }
    }

    if (options.isSelf) {
      volume = Math.max(volume, 0.95);
      filterFreq = Math.max(filterFreq, 14000);
    }

    out.pan = pan;
    out.volume = volume;
    out.filterFreq = filterFreq;
    return out;
  }

  public createSpatialVoice(spatial: SpatialResult): {
    input: GainNode;
    disconnect: () => void;
  } | null {
    const ctx = this.audioMgr.getContext();
    if (!ctx) return null;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return null;

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(spatial.volume, ctx.currentTime);

    // Distance air-absorption filter
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(spatial.filterFreq, ctx.currentTime);

    voiceGain.connect(airFilter);

    // Stereo panning
    let pannerNode: AudioNode = airFilter;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, spatial.pan)), ctx.currentTime);
      airFilter.connect(panner);
      pannerNode = panner;
    }

    pannerNode.connect(dest);

    const disconnect = () => {
      try {
        voiceGain.disconnect();
        airFilter.disconnect();
        pannerNode.disconnect();
      } catch {
        // Already disconnected
      }
    };

    return { input: voiceGain, disconnect };
  }
}
