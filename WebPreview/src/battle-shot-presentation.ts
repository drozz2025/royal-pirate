/** Visual-only transition from the rendered muzzle to the existing simulation.
 * Does not change the deterministic battle physics, hit boxes, damage or aim.
 * At age 0 the cannonball occupies the exact muzzle origin in world space;
 * the short join catches up to the simulated trajectory without a teleport.
 */
import type {Shot, Vec} from './battle';

export const MUZZLE_JOIN_SECONDS=0.42;
export function projectileFromMuzzle(shot:Shot, muzzle:Vec):Vec {
  if(shot.side!=='player'||!Number.isFinite(shot.age)||shot.age>=MUZZLE_JOIN_SECONDS)
    return {...shot.position};
  const t=Math.max(0,Math.min(1,shot.age/MUZZLE_JOIN_SECONDS));
  const join=t*t*(3-2*t);
  return {
    x:muzzle.x+(shot.position.x-muzzle.x)*join,
    y:muzzle.y+(shot.position.y-muzzle.y)*join,
    z:muzzle.z+(shot.position.z-muzzle.z)*join
  };
}
