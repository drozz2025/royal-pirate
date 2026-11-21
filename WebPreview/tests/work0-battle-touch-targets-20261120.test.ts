import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/** Regression guard for the actual iPhone-visible angle/power controls.
 * This checks shipped CSS/React contracts, not a simulated screenshot or
 * an untested claim of physical-device Safari compatibility. */
const css=readFileSync(new URL('../src/battle-touch.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');

test('WORK0 #104: BOTH existing battle ranges have 44px Safari-safe hit regions',()=>{
  assert.match(css,/\.in-battle\s+#bearing\s*\{[^}]*height:44px;[^}]*min-height:44px;[^}]*touch-action:none;/s);
  assert.match(css,/\.in-battle\s+#power\s*\{[^}]*height:44px;[^}]*min-height:44px;[^}]*touch-action:none;/s);
  assert.match(css,/\.in-battle\s+\.ocean\s*\{\s*touch-action:none;/);
  assert.match(app,/import '\.\/battle-layout-reset\.css';\s*import '\.\/battle-touch\.css';/);
  assert.doesNotMatch(css,/\.in-harbour|\.harbour-screen|\.harbour-nav/);
});

test('WORK0 #104: bearing/power remain genuine native slider + real deck gesture',()=>{
  assert.match(app,/id="bearing"[^>]*type="range"[^>]*min="-25"[^>]*max="25"/);
  assert.match(app,/id="power"[^>]*type="range"[^>]*min="20"[^>]*max="100"/);
  assert.match(app,/onPointerDownCapture=\{onSceneAimDown\}/);
  assert.match(app,/onPointerMoveCapture=\{onSceneAimMove\}/);
  assert.match(app,/event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(app,/onPointerCancelCapture=\{onSceneAimEnd\}/);
  assert.match(app,/powerFromClientX\(event\.clientX,rect\.left,rect\.width\)/);
  // The controls never mistake vertical finger motion for extra power/elevation.
  assert.match(app,/bearingFromDrag\(start\.startYaw,start\.startX,event\.clientX,event\.currentTarget\.clientWidth\)/);
});

test('WORK0 #104: developer FPS/version overlays never obscure 320–430px combat sliders',()=>{
  assert.match(css,/@media\s*\(max-width:600px\)\s*\{[\s\S]*?\.in-battle\s+\.bottom-note\s*\{\s*display:none;\s*\}/);
  assert.match(css,/body:has\(\.in-battle\)\s*>\s*\.rp-version\s*\{\s*display:none!important;/);
  assert.match(app,/<footer className="bottom-note">/);
  assert.match(app,/onClick=\{\(\)=>setDiagnostics\(!diagnostics\)\}/,
    'developer FPS is retained in Porto, not deleted from the application');
});
