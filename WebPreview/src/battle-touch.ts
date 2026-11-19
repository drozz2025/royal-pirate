/** WORK0/WORK6 #104 — pure touch mapping; elevation is deliberately unchanged.
 * Horizontal drag changes yaw only; power is controlled by the existing bar.
 * The domain model owns all actual launch limits and projectile physics.
 */
export function bearingFromDrag(startYaw:number,startX:number,currentX:number,viewportWidth:number):number {
  if(!Number.isFinite(startYaw)||!Number.isFinite(startX)||!Number.isFinite(currentX))return 0;
  const width=Number.isFinite(viewportWidth)?Math.max(1,viewportWidth):1;
  return Math.max(-25,Math.min(25,Math.round(startYaw+(currentX-startX)*50/width)));
}
export function powerFromClientX(clientX:number,left:number,width:number):number {
  if(!Number.isFinite(clientX)||!Number.isFinite(left)||!Number.isFinite(width)||width<=0)return 20;
  const fraction=Math.max(0,Math.min(1,(clientX-left)/width));
  return Math.round(20+80*fraction);
}
