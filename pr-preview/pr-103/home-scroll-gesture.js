// Gesture ownership follows input quiet, independently of animation completion.
export const WHEEL_MULTIPLIER = 0.65;
export const INPUT_QUIET_MS = 140;
const NOISE_DELTA = 0.5;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createGestureLimiter() {
  let stream;
  let animation;
  let lastPacketTime;
  return {
    reset() { stream = animation = lastPacketTime = undefined; },
    // Landing ends movement, not ownership of the wheel input stream.
    land() { if (animation) animation.landed = true; },
    input(delta, position, _target, points, time) {
      const quiet = lastPacketTime === undefined || time-lastPacketTime >= INPUT_QUIET_MS;
      // Every packet, even sub-dead-zone noise, extends the same input stream.
      lastPacketTime = time;
      if (Math.abs(delta) <= NOISE_DELTA || points.length < 2) return undefined;
      const direction = Math.sign(delta);
      const reversing = stream && direction !== stream.direction;
      if (stream && !quiet && !reversing) return undefined;
      // Reversal returns from the chosen destination immediately. A genuinely
      // new stream can also advance from an unfinished transition's target.
      const anchor = animation && !animation.landed ? animation.destination : position;
      const index = points.reduce((best, point, i) =>
        Math.abs(point-anchor) < Math.abs(points[best]-anchor) ? i : best, 0);
      const destination = points[clamp(index + direction, 0, points.length-1)];
      stream = { direction };
      animation = { destination, landed: false };
      return destination;
    },
  };
}

// One curve from commitment to landing. Preserve velocity when possible on
// retargeting; every transition ends at zero velocity.
export function transitionCurve(distance, velocity) {
  const length = Math.abs(distance);
  const speed = Math.max(0, velocity * Math.sign(distance));
  const duration = Math.min(0.42, Math.max(0.28, length / 1800),
    speed > 0 ? length * 2.8 / speed : Infinity);
  const slope = length > 0 ? speed * duration / length : 0;
  return {
    duration,
    easing: (t) => (-2*t*t*t + 3*t*t) + slope*(t*t*t - 2*t*t + t),
  };
}
