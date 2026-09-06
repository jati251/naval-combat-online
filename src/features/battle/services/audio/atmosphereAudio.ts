import type { AudioContextManager } from './audioContext';

export class AtmosphereAudioSynth {
  private lastCreakTime: number = 0;
  private lastBellTime: number = 0;
  private lastSailTime: number = 0;

  constructor(private audioMgr: AudioContextManager) {}

  public playWoodCreak(): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastCreakTime < 3500) return;
    this.lastCreakTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(95, t + 0.2);
    osc.frequency.linearRampToValueAtTime(70, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 0.38);

    const filter = ctx.createBiquadFilter();
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

  public playShipBell(): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastBellTime < 300) return;
    this.lastBellTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const t = ctx.currentTime;
    const freqs = [1180, 1680, 2390, 3100];
    freqs.forEach((freq, idx) => {
      if (!ctx || !dest) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
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

  public playSailShift(): void {
    if (this.audioMgr.getIsMuted()) return;
    const now = performance.now();
    if (now - this.lastSailTime < 150) return;
    this.lastSailTime = now;

    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const brownBuffer = this.audioMgr.getBrownNoiseBuffer();
    const t = ctx.currentTime;

    // Pitch sweep oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
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
      const canvas = ctx.createBufferSource();
      canvas.buffer = brownBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(380, t);
      filter.Q.setValueAtTime(1.2, t);

      const gain = ctx.createGain();
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

  public playVictory(): void {
    if (this.audioMgr.getIsMuted()) return;
    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, C (Major fanfare)
    notes.forEach((freq, i) => {
      if (!ctx || !dest) return;
      const startTime = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
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

  public playDefeat(): void {
    if (this.audioMgr.getIsMuted()) return;
    this.audioMgr.init();
    const ctx = this.audioMgr.getContext();
    if (!ctx) return;
    const dest = this.audioMgr.getAudioDestination();
    if (!dest) return;

    const notes = [330.0, 311.13, 293.66, 261.63]; // Descending minor
    notes.forEach((freq, i) => {
      if (!ctx || !dest) return;
      const startTime = ctx.currentTime + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
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
}
