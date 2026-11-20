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

/** Single-draw-call, gun-mounted powder plume; only the visual lifetime is
 * longer than the flash. No projectile/hit-box or combat-timer changes. */
export const CANNON_SMOKE_DURATION = 1.35;
export type CannonSmokeFrame = Readonly<{ visible: boolean; scale: number; opacity: number }>;
export function cannonSmokeState(age: number): CannonSmokeFrame {
  if(!Number.isFinite(age)||age<0||age>=CANNON_SMOKE_DURATION)
    return {visible:false,scale:0,opacity:0};
  const t=age/CANNON_SMOKE_DURATION;
  const opacity=0.53*Math.min(1,age/.12)*Math.pow(1-t,1.65);
  return {visible:opacity>.012,scale:.67+2.05*t,opacity};
}
