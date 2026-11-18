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

/** Presentation-only aim/ballistic arc for the newly aligned deck camera.
 * The legacy simulator still owns all hit detection, round timing and damage.
 * This curve connects the actual animated barrel mouth to the simulator's
 * predicted impact: the displayed aim and flying shot share the SAME curve. */
export function firstPersonArc(muzzle:Vec,impact:Vec,progress:number):Vec {
  const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  const rise=Math.sin(Math.PI*t)*Math.min(4.2,Math.max(1.2,Math.abs(impact.z-muzzle.z)*.075));
  return {
    x:muzzle.x+(impact.x-muzzle.x)*t,
    y:muzzle.y+(impact.y-muzzle.y)*t+rise,
    z:muzzle.z+(impact.z-muzzle.z)*t
  };
}

export function firstPersonShotPosition(shot:Shot,muzzle:Vec,impact:Vec,flightSeconds:number):Vec {
  if(shot.side!=='player')return {...shot.position};
  const duration=Number.isFinite(flightSeconds)&&flightSeconds>.02?flightSeconds:1;
  return firstPersonArc(muzzle,impact,shot.age/duration);
}
