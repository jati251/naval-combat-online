import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getClampedDpr, RESOLUTION_LIMIT_CONFIGS } from '../../src/features/settings/utils/resolutionClamping';
import { useSettingsStore } from '../../src/features/settings/stores/useSettingsStore';

test('getClampedDpr clamps DPR properly according to resolution limit', () => {
  // 1. Native / uncapped mode
  const nativeClamped = getClampedDpr([1.0, 2.0], 'native');
  assert.deepEqual(nativeClamped, [1.0, 2.0]);

  // 2. 1080p limit
  const fhdConfig = RESOLUTION_LIMIT_CONFIGS['1080p'];
  assert.equal(fhdConfig.maxResolution?.width, 1920);
  assert.equal(fhdConfig.maxResolution?.height, 1080);

  // 3. 720p limit
  const hdConfig = RESOLUTION_LIMIT_CONFIGS['720p'];
  assert.equal(hdConfig.maxResolution?.width, 1280);
  assert.equal(hdConfig.maxResolution?.height, 720);
});

test('useSettingsStore manages resolutionLimit state and persistence', () => {
  const store = useSettingsStore.getState();

  store.setResolutionLimit('720p');
  assert.equal(useSettingsStore.getState().resolutionLimit, '720p');

  store.setResolutionLimit('1080p');
  assert.equal(useSettingsStore.getState().resolutionLimit, '1080p');

  store.setResolutionLimit('native');
  assert.equal(useSettingsStore.getState().resolutionLimit, 'native');

  // Reset back to recommended 1080p
  store.setResolutionLimit('1080p');
});
