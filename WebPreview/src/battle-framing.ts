/** Battle-only framing for the reference 02 mobile combat screen.
 * This is the single source of truth for perspective, visible foreground sail,
 * and real cannon-deck placement. Physics, muzzle origins and Porto stay intact.
 * The approved art uses a right-of-centre opponent with a narrow player rig
 * entering from the left; the 384x512 reference and taller iPhones need
 * DIFFERENT crops, not one zoomed screenshot.
 */
export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  showBattery: boolean;
  batteryOffsetZ: number;
  batteryOffsetX: number;
  sailX: number;
  sailScaleX: number;
  sailScaleY: number;
};
export function battleCameraPose(aspect: number): CameraPose {
  if (aspect < .50) {
    // Tall iPhone: reveal more enemy starboard silhouette without changing the
    // vertical HUD or exposing the black sail over the centre of the arena.
    return {position:[0,11,78],target:[3.8,4.95,0],showBattery:true,
      batteryOffsetZ:-35,batteryOffsetX:-.6,sailX:-3.9,sailScaleX:.42,sailScaleY:.68};
  }
  if (aspect < .68) {
    // Small/short 320px devices: preserve the validated enemy and muzzle crop.
    return {position:[0,10.3,78],target:[1,4.2,0],showBattery:true,
      batteryOffsetZ:-26,batteryOffsetX:0,sailX:-5.25,sailScaleX:.48,sailScaleY:.72};
  }
  if (aspect < .80) {
    // Native approved 384x512: enemy should occupy the starboard third, not the
    // centre. Shift the DECORATIVE gun deck back to port to keep both real
    // muzzles visible when the camera looks farther left toward the ocean.
    return {position:[0,10.3,75],target:[-1.8,4.2,0],showBattery:true,
      batteryOffsetZ:-26,batteryOffsetX:-2,sailX:-7.8,sailScaleX:.41,sailScaleY:.66};
  }
  const distance=aspect<1.2?43:34;
  return {position:[distance*.20,distance*.56,distance*.88],target:[0,2,0],
    showBattery:false,batteryOffsetZ:-15,batteryOffsetX:0,
    sailX:-3.6,sailScaleX:.48,sailScaleY:.72};
}
