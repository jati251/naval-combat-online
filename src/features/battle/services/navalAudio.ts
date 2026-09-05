// Procedural Web Audio API sound synthesizer for Naval Combat Online (Black Flag Audio Engine)
// Zero external files required, zero latency, runs directly in browser.

class NavalAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;
  private cachedNoiseBuffer: AudioBuffer | null = null;

  // Rate-limiting / voice concurrency trackers
  private lastCannonTime: number = 0;
  private lastSplashTime: number = 0;
  private lastImpactTime: number = 0;
  private lastSailTime: number = 0;
  private lastBellTime: number = 0;

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
        this.compressor.threshold.setValueAtTime(-4, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(14, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

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

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.cachedNoiseBuffer || this.cachedNoiseBuffer.sampleRate !== this.ctx.sampleRate) {
      // Pre-compute 1.0s of white noise once, re-use infinitely across all cannon shots & splashes
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.cachedNoiseBuffer = buffer;
    }
    return this.cachedNoiseBuffer;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Powerful cannon explosion: burst of white noise shaped with lowpass sweep & sub-bass punch
   */
  public playCannonFire(): void {
    if (this.isMuted) return;
    const now = performance.now();
    // Rate limit: at most one cannon discharge every 55ms
    if (now - this.lastCannonTime < 55) return;
    this.lastCannonTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;

    // 1. Heavy low-frequency punch oscillator (140Hz -> 32Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135 + (Math.random() - 0.5) * 15, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    oscGain.gain.setValueAtTime(0.75, t);
    oscGain.gain.exponentialRampToValueAtTime(0.005, t + 0.55);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.55);

    // 2. Gunpowder explosion burst (Cached noise buffer filtered through lowpass sweep)
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 + (Math.random() - 0.5) * 100, t);
    filter.frequency.linearRampToValueAtTime(110, t + 0.42);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.5);

    // Cleanup audio nodes after playback ends to avoid memory leaks
    setTimeout(() => {
      try {
        osc.disconnect();
        oscGain.disconnect();
        whiteNoise.disconnect();
        filter.disconnect();
        noiseGain.disconnect();
      } catch {
        // Node already disconnected
      }
    }, 600);
  }

  // Alias for backward compatibility
  public playCannonShot(): void {
    this.playCannonFire();
  }

  /**
   * Cannonball hitting wooden hull
   */
  public playWoodHit(): void {
    if (this.isMuted) return;
    const now = performance.now();
    // Rate limit: coalesce multiple simultaneous impacts (max 1 every 70ms)
    if (now - this.lastImpactTime < 70) return;
    this.lastImpactTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260 + (Math.random() - 0.5) * 40, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.25);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Node already disconnected
      }
    }, 300);
  }

  // Alias for backward compatibility
  public playHullImpact(): void {
    this.playWoodHit();
  }

  /**
   * Water splash sound when cannonball hits ocean
   */
  public playWaterSplash(): void {
    if (this.isMuted) return;
    const now = performance.now();
    // Rate limit: coalesce multiple simultaneous splashes (max 1 every 80ms)
    if (now - this.lastSplashTime < 80) return;
    this.lastSplashTime = now;

    this.init();
    if (!this.ctx) return;
    const dest = this.getAudioDestination();
    if (!dest) return;

    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420 + (Math.random() - 0.5) * 60, t);
    filter.Q.setValueAtTime(2.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + 0.35);

    setTimeout(() => {
      try {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Node already disconnected
      }
    }, 400);
  }

  /**
   * Ship brass bell ringing (battle start, victory)
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
    const freqs = [1200, 1680, 2400];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !dest) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 1.2);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Node already disconnected
        }
      }, 1300);
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

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.15);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Node already disconnected
      }
    }, 200);
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

      gain.gain.setValueAtTime(0.4, startTime);
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
          // Node already disconnected
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
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
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
          // Node already disconnected
        }
      }, 700);
    });
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

