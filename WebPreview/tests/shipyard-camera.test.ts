import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { SHIPYARD_VIEWS, shipyardCameraOffset } from '../src/shipyard-camera.ts';

test('five working 3D camera positions cover ship from all four sides, in portrait and landscape',()=>{
 assert.deepEqual(SHIPYARD_VIEWS.map(view=>view.id),['quarter','bow','stern','port','starboard']);
 for(const portrait of [true,false]){
  const offsets=SHIPYARD_VIEWS.map(({id})=>shipyardCameraOffset(id,portrait));
  assert.equal(new Set(offsets.map(({x,y,z})=>[x,y,z].join(','))).size,5);
  for(const point of offsets)for(const coord of Object.values(point))assert.ok(Number.isFinite(coord));
  assert.equal(offsets[1].x,0);assert.ok(offsets[1].z>0,'bow is positive z');
  assert.equal(offsets[2].x,0);assert.ok(offsets[2].z<0,'stern is negative z');
  assert.ok(offsets[3].x<0);assert.equal(offsets[3].z,0);
  assert.ok(offsets[4].x>0);assert.equal(offsets[4].z,0);
  assert.ok(offsets.every(offset=>Math.hypot(offset.x,offset.y-4,offset.z)>11));
 }
 assert.notDeepEqual(shipyardCameraOffset('quarter',true),shipyardCameraOffset('quarter',false));
});

test('3D camera controls are accessible, optional and never claim purchases or saved fleet state',()=>{
 const onClose=()=>{},onPreview=()=>{},onViewChange=()=>{};
 const enabled=renderToStaticMarkup(createElement(Shipyard,{onClose,onPreview,onViewChange}));
 assert.match(enabled,/aria-label="3D ship viewing angle"/);
 for(const view of SHIPYARD_VIEWS)assert.ok(enabled.includes('Show '+view.label+' view of the preview ship'));
 assert.match(enabled,/aria-pressed="true"/);
 assert.match(enabled,/HULL PREVIEW ONLY/);
 assert.match(enabled,/Preview changes are not saved and do not affect battle/);
 assert.doesNotMatch(enabled,/EQUIP VERIFIED FLEET/);
 const without=renderToStaticMarkup(createElement(Shipyard,{onClose,onPreview}));
 assert.doesNotMatch(without,/aria-label="3D ship viewing angle"/);
});
