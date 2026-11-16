/** Battle camera positions are deliberately independent from the approved Porto
 * camera. A tall phone has extra vertical canvas but very little horizontal space:
 * bringing the camera closer makes the ships recognisable without moving their
 * physics positions, swapping the genuine 3D scene for a screenshot, or clipping
 * the foreground cannons.
 */
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  showBattery: boolean;
  batteryOffsetZ: number;
};
export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .50) {
    // 390x844 and 430x932: enlarge ship silhouettes and compose them just
    // above the live foreground cannon deck. The battery follows the camera,
    // so both original muzzle meshes keep their location in the viewport.
    return { position: [0, 11, 78], target: [0, 4.5, 0], showBattery: true, batteryOffsetZ: -27 };
  }
  if (aspect < .75) {
    // The short 320x568 viewport has less room between HP and touch controls.
    // Retain its previously tested framing rather than clipping the hulls.
    return { position: [0, 10, 90], target: [0, 2, 0], showBattery: true, batteryOffsetZ: -15 };
  }
  const distance = aspect < 1.2 ? 43 : 34;
  return { position: [distance * .20, distance * .56, distance * .88], target: [0, 2, 0], showBattery: false, batteryOffsetZ: -15 };
}
