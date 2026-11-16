/** Mobile Batalha: eye level over the cannon deck, with both playable ships abreast.
 * Porto uses its own untouched camera. The fallback Canvas renderer shares this pose.
 * The distant portrait view keeps the 3D vessels between the HP HUD and fire controls.
 */
export type CameraPose = { position: [number, number, number]; target: [number, number, number]; showBattery: boolean };
export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .75) {
    return {position: [0, 10, 105], target: [0, 2, 0], showBattery: true};
  }
  const distance = aspect < 1.2 ? 43 : 34;
  return {position: [distance * .20, distance * .56, distance * .88], target: [0, 2, 0], showBattery: false};
}
