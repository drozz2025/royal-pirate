import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';

const scene=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');

test('WORK6 #104: real 3D gun barrels keep two firing silhouettes and two live flashes',()=>{
  const {group,flashes}=makeBattleDeck();
  const counts=new Map<string,number>();
  group.traverse(part=>{
    if(part instanceof T.Mesh&&part.name)counts.set(part.name,(counts.get(part.name)??0)+1);
  });
  assert.equal(counts.get('first-person-broadside-cannon'),2);
  assert.equal(counts.get('first-person-broadside-muzzle'),2);
  // GPU-instanced decorative elements: one draw call, four visible copies.
  for(const name of ['first-person-cannon-bronze-collar',
    'first-person-cannon-breeching-rope','first-person-carriage-cheek']){
    const batched=group.getObjectByName(name);
    assert.ok(batched instanceof T.InstancedMesh,name+' is actually instanced geometry');
    assert.equal(batched.count,4,name+' has four real decorative copies');
  }
  assert.ok(group.children.length<60,'existing mobile mesh/draw-call guard must remain green');
  assert.equal(flashes.length,2);
  assert.equal(group.name,'battle-foreground-cannons');
  assert.ok(flashes.every(f=>!f.visible),'new sculptural details do not simulate shots');
});

test('WORK6 #104: sculptural decoration never changes shot physics or live controls',()=>{
  const {group}=makeBattleDeck();
  const names:string[]=[];
  group.traverse(part=>{if(part.name)names.push(part.name);});
  assert.ok(names.includes('first-person-cannon-breeching-rope'));
  assert.ok(names.includes('first-person-cannon-bronze-collar'));
  assert.doesNotMatch(scene,/this\.battle\.(yaw|power|health)\s*=/);
  assert.match(scene,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
});

test('WORK6 #104: pictorial lighting exists only in Batalha, not approved Porto',()=>{
  assert.match(scene,/private battleAccentLights=new T\.Group\(\)/);
  assert.match(scene,/battle-only-broadside-light/);
  assert.match(scene,/new T\.PointLight\('#ffca92',540,56,2\)/);
  assert.match(scene,/new T\.PointLight\('#93c6e9',390,40,2\)/);
  assert.match(scene,/home\(\)\{this\.cameraMode='battle';[^\n]*this\.battleAccentLights\.visible=true/);
  assert.match(scene,/showHarbour\(\)\{\s*this\.cameraMode='harbour';this\.battleAccentLights\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.visible=false/);
  assert.match(scene,/this\.ships\.player\.root\.visible=true/);
  assert.doesNotMatch(scene,/this\.battleAccentLights\.position\.copy\(this\.camera/);
});
