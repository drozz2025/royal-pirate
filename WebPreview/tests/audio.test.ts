import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PirateAudio } from '../src/audio.ts';

// A deterministic Web Audio test double. Browser audio policy and audible output
// still require Safari/iPhone device QA; these tests check the event wiring only.
class Param {
  value = 0;
  values: number[] = [];
  setValueAtTime(v: number) { this.value = v; this.values.push(v); }
  exponentialRampToValueAtTime(v: number) { this.value = v; this.values.push(v); }
  setTargetAtTime(v: number) { this.value = v; this.values.push(v); }
}
class Node {
  connect<T>(out: T): T { return out; }
  disconnect() {}
}
class Osc extends Node {
  frequency = new Param();
  type = 'sine';
  constructor(private ctx: AudioMock) { super(); }
  start(time: number) {
    this.ctx.oscillators.push({ time, type: this.type, frequency: this.frequency.values[0] });
  }
  stop() {}
}
class BufferSource extends Node {
  buffer: unknown;
  constructor(private ctx: AudioMock) { super(); }
  start() { this.ctx.noises++; }
  stop() {}
}
class AudioMock {
  static instances: AudioMock[] = [];
  destination = new Node();
  currentTime = 1;
  sampleRate = 8000;
  state = 'suspended';
  oscillators: { time: number; type: string; frequency: number }[] = [];
  noises = 0;
  constructor() { AudioMock.instances.push(this); }
  createDynamicsCompressor() {
    return Object.assign(new Node(), { threshold: new Param(), ratio: new Param() });
  }
  createGain() { return Object.assign(new Node(), { gain: new Param() }); }
  createOscillator() { return new Osc(this); }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() { return new BufferSource(this); }
  createBiquadFilter() {
    return Object.assign(new Node(), { type: 'lowpass', frequency: new Param() });
  }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}
const position = { x: 0, y: 0, z: 0 };
function mockAudio() {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { hidden: false } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: AudioMock });
  AudioMock.instances.length = 0;
}

test('starts muted; events have distinguishable cannon, hit, splash and result sounds', async () => {
  mockAudio();
  const audio = new PirateAudio();
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(AudioMock.instances.length, 0, 'no autoplay or context without user gesture');
  assert.equal(await audio.toggleEffects(), true);
  const ctx = AudioMock.instances[0];
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(ctx.oscillators.length, 1);
  assert.equal(ctx.noises, 1);
  const cannonPitch = ctx.oscillators[0].frequency;
  audio.play({ type: 'hit', side: 'enemy', position, damage: 29 });
  assert.equal(ctx.oscillators.length, 3);
  assert.equal(ctx.noises, 2);
  assert.notEqual(ctx.oscillators[1].frequency, cannonPitch);
  audio.play({ type: 'splash', side: 'enemy', position });
  assert.equal(ctx.oscillators.length, 4);
  assert.equal(ctx.noises, 3);
  audio.play({ type: 'result', side: 'enemy', position });
  assert.equal(ctx.oscillators.length, 8);
  assert.equal(await audio.toggleEffects(), false);
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(ctx.oscillators.length, 8, 'muting effects prevents new sounds');
  audio.dispose();
});

test('music and effects are independently controllable and do not autoplay', async () => {
  mockAudio();
  const audio = new PirateAudio();
  assert.equal(await audio.toggleMusic(), true);
  const ctx = AudioMock.instances[0];
  const before = ctx.oscillators.length;
  assert.ok(before > 0, 'the original musical motif is scheduled');
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(ctx.oscillators.length, before, 'effects are initially muted');
  assert.equal(await audio.toggleEffects(), true);
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(ctx.oscillators.length, before + 1);
  assert.equal(await audio.toggleMusic(), false);
  assert.equal(audio.effectsEnabled, true, 'muting music does not mute effects');
  audio.dispose();
});

test('hidden tabs suspend sound and disposal releases audio context', async () => {
  mockAudio();
  const audio = new PirateAudio();
  await audio.toggleMusic();
  await audio.toggleEffects();
  const ctx = AudioMock.instances[0];
  audio.setHidden(true);
  await Promise.resolve();
  assert.equal(ctx.state, 'suspended');
  const before = ctx.oscillators.length;
  audio.play({ type: 'fire', side: 'player', position });
  assert.equal(ctx.oscillators.length, before);
  audio.setHidden(false);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(ctx.state, 'running');
  audio.dispose();
  await Promise.resolve();
  assert.equal(ctx.state, 'closed');
});

test('AudioContext unavailable: both controls decline activation safely', async () => {
  mockAudio();
  Reflect.deleteProperty(globalThis, 'AudioContext');
  const audio = new PirateAudio();
  assert.equal(await audio.toggleMusic(), false);
  assert.equal(await audio.toggleEffects(), false);
  audio.dispose();
});
