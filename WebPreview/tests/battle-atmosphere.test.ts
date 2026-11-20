import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {createBattleSkyTexture} from '../src/battle-atmosphere';

test('battle-only cloudfront is painted to a real 1024 square sky texture, without remote assets', () => {
  const created: {width: number; height: number}[] = [];
  const stops: string[] = [];
  let draws = 0;
  const paint = new Proxy({}, {
    get(_target, key) {
      if (key === 'createLinearGradient' || key === 'createRadialGradient')
        return () => ({addColorStop: (_position: number, color: string) => stops.push(color)});
      if (key === 'fill' || key === 'fillRect') return () => {draws++};
      return () => {};
    },
    set() {return true;}
  });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {configurable: true, value: {
    createElement(tag: string) {
      assert.equal(tag, 'canvas');
      const canvas = {width: 0, height: 0, getContext: (kind: string) => {
        assert.equal(kind, '2d');
        created.push(canvas);
        return paint;
      }};
      return canvas;
    }
  }});
  try {
    const texture = createBattleSkyTexture();
    assert.ok(texture instanceof T.CanvasTexture);
    assert.equal(texture.colorSpace, T.SRGBColorSpace);
    assert.equal(created[0].width, 1024);
    assert.equal(created[0].height, 1024);
    assert.ok(draws > 100, 'painted volumes, sun shafts and mist must render');
    // Source 02's large open-sky area is bright COBALT, not the previous
    // desaturated grey-cyan; check real canvas gradient stops, not comments.
    assert.ok(stops.includes('#064a9a'), 'deep cobalt at zenith');
    assert.ok(stops.includes('#076fce'), 'royal-blue upper sky');
    assert.ok(stops.includes('#21a0ea'), 'bright sea-blue central sky');
    assert.ok(stops.includes('#7fc7f4'), 'cool, bright near-horizon blue');
    assert.ok(stops.includes('#d2ecf1'), 'clear distant haze');
    assert.ok(!stops.includes('#59b7e5'), 'do not restore the washed-out old middle sky');
    assert.ok(stops.includes('rgba(35,80,116,.40)'), 'deep blue storm shadows are painted');
    assert.ok(stops.includes('rgba(255,255,242,.39)'), 'lit cloud edges are painted');
    texture.dispose();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'document', descriptor);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('cloudfront remains battle-only and does not introduce image fetches or gameplay edits', () => {
  const source = readFileSync(new URL('../src/battle-atmosphere.ts',import.meta.url), 'utf8');
  assert.match(source,/cloudFront\(-75, 326, 420/);
  assert.match(source,/cloudFront\(975, 298, 438/);
  assert.doesNotMatch(source,/fetch\(|https?:\/\//);
  const scene = readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
  assert.match(scene,/this\.scene\.background=this\.battleSky/);
  assert.match(scene,/this\.scene\.background=new T\.Color\('#58baf1'\)/);
});
