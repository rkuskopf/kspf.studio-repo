// Gesture policy only. Lenis owns every animated scroll position.
export const WHEEL_MULTIPLIER = 0.65;
export const LERP = 0.12;
export const INPUT_IDLE_MS = 110;
const GESTURE_GAP_MS = 220;
const MAX_EVENT_DELTA = 120;
const INTENT_PX = 12;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createGestureLimiter({ resistance = WHEEL_MULTIPLIER } = {}) {
  let gesture;
  return {
    reset() { gesture = undefined; },
    input(delta, position, target, points, time) {
      if (!delta || points.length < 2) return 0;
      const direction = Math.sign(delta);
      const reversed = gesture && direction !== gesture.direction;
      const fresh = !gesture || (time - gesture.last > GESTURE_GAP_MS &&
        Math.abs(position - this.destination()) < 1.5);
      if (fresh || reversed) {
        // Mid-transition reversal heads back to the project we just left.
        const anchor = reversed && !fresh ? gesture.next :
          points.reduce((best, point) => Math.abs(point-position) < Math.abs(best-position) ? point : best);
        const index = points.reduce((best, point, i) =>
          Math.abs(point-anchor) < Math.abs(points[best]-anchor) ? i : best, 0);
        const next = points[clamp(index + direction, 0, points.length - 1)];
        gesture = { anchor, next, direction, intent: 0, last: time };
      }
      gesture.last = time;
      const resisted = clamp(delta * resistance, -MAX_EVENT_DELTA, MAX_EVENT_DELTA);
      gesture.intent += Math.abs(resisted);
      return clamp(target + resisted, Math.min(gesture.anchor, gesture.next),
        Math.max(gesture.anchor, gesture.next)) - target;
    },
    destination() {
      return gesture && (gesture.intent >= INTENT_PX ? gesture.next : gesture.anchor);
    },
  };
}

// Hermite easing carries input velocity into the settle instead of restarting
// with a different speed. Its endpoint velocity is zero.
export function settleCurve(distance, velocity) {
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
