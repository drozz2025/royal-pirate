/** Battle-only framing for the reference 02 mobile combat screen.
 * This is the single source of truth for perspective, visible foreground sail,
 * and real cannon-deck placement. Physics, muzzle origins and Porto stay intact.
 * The approved art uses a right-of-centre opponent with a narrow player rig
 * entering from the left; the 384x512 reference and taller iPhones need
 * DIFFERENT crops, not one zoomed screenshot.
 */
import * as T from 'three';

/** The visible muzzle is resolved from the *full* live deck transform.
 * Applying only group.position loses camera-matched barrel scaling and any
 * future parent rotation; both fire and smoke must use the same point. */
export function battleDeckMuzzleWorld(deck:T.Object3D,muzzle:T.Vector3):T.Vector3 {
  deck.updateWorldMatrix(true,false);
  return muzzle.clone().applyMatrix4(deck.matrixWorld);
}

/** Aim the single first-person cannon down the same horizontal bearing as
 * the PREVIEWED landing point. The recoil pivot, barrel, muzzle, flash, smoke
 * and visible projectile all remain attached to the same real 3D object.
 * Unlike a yaw multiplier, this includes the camera/deck's actual offset.
 * Return radians for Three.js; positive screen-right targets require -Y yaw. */
export function battleCentralCannonYaw(
  pivot:Pick<T.Vector3,'x'|'z'>,
  impact:Pick<T.Vector3,'x'|'z'>
):number {
  const dx=impact.x-pivot.x, forward=pivot.z-impact.z;
  if(!Number.isFinite(dx)||!Number.isFinite(forward)||forward<=0)return 0;
  // A safe presentation bound keeps the whole barrel in the mobile viewport.
  return Math.max(-Math.PI/4,Math.min(Math.PI/4,-Math.atan2(dx,forward)));
}

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  showBattery: boolean;
  batteryOffsetZ: number;
  batteryOffsetX: number;
  batteryScale: number;
  sailX: number;
  sailScaleX: number;
  sailScaleY: number;
};
/** Battle-only enemy presentation size. Scale the LIVE 3D model, not its
 * simulation/hitboxes: the old 1.88x red ship swallowed the centre on phones.
 * The 02 reference has clear sky, a starboard opponent and open sea between guns.
 * WORK0 21 Nov: reference-vs-Chromium comparison found the live broadside
 * ~25% wider than the approved ship at native 384x512. The subsequent
 * narrow-FOV reduction to 0.63 on 390x844 left its broadside too small.
 * Restore a legible ~0.80 scale on tall phones, keeping the stern in frame.
 * Change only the existing THREE.JS render root, not hitbox or Porto.
 * Desktop remains unchanged; Porto's 1x model is restored by showHarbour(). */
export function battleEnemyScale(aspect:number):number {
  // WORK0 #104 / 20 Nov: structurally reframe the approved short 384×512
  // Batalha. Scale down the broadside just enough that the entire aftcastle
  // fits on the right after moving it toward the approved starboard third.
  // Keep the shorter 384x512 enemy composition and preserve genuine
  // perspective on tall phones: a tiny 0.63 ship left an empty, unplayable
  // band of sky and reduced the opponent's visible target to a thumbnail.
  // Recover a clear ~0.80 broadside at 390x844/430x932 while protecting
  // the aftcastle from clipping. Simulation and damage stay untouched.
  // Presentation only: physical hull, damage hitbox and Porto stay unchanged.
  if(aspect<.62)return Math.max(.75,Math.min(.82,Math.round((.80-.30*(aspect-.463))*100)/100)); // 320x568=.77; 390x844 and 430x932=.80
  if(aspect<.80)return 1.03; // native reference: enemy now occupies a smaller starboard island
  return 1.82; // preserve desktop
}
/** Batalha 02: turn the existing live red ship into a readable starboard broadside.
 * This only changes its rendered yaw, never its position, hitbox, projectile
 * origin or the Porto camera. Mobile needs more visible hull than the narrow
 * near-bow silhouette in the current 384x512 screenshot. */
export function battleEnemyBroadsideYaw(aspect:number):number {
  // The opponent's longitudinal Z axis must read side-on, not bow-on.
  // Apply only to the battle render root, never to the simulated hull.
  if (aspect < .62) return -1.37; // narrow phones: retain stern safe area
  if (aspect < .80) return -1.50; // native short source: expose full port gun deck
  return -.95; // preserve desktop
}

export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .80) {
    // 18 Nov: first-person cannon camera, on the player's deck and aligned
    // down ONE central gun barrel. The opponent remains ahead at starboard,
    // showing its long hull in profile. This changes only battle presentation.
    // Full perspective makes the enemy grow when zooming toward its hull.
    // At 390x844 the narrower horizontal FOV enlarged/cropped the enemy.
    // Scale the live presentation proportionally to aspect and pan its broadside
    // toward starboard while moving the real deck so the muzzle stays centred.
    // Never move simulated hulls, collision geometry, Porto or the dock.
    const tallPortrait = aspect < .62; // narrow horizontal FOV needs a different starboard pan from 384x512
    return {
      // Keep the gunner eye at deck height. At the native 384x512 reference
      // crop, aim the camera further toward the PORT side so the enemy reads
      // in the RIGHT third instead of blocking the cannon centreline.
      // Move the existing live gun deck laterally with that pan to preserve
      // the real muzzle near x=50%, rather than reprojecting a fake shot.
      // Camera stays fixed; pan the ACTUAL central cannon with the optical
      // target, retaining its real muzzle world transform at each viewport.
      position: [0, 7.4, 55],
      target: [tallPortrait ? 4.5 : 2.65, 4.1, -3],
      showBattery: true,
      batteryOffsetZ: -30,
      batteryOffsetX: tallPortrait ? 3.2 : 1.8,
      batteryScale: .84,
      // Legacy optional edge rig is now HIDDEN for portrait battle.
      sailX: -11,
      sailScaleX: .33,
      sailScaleY: .50,
    };
  }
  const distance=aspect<1.2?43:34;
  return {position:[distance*.20,distance*.56,distance*.88],target:[0,2,0],
    showBattery:false,batteryOffsetZ:-15,batteryOffsetX:0,batteryScale:1,
    sailX:-3.6,sailScaleX:.48,sailScaleY:.72};
}
