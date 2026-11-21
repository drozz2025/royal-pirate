import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { SHIPYARD_TOUR_SPEED, shouldAutoRotateShipyard } from '../src/shipyard-auto-orbit.ts';

test('360° tour only rotates visible active shipyard previews, never battle or other cameras',()=>{
 assert.ok(SHIPYARD_TOUR_SPEED>0 && SHIPYARD_TOUR_SPEED<=1,'gentle showcase speed for mobile');
 for(const cameraMode of ['battle','deck','harbour','inspect','shipyard'] as const){
  for(const requested of [false,true])for(const reducedMotion of [false,true])for(const hidden of [false,true]){
   assert.equal(
    shouldAutoRotateShipyard(requested,cameraMode,reducedMotion,hidden),
    requested && cameraMode==='shipyard' && !reducedMotion && !hidden
   );
  }
 }
});

test('shipyard exposes an accessible optional camera-only showcase, with no inventory grant',()=>{
 const props={onClose:()=>{},onPreview:()=>{}};
 const enabled=renderToStaticMarkup(createElement(Shipyard,{...props,onTourChange:()=>true}));
 assert.match(enabled,/aria-label="Start automatic 360-degree 3D ship preview"/);
 assert.match(enabled,/aria-pressed="false"/);
 assert.match(enabled,/360° TOUR/);
 assert.match(enabled,/Stops on manual orbit, when leaving the shipyard, or when reduced motion is enabled/);
 assert.doesNotMatch(enabled,/EQUIP VERIFIED FLEET/);
 const without=renderToStaticMarkup(createElement(Shipyard,props));
 assert.doesNotMatch(without,/Start automatic 360-degree 3D ship preview/);
});
