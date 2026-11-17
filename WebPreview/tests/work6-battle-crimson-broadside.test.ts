import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {OceanScene} from '../src/scene';

const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');

function dress() {
  const root=new T.Group(),rig=new T.Group();
  root.add(rig);root.position.set(10,0,-3);
  const fake={ships:{enemy:{root}}};
  const method=OceanScene.prototype as unknown as {
    dressBattleBroadside:(this:typeof fake)=>void;
  };
  method.dressBattleBroadside.call(fake);
  const group=root.getObjectByName('battle-only-crimson-carved-broadside');
  assert.ok(group instanceof T.Group);
  return {root,rig,group};
}

test('WORK6 #104: crimson opponent has genuinely curved hull panels, not a flat overlay or duplicate ship',()=>{
  const {root,rig,group}=dress();
  assert.equal(root.position.x,10);
  assert.equal(root.position.z,-3);
  assert.equal(root.children.length,2,'existing rig plus one battle-only hull dressing');
  assert.equal(rig.children.length,0,'the hull dressing is not appended to the live sails');
  const hull=group.getObjectByName('battle-only-curved-crimson-planking');
  assert.ok(hull instanceof T.Mesh);
  assert.ok(hull.geometry instanceof T.BufferGeometry);
  assert.ok(hull.material instanceof T.MeshStandardMaterial);
  assert.equal(hull.material.vertexColors,true);
  assert.equal(hull.geometry.getAttribute('position').count,2*7*9*2);
  assert.equal(hull.geometry.index?.count,2*7*8*6);
  const colors=hull.geometry.getAttribute('color') as T.BufferAttribute;
  assert.equal(colors.count,hull.geometry.getAttribute('position').count);
  assert.ok(colors.getX(0)!==colors.getX(18),'red painted planks have several shaded tonal bands');
  hull.geometry.computeBoundingBox();
  const bounds=hull.geometry.boundingBox!; // local ship-space, not world x=10
  assert.ok(bounds.min.x < -1.70 && bounds.max.x>1.70);
  assert.ok(bounds.min.y<-.4 && bounds.max.y>1.8);
  assert.ok(bounds.min.z<-4.8 && bounds.max.z>4.9);
  const vertices=hull.geometry.getAttribute('position') as T.BufferAttribute;
  for(let i=0;i<vertices.count;i++)
    assert.ok([vertices.getX(i),vertices.getY(i),vertices.getZ(i)].every(Number.isFinite));
});

test('WORK6 #104: sculpted hull rails and eight sunk gunports use bounded real 3D geometry',()=>{
  const {group}=dress();
  const rails=group.children.filter(n=>n.name==='battle-only-swept-hull-rail');
  assert.equal(rails.length,6,'three curved longitudinal rails on both sides');
  assert.ok(rails.every(n=>n instanceof T.Mesh && n.geometry instanceof T.TubeGeometry));
  const rings=group.getObjectByName('battle-only-engraved-gunport-rims');
  const recesses=group.getObjectByName('battle-only-recessed-gunports');
  assert.ok(rings instanceof T.InstancedMesh);
  assert.ok(recesses instanceof T.InstancedMesh);
  assert.equal(rings.count,8);
  assert.equal(recesses.count,8);
  assert.equal(group.children.length,9,'one hull mesh, six rails and two GPU-instanced port arrays');
  for(const part of [rings,recesses]){
    const matrix=new T.Matrix4();
    for(let i=0;i<part.count;i++){
      part.getMatrixAt(i,matrix);
      assert.ok(Array.from(matrix.elements).every(Number.isFinite));
    }
  }
});

test('WORK6 #104: visuals are battle-only, never change camera, HP, guns, player ship or Porto',()=>{
  const start=source.indexOf('private dressBattleBroadside(){');
  const end=source.indexOf('private dressBattleDeck(){');
  assert.ok(start>0 && end>start);
  const method=source.slice(start,end);
  assert.doesNotMatch(method,/this\.(camera|controls|battle|ships\.player|harbourDock|battleBattery)\./);
  assert.match(method,/this\.ships\.enemy\.root\.add\(dressing\)/);
  assert.match(source,/this\.dressBattleBroadside\(\)/);
  assert.match(source,/this\.ships\.enemy\.root\.visible=false/);
  assert.match(source,/this\.ships\.player\.root\.visible=false/);
  assert.match(source,/this\.ships\.player\.root\.visible=true/);
  assert.match(source,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
});
