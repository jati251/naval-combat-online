export class AudioContextManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;

  private cachedBrownNoiseBuffer: AudioBuffer | null = null;
  private cachedWhiteNoiseBuffer: AudioBuffer | null = null;
  private cachedDistortionCurve: Float32Array | null = null;

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

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getAudioDestination(): AudioNode | null {
    this.init();
    return this.masterGain;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean, onMuteCallback?: () => void): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    if (muted && onMuteCallback) {
      onMuteCallback();
    }
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getBrownNoiseBuffer(): AudioBuffer | null {
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

  public getWhiteNoiseBuffer(): AudioBuffer | null {
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

  public getDistortionCurve(): Float32Array {
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
}
