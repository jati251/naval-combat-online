import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeadReckoningBuffer,
  pushSnapshot,
  extrapolatePosition,
} from '../../src/features/battle/utils/deadReckoning.js';
import { damp, dampAngle } from '../../src/features/battle/utils/math.js';

describe('Dead Reckoning & High-Framerate Interpolation', () => {
  it('extrapolates position smoothly past the 35ms nominal window without freezing at 45ms', () => {
    const buffer = createDeadReckoningBuffer(100, 0, 200, 0);
    const mockNow = performance.now();
    buffer.packetTime = mockNow;
    buffer.vx = 10; // 10 m/s forward along X
    buffer.vz = 0;

    // Simulate 30ms (nominal phase)
    buffer.packetTime = performance.now() - 30;
    const posAt30ms = { ...extrapolatePosition(buffer) };
    assert.ok(posAt30ms.x > 100, 'Position should advance at 30ms');

    // Simulate 45ms (where the old system stopped dead)
    buffer.packetTime = performance.now() - 45;
    const posAt45ms = { ...extrapolatePosition(buffer) };
    assert.ok(posAt45ms.x > posAt30ms.x, 'Position should advance past 30ms at 45ms');

    // Simulate 60ms (delayed server packet / network jitter)
    buffer.packetTime = performance.now() - 60;
    const posAt60ms = { ...extrapolatePosition(buffer) };
    assert.ok(
      posAt60ms.x > posAt45ms.x,
      `Ship must not freeze at 45ms: posAt60ms (${posAt60ms.x}) must be > posAt45ms (${posAt45ms.x})`
    );

    // Simulate 120ms (severe network jitter)
    buffer.packetTime = performance.now() - 120;
    const posAt120ms = { ...extrapolatePosition(buffer) };
    assert.ok(
      posAt120ms.x > posAt60ms.x,
      'Ship continues gliding forward with decaying velocity during delayed packets'
    );

    // Verify velocity bled off (distance traveled is less than pure unconstrained linear extrapolation)
    const unconstrainedX = 100 + 10 * 0.12;
    assert.ok(
      posAt120ms.x < unconstrainedX,
      'Momentum decay must prevent unconstrained overshooting'
    );
  });

  it('damp provides mathematical frame-rate invariance (60Hz vs 120Hz consistency)', () => {
    const start = 0;
    const target = 100;
    const smoothing = 15;

    // 1 step at 60 FPS (dt = 1/60s)
    const oneStep60 = damp(start, target, smoothing, 1 / 60);

    // 2 consecutive steps at 120 FPS (dt = 1/120s each)
    const step1At120 = damp(start, target, smoothing, 1 / 120);
    const step2At120 = damp(step1At120, target, smoothing, 1 / 120);

    // Floating-point math should be virtually identical (< 1e-10 difference)
    const diff = Math.abs(oneStep60 - step2At120);
    assert.ok(
      diff < 1e-9,
      `Exponential damp must be frame-rate invariant. Diff between 60Hz and 120Hz: ${diff}`
    );
  });

  it('dampAngle smoothly interpolates angles across the -PI to PI discontinuity', () => {
    const angleNearPi = Math.PI - 0.05;
    const anglePastNegPi = -Math.PI + 0.05;

    // The shortest angular difference is +0.1 rad, NOT spinning all the way backwards (-6.18 rad)
    const damped = dampAngle(angleNearPi, anglePastNegPi, 20, 0.016);

    // Wrapped difference from angleNearPi towards anglePastNegPi should be positive
    const deltaAngle = ((damped - angleNearPi + Math.PI) % (Math.PI * 2)) - Math.PI;
    assert.ok(deltaAngle > 0, 'Must rotate along the shortest arc');
  });

  it('pushSnapshot correctly updates velocities and turn rates', () => {
    const buffer = createDeadReckoningBuffer(0, 0, 0, 0);
    buffer.packetTime = performance.now() - 33.3; // 33.3ms ago

    pushSnapshot(buffer, 10, 0, 0, 0.2, 5, 0);

    assert.equal(buffer.snapX, 10);
    assert.equal(buffer.vx, 5);
    assert.ok(buffer.turnRate > 0, 'Turn rate should be positive based on heading change');
  });
});
