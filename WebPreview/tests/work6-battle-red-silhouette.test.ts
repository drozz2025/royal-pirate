import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {OceanScene} from '../src/scene';

const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');

function makeEnemyDress() {
  const root=new T.Group(),rig=new T.Group();
  root.position.set(10,0,-3);
  root.add(rig);
  const fake={ships:{enemy:{root,rig}}};
  const proto=OceanScene.prototype as unknown as {
    dressBattleEnemy:(this:typeof fake)=>void;
  };
  proto.dressBattleEnemy.call(fake);
  return {root,rig};
}

test('WORK6 #104: five curved real 3D red sail skirts extend both mast silhouettes',()=>{
  const {root,rig}=makeEnemyDress();
  const sail=rig.getObjectByName('battle-only-billowed-red-silhouette');
  const seams=rig.getObjectByName('battle-only-red-hem-stitching');
  assert.ok(sail instanceof T.Mesh);
  assert.ok(seams instanceof T.LineSegments);
  assert.ok(sail.geometry instanceof T.BufferGeometry);
  assert.ok(sail.material instanceof T.MeshStandardMaterial);
  assert.equal(sail.material.vertexColors,true);
  assert.equal(sail.material.side,T.DoubleSide);
  const vertices=sail.geometry.getAttribute('position') as T.BufferAttribute;
  const color=sail.geometry.getAttribute('color') as T.BufferAttribute;
  assert.equal(vertices.count,5*9*13);
  assert.equal(color.count,vertices.count);
  // At native 384px pointed triangular strips read as rigid red spikes.
  // The new outline must retain at least 55% of its mid-belly breadth
  // across BOTH upper yard and lower hem of the leading cloth panel.
  const span=(row:number)=>Math.abs(vertices.getX(row*9+8)-vertices.getX(row*9));
  const middle=span(6);
  assert.ok(middle>1.0);
  assert.ok(span(0)/middle>.55,'lower painted edge must be broad, not a spike');
  assert.ok(span(12)/middle>.55,'upper painted yard must be broad, not a spike');
  const bounds=new T.Box3().setFromObject(sail);
  assert.ok(bounds.min.x < -2.8 && bounds.max.x > 3.0,
    'painted red ship canvas extends laterally on both windward sides');
  assert.ok(bounds.max.y>7.6 && bounds.min.y<3.2,
    'two large square sails and the front canvas read as a galleon');
  let nonPlanar=false;
  for(let i=0;i<vertices.count;i++){
    assert.ok([vertices.getX(i),vertices.getY(i),vertices.getZ(i)].every(Number.isFinite));
    if(vertices.getZ(i)>.9+0.45) nonPlanar=true;
  }
  assert.ok(nonPlanar,'wind-filled red canvas is genuinely curved in depth');
  assert.equal(root.position.x,10);
  assert.equal(root.position.z,-3);
  assert.equal(rig.children.length,3,'billowed red cloth, seams and one 3D opponent ornament group');
  const ornament=rig.getObjectByName('battle-only-crimson-galleon-art');
  assert.ok(ornament instanceof T.Group,'existing five cloth panels retain their original geometry');
  assert.equal(ornament.userData.battleOnly,true,'new hull detailing is enemy-only');
  assert.equal(root.children.length,1,'no duplicate playable vessel');
});

test('WORK6 #104: decorative silhouette is enemy-only and cannot change Porto or battle physics',()=>{
  const start=source.indexOf('private dressBattleEnemy(){');
  const end=source.indexOf('private dressBattleDeck(){');
  assert.ok(start>=0 && end>start);
  const method=source.slice(start,end);
  assert.doesNotMatch(method,/this\.battle\.|this\.camera\.|this\.controls\.|this\.battleBattery\.|this\.harbourDock\./);
  assert.match(method,/const rig=this\.ships\.enemy\.rig/);
  assert.match(method,/rig\.add\(fabric\)/);
  assert.match(method,/rig\.add\(seams\)/);
  assert.match(source,/this\.dressBattleEnemy\(\)/);
  assert.match(source,/this\.ships\.player\.root\.visible=false/);
  assert.match(source,/this\.ships\.enemy\.root\.visible=false/);
  assert.match(source,/this\.ships\.enemy\.root\.visible=true/);
  assert.match(source,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
});
