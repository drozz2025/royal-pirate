/** Batalha mobile: the live ships must have clear silhouettes between HP HUD
 * and cannon deck on 320, 390 and 430 px viewports. The approved Porto camera
 * is independent and must never be changed by this function.
 * Desktop retains its established angled battle camera.
 */
export type CameraPose = { position: [number, number, number]; target: [number, number, number]; showBattery: boolean };
export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .75) {
    // The old Z=105 composition left a large empty sky and miniature vessels.
    // Z=90 increases the live ship presence, leaving both hulls inside the
    // narrow 390x844 frame. See tests/battle-framing.test.ts.
    return {position: [0, 10, 90], target: [0, 2, 0], showBattery: true};
  }
  const distance = aspect < 1.2 ? 43 : 34;
  return {position: [distance * .20, distance * .56, distance * .88], target: [0, 2, 0], showBattery: false};
}
