import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeShip } from '../src/ships.ts';

/** Verify actual Three.js geometry instead of checking a screenshot or a static HTML mockup. */
test('original royal ship contains a real 3D hull, cannons, sails and gilded figurehead', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const ctx = new Proxy({}, { get: () => () => {} });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({ width: 512, height: 512, getContext: () => ctx }) },
  });
  try {
    const ship = makeShip(false);
    assert.equal(ship.guns.length, 6);
    assert.equal(ship.sails.length, 4, 'two curved sails per mast make the royal galleon visibly taller');
    const upperSails = ship.sails.filter(s => s.geometry instanceof T.PlaneGeometry && s.geometry.parameters.height === 1.55);
    assert.equal(upperSails.length, 2, 'topsails are real 3D cloth meshes, not a reference screenshot');
    assert.equal(ship.flags.length, 2);
    const bounds = new T.Box3().setFromObject(ship.root);
    assert.ok(bounds.max.z > 6, 'bowsprit extends ahead of the hull');
    assert.ok(bounds.max.y > 8, 'masts rise above the deck');
    const goldMeshes: T.Mesh[] = [];
    let meshCount = 0;
    ship.root.traverse((item) => {
      if (!(item instanceof T.Mesh)) return;
      meshCount++;
      if (item.material instanceof T.MeshStandardMaterial &&
          item.material.color.getHexString() === 'f5bd50') goldMeshes.push(item);
    });
    assert.ok(meshCount < 70, 'geometry should stay batched for mobile preview');
    assert.ok(goldMeshes.length > 0);
    const gildedProwVertices = goldMeshes.reduce((count, mesh) => {
      const vertices = mesh.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        if (vertices.getZ(i) > 5.95 && vertices.getY(i) > 4.7) count++;
      }
      return count;
    }, 0);
    assert.ok(gildedProwVertices >= 6, 'original gold figurehead is part of the actual 3D model');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
