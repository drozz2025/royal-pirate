/**
 * Preview-only adaptive rendering budget.
 *
 * The harbour/battle keep their original pixel ratio. On narrow mobile screens
 * the shipyard starts with fewer physical pixels; sustained slow frames can
 * lower it one small step at a time. Fast frames recover sharpness gradually.
 * No gameplay state, camera placement, purchases or ship geometry is changed.
 */
export const MIN_SHIPYARD_DPR = 0.9;
export const MAX_SHIPYARD_DPR = 1.5;
const round2 = (value:number):number => Math.round(value * 100) / 100;

export function preferredShipyardPixelRatio(
 viewportWidth:number,
 devicePixelRatio:number
):number {
 const width=Number.isFinite(viewportWidth)&&viewportWidth>0?viewportWidth:375;
 const device=Number.isFinite(devicePixelRatio)&&devicePixelRatio>0?devicePixelRatio:1;
 const ceiling=width<=820?1.15:MAX_SHIPYARD_DPR;
 return round2(Math.max(MIN_SHIPYARD_DPR,Math.min(device,ceiling)));
}

/** Use smoothed frame / CPU rendering times; caller rate-limits changes.
 * A slower device cannot drive resolution below 0.9, and recovery never
 * exceeds the current viewport's initial cap. Invalid samples do nothing. */
export function adjustedShipyardPixelRatio(
 current:number,ceiling:number,meanFrameMs:number,meanRenderMs:number
):number {
 if(![current,ceiling,meanFrameMs,meanRenderMs].every(Number.isFinite) ||
   current<=0 || ceiling<=0 || meanFrameMs<=0 || meanRenderMs<0) return current;
 const bounded=Math.max(MIN_SHIPYARD_DPR,Math.min(current,ceiling));
 if(meanFrameMs>=30 || meanRenderMs>=24)
  return round2(Math.max(MIN_SHIPYARD_DPR,bounded-.15));
 if(meanFrameMs<=19 && meanRenderMs<=13)
  return round2(Math.min(ceiling,bounded+.10));
 return round2(bounded);
}
