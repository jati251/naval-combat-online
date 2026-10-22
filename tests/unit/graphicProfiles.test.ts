import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAPHIC_PROFILES, GRAPHIC_QUALITY_LIST } from '../../src/features/settings/config/graphicProfiles';
import { useSettingsStore } from '../../src/features/settings/stores/useSettingsStore';

test('graphic profiles define fast, balanced, and performance modes correctly', () => {
  assert.deepEqual(GRAPHIC_QUALITY_LIST, ['fast', 'balanced', 'performance']);

  const fast = GRAPHIC_PROFILES.fast;
  const balanced = GRAPHIC_PROFILES.balanced;
  const performance = GRAPHIC_PROFILES.performance;

  // Fast (Low / Mobile quality)
  assert.equal(fast.label, 'Low');
  assert.equal(fast.shadows, false);
  assert.equal(fast.waveCount, 2);
  assert.equal(fast.waterSegments, 80);
  assert.equal(fast.atmosphereParticles, 30);
  assert.equal(fast.waterShader.capillaryHarmonics, 1);
  assert.equal(fast.waterShader.glitterEnabled, false);
  assert.equal(fast.waterShader.causticsQuality, 0);

  // Balanced (Standard web)
  assert.equal(balanced.label, 'Balanced');
  assert.equal(balanced.shadows, true);
  assert.equal(balanced.shadowMapSize, 1024);
  assert.equal(balanced.waveCount, 4);
  assert.equal(balanced.waterSegments, 140);
  assert.equal(balanced.atmosphereParticles, 120);
  assert.equal(balanced.waterShader.capillaryHarmonics, 3);
  assert.equal(balanced.waterShader.glitterEnabled, true);
  assert.equal(balanced.waterShader.causticsQuality, 1);

  // Performance (Max / Black Flag Resynced Ultra photorealism)
  assert.equal(performance.label, 'Max');
  assert.equal(performance.shadows, true);
  assert.equal(performance.shadowMapSize, 2048);
  assert.equal(performance.waveCount, 8);
  assert.equal(performance.waterSegments, 220);
  assert.equal(performance.atmosphereParticles, 260);
  assert.equal(performance.waterShader.glitterEnabled, true);
  assert.equal(performance.waterShader.capillaryHarmonics, 7);
  assert.equal(performance.waterShader.causticsQuality, 2);
  assert.equal(performance.waterShader.cloudReflectionEnabled, true);
});

test('useSettingsStore updates graphicQuality and modal state', () => {
  const store = useSettingsStore.getState();

  // Test modal controls
  store.openSettings();
  assert.equal(useSettingsStore.getState().isSettingsOpen, true);

  store.closeSettings();
  assert.equal(useSettingsStore.getState().isSettingsOpen, false);

  store.toggleSettings();
  assert.equal(useSettingsStore.getState().isSettingsOpen, true);

  store.toggleSettings();
  assert.equal(useSettingsStore.getState().isSettingsOpen, false);

  // Test quality switching
  store.setGraphicQuality('performance');
  assert.equal(useSettingsStore.getState().graphicQuality, 'performance');

  store.setGraphicQuality('fast');
  assert.equal(useSettingsStore.getState().graphicQuality, 'fast');

  store.setGraphicQuality('balanced');
  assert.equal(useSettingsStore.getState().graphicQuality, 'balanced');
});
