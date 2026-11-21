/** Camera-only, accessibility-aware 360° showcase in the isolated shipyard. */
export const SHIPYARD_TOUR_SPEED = 0.65;

/** Neither preview level nor module entitlements can enable camera motion outside the shipyard. */
export function shouldAutoRotateShipyard(
 requested:boolean,
 cameraMode:'battle'|'deck'|'harbour'|'inspect'|'shipyard',
 reducedMotion:boolean,
 documentHidden:boolean
):boolean{
 return requested===true && cameraMode==='shipyard' && !reducedMotion && !documentHidden;
}
