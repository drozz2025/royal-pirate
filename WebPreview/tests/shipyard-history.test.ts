import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Shipyard } from '../src/shipyard.tsx';
import {
 createPreviewHistory, currentPreview, recordPreview, undoPreview, redoPreview,
 canUndoPreview, canRedoPreview, PREVIEW_HISTORY_LIMIT
} from '../src/shipyard-history.ts';

test('preview edit history begins empty and never invents inventory or player state',()=>{
 const history=createPreviewHistory();
 assert.equal(history.index,0);
 assert.equal(history.snapshots.length,1);
 assert.equal(currentPreview(history).shipClass,'fighter');
 assert.equal(currentPreview(history).level,1);
 assert.deepEqual(currentPreview(history).selectedByClass,{
  scout:{},fighter:{},warship:{}
 });
 assert.equal(canUndoPreview(history),false);
 assert.equal(canRedoPreview(history),false);
 assert.equal('ownedModuleIds' in currentPreview(history),false);
 assert.equal('balance' in currentPreview(history),false);
 assert.equal('verifiedPlayerLevel' in currentPreview(history),false);
});

test('undo and redo restore class, level and different hull module drafts together',()=>{
 let history=createPreviewHistory();
 const a=currentPreview(history);
 history=recordPreview(history,{...a,shipClass:'scout',level:6,
  selectedByClass:{...a.selectedByClass,scout:{sails:'sails-crimson'}}});
 const b=currentPreview(history);
 history=recordPreview(history,{...b,shipClass:'warship',level:20,
  selectedByClass:{...b.selectedByClass,warship:{hull:'hull-royal',flag:'flag-black'}}});
 assert.equal(currentPreview(history).shipClass,'warship');
 assert.equal(currentPreview(history).selectedByClass.scout.sails,'sails-crimson');
 history=undoPreview(history);
 assert.equal(currentPreview(history).level,6);
 assert.equal(currentPreview(history).shipClass,'scout');
 assert.deepEqual(currentPreview(history).selectedByClass.warship,{});
 history=undoPreview(history);
 assert.equal(currentPreview(history).level,1);
 assert.equal(currentPreview(history).shipClass,'fighter');
 assert.equal(canUndoPreview(history),false);
 history=undoPreview(history);
 assert.equal(history.index,0);
 history=redoPreview(redoPreview(history));
 assert.equal(currentPreview(history).shipClass,'warship');
 assert.equal(currentPreview(history).selectedByClass.warship.hull,'hull-royal');
 assert.equal(canRedoPreview(history),false);
});

test('a new visual edit after undo clears only redo, with idempotent selections ignored',()=>{
 let history=createPreviewHistory();
 const start=currentPreview(history);
 assert.equal(recordPreview(history,{...start}),history,'repeating a selection must not allocate a new history step');
 history=recordPreview(history,{...start,level:6});
 history=recordPreview(history,{...currentPreview(history),level:11});
 history=undoPreview(history);
 assert.equal(canRedoPreview(history),true);
 history=recordPreview(history,{...currentPreview(history),shipClass:'scout'});
 assert.equal(canRedoPreview(history),false);
 assert.equal(currentPreview(history).level,6);
 assert.equal(currentPreview(history).shipClass,'scout');
});

test('history keeps independent immutable snapshots and bounds memory to thirty states',()=>{
 let history=createPreviewHistory();
 for(let i=0;i<90;i++){
  history=recordPreview(history,{...currentPreview(history),
   shipClass:i%2?'scout':'warship',level:i%20+1
  });
  assert.ok(history.snapshots.length<=PREVIEW_HISTORY_LIMIT);
 }
 assert.equal(history.snapshots.length,PREVIEW_HISTORY_LIMIT);
 assert.equal(history.index,PREVIEW_HISTORY_LIMIT-1);
 const latest=currentPreview(history);
 const earlier=history.snapshots[0];
 latest.selectedByClass.scout.sails='sails-crimson';
 assert.equal(earlier.selectedByClass.scout.sails,undefined,'historical entries are independent clones');
 assert.throws(()=>recordPreview(history,{...latest,level:21}),RangeError);
 assert.throws(()=>recordPreview(history,{...latest,level:1.5}),RangeError);
 assert.throws(()=>recordPreview(history,{...latest,shipClass:'ghost' as 'scout'}),/Unknown/);
});

test('editor exposes accessible undo and redo without claiming ownership or saving progress',()=>{
 const html=renderToStaticMarkup(createElement(Shipyard,{onClose:()=>{},onPreview:()=>{}}));
 const undo=html.match(/<button[^>]*aria-label="Undo last visual shipyard preview change"[^>]*>/)?.[0]??'';
 const redo=html.match(/<button[^>]*aria-label="Redo last visual shipyard preview change"[^>]*>/)?.[0]??'';
 assert.match(undo,/disabled/);
 assert.match(redo,/disabled/);
 assert.match(html,/Undo and redo are local to this editor session/);
 assert.match(html,/Level unlocks are not purchases or ownership/);
 assert.doesNotMatch(html,/EQUIP VERIFIED FLEET/);
});
