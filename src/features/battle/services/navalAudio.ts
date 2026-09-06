// Procedural Web Audio API sound synthesizer for Naval Combat Online (Black Flag Audio Engine)
// Zero external files required, zero latency, runs directly in browser.
// Modularized into audio/ directory (audioContext, spatialAudio, combatAudio, atmosphereAudio, ambienceAudio).

import { AudioContextManager } from './audio/audioContext';
import { SpatialAudioCalculator } from './audio/spatialAudio';
import { CombatAudioSynth } from './audio/combatAudio';
import { AtmosphereAudioSynth } from './audio/atmosphereAudio';
import { AmbienceAudioSynth } from './audio/ambienceAudio';
import type { SpatialAudioOptions, SpatialResult } from './audio/types';

export type { SpatialAudioOptions, SpatialResult };

export class NavalAudioController {
  private audioMgr: AudioContextManager;
  private spatialCalc: SpatialAudioCalculator;
  private combatSynth: CombatAudioSynth;
  private atmosphereSynth: AtmosphereAudioSynth;
  private ambienceSynth: AmbienceAudioSynth;

  constructor() {
    this.audioMgr = new AudioContextManager();
    this.spatialCalc = new SpatialAudioCalculator(this.audioMgr);
    this.combatSynth = new CombatAudioSynth(this.audioMgr, this.spatialCalc);
    this.atmosphereSynth = new AtmosphereAudioSynth(this.audioMgr);
    this.ambienceSynth = new AmbienceAudioSynth(this.audioMgr);
  }

  public init(): void {
    this.audioMgr.init();
  }

  public updateListener(x: number, z: number, rotationY: number): void {
    this.spatialCalc.updateListener(x, z, rotationY);
  }

  public setMuted(muted: boolean): void {
    this.audioMgr.setMuted(muted, () => this.stopAmbience());
  }

  public setVolume(vol: number): void {
    this.audioMgr.setVolume(vol);
  }

  public calculateSpatial(options?: SpatialAudioOptions): SpatialResult {
    return this.spatialCalc.calculateSpatial(options);
  }

  public playCannonFire(options?: SpatialAudioOptions): void {
    this.combatSynth.playCannonFire(options);
  }

  public playCannonShot(options?: SpatialAudioOptions): void {
    this.combatSynth.playCannonShot(options);
  }

  public playWoodHit(options?: SpatialAudioOptions): void {
    this.combatSynth.playWoodHit(options);
  }

  public playHullImpact(options?: SpatialAudioOptions): void {
    this.combatSynth.playHullImpact(options);
  }

  public playWaterSplash(options?: SpatialAudioOptions): void {
    this.combatSynth.playWaterSplash(options);
  }

  public playShipSunk(options?: SpatialAudioOptions): void {
    this.combatSynth.playShipSunk(options);
  }

  public playWoodCreak(): void {
    this.atmosphereSynth.playWoodCreak();
  }

  public playShipBell(): void {
    this.atmosphereSynth.playShipBell();
  }

  public playSailShift(): void {
    this.atmosphereSynth.playSailShift();
  }

  public playVictory(): void {
    this.atmosphereSynth.playVictory();
  }

  public playDefeat(): void {
    this.atmosphereSynth.playDefeat();
  }

  public startAmbience(): void {
    this.ambienceSynth.startAmbience();
  }

  public updateAmbienceSpeed(speed: number): void {
    this.ambienceSynth.updateAmbienceSpeed(speed);
  }

  public stopAmbience(): void {
    this.ambienceSynth.stopAmbience();
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
