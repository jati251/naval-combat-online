interface OceanTimeState { serverTime: number; snapshotReceivedAt: number }

/** One continuous clock for water, buoyancy and weather, with gradual network correction. */
export function createOceanClock() {
  let previousFrame = -Infinity;
  let previousServerTime = 0;
  let receivedAt = 0;
  let offset = 0;
  let targetOffset = 0;
  let frameTime = 0;
  return (state: OceanTimeState, localTime: number, now = performance.now()): number => {
    if (!state.snapshotReceivedAt) {
      previousFrame = -Infinity;
      receivedAt = 0;
      return localTime;
    }
    if (localTime === previousFrame) return frameTime;
    const restart = !receivedAt || localTime < previousFrame || state.serverTime < previousServerTime - 1;
    if (restart || receivedAt !== state.snapshotReceivedAt) {
      targetOffset = state.serverTime + Math.max(0, (now - state.snapshotReceivedAt) / 1000) - localTime;
      receivedAt = state.snapshotReceivedAt;
      previousServerTime = state.serverTime;
    }
    if (restart) offset = targetOffset;
    else {
      // Correct at most 5% of playback speed; late packets cannot rewind or freeze waves.
      const correction = Math.min(0.1, localTime - previousFrame) * 0.05;
      offset += Math.max(-correction, Math.min(correction, targetOffset - offset));
    }
    previousFrame = localTime;
    frameTime = localTime + offset;
    return frameTime;
  };
}

export const getOceanTime = createOceanClock();
