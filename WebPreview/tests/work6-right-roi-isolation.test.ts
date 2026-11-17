import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';
import {battleCameraPose} from '../src/battle-framing';

function guns() {
  const {group,flashes}=makeBattleDeck();
  const muzzles:T.Mesh[]=[],barrels:T.Mesh[]=[];
  group.traverse(part=>{
    if(part instanceof T.Mesh&&part.name==='first-person-broadside-muzzle')muzzles.push(part);
    if(part instanceof T.Mesh&&part.name==='first-person-broadside-cannon')barrels.push(part);
  });
  muzzles.sort((a,b)=>a.position.x-b.position.x);
  barrels.sort((a,b)=>a.position.x-b.position.x);
  return {group,flashes,muzzles,barrels};
}

test('WORK6 right ROI: port cannon remains at the exact HEAD geometry/material',()=>{
  const {flashes,muzzles,barrels}=guns();
  assert.equal(flashes.length,2);
  assert.equal(barrels.length,2);
  assert.equal(muzzles.length,2);
  assert.ok(barrels[0].geometry instanceof T.CylinderGeometry);
  assert.equal(barrels[0].geometry.parameters.radiusTop,1.14);
  assert.equal(barrels[0].geometry.parameters.radiusBottom,1.48);
  const expectedLength=new T.Vector3(-3.15,1.90,78.6)
    .distanceTo(new T.Vector3(-3.15,4.86,65.35));
  assert.ok(Math.abs(barrels[0].geometry.parameters.height-expectedLength)<1e-7);
  assert.deepEqual(muzzles[0].position.toArray(),[-3.15,4.86,65.35]);
  assert.ok(barrels[0].material instanceof T.MeshStandardMaterial);
  assert.equal(barrels[0].material.color.getHexString(),'354b5d');
});

test('WORK6 right ROI: only the existing starboard cannon is a smaller angled 3D silhouette',()=>{
  const {group,barrels,muzzles}=guns();
  assert.ok(barrels[1].geometry instanceof T.CylinderGeometry);
  assert.ok(barrels[1].geometry.parameters.radiusBottom < 1.48);
  assert.ok(barrels[1].geometry.parameters.radiusBottom > 1.20);
  assert.deepEqual(muzzles[1].position.toArray(),[5.72,3.0,66.8]);
  assert.equal(group.children.length<60,true,'draw-call limit unchanged');
  const barrel=barrels[1].geometry.parameters.height;
  assert.ok(barrel>12,'real longitudinal cannon geometry, not a 2D decal');
  assert.ok(barrels[1].material instanceof T.MeshStandardMaterial);
  assert.equal(barrels[1].material.color.getHexString(),'202b36');
});

test('WORK6: two muzzles remain visible at 320/384/390/430 without camera changes',()=>{
  const {muzzles}=guns();
  for(const [w,h] of [[320,568],[384,512],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    const camera=new T.PerspectiveCamera(42,w/h,.1,220);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const projection=muzzles.map(m=>{
      const ndc=m.position.clone()
        .add(new T.Vector3(0,0,pose.batteryOffsetZ)).project(camera);
      return {x:(1+ndc.x)*w/2,y:(1-ndc.y)*h/2};
    });
    for(const p of projection){
      assert.ok(p.x>w*.06 && p.x<w*.95,JSON.stringify({w,h,p}));
      assert.ok(p.y>h*.48 && p.y<h*.70,JSON.stringify({w,h,p}));
    }
    assert.ok(projection[0].x+60<projection[1].x);
  }
});

test('WORK6: change cannot alter Porto, gameplay HP, firing or the five-item menu',()=>{
  const deck=readFileSync(new URL('../src/battle-deck.ts',import.meta.url),'utf8');
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const dressing=scene.split('private dressBattleDeck(){')[1]?.split('private environment(){')[0]??'';
  assert.match(dressing,/for\(const x of \[-3\.15,5\.72\]\)/);
  assert.doesNotMatch(dressing,/this\.battle\.|this\.controls\.|this\.ships\.|this\.harbourDock\./);
  assert.doesNotMatch(deck,/this\.battle\.|localStorage|fetch\(/);
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.visible=true/);
  assert.match(scene,/this\.ships\.enemy\.root\.rotation\.y=-\.95/);
});
