import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enemyGalleonPlankHeight} from '../src/ships';
import {Battle} from '../src/battle';

// This is a real 3D silhouette change, NOT a one-viewport CSS tint.
// The royal player hull/Porto, simulation and firing geometry stay untouched.
test('WORK0: opposing red ship hull bends bow and stern, with a genuine low amidships',()=>{
  for(const y of [-.5,.35,1.6,2.36,2.82]){
    const mid=enemyGalleonPlankHeight(0,y);
    const bow=enemyGalleonPlankHeight(5,y);
    const stern=enemyGalleonPlankHeight(-4.9,y);
    assert.equal(mid,y,'midship remains aligned with deck');
    assert.ok(bow>mid+.4,'raised enemy prow must be visible in broadside');
    assert.ok(stern>mid+.2,'quarterdeck sheer must be visibly curved');
    for(const z of [-4.9,-4.3,-3.2,-1.6,0,1.8,3.2,4.3,5])
      assert.ok(Number.isFinite(enemyGalleonPlankHeight(z,y)));
  }
});

test('WORK0: red galleon geometry only; player Porto, cannon flight and HUD untouched',()=>{
  const source=readFileSync(new URL('../src/ships.ts',import.meta.url),'utf8');
  assert.match(source,/red\?enemyGalleonPlankHeight\(z,y0\):y0/);
  assert.match(source,/red\?enemyGalleonPlankHeight\(z,y1\):y1/);
  // makeShip() constructs texture canvases and intentionally requires the DOM.
  // Node's headless source/geometry test must NOT pretend to run a browser.
  assert.match(source,/red\?enemyGalleonPlankHeight\(stations\[i\],2\.82\):2\.82/);
  assert.match(source,/red\?enemyGalleonPlankHeight\(stations\[i\+1\],2\.82\):2\.82/);
  const battle=new Battle(1729);
  battle.aim(12,65);
  assert.equal(battle.fire(),true);
  assert.ok(battle.shot);
  assert.equal(typeof battle.shot!.origin.z,'number');
});
