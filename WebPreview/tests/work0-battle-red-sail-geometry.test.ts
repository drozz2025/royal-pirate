import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeShip } from '../src/ships.ts';

// WORK0/#104: real Three.js vertex geometry, not screenshot/DOM imitation.
// This is a candidate until Chromium reference/overlay, touch and FPS QA pass.
test('enemy red three-mast silhouette uses curved, tapered sails without changing guns', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const context = new Proxy({}, { get: () => () => {} });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ width: 512, height: 512, getContext: () => context }) },
  });
  try {
    const red = makeShip(true);
    assert.equal(red.guns.length, 6, 'original six real broadside cannons');
    assert.equal(red.flags.length, 2, 'original animated flags');
    assert.equal(red.sails.length, 5, 'two mains, two topsails, one foremast sail');
    const [upper, main] = red.sails;
    const fore = red.sails[4];
    const positions = (mesh: T.Mesh) => mesh.geometry.getAttribute('position') as T.BufferAttribute;
    function widthAt(mesh: T.Mesh, y: number) {
      const points = positions(mesh);
      let left = Infinity, right = -Infinity;
      for (let i = 0; i < points.count; i++) {
        if (Math.abs(points.getY(i) - y) > .002) continue;
        left = Math.min(left, points.getX(i));
        right = Math.max(right, points.getX(i));
      }
      assert.ok(Number.isFinite(left) && Number.isFinite(right), 'matching mesh row exists');
      return right - left;
    }
    function depth(mesh: T.Mesh) {
      const p = positions(mesh);
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < p.count; i++) {
        min = Math.min(min, p.getZ(i));
        max = Math.max(max, p.getZ(i));
      }
      return max - min;
    }
    assert.ok(widthAt(main, -1.8) < widthAt(main, 1.8 / 7) * .78,
      'red mainsail foot must taper substantially rather than form a rectangle');
    assert.ok(widthAt(upper, -.775) < widthAt(upper, .155) * .78,
      'red topsail foot must taper, too');
    assert.ok(depth(main) > 1.0, 'the enemy main canvas has substantial real 3D belly');
    assert.ok(depth(upper) > .10 && depth(upper) < .22,
      'red topsail curves as cloth while respecting compact topmast depth');
    assert.ok(depth(fore) > .65, 'the third forward sail is genuinely billowed');
    const bounds = new T.Box3().setFromObject(red.root);
    assert.ok(bounds.max.y > 8 && bounds.max.z > 6,
      'mast silhouette and bowsprit remain inside their original world-space scale');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
