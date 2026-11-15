import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Harbour} from '../src/harbour.tsx';
import {initialProfile} from '../src/progression.ts';

const read=(file:string)=>readFileSync(new URL(file,import.meta.url),'utf8');
const ships=read('../src/ships.ts');
const scene=read('../src/scene.ts');
const css=read('../src/harbour.css');

test('premium black sails and sculpted lion are Three.js geometry, not a static reference image',()=>{
  assert.match(ships,/flag \? '#151923' : red \? '#a7342f' : '#101923'/);
  assert.match(ships,/function addLionFigurehead\(root:T\.Group\)/);
  assert.match(ships,/if\(!red\)addLionFigurehead\(root\)/);
  assert.match(ships,/new T\.ConeGeometry\(1,1,7\)/);
  assert.match(ships,/new T\.CanvasTexture\(canvas\)/);
  assert.doesNotMatch(scene,/new T\.TextureLoader\(\)\.load\([^)]*(?:porto|reference|approved)/);
});

test('live harbour has independent layered 3D scenery, while battle camera is preserved',()=>{
  assert.match(scene,/buildPortBackdrop\(\);this\.buildHarbourDetails\(\)/);
  assert.match(scene,/private buildHarbourDetails\(\)/);
  assert.match(scene,/const castleX=ship\.x-16,castleZ=ship\.z-31/);
  assert.match(scene,/const palms:/);
  assert.match(scene,/const houses:/);
  assert.match(scene,/this\.harbourDock\.visible=false/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
});

test('Arena supplements the artwork with actual local wins rather than a fake league rank',()=>{
  const html=renderToStaticMarkup(React.createElement(Harbour,{
    profile:{...initialProfile(),wins:4},
    onBattle:()=>{},onNavigate:()=>{}
  }));
  assert.match(html,/4 local battle victories/);
  assert.match(html,/4 VITÓRIAS/);
  assert.doesNotMatch(html,/Liga Ouro|2\.450|128\.450|2\.860/);
});

test('mobile artwork leaves a transparent touch surface and five working tabs',()=>{
  assert.match(css,/\.harbour-screen\{[\s\S]*pointer-events:none/);
  assert.match(css,/\.harbour-battle-button\{/);
  assert.match(css,/harbour-local-wins/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/body:has\(\.harbour-screen:not\(\[aria-hidden="true"\]\)\)/);
});
