import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {CrewDeck} from '../src/crew-deck.tsx';
import {AppScreens} from '../src/app-screens.tsx';
import {initialProfile,buyCrew,equipCrew,improve,type LocalProfile} from '../src/progression.ts';

const noop=()=>{};
const renderDeck=(profile:LocalProfile,onlyOwned=false)=>renderToStaticMarkup(React.createElement(CrewDeck,{
 profile,onlyOwned,onBuyCrew:noop,onEquipCrew:noop,onBattle:noop,announce:(_msg:string,callback:()=>void)=>callback()
}));
const renderForge=(profile:LocalProfile)=>renderToStaticMarkup(React.createElement(AppScreens,{
 screen:'forge',profile,onNavigate:noop,onClose:noop,onBattle:noop,onInspect:noop,onBuyCrew:noop,
 onEquipCrew:noop,onUpgrade:noop,onMission:noop,onDaily:noop,onExportBackup:noop,onImportBackup:noop,backupMessage:''
}));

test('crew deck shows only actual owned/active captain with no invented bonuses',()=>{
 const html=renderDeck(initialProfile());
 assert.match(html,/Captain Mara/);
 assert.match(html,/★ ACTIVE CAPTAIN/);
 assert.match(html,/1 \/ 3 OWNED/);
 assert.match(html,/View Iron Jack, locked/);
 assert.match(html,/One active captain/);
 assert.match(html,/no combat bonuses yet/);
 assert.equal((html.match(/aria-pressed="/g)||[]).length,3);
 assert.match(html,/aria-label="Browse crew cards"/);
 assert.match(html,/aria-label="View Iron Jack, locked"/);
 assert.match(html,/aria-label="Captain Mara is already active"/);
});

test('owned-only filter hides locked cards, even before any purchases',()=>{
 const html=renderDeck(initialProfile(),true);
 assert.match(html,/Captain Mara/);
 assert.doesNotMatch(html,/Iron Jack|Northwind/);
 assert.equal((html.match(/class="app-deck-slot(?: is-preview)?"/g)||[]).length,1);
});

test('real local purchases and equipment render with accurate state and balance',()=>{
 let profile={...initialProfile(),coins:100};
 profile=buyCrew(profile,'gunner');
 profile=equipCrew(profile,'gunner');
 assert.equal(profile.coins,40);
 const html=renderDeck(profile);
 assert.match(html,/2 \/ 3 OWNED/);
 assert.match(html,/Iron Jack, active captain/);
 assert.match(html,/View Northwind, locked/);
 assert.match(html,/Captain Mara/);
 assert.match(html,/View Captain Mara, owned/);
});

test('forge overview reflects only purchased levels and explicitly disclaims battle effects',()=>{
 const empty=renderForge(initialProfile());
 assert.match(empty,/aria-label="Melhorias e forja"/);
 assert.match(empty,/PROGRESSO DO ESTALEIRO/);
 assert.match(empty,/ainda não altera dano, vida, velocidade/);
 assert.equal((empty.match(/shipyard upgrade progress"/g)||[]).length,3);
 assert.equal((empty.match(/NÍVEL 0 \/ 5/g)||[]).length,3);
 assert.match(empty,/ARMADURA/);
 assert.match(empty,/moedas locais são usadas/);
 const upgraded=improve({...initialProfile(),coins:100},'hull');
 assert.equal(upgraded.upgrades.hull,1);
 const changed=renderForge(upgraded);
 assert.match(changed,/Hull<\/strong><small>NÍVEL 1 \/ 5/);
 assert.equal((changed.match(/NÍVEL 0 \/ 5/g)||[]).length,2);
 assert.match(changed,/MELHORAR/);
});

test('crew and forge premium styling has portrait, keyboard focus and narrow viewport rules',()=>{
 const css=readFileSync(new URL('../src/app-screens.css',import.meta.url),'utf8');
 assert.match(css,/\.app-deck-feature/);
 assert.match(css,/\.app-deck-slot\.is-preview/);
 assert.match(css,/\.app-forge-board/);
 assert.match(css,/\.app-deck button:focus-visible/);
 assert.match(css,/@media\(max-width:390px\)/);
});
