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
 * Desktop remains unchanged; Porto's 1x model is restored by showHarbour(). */
export function battleEnemyScale(aspect:number):number {
  if(aspect<.50)return 1.38; // tall phones: ship no longer occupies the middle of the sky
  if(aspect<.80)return 1.42; // reference-native 384x512 and compact portrait
  return 1.82; // do not change non-portrait framing
}
/** Batalha 02: turn the existing live red ship into a readable starboard broadside.
 * This only changes its rendered yaw, never its position, hitbox, projectile
 * origin or the Porto camera. Mobile needs more visible hull than the narrow
 * near-bow silhouette in the current 384x512 screenshot. */
export function battleEnemyBroadsideYaw(aspect:number):number {
  if (aspect < .50) return -1.19; // tall phones: avoid hiding the hull behind HUD
  if (aspect < .80) return -1.30; // approved native illustration: visible long gun deck
  return -.95; // unchanged desktop composition
}

export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .80) {
    // 18 Nov: first-person cannon camera, on the player's deck and aligned
    // down ONE central gun barrel. The opponent remains ahead at starboard,
    // showing its long hull in profile. This changes only battle presentation.
    // Full perspective makes the enemy grow when zooming toward its hull.
    // Ultra-tall phones have a narrower horizontal field of view. In real
    // 390x844 Chromium evidence the enemy stern touches the right edge.
    // Pan the first-person camera AND battle-only gunner deck together:
    // the single muzzle remains centred while the broadside stays visible.
    // Never move the simulated ships, physics, Porto or five-item dock.
    const ultraTall = aspect < .50;
    return {
      position: [0, 7.4, 67],
      target: [ultraTall ? 7.2 : 4.2, 4.1, -3],
      showBattery: true,
      batteryOffsetZ: -18,
      batteryOffsetX: ultraTall ? 5 : 2,
      batteryScale: 1,
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
