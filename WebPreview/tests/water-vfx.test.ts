import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rippleState } from '../src/water-vfx.ts';

test('impact ripples expand while opacity fades to zero', () => {
  const start = rippleState(0, 1.2);
  const middle = rippleState(0.6, 1.2);
  const end = rippleState(1.2, 1.2);
  assert.equal(start.scale, 0.6);
  assert.equal(start.opacity, 0.58);
  assert.equal(start.finished, false);
  assert.ok(middle.scale > start.scale && middle.scale < end.scale);
  assert.ok(middle.opacity > 0 && middle.opacity < start.opacity);
  assert.equal(end.opacity, 0);
  assert.equal(end.finished, true);
  assert.ok(end.surfaceY > start.surfaceY);
});

test('ripples clamp late, early, and invalid frame ages without NaN values', () => {
  assert.deepEqual(rippleState(-20, 1), rippleState(0, 1));
  assert.deepEqual(rippleState(20, 1), rippleState(1, 1));
  for (const state of [
    rippleState(Number.NaN, 0),
    rippleState(Number.POSITIVE_INFINITY, Number.NaN),
    rippleState(0.1, -3),
  ]) {
    for (const value of [state.scale, state.opacity, state.surfaceY]) {
      assert.ok(Number.isFinite(value));
    }
    assert.ok(state.scale >= 0.6 && state.scale <= 4.8);
    assert.ok(state.opacity >= 0 && state.opacity <= 0.58);
  }
});
