// Procedural Web Audio API sound synthesizer for Naval Combat Online (Black Flag Audio Engine)
// Zero external files required, zero latency, runs directly in browser.

class NavalAudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;
  private cachedNoiseBuffer: AudioBuffer | null = null;

  public init(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Powerful cannon explosion: burst of white noise shaped with lowpass sweep & sub-bass punch
   */
  public playCannonFire(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;

    // 1. Heavy low-frequency punch oscillator (140Hz -> 32Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    oscGain.gain.setValueAtTime(0.85 * this.masterVolume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);

    // 2. Gunpowder explosion burst (Cached noise buffer filtered through lowpass sweep)
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.linearRampToValueAtTime(110, t + 0.45);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.95 * this.masterVolume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.6);
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
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.2);

    gain.gain.setValueAtTime(0.8 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
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
    this.init();
    if (!this.ctx) return;

    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.38);
  }

  /**
   * Ship brass bell ringing (battle start, victory)
   */
  public playShipBell(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [1200, 1680, 2400];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime((0.35 / (idx + 1)) * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  /**
   * Canvas unfurling whoosh sound when shifting sails
   */
  public playSailShift(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);

    gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Fanfare melody when winning battle
   */
  public playVictory(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, C (Major fanfare)
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const startTime = this.ctx.currentTime + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.45 * this.masterVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  /**
   * Sinking/defeat minor melody
   */
  public playDefeat(): void {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [330.0, 311.13, 293.66, 261.63]; // Descending minor
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const startTime = this.ctx.currentTime + i * 0.2;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.35 * this.masterVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
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

