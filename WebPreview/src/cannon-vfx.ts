/** Small, deterministic muzzle-flash and gun recoil envelope.
 * Used exclusively for presentation; does not alter ballistics or damage. */
export type CannonFxFrame = Readonly<{ recoil: number; flashScale: number; flashOpacity: number; visible: boolean }>;
export const CANNON_FX_DURATION = 0.46;
export function cannonFxState(age: number): CannonFxFrame {
  if (!Number.isFinite(age) || age < 0 || age >= CANNON_FX_DURATION)
    return { recoil: 0, flashScale: 0, flashOpacity: 0, visible: false };
  const t = age / CANNON_FX_DURATION;
  // Quick kick, damped return: all values resolve exactly to zero.
  const recoil = Math.sin(Math.PI * t) * Math.pow(1 - t, 0.6) * 0.42;
  // A 150 ms flash was practically invisible on low-FPS mobile Chromium.
  // Keep the *visual* muzzle flare readable for ~300 ms; recoil, damage,
  // flight time and the .46 s presentation envelope remain unchanged.
  const flashT = Math.min(1, t / 0.67);
  return {
    recoil,
    flashScale: 0.44 + flashT * 0.96,
    flashOpacity: Math.pow(1 - flashT, 1.1) * 0.93,
    visible: flashT < 1
  };
}
