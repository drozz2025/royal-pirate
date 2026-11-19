import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createPreviewSternHeraldry } from '../src/ship-heraldry.ts';
import { applyShipModules, highestUnlockedPreviewModules } from '../src/ship-modules.ts';

const classes = ['scout', 'fighter', 'warship'] as const;

test('three independently sculpted original stern crests render as one mobile draw-call object each', () => {
 const geometries = new Set<number>();
 const placements = new Set<string>();
 for (const shipClass of classes) {
  const crest = createPreviewSternHeraldry(shipClass, 'ornaments-simple');
  assert.ok(crest instanceof T.Mesh);
  assert.equal(crest.name, 'shipyard-' + shipClass + '-stern-heraldry');
  assert.equal(crest.userData.previewOnly, true);
  assert.equal(crest.userData.drawCallObjects, 1);
  assert.ok(crest.userData.primitivesMerged >= 5);
  assert.equal(crest.children.length, 0, 'merged parts are not extra draw calls');
  assert.ok(crest.material instanceof T.MeshStandardMaterial);
  assert.equal(crest.geometry.index !== null, true);
  const vertices = crest.geometry.getAttribute('position');
  geometries.add(vertices.count);
  placements.add(crest.position.toArray().join(':'));
  assert.ok(vertices.count < 500, 'small original relief is bounded for mobile GPU memory');
  for (let i = 0; i < vertices.count; i++) {
   assert.ok(Number.isFinite(vertices.getX(i)));
   assert.ok(Number.isFinite(vertices.getY(i)));
   assert.ok(Number.isFinite(vertices.getZ(i)));
  }
  crest.geometry.dispose();
  (crest.material as T.Material).dispose();
 }
 assert.equal(geometries.size, 3, 'a scout rose, frigate swords, flagship crown use different geometry');
 assert.equal(placements.size, 3);
});

test('visual trim tier changes the crest geometry without granting any owned equipment', () => {
 for (const shipClass of classes) {
  const counts = (['ornaments-simple','ornaments-lanterns','ornaments-legendary'] as const)
   .map(ornament => {
    const crest = createPreviewSternHeraldry(shipClass, ornament);
    const count = crest.geometry.getAttribute('position').count;
    assert.equal(crest.userData.ornamentModule, ornament);
    crest.geometry.dispose();
    (crest.material as T.Material).dispose();
    return count;
   });
  assert.ok(counts[0] < counts[1]);
  assert.ok(counts[1] < counts[2]);
 }
 assert.throws(()=>createPreviewSternHeraldry('scout','fake' as 'ornaments-simple'),/Unknown preview ornament module/);
});

test('every ship class and all 20 levels attach exactly one preview crest and retire old GPU resources once', () => {
 const root = new T.Group(), rig = new T.Group(); root.add(rig);
 let oldCrest: T.Mesh | undefined;
 for (const shipClass of classes) for (let level = 1; level <= 20; level++) {
  const selected = highestUnlockedPreviewModules(level);
  const accessories = applyShipModules(root, rig, { shipClass, level, modules: selected });
  const crest = accessories.getObjectByName('shipyard-' + shipClass + '-stern-heraldry');
  assert.ok(crest instanceof T.Mesh);
  assert.equal(crest.userData.ornamentModule, selected.ornaments);
  assert.equal(root.children.filter(item=>item.name==='modular-ship-accessories').length, 1);
  assert.equal(rig.children.length, 0, 'preview is not the damage/combat rig');
  assert.equal(accessories.userData.previewOnly, true);
  assert.ok(accessories.children.length < 125, 'keep existing mobile object budget');
  let geometryReleases = 0, materialReleases = 0;
  crest.geometry.addEventListener('dispose', () => geometryReleases++);
  (crest.material as T.Material).addEventListener('dispose', () => materialReleases++);
  if (oldCrest) {
   assert.equal(oldCrest.userData.geometryReleases?.(), 1);
   assert.equal(oldCrest.userData.materialReleases?.(), 1);
  }
  crest.userData.geometryReleases = () => geometryReleases;
  crest.userData.materialReleases = () => materialReleases;
  oldCrest = crest;
 }
 // A final switch verifies that the last crest is not left on the GPU.
 applyShipModules(root, rig, { shipClass: 'scout', level: 1, modules: {} });
 assert.equal(oldCrest!.userData.geometryReleases(), 1);
 assert.equal(oldCrest!.userData.materialReleases(), 1);
});
