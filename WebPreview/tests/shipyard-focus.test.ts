import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { SLOTS } from '../src/ship-modules.ts';
import { SHIPYARD_VIEWS, shipyardCameraOffset, shipyardPartCameraOffset, shipyardPartTarget } from '../src/shipyard-camera.ts';

test('every modular slot has a finite, distinct anatomical 3D inspection target',()=>{
  assert.equal(SLOTS.length,9);
  const points=SLOTS.map(shipyardPartTarget);
  assert.equal(new Set(points.map(p=>[p.x,p.y,p.z].join(','))).size,9);
  for(const point of points)for(const value of Object.values(point))assert.ok(Number.isFinite(value));
  assert.ok(shipyardPartTarget('figurehead').z>shipyardPartTarget('cabin').z);
  assert.ok(shipyardPartTarget('flag').y>shipyardPartTarget('hull').y);
});

test('all close-ups are closer than full ship views while preserving each camera direction',()=>{
  for(const portrait of [false,true])for(const {id} of SHIPYARD_VIEWS){
    const wide=shipyardCameraOffset(id,portrait),near=shipyardPartCameraOffset(id,portrait);
    assert.ok(Math.hypot(near.x,near.y,near.z)<Math.hypot(wide.x,wide.y,wide.z));
    assert.ok(Math.hypot(near.x,near.y,near.z)>6);
    assert.ok(near.x===0||Math.sign(near.x)===Math.sign(wide.x));
    assert.ok(near.z===0||Math.sign(near.z)===Math.sign(wide.z));
  }
});

test('focus button is optional, accessible and never grants ownership',()=>{
  const onClose=()=>{},onPreview=()=>{},onFocusSlot=()=>{};
  const enabled=renderToStaticMarkup(createElement(Shipyard,{onClose,onPreview,onFocusSlot}));
  assert.match(enabled,/Inspect HULL in close-up 3D/);
  assert.match(enabled,/FOCUS HULL/);
  assert.match(enabled,/HULL PREVIEW ONLY/);
  assert.match(enabled,/Preview changes are not saved and do not affect battle/);
  assert.doesNotMatch(enabled,/EQUIP VERIFIED FLEET/);
  const without=renderToStaticMarkup(createElement(Shipyard,{onClose,onPreview}));
  assert.doesNotMatch(without,/Inspect HULL in close-up 3D/);
});
