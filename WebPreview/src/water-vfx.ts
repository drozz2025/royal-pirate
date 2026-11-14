/** A small, deterministic screen-independent ripple profile for impact foam. */
export type RippleState = {
  scale: number;
  opacity: number;
  surfaceY: number;
  finished: boolean;
};

/** Age/lifetime are seconds; returns finite, bounded values even for invalid input. */
export function rippleState(age: number, lifetime: number): RippleState {
  const safeAge = Number.isFinite(age) ? Math.max(0, age) : 0;
  const safeLifetime = Number.isFinite(lifetime) ? Math.max(0.001, lifetime) : 1;
  const progress = Math.min(1, safeAge / safeLifetime);
  const ease = 1 - (1 - progress) * (1 - progress);
  return {
    scale: 0.6 + 4.2 * ease,
    opacity: 0.58 * (1 - progress) * (1 - progress),
    surfaceY: 0.14 + 0.035 * progress,
    finished: progress >= 1,
  };
}
