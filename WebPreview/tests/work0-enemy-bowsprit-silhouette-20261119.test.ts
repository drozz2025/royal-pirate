import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {makeShip} from '../src/ships';

function withFakeCanvas<TValue>(run:()=>TValue):TValue {
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');
  const paint=new Proxy({}, {get:()=>()=>{},set:()=>true});
  Object.defineProperty(globalThis,'document',{configurable:true,
    value:{createElement:()=>({width:512,height:512,getContext:()=>paint})}});
  try{return run();}
  finally{
    if(original)Object.defineProperty(globalThis,'document',original);
    else Reflect.deleteProperty(globalThis,'document');
  }
}

test('WORK0 #104: enemy-only three-dimensional triangular staysail spans the actual bowsprit',()=>{
  withFakeCanvas(()=>{
    const enemy=makeShip(true);
    const royal=makeShip(false);
    const jib=enemy.rig.getObjectByName('enemy-billowed-bowsprit-jib');
    assert.ok(jib instanceof T.Mesh);
    assert.ok(jib.material instanceof T.MeshStandardMaterial);
    assert.equal(jib.material.side,T.DoubleSide);
    assert.ok(jib.geometry instanceof T.BufferGeometry);
    const positions=jib.geometry.getAttribute('position') as T.BufferAttribute;
    assert.ok(positions.count>=60,'genuinely tessellated three-dimensional cloth');
    const indices=jib.geometry.getIndex();
    assert.ok(indices&&indices.count>=250,'triangular cloth is filled, not a wire outline');
    const bounds=new T.Box3().setFromObject(jib);
    assert.ok(bounds.max.z>8&&bounds.min.z<3.8,'jib projects ahead of the foremast toward the bow');
    assert.ok(bounds.max.y>7&&bounds.min.y<3.3,'sail has a substantial side-on silhouette');
    const x=Array.from({length:positions.count},(_,i)=>positions.getX(i));
    assert.ok(Math.max(...x)-Math.min(...x)>.25,'billow has genuine depth for live lighting');
    assert.equal(enemy.sails.length,5,'existing sail damage bookkeeping is untouched');
    assert.equal(enemy.guns.length,6,'the six firing cannons are unchanged');
    assert.equal(royal.sails.length,6,'approved Porto ship retains its six original cloth pieces');
    assert.equal(royal.rig.getObjectByName('enemy-billowed-bowsprit-jib'),undefined,
      'never decorate the approved royal harbour vessel');
  });
});

test('WORK0 #104: new opponent art is presentation-only and cannot move physics or the dock',()=>{
  const ships=readFileSync(new URL('../src/ships.ts',import.meta.url),'utf8');
  const sculpture=ships.split('// WORK0 / #104: a genuine billowed triangular staysail')[1]
    ?.split('// Warm lanterns at bow and stern')[0]??'';
  assert.ok(sculpture.startsWith(' extends the')||sculpture.length>100);
  assert.match(sculpture,/if\(red\)\{/);
  assert.match(sculpture,/rig\.add\(jib\)/);
  const codeOnly=sculpture.replace(/\/\/[^\n]*/g,'');
  assert.doesNotMatch(codeOnly,/SHIPS|Battle|\.sails\.push|\.guns\.push|hitbox|bullet|damage\./i);
  const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.visible=true/);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
});
