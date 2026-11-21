import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { createPreviewHistory, currentPreview, type PreviewDraft } from '../src/shipyard-history.ts';
import { encodePreviewBlueprint, decodePreviewBlueprint, BLUEPRINT_MAX_CHARS } from '../src/shipyard-blueprint.ts';
import { SHIP_MODULES, SLOTS, type ShipClass } from '../src/ship-modules.ts';

const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const codeFor=(value:unknown)=>'RPV1.'+btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const example=()=>currentPreview(createPreviewHistory());

test('visual blueprint roundtrips all 3 classes, 9 modules, levels 1–20 without inventing inventory',()=>{
 for(let level=1;level<=20;level++){
  const original=example();
  const selections={} as PreviewDraft['selectedByClass'];
  for(const cls of CLASSES){
   selections[cls]=Object.fromEntries(SLOTS.map(slot=>{
    const variants=SHIP_MODULES.filter(m=>m.slot===slot && m.minLevel<=level);
    return [slot,variants[variants.length-1].id];
   }));
  }
  for(const shipClass of CLASSES){
   const draft={...original,level,shipClass,selectedByClass:selections};
   const encoded=encodePreviewBlueprint(draft);
   assert.match(encoded,/^RPV1\.[A-Za-z0-9_-]+$/);
   assert.ok(encoded.length<BLUEPRINT_MAX_CHARS);
   const decoded=decodePreviewBlueprint(encoded);
   assert.deepEqual(decoded,draft);
   assert.equal(encodePreviewBlueprint(decoded),encoded);
   assert.notStrictEqual(decoded.selectedByClass,draft.selectedByClass);
   for(const key of ['ownedModuleIds','ownedShipClasses','balance','purchases','verifiedPlayerLevel','inventory','playerId'])
    assert.equal(key in decoded,false);
  }
 }
});

test('export does not mutate the source draft; import never aliases class selections',()=>{
 const original=example();
 const decoded=decodePreviewBlueprint(encodePreviewBlueprint(original));
 decoded.selectedByClass.scout.sails='sails-cream';
 assert.equal(original.selectedByClass.scout.sails,undefined);
 assert.notStrictEqual(decoded.selectedByClass.scout,original.selectedByClass.scout);
});

test('invalid, malicious, level-locked and foreign blueprint fields are rejected',()=>{
 const valid=example();
 const object={version:1,shipClass:valid.shipClass,level:valid.level,selectedByClass:valid.selectedByClass};
 const bad:unknown[]=[
  {...object,ownedModuleIds:['hull-royal']},
  {...object,balances:{gold:999999}},
  {...object,version:2},
  {...object,level:0},
  {...object,level:21},
  {...object,level:1.5},
  {...object,shipClass:'enemy'},
  {...object,selectedByClass:{scout:{},fighter:{}}},
  {...object,selectedByClass:{...valid.selectedByClass,scout:{hull:'hull-royal'}}},
  {...object,selectedByClass:{...valid.selectedByClass,scout:{hull:'hull-fake'}}},
  {...object,selectedByClass:{...valid.selectedByClass,scout:{unknown:'hull-oak'}}},
  {...object,selectedByClass:{...valid.selectedByClass,scout:{hull:7}}},
  {...object,selectedByClass:{...valid.selectedByClass,scout:{__proto__:null}}},
  null, [], 'whatever'
 ];
 for(const input of bad)assert.throws(()=>decodePreviewBlueprint(codeFor(input)));
 for(const code of ['', 'not-a-blueprint', 'RPV1.??', 'RPV1.@@@@', 'RPV2.ZXJyb3I', 'RPV1.'+'x'.repeat(5000)])
  assert.throws(()=>decodePreviewBlueprint(code));
});

test('shipyard shows an optional accessible import/export panel, never an automatic equip or save',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{onClose:()=>{},onPreview:()=>{}}));
 assert.match(html,/aria-label="Show or hide visual design sharing"/);
 assert.match(html,/VISUAL BLUEPRINT/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
 const css=readFileSync(new URL('../src/shipyard.css',import.meta.url),'utf8');
 assert.match(css,/\.shipyard-blueprint-toggle:focus-visible/);
 assert.match(css,/\.shipyard-blueprint-panel textarea/);
 const source=readFileSync(new URL('../src/shipyard.tsx',import.meta.url),'utf8');
 assert.match(source,/decodePreviewBlueprint\(blueprintInput\)/);
 assert.match(source,/commitDraft\(restored\)/);
 assert.doesNotMatch(source,/localStorage|sessionStorage/);
});
