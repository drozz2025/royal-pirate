import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';
import {battleCameraPose} from '../src/battle-framing';

type Sightline={breech:number[];muzzle:number[]};
function sightlines() {
  const {group,flashes}=makeBattleDeck();
  const barrels:T.Mesh[]=[];
  group.traverse(child=>{
    if(child instanceof T.Mesh&&child.name==='first-person-broadside-cannon')barrels.push(child);
  });
  const lines=barrels.map(gun=>gun.userData.decorativeSightline as Sightline);
  return {group,flashes,barrels,lines};
}

function screenPoint(raw:number[],viewport:[number,number]):{x:number;y:number}{
  const [w,h]=viewport;
  const pose=battleCameraPose(w/h);
  const camera=new T.PerspectiveCamera(42,w/h,.1,220);
  camera.position.set(...pose.position);
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld();
  const projected=new T.Vector3(raw[0],raw[1],raw[2]+pose.batteryOffsetZ).project(camera);
  return {x:(projected.x+1)*w/2,y:(1-projected.y)*h/2};
}

test('WORK6 #104: two existing 3D guns now aim diagonally from INSIDE the vessel',()=>{
  const {group,barrels,lines,flashes}=sightlines();
  assert.equal(barrels.length,2);
  assert.equal(flashes.length,2);
  assert.ok(flashes.every(f=>!f.visible));
  assert.ok(group.children.length<60,'no extra cannon, deck draw-call flood or UI');
  for(const barrel of barrels){
    assert.ok(barrel.geometry instanceof T.LatheGeometry,'real sculptural cast-iron muzzle, not a cylinder decal');
    assert.ok(barrel.geometry.getAttribute('position').count>=200,'a tapered forged profile with flared muzzle');
  }
  const port=lines.find(line=>line.breech[0]<0);
  const starboard=lines.find(line=>line.breech[0]>0);
  assert.ok(port && starboard);
  assert.ok(port.breech[0]<-4 && port.muzzle[0]>-2.4,'port cannon enters from left foreground toward open sea');
  assert.ok(starboard.breech[0]>4 && starboard.muzzle[0]>5,'starboard cannon points out beyond the near gunwale');
  assert.ok(port.breech[2]>port.muzzle[2] && starboard.breech[2]>starboard.muzzle[2]);
});

test('WORK6 #104: original native 384x512 sightlines have separated mouths, no twin parallel vertical guns',()=>{
  const {lines}=sightlines();
  const [port,starboard]=[
    lines.find(line=>line.breech[0]<0)!,
    lines.find(line=>line.breech[0]>0)!
  ];
  const v:[number,number]=[384,512];
  const portNear=screenPoint(port.breech,v),portFar=screenPoint(port.muzzle,v);
  const rightNear=screenPoint(starboard.breech,v),rightFar=screenPoint(starboard.muzzle,v);
  assert.ok(portNear.x<100 && portFar.x>130 && portFar.x-portNear.x>55,
    'port gun must sweep from lower-left toward central enemy water');
  assert.ok(rightNear.x>270 && rightFar.x>245,
    'second muzzle stays to the starboard side, not over the first gun');
  assert.ok(portFar.y>290 && portFar.y<350 && rightFar.y>290 && rightFar.y<350,
    'muzzles frame the sea below the health banners, not the ships');
});

test('WORK6 #104: cannon muzzles remain visible on four native Chromium phone viewports',()=>{
  const {lines}=sightlines();
  for(const size of [[320,568],[384,512],[390,844],[430,932]] as [number,number][]){
    for(const line of lines){
      const end=screenPoint(line.muzzle,size);
      assert.ok(end.x>0 && end.x<size[0] && end.y>0 && end.y<size[1],
        '3D cannon mouth must stay on-screen at '+size.join('x'));
    }
  }
});

test('WORK6 #104: sculpted battle-only wave folds never replace calm Porto or alter game state',()=>{
  const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const vertex=source.split('vertexShader:`')[1]?.split('`,fragmentShader:')[0]??'';
  assert.match(vertex,/if\(battleMode<\.5\)return harbour/);
  assert.match(vertex,/float foldedRim=pow\(max\(0\.,sin\(/);
  assert.match(vertex,/\(rolling\+crossSea\+chop\)\*deckFade/);
  assert.match(source,/this\.battleBattery\.visible=false;this\.battleForegroundSail\.visible=false/);
  assert.match(source,/this\.ships\.player\.root\.visible=false/);
  assert.doesNotMatch(vertex,/collision|health|hitbox|projectile|damage/);
});
