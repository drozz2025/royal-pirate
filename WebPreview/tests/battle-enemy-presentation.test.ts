import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeShip} from '../src/ships.ts';
import {battleCameraPose} from '../src/battle-framing';

function withFakeCanvas<TValue>(fn:()=>TValue):TValue {
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');
  const ctx=new Proxy({}, {get:()=>()=>{}});
  Object.defineProperty(globalThis,'document',{
    configurable:true,
    value:{createElement:()=>({width:512,height:512,getContext:()=>ctx})}
  });
  try{return fn();}
  finally{
    if(original)Object.defineProperty(globalThis,'document',original);
    else Reflect.deleteProperty(globalThis,'document');
  }
}

test('enemy galleon is red, three-masted and billowed geometry, not an overlay',()=>{
  withFakeCanvas(()=>{
    const enemy=makeShip(true);
    const player=makeShip(false);
    assert.equal(player.sails.length,6,'royal Porto/player geometry remains untouched');
    assert.equal(enemy.sails.length,5,'two main sails, two topsails and a third foremast');
    const foresail=enemy.root.getObjectByName('enemy-billowed-foresail') as T.Mesh;
    assert.ok(foresail,'enemy has a genuine third red 3D sail');
    assert.equal(foresail.material,enemy.sails[1].material,
      'the visible red forecanvas must bear the same original Jolly Roger as the main canvas');
    const redTop=enemy.sails[0].geometry.getAttribute('position') as T.BufferAttribute;
    const topDepth=Array.from({length:redTop.count},(_,i)=>redTop.getZ(i));
    assert.ok(Math.max(...topDepth)-Math.min(...topDepth)<.22,
      'enemy topsail remains cloth-shaped, not the old inflated spherical silhouette');
    const positions=foresail.geometry.getAttribute('position') as T.BufferAttribute;
    assert.ok(positions.count>=60);
    const depths=Array.from({length:positions.count},(_,i)=>positions.getZ(i));
    assert.ok(Math.max(...depths)-Math.min(...depths)>.3,'curved cloth must have real volume');
    assert.ok(depths.every(Number.isFinite));
    assert.equal(enemy.guns.length,6,'original cannon visuals remain');
  });
});

test('enemy battle-only presentation leaves the tested camera and Porto intact',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(source,/this\.ships\.enemy\.root\.rotation\.y=-\.95/);
  assert.match(source,/this\.ships\.enemy\.root\.scale\.setScalar\(1\.72\)/);
  assert.match(source,/this\.ships\.player\.root\.scale\.setScalar\(1\);this\.ships\.enemy\.root\.scale\.setScalar\(1\)/);
  assert.match(source,/this\.battleForegroundSail\.visible=false;this\.worldScenery\.visible=true/);
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    const pose=battleCameraPose(w/h);
    const camera=new T.PerspectiveCamera(42,w/h,.1,220);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const points=[
      new T.Vector3(10,0,-3),
      new T.Vector3(10,1.72*8.4,-3),
      new T.Vector3(10,1.72*6.7,-3+1.72*3.42)
    ];
    for(const point of points){
      const ndc=point.project(camera);
      assert.ok(Number.isFinite(ndc.x)&&Number.isFinite(ndc.y));
      assert.ok(ndc.x>-1&&ndc.x<1,
        `enemy anchor visible at ${w}x${h}: ${ndc.x}`);
    }
  }
});


test('red enemy broadside is sculpted three-dimensional material, without changing the royal Porto ship',()=>{
  withFakeCanvas(()=>{
    const opponent=makeShip(true), royal=makeShip(false);
    const findOxblood=(ship:T.Group)=> {
      const matches:T.Mesh[]=[];
      ship.traverse(part=>{
        if(part instanceof T.Mesh && part.material instanceof T.MeshStandardMaterial
          && part.material.color.getHexString()==='802b36') matches.push(part);
      });
      return matches;
    };
    const redDetail=findOxblood(opponent.root);
    assert.equal(redDetail.length,1,'red gallery, hull strakes and gunport edging are batched into a single material draw');
    assert.equal(findOxblood(royal.root).length,0,'Porto royal ship must not receive battle-only red sculpture');
    const hull=redDetail[0].geometry;
    assert.ok(hull.getAttribute('position').count>400,'real flared stern and broadside geometry, not a UI picture');
    const bounds=new T.Box3().setFromObject(redDetail[0]);
    assert.ok(bounds.max.x>1.5&&bounds.min.x< -1.5,'galleon decoration spans both flanks');
    assert.ok(bounds.max.z>4.2&&bounds.min.z< -4.3,'carving runs from stern gallery to prow');
    assert.equal(opponent.guns.length,6,'all three live cannons on each side are preserved');
    assert.equal(opponent.sails.length,5,'existing three-mast enemy sail geometry is not recreated');
    assert.equal(royal.sails.length,6,'approved royal ship and jib remain intact');
  });
});
