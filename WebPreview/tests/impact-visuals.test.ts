import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hullImpactPlacement } from '../src/impact-visuals.ts';

test('cannon hits reveal scars on the side of the hull actually struck', () => {
  const center = { x: 10, y: 0, z: -3 };
  const port = hullImpactPlacement({ x: 8.35, y: 1.3, z: -1.1 }, center);
  const starboard = hullImpactPlacement({ x: 11.65, y: 1.3, z: -1.1 }, center);
  assert.equal(port.side, -1);
  assert.equal(starboard.side, 1);
  assert.ok(port.x < -1 && starboard.x > 1);
  assert.equal(port.z, 1.9);
  assert.equal(port.y, 1.3);
});

test('marks follow different z impact stations and never leave the modeled hull', () => {
  const center = { x: -10, y: 0, z: 3 };
  const bow = hullImpactPlacement({ x: -8.35, y: 1.8, z: 8 }, center);
  const stern = hullImpactPlacement({ x: -8.35, y: .2, z: -3 }, center);
  assert.equal(bow.z, 3.4);
  assert.equal(stern.z, -3.4);
  assert.equal(bow.y, 1.72);
  assert.equal(stern.y, .55);
  assert.notEqual(bow.x, stern.x);
  for (const v of Object.values(bow)) assert.ok(Number.isFinite(v));
});
