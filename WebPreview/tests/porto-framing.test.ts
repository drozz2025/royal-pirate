import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(file:string)=>readFileSync(new URL(file,import.meta.url),'utf8');
const scene=source('../src/scene.ts'),port=source('../src/harbour.tsx'),css=source('../src/harbour.css');
const ships=source('../src/ships.ts');

test('Porto broadside is shown from the left with the lion prow toward the right',()=>{
  assert.match(scene,/this\.camera\.position\.set\(ship\.x-\(portrait\?29\.5:18\)/);
  assert.match(scene,/portrait\?25\.8:17/);
  assert.match(scene,/intersectObject\(this\.ships\.player\.root,true\)/);
  assert.match(scene,/showBattle\(\)\{/);
  assert.match(scene,/this\.harbourDock\.visible=false/);
});

test('actual dockside 3D chest replaces misleading floating overlay',()=>{
  assert.match(scene,/const chest=new T\.Group\(\)/);
  assert.match(scene,/this\.harbourDock\.add\(chest\)/);
  assert.match(scene,/SHIPS\.player\.x-9\.2/);
  assert.doesNotMatch(port,/harbour-dock-chest/);
  assert.doesNotMatch(css,/harbour-dock-chest/);
  assert.match(port,/screen:'chests'/);
});

test('Porto silhouettes now place fortress and beacon on opposite sides of broadside',()=>{
  assert.match(scene,/\[\[-1,-8,-27\],\[1,25,-11\]\]/);
  assert.match(scene,/const castleX=ship\.x-16/);
  assert.match(scene,/const houses:/);
  assert.match(scene,/const palms:/);
  assert.match(ships,/Layered swept mane, pointed feline ears/);
  assert.doesNotMatch(scene,/new T\.TextureLoader\(\)\.load/);
});
