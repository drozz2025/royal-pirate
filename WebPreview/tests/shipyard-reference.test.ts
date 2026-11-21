import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import { createPreviewHistory, currentPreview, recordPreview } from '../src/shipyard-history.ts';
import { capturePreviewReference, comparePreviewReference } from '../src/shipyard-reference.ts';

test('pinning a visual A copy preserves three independent classes without inventory or persistence',()=>{
 const working=currentPreview(createPreviewHistory());
 const pinned=capturePreviewReference(working);
 assert.deepEqual(pinned,working);
 assert.notEqual(pinned,working);
 assert.notEqual(pinned.selectedByClass,working.selectedByClass);
 for(const cls of ['scout','fighter','warship'] as const)
  assert.notEqual(pinned.selectedByClass[cls],working.selectedByClass[cls]);
 working.selectedByClass.scout.flag='flag-navy';
 assert.equal(pinned.selectedByClass.scout.flag,undefined);
 for(const field of ['ownedModuleIds','ownedShipClasses','balance','verifiedPlayerLevel','purchases'])
  assert.equal(field in pinned,false);
});

test('A/B comparison reports class, level and actual module changes without inventing ownership',()=>{
 let history=createPreviewHistory();
 const pinned=capturePreviewReference(currentPreview(history));
 assert.deepEqual(comparePreviewReference(pinned,currentPreview(history)),{
  classChanged:false,levelChanged:false,changedSlots:[]
 });
 const current=currentPreview(history);
 history=recordPreview(history,{...current,level:20,shipClass:'scout',selectedByClass:{
  ...current.selectedByClass,scout:{sails:'sails-night',hull:'hull-royal'}
 }});
 const diff=comparePreviewReference(pinned,currentPreview(history));
 assert.equal(diff.classChanged,true);
 assert.equal(diff.levelChanged,true);
 assert.deepEqual([...diff.changedSlots],['hull','sails']);
 assert.equal('ownedIds' in diff,false);
});

test('A/B accepts a pinned high-level draft but rejects invalid or locked preview parts',()=>{
 const initial=currentPreview(createPreviewHistory());
 assert.throws(()=>capturePreviewReference({...initial,selectedByClass:{
  ...initial.selectedByClass,warship:{cannons:'cannons-gold'}
 }}),/not unlocked/);
 assert.throws(()=>capturePreviewReference({...initial,selectedByClass:{
  ...initial.selectedByClass,warship:{cannons:'missing-cannon'}
 }}),/Unknown module/);
 const high=capturePreviewReference({...initial,level:20,selectedByClass:{
  ...initial.selectedByClass,warship:{cannons:'cannons-gold'}
 }});
 assert.equal(high.selectedByClass.warship.cannons,'cannons-gold');
 assert.equal(comparePreviewReference(high,initial).levelChanged,true);
});

test('shipyard exposes explicitly temporary pinned A/B controls, initially safe and disabled',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{onClose:()=>{},onPreview:()=>{}}));
 assert.match(html,/aria-label="Pin current visual ship as temporary reference A"/);
 const view=html.match(/<button[^>]*aria-label="View pinned visual reference A"[^>]*>/)?.[0]??'';
 assert.match(view,/disabled/);
 const clear=html.match(/<button[^>]*aria-label="Discard temporary visual reference A"[^>]*>/)?.[0]??'';
 assert.match(clear,/disabled/);
 assert.match(html,/No ships, modules, progression or ownership are saved by comparison/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
});
