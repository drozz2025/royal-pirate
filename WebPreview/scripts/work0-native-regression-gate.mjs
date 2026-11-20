#!/usr/bin/env node
/**
 * WORK0/#104: fail the eight-screen comparison job when the SAME native
 * 384x512 static screen objectively drifts away from the approved source.
 *
 * This never grants artistic approval: WebGL waves and responsive 320/390
 * letterboxing cannot be judged with a single global pixel score.
 * Source: work0-true-basehead-score.py -> true-basehead-report.json.
 */
import {readFileSync} from 'node:fs';

export const NATIVE_WIDTH=384;
export const NATIVE_HEIGHT=512;
export const EXPECTED=['porto','battle','frota','forja','cartas','loja','missoes','ranking'];
export const STATIC=['frota','forja','cartas','loja','missoes','ranking'];
// Sub-0.05 RGB mean differences can be rounding/rendering noise. This
// protects against measurable static regressions, not artistic mismatch.
export const MAX_STATIC_REGRESSION=0.05;

export function inspectNativeVisualReport(report) {
  if(!report||!Array.isArray(report.screens))throw new Error('Missing base-vs-head screenshot report');
  if(report.artistic_approval===true)throw new Error('A pixel run cannot certify human artistic approval');
  const lines=[],failures=[];
  for(const name of EXPECTED) {
    const matches=report.screens.filter(s=>s.screen===name &&
      Array.isArray(s.viewport)&&s.viewport[0]===NATIVE_WIDTH&&s.viewport[1]===NATIVE_HEIGHT);
    if(matches.length!==1){failures.push(name+': missing or duplicate native 384x512 evidence');continue;}
    const s=matches[0];
    if(s.approved===true){failures.push(name+': screenshot alone must not mark human approval');continue;}
    const base=Number(s.source_mae_base),head=Number(s.source_mae_head);
    if(!Number.isFinite(base)||!Number.isFinite(head)||base<0||head<0||base>255||head>255){
      failures.push(name+': invalid native MAE');continue;
    }
    const delta=head-base;
    const label=name.padEnd(8)+' native MAE '+base.toFixed(5)+' -> '+head.toFixed(5)+
      ' (delta '+(delta>=0?'+':'')+delta.toFixed(5)+')';
    lines.push(label+(STATIC.includes(name)?' [static guard]':' [dynamic/manual review]'));
    if(STATIC.includes(name)&&delta>MAX_STATIC_REGRESSION)
      failures.push(name+': static native regression '+delta.toFixed(5)+
        ' exceeds '+MAX_STATIC_REGRESSION.toFixed(2)+' RGB MAE');
  }
  const hasMobile=report.screens.some(s=>Array.isArray(s.viewport)&&
    s.viewport[0]===320&&s.viewport[1]===568) &&
    report.screens.some(s=>Array.isArray(s.viewport)&&
    s.viewport[0]===390&&s.viewport[1]===844);
  if(!hasMobile)failures.push('Missing 320x568 or 390x844 mobile evidence');
  lines.push('Artistic approval: NOT granted by visual automation.');
  lines.push('Porto / Batalha moving WebGL scene: separate human and functional review required.');
  return {ok:failures.length===0,lines,failures};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href) {
  try {
    const path=process.argv[2];
    if(!path)throw new Error('Usage: node scripts/work0-native-regression-gate.mjs <true-basehead-report.json>');
    const outcome=inspectNativeVisualReport(JSON.parse(readFileSync(path,'utf8')));
    for(const line of outcome.lines)console.log(line);
    for(const failure of outcome.failures)console.error('WORK0 VISUAL GATE: '+failure);
    if(!outcome.ok)process.exitCode=1;
  }catch(error){console.error('WORK0 VISUAL GATE: '+(error?.message||String(error)));process.exitCode=1;}
}
