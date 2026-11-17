import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {makeBattleDeck} from '../src/battle-deck';
import {battleCameraPose} from '../src/battle-framing';

// The original Batalha 02 is a view from ON the player's ship. Two equal
// parallel tubes were reading as a symmetrical arcade platform rather than
// a broadside that converges into the illustrated sea.
test('the live Three.js deck has two asymmetrical, inward-facing broadside guns',()=>{
  const {group,flashes}=makeBattleDeck();
  const barrels:T.Mesh[]=[],muzzles:T.Mesh[]=[];
  group.traverse(child=>{
    if(child instanceof T.Mesh&&child.name==='first-person-broadside-cannon') barrels.push(child);
    if(child instanceof T.Mesh&&child.name==='first-person-broadside-muzzle') muzzles.push(child);
  });
  barrels.sort((a,b)=>a.position.x-b.position.x);
  muzzles.sort((a,b)=>a.position.x-b.position.x);
  assert.equal(flashes.length,2,'keep precisely two existing decorative fire flashes');
  assert.equal(barrels.length,2,'never invent an additional playable cannon');
  assert.equal(muzzles.length,2);
  assert.ok(barrels[0].geometry instanceof T.CylinderGeometry);
  assert.ok(barrels[1].geometry instanceof T.CylinderGeometry);
  assert.ok(muzzles[0].geometry instanceof T.TorusGeometry);
  assert.ok(muzzles[1].geometry instanceof T.TorusGeometry);
  assert.ok(barrels[0].geometry.parameters.radiusBottom>
    barrels[1].geometry.parameters.radiusBottom*1.2,
    'near port barrel should be visibly heavier than the starboard gun');
  assert.ok(barrels[0].geometry.parameters.height>12&&
    barrels[1].geometry.parameters.height>12,
    'retain long sculpted iron barrels, not flat ornaments');
  assert.ok(muzzles[0].position.x>-3&&muzzles[0].position.x<-2,
    'port cannon projects diagonally from the near left rail toward the sea');
  assert.ok(muzzles[1].position.x>5.3&&muzzles[1].position.x<6.3,
    'starboard cannon angles toward the right edge');
});

test('both first-person muzzles stay above live controls at all four native portrait sizes',()=>{
  const {group}=makeBattleDeck();
  const muzzles:T.Mesh[]=[];
  group.traverse(child=>{
    if(child instanceof T.Mesh&&child.name==='first-person-broadside-muzzle')muzzles.push(child);
  });
  muzzles.sort((a,b)=>a.position.x-b.position.x);
  for(const [width,height] of [[384,512],[320,568],[390,844],[430,932]]){
    const pose=battleCameraPose(width/height);
    const camera=new T.PerspectiveCamera(42,width/height,.1,220);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const ndc=muzzles.map(m=>m.position.clone()
      .add(new T.Vector3(0,0,pose.batteryOffsetZ)).project(camera));
    const px=ndc.map(n=>({x:(n.x+1)*width/2,y:(1-n.y)*height/2}));
    assert.ok(px[0].x<px[1].x-60,
      'guns must visibly converge from separated near quarters: '+width+'x'+height);
    for(const p of px){
      assert.ok(p.x>width*.075&&p.x<width*.925,
        'muzzle cannot clip the viewport: '+width+'x'+height+' '+JSON.stringify(p));
      assert.ok(p.y>height*.50&&p.y<height*.68,
        'muzzle must stay in playable view ABOVE the fire controls: '+width+'x'+height+' '+JSON.stringify(p));
    }
    if(width===384){
      assert.ok(px[0].x>108&&px[0].x<176&&px[1].x>255&&px[1].x<325,
        'original 384x512 artwork has a left-to-centre port gun and a right-hand starboard gun');
      assert.ok(px[0].y>313&&px[0].y<350,
        'the old symmetric muzzles were visually too high on reference 02');
    }
  }
});

test('the perspective change cannot modify Porto, gameplay, dock or camera framing',()=>{
  const deckSource=readFileSync(new URL('../src/battle-deck.ts',import.meta.url),'utf8');
  const sceneSource=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  const deckBuilder=deckSource.split('export function makeBattleDeck()')[1]??'';
  const deckDressing=sceneSource.split('private dressBattleDeck(){')[1]?.split('private environment(){')[0]??'';
  assert.ok(deckDressing.includes('for(const x of [-2.42,5.72])'));
  assert.doesNotMatch(deckDressing,/this\.battle\.|this\.controls\.|this\.ships\.|this\.harbourDock/);
  assert.doesNotMatch(deckBuilder,/this\.battle\.|this\.controls\.|localStorage|fetch\(/);
  assert.match(sceneSource,/this\.ships\.player\.root\.visible=false/);
  assert.match(sceneSource,/this\.ships\.player\.root\.visible=true/);
});
