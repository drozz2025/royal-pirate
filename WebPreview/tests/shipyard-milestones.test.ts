import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { SHIP_MODULES, SLOTS, availableModules, mayEquip, type ShipClass } from '../src/ship-modules.ts';
import {
  VISUAL_UNLOCK_LEVELS, nextVisualUnlock, previousVisualUnlock, visualUnlocksAtLevel
} from '../src/shipyard-milestones.ts';

test('milestone trail covers all 27 modules with no invented or missing level gates', () => {
 const catalogueLevels=[...new Set(SHIP_MODULES.map(module=>module.minLevel))].sort((a,b)=>a-b);
 assert.deepEqual(VISUAL_UNLOCK_LEVELS,catalogueLevels);
 assert.equal(VISUAL_UNLOCK_LEVELS[0],1);
 assert.equal(VISUAL_UNLOCK_LEVELS[VISUAL_UNLOCK_LEVELS.length-1],20);
 assert.equal(VISUAL_UNLOCK_LEVELS.reduce((count,level)=>count+visualUnlocksAtLevel(level).length,0),27);
 assert.equal(new Set(SHIP_MODULES.map(item=>item.id)).size,27);
 assert.equal(SLOTS.length,9);
 for(let level=1;level<=20;level++){
  const at=visualUnlocksAtLevel(level);
  assert.ok(at.every(module=>module.minLevel===level));
  const next=nextVisualUnlock(level);
  const prev=previousVisualUnlock(level);
  if(next){
   assert.ok(next.level>level);
   assert.deepEqual(next.modules,visualUnlocksAtLevel(next.level));
   assert.ok(!VISUAL_UNLOCK_LEVELS.some(value=>value>level&&value<next.level));
  }else assert.equal(level,20);
  if(prev){
   assert.ok(prev.level<level);
   assert.deepEqual(prev.modules,visualUnlocksAtLevel(prev.level));
   assert.ok(!VISUAL_UNLOCK_LEVELS.some(value=>value<level&&value>prev.level));
  }else assert.equal(level,1);
  for(const shipClass of ['scout','fighter','warship'] as ShipClass[]){
   assert.ok(shipClass);
   assert.equal(availableModules(level).length,SHIP_MODULES.filter(m=>m.minLevel<=level).length);
   assert.ok(at.every(m=>!mayEquip(m.id,level,new Set<string>())),
    'unlock alone must never grant acquisition/equip rights');
  }
 }
});

test('navigation jumps to the next real art unlock without manufacturing intermediate levels',()=>{
 assert.equal(nextVisualUnlock(1)?.level,4);
 assert.equal(nextVisualUnlock(2)?.level,4);
 assert.equal(nextVisualUnlock(3)?.level,4);
 assert.equal(nextVisualUnlock(4)?.level,5);
 assert.equal(previousVisualUnlock(4)?.level,1);
 assert.equal(previousVisualUnlock(13)?.level,12);
 assert.equal(nextVisualUnlock(19)?.level,20);
 assert.equal(nextVisualUnlock(20),null);
 assert.equal(previousVisualUnlock(1),null);
 assert.deepEqual(visualUnlocksAtLevel(3),[]);
});

test('invalid demo preview level cannot create milestones or equip rights',()=>{
 for(const bad of [0,21,-1,1.5,Number.NaN,Number.POSITIVE_INFINITY]){
  assert.throws(()=>nextVisualUnlock(bad),RangeError);
  assert.throws(()=>previousVisualUnlock(bad),RangeError);
  assert.throws(()=>visualUnlocksAtLevel(bad),RangeError);
 }
});

test('mobile shipyard exposes preview-only previous/next 3D art unlock navigation',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{onClose:()=>{},onPreview:()=>{}}));
 assert.match(html,/aria-label="Go to previous visual unlock level"/);
 assert.match(html,/aria-label="Go to next visual unlock level"/);
 assert.match(html,/NEXT VISUAL UNLOCK/);
 assert.match(html,/LV 4/);
 assert.match(html,/FLAG/);
 assert.match(html,/VISUAL PREVIEW ONLY/);
 assert.match(html,/DEMO PREVIEW LEVEL/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
 const prev=html.match(/<button[^>]*aria-label="Go to previous visual unlock level"[^>]*>/)?.[0]??'';
 assert.match(prev,/disabled/);
 const css=readFileSync(new URL('../src/shipyard.css',import.meta.url),'utf8');
 assert.match(css,/\.shipyard-milestones/);
 assert.match(css,/\.shipyard-milestones button:focus-visible/);
});
