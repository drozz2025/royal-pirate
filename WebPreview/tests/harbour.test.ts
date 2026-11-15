import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile} from '../src/progression.ts';

const read=(name:string)=>readFileSync(new URL(name,import.meta.url),'utf8');
const main=read('../src/main.tsx'),port=read('../src/harbour.tsx'),css=read('../src/harbour.css'),scene=read('../src/scene.ts');
const no=()=>{};
const render=()=>renderToStaticMarkup(React.createElement(Harbour,{profile:initialProfile(),onBattle:no,onNavigate:no}));

test('the live Porto remains linked to the existing battle, without a viewer route',()=>{
 assert.match(main,/harbour&&<Harbour onBattle=\{enterBattle\}/);
 assert.match(main,/const enterBattle=\(\)=>\{reset\(\);view\.current\?\.showBattle\(\);setShipSelected\(false\);setHarbour\(false\)/);
 assert.match(main,/const returnHarbour=\(\)=>\{reset\(\);view\.current\?\.showHarbour\(\);setShipSelected\(false\);setHarbour\(true\)/);
 assert.match(main,/aria-label="Return to harbour"/);
 assert.match(port,/onClick=\{onBattle\}/);
 assert.doesNotMatch(port,/VIEW SHIP IN 3D|TOUCH THE SHIP|THE ROYAL CROWN|DAILY SUPPLY ROUTE|harbour-ship-label|onInspect/);
});
test('exact approved Porto navigation and side actions are built as actual controls',()=>{
 const html=render();
 for(const value of ['PORTO','FROTA','CARTAS','LOJA','RANKING','ARENA','BAÚS','EVENTOS','RECOMPENSAS','MISSÕES','OFERTAS','BATALHA!'])assert.ok(html.includes(value),value);
 assert.equal((html.match(/class="harbour-nav-item/g)||[]).length,5);
 assert.equal((html.match(/class="harbour-flank-button/g)||[]).length,6);
 assert.equal((html.match(/class="harbour-battle-button/g)||[]).length,1);
 assert.match(html,/aria-current="page"/);
 assert.match(html,/Main game navigation/);
 assert.match(html,/aria-label="Batalha: iniciar combate naval jogável"/);
 assert.doesNotMatch(html,/harbour-arena|harbour-chests|harbour-secondary-action|harbour-ship-label/);
});
test('real ship gestures can pass through the noninteractive interface centre',()=>{
 assert.match(css,/\.harbour-screen\{[\s\S]*pointer-events:none/);
 assert.match(css,/\.harbour-flank-button\{[^}]*pointer-events:auto/);
 assert.match(css,/\.harbour-central\{[^}]*pointer-events:none/);
 assert.match(scene,/shipPointerDown=/);
 assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
 assert.match(scene,/this\.controls\.enableRotate=true;this\.controls\.enableZoom=true/);
 assert.match(scene,/this\.controls\.enableRotate=false;this\.controls\.enableZoom=false/);
 assert.match(scene,/if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)/);
});
test('mobile Porto respects safe areas, reduced motion and keyboard focus',()=>{
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/harbour-battle-button:active/);
 assert.match(css,/harbour-screen button:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
test('real 3D coastal town is visible only in the harbour and ship is framed obliquely',()=>{
 assert.match(scene,/buildPortBackdrop\(\)/);
 assert.match(scene,/this\.harbourDock\.visible=true/);
 assert.match(scene,/this\.harbourDock\.visible=false/);
 assert.match(scene,/lighthouse and glowing beacon/);
 assert.match(scene,/portrait\?29\.5:18/);
 assert.match(scene,/this\.ships\.enemy\.root\.visible=false/);
});
test('package and title use a matching release number',()=>{
 const pkg=JSON.parse(read('../package.json'));
 assert.match(pkg.version,/^0\.1\.\d+$/);
 assert.ok(read('../index.html').includes('v'+pkg.version));
});
