import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const gate=fileURLToPath(new URL('../scripts/work0-native-regression-gate.mjs',import.meta.url));
const names=['porto','battle','frota','forja','cartas','loja','missoes','ranking'];
function report() {
  return {artistic_approval:false,screens:[
    ...([[384,512],[320,568],[390,844]] as [number,number][]).flatMap(viewport=>
      names.map(screen=>({screen,viewport,source_mae_base:60,source_mae_head:59.98,approved:false})))
  ]};
}
function run(r:unknown) {
  const dir=mkdtempSync(join(tmpdir(),'rp-native-gate-'));
  try {
    const file=join(dir,'report.json');
    writeFileSync(file,JSON.stringify(r));
    return spawnSync(process.execPath,[gate,file],{encoding:'utf8'});
  }finally {rmSync(dir,{recursive:true,force:true});}
}

test('WORK0: eight native screenshots and small static numerical noise pass, without art approval',()=>{
  const p=run(report());
  assert.equal(p.status,0,p.stderr);
  assert.match(p.stdout,/Artistic approval: NOT granted/);
  assert.match(p.stdout,/Porto \/ Batalha moving WebGL/);
});

test('WORK0: static image regression fails even when base/head workflow captures succeeded',()=>{
  const r=report();r.screens.find(s=>s.screen==='cartas'&&s.viewport[0]===384)!.source_mae_head=60.50;
  const p=run(r);
  assert.equal(p.status,1);
  assert.match(p.stderr,/cartas: static native regression/);
});

test('WORK0: missing native image or 320/390 mobile evidence fails closed',()=>{
  const r=report();r.screens=r.screens.filter(s=>!(s.screen==='forja'&&s.viewport[0]===384));
  assert.equal(run(r).status,1);
  const mobile=report();mobile.screens=mobile.screens.filter(s=>s.viewport[0]!==320);
  assert.match(run(mobile).stderr,/missing or duplicate 320x568 evidence/);
});

test('WORK0: animations do not create an automatic Batalha pixel approval',()=>{
  const r=report();r.screens.find(s=>s.screen==='battle'&&s.viewport[0]===384)!.source_mae_head=99;
  const p=run(r);
  assert.equal(p.status,0,p.stderr);
  assert.match(p.stdout,/dynamic\/manual review/);
});

test('WORK0: no single Batalha phone screenshot can mask missing panels',()=>{
  const r=report();
  r.screens=r.screens.filter(s=>!(s.screen==='ranking'&&s.viewport[0]===390));
  const p=run(r);
  assert.equal(p.status,1);
  assert.match(p.stderr,/ranking: missing or duplicate 390x844 evidence/);
});

test('WORK0: mobile screenshots cannot be duplicated or self-approved',()=>{
  const duplicate=report();
  duplicate.screens.push({...duplicate.screens.find(s=>s.screen==='battle'&&s.viewport[0]===320)!});
  assert.match(run(duplicate).stderr,/battle: missing or duplicate 320x568 evidence/);
  const approved=report();
  approved.screens.find(s=>s.screen==='frota'&&s.viewport[0]===390)!.approved=true;
  assert.match(run(approved).stderr,/frota: 390x844 screenshot alone must not mark human approval/);
});

test('WORK0: missing or invalid phone MAE is a failed capture, not coverage',()=>{
  const r=report();
  r.screens.find(s=>s.screen==='loja'&&s.viewport[0]===320)!.source_mae_head=Number.NaN;
  const p=run(r);
  assert.equal(p.status,1);
  assert.match(p.stderr,/loja: invalid 320x568 MAE/);
});
