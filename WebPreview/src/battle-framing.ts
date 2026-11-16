/** Static battle-only portrait composition. Camera/target coordinates here are
 * the ACTUAL OrbitControls pose, not values to which scene.ts adds offsets.
 * We do not alter the genuine ship/shot physics, Porto camera or game controls.
 *
 * 384x512 exposed a framing bug: the short-phone branch kept the galleon tiny,
 * central and behind an expanse of empty ocean. Bringing the camera 12 units
 * forward, aiming slightly to port and moving only the decorative gun deck back
 * places the opponent in the right-hand broadside without enlarging buttons.
 */
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  showBattery: boolean;
  batteryOffsetZ: number;
};
export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .50) {
    // Keep the already-tested tall portrait 390x844/430x932 composition
    // pixel-equivalent to the previous scene.ts target offsets.
    return { position: [0, 11, 78], target: [5, 4.95, 0], showBattery: true, batteryOffsetZ: -35 };
  }
  if (aspect < .80) {
    // 320x568 and native-reference 384x512: closer enemy broadside, starboard
    // focal point and the SAME near-field cannon size/depth as before.
    // Battery is decorative; its offset never changes cannon firing origins.
    return { position: [0, 10.3, 78], target: [1, 4.2, 0], showBattery: true, batteryOffsetZ: -26 };
  }
  const distance = aspect < 1.2 ? 43 : 34;
  return { position: [distance * .20, distance * .56, distance * .88], target: [0, 2, 0], showBattery: false, batteryOffsetZ: -15 };
}
