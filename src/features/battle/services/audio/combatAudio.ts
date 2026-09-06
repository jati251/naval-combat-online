import type { AudioContextManager } from './audioContext';
import type { SpatialAudioCalculator } from './spatialAudio';
import type { SpatialAudioOptions } from './types';

export class CombatAudioSynth {
  private lastCannonTime: number = 0;
  private activeCannonVoices: number = 0;
  private lastSplashTime: number = 0;
  private lastImpactTime: number = 0;
  private lastSinkTime: number = 0;

  constructor(
    private audioMgr: AudioContextManager,
    private spatialCalc: SpatialAudioCalculator
  ) {}

  public playCannonFire(options?: SpatialAudioOptions): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    const isLocal = options?.side !== undefined || options?.isSelf;

    // Rate limit: 55ms for local player, 95ms for remote ships
    const minInterval = isLocal ? 55 : 95;
    if (now - this.lastCannonTime < minInterval) return;
    this.lastCannonTime = now;

    // Concurrency throttle: cap active complex cannon graphs to 3
    if (!isLocal && this.activeCannonVoices >= 3) return;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;

    const spatial = this.spatialCalc.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.spatialCalc.createSpatialVoice(spatial);
    if (!voice) return;

    const t = ctx.currentTime;
    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();

    // STREAMLINED GRAPH FOR DISTANT / REMOTE SHIPS:
    // Only 2 nodes (brown noise roar + lowpass filter). Reduces WebAudio node count by 85%!
    if (!isLocal) {
      if (brownBuffer) {
        const roar = ctx.createBufferSource();
        roar.buffer = brownBuffer;
        const roarFilter = ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(380, t);
        roarFilter.frequency.exponentialRampToValueAtTime(80, t + 0.38);

        const roarGain = ctx.createGain();
        roarGain.gain.setValueAtTime(0.65, t);
        roarGain.gain.exponentialRampToValueAtTime(0.005, t + 0.42);

        roar.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(voice.input);

        roar.start(t);
        roar.stop(t + 0.45);

        setTimeout(() => {
          try {
            roar.disconnect();
            roarFilter.disconnect();
            roarGain.disconnect();
            voice.disconnect();
          } catch {
            // Cleaned up
          }
        }, 500);
      }
      return;
    }

    // FULL HIGH-IMPACT CINEMATIC STACK FOR LOCAL PLAYER SHIP:
    this.activeCannonVoices++;
    const whiteBuffer = this.audioMgr.getWhiteNoiseBuffer();
    const distCurve = this.audioMgr.getDistortionCurve();

    // 1. Initial Shockwave Muzzle Crack (0 to 45ms) - Sharp black powder ignition
    if (whiteBuffer) {
      const crack = ctx.createBufferSource();
      crack.buffer = whiteBuffer;

      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(2400, t);
      crackFilter.Q.setValueAtTime(1.8, t);

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.7, t);
      crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      crack.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(voice.input);

      crack.start(t);
      crack.stop(t + 0.06);

      setTimeout(() => {
        try {
          crack.disconnect();
          crackFilter.disconnect();
          crackGain.disconnect();
        } catch {
          // Disconnected
        }
      }, 80);
    }

    // 2. Visceral Sub-bass Heavy Punch (Sine pitch drop through analog WaveShaper saturation)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.32);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.95, t);
    subGain.gain.exponentialRampToValueAtTime(0.005, t + 0.48);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;
    shaper.oversample = 'none';

    subOsc.connect(subGain);
    subGain.connect(shaper);
    shaper.connect(voice.input);

    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // 3. Heavy Gunpowder Expansion Roar (Brown Noise through lowpass sweep)
    if (brownBuffer) {
      const roar = ctx.createBufferSource();
      roar.buffer = brownBuffer;

      const roarFilter = ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(600, t);
      roarFilter.frequency.exponentialRampToValueAtTime(75, t + 0.42);

      const roarGain = ctx.createGain();
      roarGain.gain.setValueAtTime(0.85, t);
      roarGain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);

      roar.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(voice.input);

      roar.start(t);
      roar.stop(t + 0.52);

      // 4. Rolling Ocean Thunder Echo (Lingering low rumble over open water)
      const echo = ctx.createBufferSource();
      echo.buffer = brownBuffer;

      const echoFilter = ctx.createBiquadFilter();
      echoFilter.type = 'bandpass';
      echoFilter.frequency.setValueAtTime(140, t + 0.06);
      echoFilter.Q.setValueAtTime(1.3, t);

      const echoGain = ctx.createGain();
      echoGain.gain.setValueAtTime(0.001, t);
      echoGain.gain.linearRampToValueAtTime(0.4, t + 0.1);
      echoGain.gain.exponentialRampToValueAtTime(0.002, t + 1.05);

      echo.connect(echoFilter);
      echoFilter.connect(echoGain);
      echoGain.connect(voice.input);

      echo.start(t + 0.06);
      echo.stop(t + 1.1);

      setTimeout(() => {
        try {
          roar.disconnect();
          roarFilter.disconnect();
          roarGain.disconnect();
          echo.disconnect();
          echoFilter.disconnect();
          echoGain.disconnect();
        } catch {
          // Disconnected
        }
      }, 1200);
    }

    setTimeout(() => {
      this.activeCannonVoices = Math.max(0, this.activeCannonVoices - 1);
      try {
        subOsc.disconnect();
        subGain.disconnect();
        shaper.disconnect();
        voice.disconnect();
      } catch {
        // Disconnected
      }
    }, 550);
  }

  public playCannonShot(options?: SpatialAudioOptions): void {
    this.playCannonFire(options);
  }

  public playWoodHit(options?: SpatialAudioOptions): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastImpactTime < 80) return;
    this.lastImpactTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;

    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();
    const whiteBuffer = this.audioMgr.getWhiteNoiseBuffer();
    const distCurve = this.audioMgr.getDistortionCurve();

    const spatial = this.spatialCalc.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.spatialCalc.createSpatialVoice(spatial);
    if (!voice) return;

    const t = ctx.currentTime;
    const isSelf = options?.isSelf ?? false;

    // 1. Heavy hull frame thump (160Hz -> 36Hz through WaveShaper)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isSelf ? 170 : 130, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.22);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(isSelf ? 0.9 : 0.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;
    shaper.oversample = 'none';

    osc.connect(oscGain);
    oscGain.connect(shaper);
    shaper.connect(voice.input);
    osc.start(t);
    osc.stop(t + 0.32);

    // 2. Oak plank splinter crunch
    if (brownBuffer || whiteBuffer) {
      const splinter = ctx.createBufferSource();
      splinter.buffer = whiteBuffer || brownBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.setValueAtTime(1.8, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(isSelf ? 0.55 : 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);

      splinter.connect(filter);
      filter.connect(gain);
      gain.connect(voice.input);

      splinter.start(t);
      splinter.stop(t + 0.18);

      setTimeout(() => {
        try {
          splinter.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 220);
    }

    setTimeout(() => {
      try {
        osc.disconnect();
        oscGain.disconnect();
        shaper.disconnect();
        voice.disconnect();
      } catch {
        // Disconnected
      }
    }, 380);
  }

  public playHullImpact(options?: SpatialAudioOptions): void {
    this.playWoodHit(options);
  }

  public playWaterSplash(options?: SpatialAudioOptions): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastSplashTime < 120) return;
    this.lastSplashTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;

    const whiteBuffer = this.audioMgr.getWhiteNoiseBuffer();
    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();

    const spatial = this.spatialCalc.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.spatialCalc.createSpatialVoice(spatial);
    if (!voice) return;

    const t = ctx.currentTime;

    // 1. Hydrodynamic water impact entry (280Hz -> 65Hz sweep)
    const plop = ctx.createOscillator();
    const plopGain = ctx.createGain();
    plop.type = 'sine';
    plop.frequency.setValueAtTime(280 + (Math.random() - 0.5) * 30, t);
    plop.frequency.exponentialRampToValueAtTime(65, t + 0.11);

    plopGain.gain.setValueAtTime(0.4, t);
    plopGain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);

    plop.connect(plopGain);
    plopGain.connect(voice.input);
    plop.start(t);
    plop.stop(t + 0.15);

    // 2. Soft frothy spray & foam hiss (not piercing)
    const noise = ctx.createBufferSource();
    noise.buffer = whiteBuffer || brownBuffer;

    if (noise.buffer) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.linearRampToValueAtTime(220, t + 0.28);
      filter.Q.setValueAtTime(1.8, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(voice.input);

      noise.start(t);
      noise.stop(t + 0.32);

      setTimeout(() => {
        try {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 360);
    }

    setTimeout(() => {
      try {
        plop.disconnect();
        plopGain.disconnect();
        voice.disconnect();
      } catch {
        // Disconnected
      }
    }, 380);
  }

  public playShipSunk(options?: SpatialAudioOptions): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastSinkTime < 250) return;
    this.lastSinkTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;

    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();
    const whiteBuffer = this.audioMgr.getWhiteNoiseBuffer();
    const distCurve = this.audioMgr.getDistortionCurve();

    const spatial = this.spatialCalc.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.spatialCalc.createSpatialVoice(spatial);
    if (!voice) return;

    const t = ctx.currentTime;
    const isSelf = options?.isSelf ?? false;

    // 1. Primary Detonation Blast (Deep sine drop 160Hz -> 18Hz through WaveShaper)
    const blast1 = ctx.createOscillator();
    blast1.type = 'sine';
    blast1.frequency.setValueAtTime(160, t);
    blast1.frequency.exponentialRampToValueAtTime(20, t + 0.5);

    const blast1Gain = ctx.createGain();
    blast1Gain.gain.setValueAtTime(isSelf ? 1.0 : 0.85, t);
    blast1Gain.gain.exponentialRampToValueAtTime(0.005, t + 0.7);

    const shaper = ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;

    blast1.connect(blast1Gain);
    blast1Gain.connect(shaper);
    shaper.connect(voice.input);
    blast1.start(t);
    blast1.stop(t + 0.75);

    // 2. Secondary Magazine Detonation (+70ms delay for colossal double-blast)
    const blast2 = ctx.createOscillator();
    blast2.type = 'sine';
    blast2.frequency.setValueAtTime(110, t + 0.07);
    blast2.frequency.exponentialRampToValueAtTime(18, t + 0.65);

    const blast2Gain = ctx.createGain();
    blast2Gain.gain.setValueAtTime(0.001, t);
    blast2Gain.gain.setValueAtTime(isSelf ? 0.9 : 0.75, t + 0.07);
    blast2Gain.gain.exponentialRampToValueAtTime(0.005, t + 0.85);

    blast2.connect(blast2Gain);
    blast2Gain.connect(shaper);
    blast2.start(t + 0.07);
    blast2.stop(t + 0.88);

    // 3. Massive Brown Noise Fireball Roar
    if (brownBuffer) {
      const roar = ctx.createBufferSource();
      roar.buffer = brownBuffer;

      const roarFilter = ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(750, t);
      roarFilter.frequency.exponentialRampToValueAtTime(55, t + 0.9);

      const roarGain = ctx.createGain();
      roarGain.gain.setValueAtTime(isSelf ? 1.0 : 0.8, t);
      roarGain.gain.exponentialRampToValueAtTime(0.005, t + 1.2);

      roar.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(voice.input);

      roar.start(t);
      roar.stop(t + 1.25);

      // 4. Underwater Flooding Surge
      const surge = ctx.createBufferSource();
      surge.buffer = brownBuffer;

      const surgeFilter = ctx.createBiquadFilter();
      surgeFilter.type = 'bandpass';
      surgeFilter.frequency.setValueAtTime(220, t + 0.2);
      surgeFilter.Q.setValueAtTime(2.2, t);

      const surgeGain = ctx.createGain();
      surgeGain.gain.setValueAtTime(0.001, t);
      surgeGain.gain.linearRampToValueAtTime(0.4, t + 0.4);
      surgeGain.gain.exponentialRampToValueAtTime(0.005, t + 1.6);

      surge.connect(surgeFilter);
      surgeFilter.connect(surgeGain);
      surgeGain.connect(voice.input);

      surge.start(t + 0.15);
      surge.stop(t + 1.65);

      setTimeout(() => {
        try {
          roar.disconnect();
          roarFilter.disconnect();
          roarGain.disconnect();
          surge.disconnect();
          surgeFilter.disconnect();
          surgeGain.disconnect();
        } catch {
          // Disconnected
        }
      }, 1700);
    }

    // 5. Timber Snapping Crackles
    if (whiteBuffer) {
      const timber = ctx.createBufferSource();
      timber.buffer = whiteBuffer;

      const timberFilter = ctx.createBiquadFilter();
      timberFilter.type = 'bandpass';
      timberFilter.frequency.setValueAtTime(950, t);
      timberFilter.Q.setValueAtTime(2.0, t);

      const timberGain = ctx.createGain();
      timberGain.gain.setValueAtTime(0.5, t);
      timberGain.gain.exponentialRampToValueAtTime(0.005, t + 0.25);

      timber.connect(timberFilter);
      timberFilter.connect(timberGain);
      timberGain.connect(voice.input);

      timber.start(t + 0.04);
      timber.stop(t + 0.3);

      setTimeout(() => {
        try {
          timber.disconnect();
          timberFilter.disconnect();
          timberGain.disconnect();
        } catch {
          // Disconnected
        }
      }, 350);
    }

    setTimeout(() => {
      try {
        blast1.disconnect();
        blast1Gain.disconnect();
        blast2.disconnect();
        blast2Gain.disconnect();
        shaper.disconnect();
        voice.disconnect();
      } catch {
        // Disconnected
      }
    }, 1800);
  }
}
