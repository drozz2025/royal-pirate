import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {Battle, launch} from '../src/battle';
import {makeBattleDeck} from '../src/battle-deck';
import {projectileFromMuzzle, MUZZLE_JOIN_SECONDS} from '../src/battle-shot-presentation';

const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');

test('WORK0: battle mobile hierarchy removes duplicated headline/currency weight and preserves gameplay inputs',()=>{
  const css=read('../src/battle-layout-reset.css');
  const app=read('../src/main.tsx');
  assert.match(css,/\.app\.in-battle \{height:100dvh;min-height:0;/);
  assert.match(css,/\.in-battle \.battle-approved-logo,[\s\S]*?display:none/);
  assert.match(css,/\.in-battle \.command-deck \.fire-button/);
  assert.match(css,/\.in-battle \.command-deck \.sliders/);
  assert.match(app,/import '\.\/battle-layout-reset\.css'/);
  assert.match(app,/aria-expanded=\{utilityMenuOpen\}/);
  for(const action of ['Reset camera','Toggle deck camera','Enable pirate music','Enable cannon and impact effects','Restart battle'])
    assert.ok(app.includes(action),'existing utility action preserved: '+action);
  for(const action of ['engine.current.fire()','value={yaw}','value={power}','onClick={returnHarbour}'])
    assert.ok(app.includes(action),'live battle control preserved: '+action);
  assert.doesNotMatch(css,/\n\.harbour-(?:nav|screen)/);
});

test('WORK0: real pair of muzzle locations maps one-to-one to visible flash meshes',()=>{
  const {group,flashes,muzzles}=makeBattleDeck();
  assert.equal(flashes.length,2);
  assert.equal(muzzles.length,flashes.length);
  for(let i=0;i<flashes.length;i++){
    assert.ok(muzzles[i].distanceTo(flashes[i].position)<.25);
    assert.ok(Number.isFinite(muzzles[i].x));
  }
  assert.ok(group.getObjectByName('first-person-broadside-muzzle'));
});

test('WORK0: cannonball begins at chosen muzzle, joins simulated flight smoothly, never changes gameplay',()=>{
  const battle=new Battle(123);
  battle.aim(7,71);
  assert.equal(battle.fire(),true);
  const shot=battle.shot!;
  const muzzle={x:-3.15,y:4.86,z:39.35};
  assert.deepEqual(projectileFromMuzzle(shot,muzzle),muzzle);
  const originalVelocity={...shot.velocity};
  for(const t of [0,.03,.12,.30,MUZZLE_JOIN_SECONDS]){
    const state={...shot,age:t,position:{
      x:shot.origin.x+shot.velocity.x*t,
      y:shot.origin.y+shot.velocity.y*t-6*t*t,
      z:shot.origin.z+shot.velocity.z*t
    }};
    const render=projectileFromMuzzle(state,muzzle);
    assert.ok(Object.values(render).every(Number.isFinite));
    if(t===MUZZLE_JOIN_SECONDS)assert.deepEqual(render,state.position);
  }
  assert.deepEqual(shot.velocity,originalVelocity);
  const enemy=launch('enemy',0,65);
  assert.deepEqual(projectileFromMuzzle(enemy,muzzle),enemy.position);
  const scene=read('../src/scene.ts');
  assert.match(scene,/this\.batteryMuzzles=battery\.muzzles/);
  assert.match(scene,/index===this\.activeBatteryMuzzle/);
  assert.match(scene,/projectileFromMuzzle\(s,visibleMuzzle\)/);
  assert.match(scene,/this\.battleForegroundSail\.scale\.set\(\.48,\.72,1\)/);
});
