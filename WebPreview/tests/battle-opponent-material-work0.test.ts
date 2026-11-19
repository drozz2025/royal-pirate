import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeShip} from '../src/ships';

/** Battle 02: exercise real enemy ship construction and canvas texture path.
 * Visual approval is separate: CI's work6-visual-capture.mjs must still render
 * reference | before | after | overlay at 320,384,390,430 pixel viewports. */
test('WORK0 battle enemy remains genuine rigged 3D with deterministic layered burgundy canvas',()=>{
  const existingDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const dyeStops:Array<{offset:number;color:string}>=[];
  let ellipseDraws=0, canvasPaints=0, textureCreations=0;
  const noop=()=>{};
  const context={
    fillRect:()=>{canvasPaints++},strokeRect:noop,beginPath:noop,moveTo:noop,
    lineTo:noop,stroke:noop,fill:noop,save:noop,restore:noop,translate:noop,
    quadraticCurveTo:noop,closePath:noop,arc:noop,ellipse:()=>{ellipseDraws++},
    createLinearGradient:()=>({
      addColorStop:(offset:number,color:string)=>{dyeStops.push({offset,color});}
    }),
  };
  const fakeCanvas={width:512,height:512,getContext:()=>context};
  Object.defineProperty(globalThis,'document',{
    configurable:true,writable:true,
    value:{createElement:(tag:string)=>{
      assert.equal(tag,'canvas');
      textureCreations++;
      return fakeCanvas;
    }}
  });
  try {
    const ship=makeShip(true);
    assert.ok(ship.root instanceof T.Group,'opponent remains true Three.js geometry');
    assert.ok(ship.rig instanceof T.Group,'opponent cloth remains on live ship rig');
    assert.equal(textureCreations,2,'main sails and flag each reuse their canvas texture');
    assert.ok(dyeStops.length>=5,'hand-painted fabric has multiple genuine dye stops');
    assert.ok(dyeStops.some(stop=>stop.color==='#482239'));
    assert.ok(dyeStops.some(stop=>stop.color==='#aa4c48'));
    assert.ok(dyeStops.some(stop=>stop.color==='#3e1c30'));
    assert.ok(canvasPaints>=2 && ellipseDraws>=2,'the original emblem is still painted onto canvas');
    assert.ok(ship.sails.length>=5,'original multiple curved cloth surfaces remain');
    const emblems=ship.sails.filter(s=>s.material instanceof T.MeshStandardMaterial
      && s.material.map instanceof T.CanvasTexture);
    assert.ok(emblems.length>=3,'existing live skull textures still map to curved mesh');
    assert.ok(ship.rig.getObjectByName('enemy-billowed-foresail') instanceof T.Mesh,
      'real red foremast remains present');
    assert.ok(ship.guns.length>0,'real gunport origins must not change');
  } finally {
    if(existingDocument)Object.defineProperty(globalThis,'document',existingDocument);
    else Reflect.deleteProperty(globalThis,'document');
  }
});
