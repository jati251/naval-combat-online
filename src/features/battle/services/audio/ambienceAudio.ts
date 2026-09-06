import type { AudioContextManager } from './audioContext';

export class AmbienceAudioSynth {
  private isAmbienceActive: boolean = false;
  private oceanWaveSource: AudioBufferSourceNode | null = null;
  private oceanWaveFilter: BiquadFilterNode | null = null;
  private oceanWaveGain: GainNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private oceanLfoGain: GainNode | null = null;

  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  constructor(private audioMgr: AudioContextManager) {}

  public getIsActive(): boolean {
    return this.isAmbienceActive;
  }

  public startAmbience(): void {
    if (this.isAmbienceActive || this.audioMgr.getIsMuted()) return;
    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();
    if (!brownBuffer) return;

    this.isAmbienceActive = true;
    const t = ctx.currentTime;

    try {
      // 1. Rolling Deep Ocean Swells (Brown noise through deep lowpass, NO harsh highs)
      this.oceanWaveSource = ctx.createBufferSource();
      this.oceanWaveSource.buffer = brownBuffer;
      this.oceanWaveSource.loop = true;

      this.oceanWaveFilter = ctx.createBiquadFilter();
      this.oceanWaveFilter.type = 'lowpass';
      this.oceanWaveFilter.frequency.setValueAtTime(110, t); // Deep, soothing underwater body
      this.oceanWaveFilter.Q.setValueAtTime(1.2, t);

      this.oceanWaveGain = ctx.createGain();
      this.oceanWaveGain.gain.setValueAtTime(0.016, t); // Very gentle background level

      // Very slow LFO (~0.08Hz, ~12 second cycle) for peaceful rolling swells
      this.oceanLfo = ctx.createOscillator();
      this.oceanLfo.frequency.setValueAtTime(0.08, t);

      this.oceanLfoGain = ctx.createGain();
      this.oceanLfoGain.gain.setValueAtTime(45, t); // Modulation: 65Hz to 155Hz

      this.oceanLfo.connect(this.oceanLfoGain);
      this.oceanLfoGain.connect(this.oceanWaveFilter.frequency);

      this.oceanWaveSource.connect(this.oceanWaveFilter);
      this.oceanWaveFilter.connect(this.oceanWaveGain);
      this.oceanWaveGain.connect(dest);

      this.oceanWaveSource.start(t);
      this.oceanLfo.start(t);

      // 2. Soft Sea Breeze Wind (Gentle breath of wind, not a roaring fan)
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = brownBuffer;
      this.windSource.loop = true;

      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(320, t);
      this.windFilter.Q.setValueAtTime(1.1, t);

      this.windGain = ctx.createGain();
      this.windGain.gain.setValueAtTime(0.012, t); // Very soft baseline

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(dest);

      this.windSource.start(t);
    } catch {
      this.stopAmbience();
    }
  }

  public updateAmbienceSpeed(speed: number): void {
    const ctx = this.audioMgr.getContext();
    if (!this.isAmbienceActive || !ctx) return;
    const normalizedSpeed = Math.max(0, Math.min(1, speed / 16));
    const t = ctx.currentTime;

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
