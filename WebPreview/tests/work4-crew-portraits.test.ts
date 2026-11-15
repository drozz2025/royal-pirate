import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CrewPortrait} from '../src/crew-portrait.tsx';
import {CrewDeck} from '../src/crew-deck.tsx';
import {CREW,initialProfile,type LocalProfile,type CrewId} from '../src/progression.ts';

const no=()=>{};
const renderDeck=(profile:LocalProfile=initialProfile(),onlyOwned=false)=>
  renderToStaticMarkup(React.createElement(CrewDeck,{
    profile,onlyOwned,onBuyCrew:no,onEquipCrew:no,onBattle:no,announce:(_message:string,callback:()=>void)=>callback()
  }));

test('every actual crew card has a unique original vector portrait',()=>{
  const ids=CREW.map(c=>c.id);
  assert.deepEqual(ids,['captain','gunner','navigator']);
  const drawings=ids.map(id=>renderToStaticMarkup(React.createElement(CrewPortrait,{id})));
  for(const [index,id] of ids.entries()){
    const drawing=drawings[index];
    assert.match(drawing,new RegExp('data-crew-portrait="'+id+'"'));
    assert.ok(drawing.includes('data-crew-art="'));
    assert.match(drawing,/<svg[^>]*aria-hidden="true"/);
    assert.doesNotMatch(drawing,/<image|<foreignObject|https?:\/\//);
  }
  assert.equal(new Set(drawings).size,3,'No crew member reuses the captain illustration');
});

test('new captain starts with a visible portrait but locked crew remains locked',()=>{
  const html=renderDeck();
  assert.match(html,/data-crew-portrait="captain"/);
  assert.match(html,/Captain Mara/);
  assert.match(html,/ACTIVE CAPTAIN/);
  assert.doesNotMatch(html,/RECRUIT CREW/);
  assert.match(html,/View Northwind, locked/);
  assert.match(html,/1 \/ 3 OWNED/);
  assert.match(html,/One active captain/);
  assert.match(html,/no combat bonuses yet/);
});

test('equipped gunner receives matching illustration and active state',()=>{
  const profile={...initialProfile(),coins:25,ownedCrew:['captain','gunner'] as CrewId[],equippedCrew:'gunner' as const};
  const html=renderDeck(profile);
  assert.match(html,/data-crew-portrait="gunner"/);
  assert.match(html,/data-crew-art="iron-jack"/);
  assert.match(html,/Iron Jack/);
  assert.match(html,/ACTIVE CAPTAIN/);
  assert.match(html,/aria-controls="app-crew-preview-name"/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/2 \/ 3 OWNED/);
});

test('owned-only filter shows only saved crew without inventing unlocks',()=>{
  const html=renderDeck(initialProfile(),true);
  assert.match(html,/View Captain Mara, active captain/);
  assert.doesNotMatch(html,/View Iron Jack/);
  assert.doesNotMatch(html,/View Northwind/);
  assert.match(html,/data-crew-portrait="captain"/);
});
