import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRAPHIC_PROFILES, GRAPHIC_QUALITY_LIST } from '../../src/features/settings/config/graphicProfiles';
import { useSettingsStore } from '../../src/features/settings/stores/useSettingsStore';

test('graphic profiles define fast, balanced, and performance modes correctly', () => {
  assert.deepEqual(GRAPHIC_QUALITY_LIST, ['fast', 'balanced', 'performance']);

  const fast = GRAPHIC_PROFILES.fast;
  const balanced = GRAPHIC_PROFILES.balanced;
  const performance = GRAPHIC_PROFILES.performance;

  // Fast (Mobile quality)
  assert.equal(fast.shadows, false);
  assert.equal(fast.waveCount, 2);
  assert.equal(fast.waterSegments, 90);
  assert.equal(fast.atmosphereParticles, 40);

  // Balanced (Standard web)
  assert.equal(balanced.shadows, true);
  assert.equal(balanced.shadowMapSize, 1024);
  assert.equal(balanced.waveCount, 4);
  assert.equal(balanced.waterSegments, 160);
  assert.equal(balanced.atmosphereParticles, 180);

  // Performance (Ultra photorealism)
  assert.equal(performance.shadows, true);
  assert.equal(performance.shadowMapSize, 2048);
  assert.equal(performance.waveCount, 8);
  assert.equal(performance.waterSegments, 240);
  assert.equal(performance.atmosphereParticles, 360);
  assert.equal(performance.waterShader.glitterEnabled, true);
  assert.equal(performance.waterShader.capillaryHarmonics, 5);
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
