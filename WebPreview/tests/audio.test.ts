import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINAL_MELODY, ORIGINAL_BASS, TEMPO_BPM, STEP_SECONDS, midiHz, PirateSoundscape } from '../src/audio.ts';

test('original four-bar motif has safe pitches and deterministic timing', () => {
  assert.equal(ORIGINAL_MELODY.length, 32);
  assert.deepEqual(ORIGINAL_BASS, [45, 43, 41, 40]);
  assert.ok(ORIGINAL_MELODY.every(note => note === null || (note >= 48 && note <= 84)));
  assert.ok(TEMPO_BPM > 60 && TEMPO_BPM < 160);
  assert.equal(STEP_SECONDS, 60 / TEMPO_BPM / 2);
  assert.equal(midiHz(69), 440);
  assert.ok(Math.abs(midiHz(57) - 220) < 0.0001);
});

test('no browser AudioContext or playback before opt-in', () => {
  const audio = new PirateSoundscape();
  assert.equal(audio.musicEnabled, false);
  assert.equal(audio.effectsEnabled, false);
  audio.play('fire');
  audio.play('hit');
  audio.onVisibility(true);
  audio.dispose();
  audio.dispose();
});

test('disabled browser audio fails closed without corrupting independent switches', async () => {
  const audio = new PirateSoundscape();
  assert.equal(await audio.toggleMusic(), false);
  assert.equal(await audio.toggleEffects(), false);
  assert.equal(audio.musicEnabled, false);
  assert.equal(audio.effectsEnabled, false);
  audio.dispose();
  assert.equal(await audio.toggleMusic(), false);
});
