import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createOceanClock } from '../../src/features/battle/utils/oceanTime.js';

it('keeps wave playback continuous through delayed and irregular snapshots', () => {
  const clock = createOceanClock();
  const state = { serverTime: 10, snapshotReceivedAt: 1000 };
  let previous = clock(state, 0, 1000);
  for (let frame = 1; frame <= 180; frame++) {
    const local = frame / 60;
    if (frame % 7 === 0 && (frame < 30 || frame > 80)) {
      state.serverTime = 10 + local - (frame % 3) * 0.035;
      state.snapshotReceivedAt = 1000 + local * 1000;
    }
    const time = clock(state, local, 1000 + local * 1000);
    const step = time - previous;
    assert.ok(step >= 0.95 / 60 - 1e-10 && step <= 1.05 / 60 + 1e-10);
    assert.equal(clock(state, local, 1002 + local * 1000), time, 'all consumers share the frame time');
    previous = time;
  }
});

it('uses local time in previews and resets phase when a new battle starts', () => {
  const clock = createOceanClock();
  assert.equal(clock({ serverTime: 0, snapshotReceivedAt: 0 }, 5, 1000), 5);
  assert.equal(clock({ serverTime: 80, snapshotReceivedAt: 2000 }, 6, 2000), 80);
  assert.equal(clock({ serverTime: 0.5, snapshotReceivedAt: 3000 }, 7, 3000), 0.5);
});
