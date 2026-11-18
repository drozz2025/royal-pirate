import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {CANNON_FX_DURATION,CANNON_SMOKE_DURATION,cannonFxState,cannonSmokeState} from '../src/cannon-vfx';
import {makeBattleDeck} from '../src/battle-deck';
import {battleDeckMuzzleWorld} from '../src/battle-framing';
import {Battle} from '../src/battle';

test('WORK0 02: single true muzzle keeps its six smoke puffs in a single instanced draw call',()=>{
 const {group,muzzles}=makeBattleDeck(true);
 assert.equal(muzzles.length,1);
 const recoil=group.getObjectByName('first-person-central-recoil')!;
 const cloud=group.getObjectByName('first-person-central-smoke') as T.Group;
 const puffs=group.getObjectByName('first-person-central-smoke-puffs');
 assert.ok(cloud instanceof T.Group);
 assert.equal(cloud.parent,recoil);
 assert.ok(puffs instanceof T.InstancedMesh);
 assert.equal(puffs.count,6);
 assert.equal(puffs.parent,cloud);
 assert.equal(cloud.visible,false,'powder hidden before firing');
 assert.ok(cloud.position.distanceTo(muzzles[0])<.65,'real smoke starts at bore, not outside to the right');
 recoil.rotation.y=.17;recoil.position.z=68.2;
 const worldMuzzle=battleDeckMuzzleWorld(recoil,muzzles[0]);
 const worldSmoke=battleDeckMuzzleWorld(cloud,new T.Vector3());
 assert.ok(worldMuzzle.distanceTo(worldSmoke)<.65,'plume and muzzle share live yaw/recoil transform');
});

test('WORK0 02: smoke remains legible across low-FPS samples, fades and stops with no NaNs',()=>{
 for(const x of [-1,NaN,Infinity,-Infinity,CANNON_SMOKE_DURATION,CANNON_SMOKE_DURATION+3])
  assert.deepEqual(cannonSmokeState(x),{visible:false,scale:0,opacity:0});
 assert.equal(cannonSmokeState(0).visible,false);
 for(const age of [.08,.20,.32,.6]){
  const plume=cannonSmokeState(age);
  assert.equal(plume.visible,true,'several real frame samples must show muzzle powder');
  assert.ok(plume.opacity>0 && plume.opacity<=.53);
  assert.ok(plume.scale>=.67 && plume.scale<2.72);
 }
 assert.ok(CANNON_SMOKE_DURATION>CANNON_FX_DURATION,'smoke must outlive the flash');
 assert.equal(cannonFxState(.6).visible,false,'powder does not extend light or recoil');
 assert.ok(cannonSmokeState(.30).opacity>cannonSmokeState(.92).opacity);
 for(let i=0;i<=100;i++){
  const state=cannonSmokeState(i*CANNON_SMOKE_DURATION/100);
  assert.ok(Number.isFinite(state.opacity)&&Number.isFinite(state.scale));
 }
});

test('WORK0 02: only presentation changes; real turn, shot and health are untouched',()=>{
 const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(source,/cannonSmokeState\(this\.recoilAge\.player\)/);
 assert.match(source,/smokeRig\.visible=this\.battleBattery\.visible&&plume\.visible/);
 assert.match(source,/side==='player'\?CANNON_SMOKE_DURATION:CANNON_FX_DURATION/);
 assert.match(source,/battleDeckMuzzleWorld\(central,muzzle\)/);
 assert.match(source,/if\(smokeRig\)smokeRig\.visible=false/);
 const battle=new Battle(1261);battle.aim(8,68);
 assert.equal(battle.fire(),true);
 const projectile=battle.shot!;
 assert.equal(battle.shotsFired,1);
 assert.equal(battle.health.player,100);assert.equal(battle.health.enemy,100);
 assert.equal(projectile.side,'player');
 assert.deepEqual(battle.drainEvents().map(e=>e.type),['fire']);
});
