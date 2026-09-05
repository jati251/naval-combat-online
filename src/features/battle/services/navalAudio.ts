// Procedural Web Audio API sound synthesizer for Naval Combat Online (Black Flag Audio Engine)
// Zero external files required, zero latency, runs directly in browser.
// Features: Brown-noise synthesis, analog-saturated WaveShaper punch, Spatial Area Audio, Stereo Panning, and Gentle Ocean Ambience.

export interface SpatialAudioOptions {
  worldPos?: { x: number; z: number };
  side?: 'left' | 'right';
  pan?: number;
  volumeMultiplier?: number;
  isSelf?: boolean;
}

interface SpatialResult {
  pan: number;
  volume: number;
  filterFreq: number;
}

class NavalAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;

  // Precomputed specialized buffers for cinematic acoustics
  private cachedBrownNoiseBuffer: AudioBuffer | null = null;
  private cachedWhiteNoiseBuffer: AudioBuffer | null = null;
  private cachedDistortionCurve: Float32Array | null = null;

  // Listener spatial coordinates in world (updated every frame from local ship)
  private listenerX: number = 0;
  private listenerZ: number = 0;
  private listenerHeading: number = 0;

  // Continuous oceanic ambience nodes (gentle & warm, never noisy)
  private isAmbienceActive: boolean = false;
  private oceanWaveSource: AudioBufferSourceNode | null = null;
  private oceanWaveFilter: BiquadFilterNode | null = null;
  private oceanWaveGain: GainNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private oceanLfoGain: GainNode | null = null;

  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // Rate-limiting / voice concurrency trackers
  private lastCannonTime: number = 0;
  private lastSplashTime: number = 0;
  private lastImpactTime: number = 0;
  private lastSailTime: number = 0;
  private lastBellTime: number = 0;
  private lastSinkTime: number = 0;
  private lastCreakTime: number = 0;

  public init(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Limiter / Compressor prevents digital clipping during multi-ship salvos
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-3, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(16, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getAudioDestination(): AudioNode | null {
    this.init();
    return this.masterGain;
  }

  /**
   * Generates deep, rumbling Brown Noise (-6dB/octave).
   * Unlike harsh white noise hiss, brown noise has natural rolling thunder & sea rumble characteristics.
   */
  private getBrownNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.cachedBrownNoiseBuffer || this.cachedBrownNoiseBuffer.sampleRate !== this.ctx.sampleRate) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 3.0);
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      let lastL = 0;
      let lastR = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        lastL = (lastL + 0.038 * whiteL) / 1.038;
        lastR = (lastR + 0.038 * whiteR) / 1.038;
        left[i] = Math.max(-1, Math.min(1, lastL * 3.9));
        right[i] = Math.max(-1, Math.min(1, lastR * 3.9));
      }
      this.cachedBrownNoiseBuffer = buffer;
    }
    return this.cachedBrownNoiseBuffer;
  }

  /**
   * Generates gentle white noise buffer for micro-transients and water spray
   */
  private getWhiteNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.cachedWhiteNoiseBuffer || this.cachedWhiteNoiseBuffer.sampleRate !== this.ctx.sampleRate) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      for (let i = 0; i < bufferSize; i++) {
        left[i] = Math.random() * 2 - 1;
        right[i] = Math.random() * 2 - 1;
      }
      this.cachedWhiteNoiseBuffer = buffer;
    }
    return this.cachedWhiteNoiseBuffer;
  }

  /**
   * Precomputed soft-clip overdrive / saturation curve.
   * Gives sub-sine drops an analog chest-thumping punch instead of an electronic buzzer.
   */
  private getDistortionCurve(): Float32Array {
    if (!this.cachedDistortionCurve) {
      const n = 2048;
      const curve = new Float32Array(n);
      const drive = 3.2;
      for (let i = 0; i < n; ++i) {
        const x = (i * 2) / n - 1;
        curve[i] = Math.tanh(x * drive);
      }
      this.cachedDistortionCurve = curve;
    }
    return this.cachedDistortionCurve;
  }

  /**
   * Update listener position & orientation in the ocean (called by ShipEntity each frame for self player)
   */
  public updateListener(x: number, z: number, rotationY: number): void {
    this.listenerX = x;
    this.listenerZ = z;
    this.listenerHeading = rotationY;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    if (muted) {
      this.stopAmbience();
    }
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Calculates stereo pan (-1 to 1), distance volume attenuation (0 to 1), and distance air-absorption filter
   */
  public calculateSpatial(options?: SpatialAudioOptions): SpatialResult {
    if (!options) {
      return { pan: 0, volume: 1, filterFreq: 18000 };
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
        return { pan: 0, volume: 0, filterFreq: 300 };
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

    return { pan, volume, filterFreq };
  }

  /**
   * Helper to create a spatialized audio voice pipeline:
   * Voice Nodes -> Air-absorption Lowpass -> Voice Gain -> Stereo Panner -> Master Gain
   */
  private createSpatialVoice(spatial: SpatialResult): {
    input: GainNode;
    disconnect: () => void;
  } | null {
    if (!this.ctx) return null;
    const dest = this.getAudioDestination();
    if (!dest) return null;

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(spatial.volume, this.ctx.currentTime);

    // Distance air-absorption filter
    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(spatial.filterFreq, this.ctx.currentTime);

    voiceGain.connect(airFilter);

    // Stereo panning
    let pannerNode: AudioNode = airFilter;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, spatial.pan)), this.ctx.currentTime);
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

  /**
   * Cinema-Grade Naval Cannon Fire:
   * 1. Detonation Shockwave Crack (fast powder flash transient)
   * 2. Analog-Saturated Sub-bass Kick (Sine 135Hz -> 24Hz through WaveShaper, ZERO sawtooth buzz)
   * 3. Deep Expanding Gunpowder Roar (Brown Noise through lowpass sweep)
   * 4. Lingering Ocean Thunder Echo (Warm reverberant reflection across the sea)
   */
  public playCannonFire(options?: SpatialAudioOptions): void {
    if (this.isMuted) return;
    const now = performance.now();
    // Rate limit: at most one cannon discharge every 45ms
    if (now - this.lastCannonTime < 45) return;
    this.lastCannonTime = now;

    this.init();
    if (!this.ctx) return;

    const brownBuffer = this.getBrownNoiseBuffer();
    const whiteBuffer = this.getWhiteNoiseBuffer();
    const distCurve = this.getDistortionCurve();

    const spatial = this.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.createSpatialVoice(spatial);
    if (!voice) return;

    const t = this.ctx.currentTime;
    const isLocal = options?.side !== undefined || options?.isSelf;

    // 1. Initial Shockwave Muzzle Crack (0 to 45ms) - Sharp black powder ignition
    if (whiteBuffer) {
      const crack = this.ctx.createBufferSource();
      crack.buffer = whiteBuffer;

      const crackFilter = this.ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(isLocal ? 2400 : 1200, t);
      crackFilter.Q.setValueAtTime(1.8, t);

      const crackGain = this.ctx.createGain();
      crackGain.gain.setValueAtTime(isLocal ? 0.7 : 0.4, t);
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
    // Pure sine wave gives massive chest-thumping bass, NO electronic buzzer/sawtooth sound!
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isLocal ? 140 : 115, t);
    subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.32);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(isLocal ? 0.95 : 0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.005, t + 0.48);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;
    shaper.oversample = '2x';

    subOsc.connect(subGain);
    subGain.connect(shaper);
    shaper.connect(voice.input);

    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // 3. Heavy Gunpowder Expansion Roar (Brown Noise through lowpass sweep)
    // Deep, rumbling, earthy combustion roar
    if (brownBuffer) {
      const roar = this.ctx.createBufferSource();
      roar.buffer = brownBuffer;

      const roarFilter = this.ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(isLocal ? 600 : 400, t);
      roarFilter.frequency.exponentialRampToValueAtTime(75, t + 0.42);

      const roarGain = this.ctx.createGain();
      roarGain.gain.setValueAtTime(isLocal ? 0.85 : 0.6, t);
      roarGain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);

      roar.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(voice.input);

      roar.start(t);
      roar.stop(t + 0.52);

      // 4. Rolling Ocean Thunder Echo (Lingering low rumble over open water)
      const echo = this.ctx.createBufferSource();
      echo.buffer = brownBuffer;

      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'bandpass';
      echoFilter.frequency.setValueAtTime(140, t + 0.06);
      echoFilter.Q.setValueAtTime(1.3, t);

      const echoGain = this.ctx.createGain();
      echoGain.gain.setValueAtTime(0.001, t);
      echoGain.gain.linearRampToValueAtTime(isLocal ? 0.4 : 0.25, t + 0.1);
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
      try {
        subOsc.disconnect();
        subGain.disconnect();
        shaper.disconnect();
        voice.disconnect();
      } catch {
        // Disconnected
      }
    }, 1200);
  }

  // Alias for backward compatibility
  public playCannonShot(options?: SpatialAudioOptions): void {
    this.playCannonFire(options);
  }

  /**
   * Cannonball smashing into heavy oak hull:
   * Heavy frame impact thump + splintering timber crunch + iron ball ricochet.
   */
  public playWoodHit(options?: SpatialAudioOptions): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastImpactTime < 55) return;
    this.lastImpactTime = now;

    this.init();
    if (!this.ctx) return;

    const brownBuffer = this.getBrownNoiseBuffer();
    const whiteBuffer = this.getWhiteNoiseBuffer();
    const distCurve = this.getDistortionCurve();

    const spatial = this.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.createSpatialVoice(spatial);
    if (!voice) return;

    const t = this.ctx.currentTime;
    const isSelf = options?.isSelf ?? false;

    // 1. Heavy hull frame thump (160Hz -> 36Hz through WaveShaper)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isSelf ? 170 : 130, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.22);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(isSelf ? 0.9 : 0.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;

    osc.connect(oscGain);
    oscGain.connect(shaper);
    shaper.connect(voice.input);
    osc.start(t);
    osc.stop(t + 0.32);

    // 2. Oak plank splinter crunch
    if (brownBuffer || whiteBuffer) {
      const splinter = this.ctx.createBufferSource();
      splinter.buffer = whiteBuffer || brownBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.Q.setValueAtTime(1.8, t);

      const gain = this.ctx.createGain();
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

  // Alias for backward compatibility
  public playHullImpact(options?: SpatialAudioOptions): void {
    this.playWoodHit(options);
  }

  /**
   * Water splash sound when cannonball strikes ocean surface:
   * Hydrodynamic entry plop + soft frothy spray.
   */
  public playWaterSplash(options?: SpatialAudioOptions): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastSplashTime < 65) return;
    this.lastSplashTime = now;

    this.init();
    if (!this.ctx) return;

    const whiteBuffer = this.getWhiteNoiseBuffer();
    const brownBuffer = this.getBrownNoiseBuffer();

    const spatial = this.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.createSpatialVoice(spatial);
    if (!voice) return;

    const t = this.ctx.currentTime;

    // 1. Hydrodynamic water impact entry (280Hz -> 65Hz sweep)
    const plop = this.ctx.createOscillator();
    const plopGain = this.ctx.createGain();
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
    const noise = this.ctx.createBufferSource();
    noise.buffer = whiteBuffer || brownBuffer;

    if (noise.buffer) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.linearRampToValueAtTime(220, t + 0.28);
      filter.Q.setValueAtTime(1.8, t);

      const gain = this.ctx.createGain();
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

  /**
   * Catastrophic warship sinking / powder magazine explosion:
   * Double-staggered massive explosion, splintering timber snap, and bubbling plunge.
   */
  public playShipSunk(options?: SpatialAudioOptions): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastSinkTime < 250) return;
    this.lastSinkTime = now;

    this.init();
    if (!this.ctx) return;

    const brownBuffer = this.getBrownNoiseBuffer();
    const whiteBuffer = this.getWhiteNoiseBuffer();
    const distCurve = this.getDistortionCurve();

    const spatial = this.calculateSpatial(options);
    if (spatial.volume <= 0.01) return;

    const voice = this.createSpatialVoice(spatial);
    if (!voice) return;

    const t = this.ctx.currentTime;
    const isSelf = options?.isSelf ?? false;

    // 1. Primary Detonation Blast (Deep sine drop 160Hz -> 18Hz through WaveShaper)
    const blast1 = this.ctx.createOscillator();
    blast1.type = 'sine';
    blast1.frequency.setValueAtTime(160, t);
    blast1.frequency.exponentialRampToValueAtTime(20, t + 0.5);

    const blast1Gain = this.ctx.createGain();
    blast1Gain.gain.setValueAtTime(isSelf ? 1.0 : 0.85, t);
    blast1Gain.gain.exponentialRampToValueAtTime(0.005, t + 0.7);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = distCurve as Float32Array<ArrayBuffer>;

    blast1.connect(blast1Gain);
    blast1Gain.connect(shaper);
    shaper.connect(voice.input);
    blast1.start(t);
    blast1.stop(t + 0.75);

    // 2. Secondary Magazine Detonation (+70ms delay for colossal double-blast)
    const blast2 = this.ctx.createOscillator();
    blast2.type = 'sine';
    blast2.frequency.setValueAtTime(110, t + 0.07);
    blast2.frequency.exponentialRampToValueAtTime(18, t + 0.65);

    const blast2Gain = this.ctx.createGain();
    blast2Gain.gain.setValueAtTime(0.001, t);
    blast2Gain.gain.setValueAtTime(isSelf ? 0.9 : 0.75, t + 0.07);
    blast2Gain.gain.exponentialRampToValueAtTime(0.005, t + 0.85);

    blast2.connect(blast2Gain);
    blast2Gain.connect(shaper);
    blast2.start(t + 0.07);
    blast2.stop(t + 0.88);

    // 3. Massive Brown Noise Fireball Roar
    if (brownBuffer) {
      const roar = this.ctx.createBufferSource();
      roar.buffer = brownBuffer;

      const roarFilter = this.ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(750, t);
      roarFilter.frequency.exponentialRampToValueAtTime(55, t + 0.9);

      const roarGain = this.ctx.createGain();
      roarGain.gain.setValueAtTime(isSelf ? 1.0 : 0.8, t);
      roarGain.gain.exponentialRampToValueAtTime(0.005, t + 1.2);

      roar.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(voice.input);

      roar.start(t);
      roar.stop(t + 1.25);

      // 4. Underwater Flooding Surge
      const surge = this.ctx.createBufferSource();
      surge.buffer = brownBuffer;

      const surgeFilter = this.ctx.createBiquadFilter();
      surgeFilter.type = 'bandpass';
      surgeFilter.frequency.setValueAtTime(220, t + 0.2);
      surgeFilter.Q.setValueAtTime(2.2, t);

      const surgeGain = this.ctx.createGain();
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
      const timber = this.ctx.createBufferSource();
      timber.buffer = whiteBuffer;

      const timberFilter = this.ctx.createBiquadFilter();
      timberFilter.type = 'bandpass';
      timberFilter.frequency.setValueAtTime(950, t);
      timberFilter.Q.setValueAtTime(2.0, t);

      const timberGain = this.ctx.createGain();
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

  /**
   * Subtle wood stress creaking under helm turn & wave swells
   */
  public playWoodCreak(): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastCreakTime < 3500) return;
    this.lastCreakTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(95, t + 0.2);
    osc.frequency.linearRampToValueAtTime(70, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 0.38);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.4);

    setTimeout(() => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Disconnected
      }
    }, 450);
  }

  /**
   * Multi-harmonic brass bell ringing (battle start, objective fanfare)
   */
  public playShipBell(): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastBellTime < 300) return;
    this.lastBellTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const t = this.ctx.currentTime;
    // Bell fundamental and authentic harmonic overtones
    const freqs = [1180, 1680, 2390, 3100];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !dest) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.24 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 1.4);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 1500);
    });
  }

  /**
   * Canvas unfurling whoosh sound when shifting sails
   */
  public playSailShift(): void {
    if (this.isMuted) return;
    const now = performance.now();
    if (now - this.lastSailTime < 150) return;
    this.lastSailTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const brownBuffer = this.getBrownNoiseBuffer();
    const t = this.ctx.currentTime;

    // Pitch sweep oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.14);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.18);

    // Canvas fabric flutter noise (Brown noise, soft, non-hissy)
    if (brownBuffer) {
      const canvas = this.ctx.createBufferSource();
      canvas.buffer = brownBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(380, t);
      filter.Q.setValueAtTime(1.2, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.2);

      canvas.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      canvas.start(t);
      canvas.stop(t + 0.22);

      setTimeout(() => {
        try {
          canvas.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 300);
    }

    setTimeout(() => {
      try {
        osc.disconnect();
        oscGain.disconnect();
      } catch {
        // Disconnected
      }
    }, 250);
  }

  /**
   * Fanfare melody when winning battle
   */
  public playVictory(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, C (Major fanfare)
    notes.forEach((freq, i) => {
      if (!this.ctx || !dest) return;
      const startTime = this.ctx.currentTime + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.45);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.45);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 600);
    });
  }

  /**
   * Sinking/defeat minor melody
   */
  public playDefeat(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const notes = [330.0, 311.13, 293.66, 261.63]; // Descending minor
    notes.forEach((freq, i) => {
      if (!this.ctx || !dest) return;
      const startTime = this.ctx.currentTime + i * 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.5);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.5);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Disconnected
        }
      }, 700);
    });
  }

  /**
   * Gentle, Calming Ocean Sea Ambience:
   * Uses low-frequency Brown Noise with gentle low-pass filtering (< 140Hz).
   * Super quiet (~0.016 gain), relaxing, and zero hissy static.
   */
  public startAmbience(): void {
    if (this.isAmbienceActive || this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const brownBuffer = this.getBrownNoiseBuffer();
    if (!brownBuffer) return;

    this.isAmbienceActive = true;
    const t = this.ctx.currentTime;

    try {
      // 1. Rolling Deep Ocean Swells (Brown noise through deep lowpass, NO harsh highs)
      this.oceanWaveSource = this.ctx.createBufferSource();
      this.oceanWaveSource.buffer = brownBuffer;
      this.oceanWaveSource.loop = true;

      this.oceanWaveFilter = this.ctx.createBiquadFilter();
      this.oceanWaveFilter.type = 'lowpass';
      this.oceanWaveFilter.frequency.setValueAtTime(110, t); // Deep, soothing underwater body
      this.oceanWaveFilter.Q.setValueAtTime(1.2, t);

      this.oceanWaveGain = this.ctx.createGain();
      this.oceanWaveGain.gain.setValueAtTime(0.016, t); // Very gentle background level

      // Very slow LFO (~0.08Hz, ~12 second cycle) for peaceful rolling swells
      this.oceanLfo = this.ctx.createOscillator();
      this.oceanLfo.frequency.setValueAtTime(0.08, t);

      this.oceanLfoGain = this.ctx.createGain();
      this.oceanLfoGain.gain.setValueAtTime(45, t); // Modulation: 65Hz to 155Hz

      this.oceanLfo.connect(this.oceanLfoGain);
      this.oceanLfoGain.connect(this.oceanWaveFilter.frequency);

      this.oceanWaveSource.connect(this.oceanWaveFilter);
      this.oceanWaveFilter.connect(this.oceanWaveGain);
      this.oceanWaveGain.connect(dest);

      this.oceanWaveSource.start(t);
      this.oceanLfo.start(t);

      // 2. Soft Sea Breeze Wind (Gentle breath of wind, not a roaring fan)
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = brownBuffer;
      this.windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(320, t);
      this.windFilter.Q.setValueAtTime(1.1, t);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.012, t); // Very soft baseline

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(dest);

      this.windSource.start(t);
    } catch {
      this.stopAmbience();
    }
  }

  /**
   * Adjust wind and water speed intensity subtly according to player's current speed
   */
  public updateAmbienceSpeed(speed: number): void {
    if (!this.isAmbienceActive || !this.ctx) return;
    const normalizedSpeed = Math.max(0, Math.min(1, speed / 16));
    const t = this.ctx.currentTime;

    if (this.windGain) {
      // Wind stays calm and gentle (max 0.026 at full speed)
      const targetGain = 0.012 + normalizedSpeed * 0.014;
      this.windGain.gain.setTargetAtTime(targetGain, t, 0.5);
    }
    if (this.windFilter) {
      const targetFreq = 300 + normalizedSpeed * 120;
      this.windFilter.frequency.setTargetAtTime(targetFreq, t, 0.5);
    }
    if (this.oceanWaveGain) {
      const targetWave = 0.016 + normalizedSpeed * 0.008;
      this.oceanWaveGain.gain.setTargetAtTime(targetWave, t, 0.5);
    }
  }

  /**
   * Stop background ambience
   */
  public stopAmbience(): void {
    this.isAmbienceActive = false;
    try {
      if (this.oceanWaveSource) {
        this.oceanWaveSource.stop();
        this.oceanWaveSource.disconnect();
        this.oceanWaveSource = null;
      }
      if (this.oceanLfo) {
        this.oceanLfo.stop();
        this.oceanLfo.disconnect();
        this.oceanLfo = null;
      }
      if (this.oceanWaveFilter) {
        this.oceanWaveFilter.disconnect();
        this.oceanWaveFilter = null;
      }
      if (this.oceanWaveGain) {
        this.oceanWaveGain.disconnect();
        this.oceanWaveGain = null;
      }
      if (this.oceanLfoGain) {
        this.oceanLfoGain.disconnect();
        this.oceanLfoGain = null;
      }
      if (this.windSource) {
        this.windSource.stop();
        this.windSource.disconnect();
        this.windSource = null;
      }
      if (this.windFilter) {
        this.windFilter.disconnect();
        this.windFilter = null;
      }
      if (this.windGain) {
        this.windGain.disconnect();
        this.windGain = null;
      }
    } catch {
      // Cleaned
    }
  }
}

export const navalAudio = new NavalAudioController();

// Global user gesture listener to reliably unlock AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    navalAudio.init();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('mousedown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('mousedown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}
