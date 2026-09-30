// Gesture policy only. Lenis owns every animated scroll position.
export const WHEEL_MULTIPLIER = 0.65;
const NOISE_DELTA = 0.5;
const PACKET_GAP_MS = 80;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createGestureLimiter() {
  let active;
  let previous;
  return {
    reset() { active = previous = undefined; },
    land() { active = undefined; },
    input(delta, position, _target, points, time) {
      const magnitude = Math.abs(delta);
      if (magnitude <= NOISE_DELTA || points.length < 2) return undefined;
      const direction = Math.sign(delta);
      const contiguous = previous && direction === previous.direction &&
        time - previous.time <= PACKET_GAP_MS;
      const renewed = contiguous && magnitude > previous.magnitude * 1.1;
      // After landing, reject a continuing sustained/decaying packet train.
      // A renewed pulse or reversed direction is available immediately; this
      // is not an arrival cooldown. WheelEvent has no portable momentum phase.
      const residual = !active && contiguous && previous.packets >= 3 && !renewed;
      const anchor = active && direction !== active.direction ? active.destination : position;
      const inFlight = active && direction === active.direction;
      previous = { direction, magnitude, time,
        packets: contiguous && !renewed ? previous.packets + 1 : 1 };
      if (inFlight || residual) return undefined;
      const index = points.reduce((best, point, i) =>
        Math.abs(point-anchor) < Math.abs(points[best]-anchor) ? i : best, 0);
      const destination = points[clamp(index + direction, 0, points.length-1)];
      active = { direction, destination };
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
