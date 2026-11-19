import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { makeShip } from '../src/ships';

function fakeCanvas<TValue>(run:()=>TValue):TValue {
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');
  const paint=new Proxy({}, {get:()=>()=>{},set:()=>true});
  Object.defineProperty(globalThis,'document',{configurable:true,
    value:{createElement:()=>({width:512,height:512,getContext:()=>paint})}});
  try {return run();}
  finally {
    if(original)Object.defineProperty(globalThis,'document',original);
    else Reflect.deleteProperty(globalThis,'document');
  }
}

test('enemy crimson galleon is physically rendered and Porto retains its original timber',()=>{
  fakeCanvas(()=>{
    const enemy=makeShip(true),royal=makeShip(false);
    function colors(ship:ReturnType<typeof makeShip>) {
      const all:string[]=[];
      ship.root.traverse(o=>{
        if(!(o instanceof T.Mesh))return;
        const mats=Array.isArray(o.material)?o.material:[o.material];
        for(const mat of mats)if(mat instanceof T.MeshStandardMaterial)all.push(mat.color.getHexString());
      });
      return all;
    }
    const redColors=colors(enemy),royalColors=colors(royal);
    assert.ok(redColors.includes('83352f'),'enemy red hull has genuine render material');
    assert.ok(redColors.includes('38272c'),'enemy's dark plank shading is present');
    assert.ok(redColors.includes('b44d44'),'enemy topsails are separate illuminated geometry');
    assert.ok(!royalColors.includes('83352f'),'approved Porto hull unchanged');
    assert.ok(!royalColors.includes('38272c'),'approved Porto planks unchanged');
    assert.equal(enemy.guns.length,6,'no change to live cannon positions');
    assert.equal(enemy.sails.length,5,'no additional functional sail targets');
    assert.equal(royal.sails.length,6,'existing royal sail model untouched');
  });
});

test('enemy lower canvas has sculpted triangular shoulder and real wind bellows',()=>{
  fakeCanvas(()=>{
    const enemy=makeShip(true);
    const sail=enemy.sails[1];
    assert.ok(sail.geometry instanceof T.PlaneGeometry);
    const p=sail.geometry.getAttribute('position') as T.BufferAttribute;
    const rows=new Map<number,number[]>();
    for(let i=0;i<p.count;i++){
      const y=+p.getY(i).toFixed(3);
      const xs=rows.get(y)??[];
      xs.push(p.getX(i));
      rows.set(y,xs);
    }
    const widths=Array.from(rows.entries()).sort((a,b)=>a[0]-b[0]).map(([,xs])=>Math.max(...xs)-Math.min(...xs));
    const mid=widths[Math.floor(widths.length/2)];
    assert.ok(mid>widths[0]*1.27,'curved hem clearly narrows at foot');
    assert.ok(mid>widths[widths.length-1]*1.22,'upper shoulder clearly narrows');
    assert.ok(Array.from({length:p.count},(_,i)=>p.getZ(i)).some(z=>z>.90),
      'actual 3D convex sail, not a flat overlay');
  });
});
