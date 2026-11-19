import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');

test('WORK4 Forge ambient study validates both approved masters and all eight screens',()=>{
 const names=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
   '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
   '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
 for(const filename of names){const data=readFileSync(new URL('../../assets/design-approved/'+filename,import.meta.url));
   assert.equal(data.toString('ascii',0,4),'RIFF',filename);
   assert.equal(data.toString('ascii',8,12),'WEBP',filename);
   assert.ok(data.length>10000,filename);
 }
 assert.match(css,/radial-gradient\(ellipse 140% 122% at 37% 49%/);
 assert.match(css,/linear-gradient\(to bottom,#000 0%,#000 99%,transparent 100%\)/);
 assert.match(css,/contain:paint/);
 assert.match(css,/transform:translateZ\(0\)/);
 assert.match(css,/background-color:#2d2929!important/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Forge 04: real foundry plaque ambient material A/B, ROI, native touch and 4 viewports',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-forge-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:200}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'isolated Forge build: '+(build.stderr||build.stdout).slice(-1200));
  const qa=resolve('porto-qa/work4');mkdirSync(qa,{recursive:true});
  const port=await new Promise<number>((yes,no)=>{
    const s=createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{
      const addr=s.address();if(!addr||typeof addr==='string'){s.close();return no(Error('port'));}
      s.close(()=>yes(addr.port));
    });
  });
  const preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),[
    'preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'
  ],{stdio:'ignore'});
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-ambient-'));
  let browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');preview.kill('SIGTERM');
    await delay(450);rmSync(profile,{recursive:true,force:true,maxRetries:12,retryDelay:250});
  });
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let i=0;i<120;i++){try{live=(await fetch(origin,{signal:AbortSignal.timeout(750)})).ok;if(live)break;}catch{}await delay(120);}
  assert.ok(live,'production preview must be live');
  browser=spawn(chrome!,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
  ],{stdio:'ignore'});
  let target:any=null;
  for(let i=0;i<270;i++){
    if(browser.exitCode!==null)throw Error('Chromium exited early');
    try{const p=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(p>0){const res=await fetch('http://127.0.0.1:'+p+'/json/list',{signal:AbortSignal.timeout(750)});
        if(res.ok)target=(await res.json() as any[]).find(item=>item.type==='page');}
    }catch{}
    if(target)break;await delay(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'Chromium debugger target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('DevTools WS')), {once:true});
  });
  let next=0;const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  ws.addEventListener('message',e=>{
    const m=JSON.parse(String(e.data)),p=pending.get(m.id);if(!p)return;
    pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++next;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout: '+method));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);yes(v);},
      reject:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(expression:string)=>{
    const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Runtime.evaluate '+r.exceptionDetails.text);
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let i=0;i<170;i++){if(await evaluate(expr))return;await delay(130);}
    throw Error('Missing browser UI '+expr);
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
  });
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=forge-ambient-ab'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:3}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const route=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()");
  assert.equal(route,true,'existing functional Frota-to-Forja button must navigate');
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  const geometry=await evaluate("(()=>({cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,liveLevels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,sceneRect:(()=>{const r=document.querySelector('.w4-forge-scene').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()}))()");
  assert.equal(geometry.cannon,1,'one approved source cannon only');
  assert.equal(geometry.liveLevels,3,'three real locally saved levels');
  assert.equal(geometry.costs,3,'three real resource cells');
  assert.equal(geometry.dock,5,'five shared WORK0 dock buttons');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-cannon image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('source forge image not loaded');return true;})()");
  // Genuine approved 04 source cannon/hearth is already registered to pixels.
  // Sweep ONLY the three-dimensional warm/cool material of the LIVE right-hand
  // level plaque. Never edit source cannon/furnace, the actual three costs,
  // button, dock, geometry, progression, or another WORK's files.
  const variants=[
    {label:'release-baseline',background:''},
    {label:'forged-charcoal',background:'linear-gradient(170deg,#262b2ef0 0%,#111e25f8 70%,#051522f9)'},
    {label:'oak-shadow',background:'linear-gradient(170deg,#302a26ef 0%,#1b2225f8 70%,#091824fa)'},
    {label:'indigo-iron',background:'linear-gradient(170deg,#1a313ced 0%,#081d2df8 70%,#04101ffa)'},
    {label:'subtle-ember',background:'radial-gradient(ellipse 80% 90% at 0% 78%,#a95a251c 0%,transparent 85%),linear-gradient(170deg,#172b36ed,#061827f8 70%,#04101ff9)'},
    {label:'bright-ember',background:'radial-gradient(ellipse 75% 90% at 0% 81%,#bd69352d 0%,transparent 80%),linear-gradient(170deg,#172b36ed,#061827f8 70%,#04101ff9)'},
    {label:'ember-side',background:'radial-gradient(ellipse 100% 95% at 0% 85%,#cd834b22 0%,transparent 76%),linear-gradient(170deg,#212b30ed,#091b27f8 70%,#04101ff9)'},
    {label:'warm-wood',background:'linear-gradient(170deg,#40322dee 0%,#18252bf8 64%,#061520fa)'},
    {label:'slate-dim',background:'linear-gradient(170deg,#1b292dec 0%,#0a1c27f8 70%,#030e1cf9)'},
    {label:'amber-top',background:'radial-gradient(ellipse 86% 55% at 0% 0%,#bb754c20 0%,transparent 96%),linear-gradient(170deg,#172b36ed,#061827f8 70%,#04101ff9)'},
    {label:'copper-edge',background:'radial-gradient(ellipse 70% 100% at 3% 60%,#91613824 0%,transparent 75%),linear-gradient(175deg,#262d30ed,#0a1927f8 70%,#04101ff9)'},
    {label:'blue-steel',background:'linear-gradient(170deg,#1c3847ed 0%,#072335f8 70%,#041521f9)'},
    {label:'smoked-bronze',background:'linear-gradient(170deg,#322f2bef 0%,#1a2629f8 65%,#061b29f9)'},
    {label:'hearth-subtle',background:'radial-gradient(ellipse 55% 80% at 0% 75%,#c77f3220 0%,transparent 93%),linear-gradient(170deg,#172b36ed,#061827f8 70%,#04101ff9)'}
  ];
  const shots=[];
  for(const shift of variants){
    const rule=shift.background?'.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{background:'+shift.background+'!important;}':'';
    const exp="(()=>{let style=document.getElementById('work4-forge-plaque-candidate');if(!style){style=document.createElement('style');style.id='work4-forge-plaque-candidate';document.head.append(style)}style.textContent="+JSON.stringify(rule)+";return true})()";
    await evaluate(exp);
    await delay(120);
    shots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const script="(async()=>{"+
    "const load=async(bytes,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+bytes;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const screens=await Promise.all("+JSON.stringify(shots)+".map(s=>load(s,'image/png')));"+
    "if(original.width!==384||original.height!==512||screens.some(im=>im.width!==384||im.height!==512))throw Error('native 384x512 source required');"+
    "const pix=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const a=pix(original),shots=screens.map(pix),boxes={full:[0,0,384,512],plaque:[179,145,373,316],plaqueBorder:[178,145,373,319],cannon:[18,153,175,305],furnace:[129,168,171,294],costs:[16,329,375,430],dock:[0,433,384,512]};"+
    "const mae=(x,y,b)=>{let sum=0,n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
    "const count=(x,y,b)=>{let n=0;for(let yy=b[1];yy<b[3];yy++)for(let xx=b[0];xx<b[2];xx++){const k=(yy*384+xx)*4;if(x[k]!==y[k]||x[k+1]!==y[k+1]||x[k+2]!==y[k+2])n++;}return n;};"+
    "const records=shots.map((shot,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(a,shot,box),changedPixels:count(shots[0],shot,box)};return {index:i,roi};});"+
    "const baseline=records[0];"+
    "const globalWinner=[...records].filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0).sort((x,y)=>(x.roi.full.mae-y.roi.full.mae))[0];"+
    "const valid=records.filter(r=>r.roi.costs.changedPixels===0&&r.roi.dock.changedPixels===0&&['full','plaque','plaqueBorder','cannon','furnace'].every(name=>r.roi[name].mae<=baseline.roi[name].mae));"+
    "valid.sort((x,y)=>(x.roi.full.mae-y.roi.full.mae)||(x.roi.plaque.mae-y.roi.plaque.mae)||(x.roi.furnace.mae-y.roi.furnace.mae));"+
    "const best=valid[0];if(!best)throw Error('baseline must remain an admissible candidate');"+
    "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(original,0,0);g.drawImage(screens[0],384,0);g.drawImage(screens[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(screens[best.index],1152,0);"+
    "return {records,bestIndex:best.index,globalWinnerIndex:globalWinner.index,baseline,geometry:"+JSON.stringify(geometry)+",grid:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(script);
  assert.equal(result.records.length,variants.length);
  assert.ok(Number.isFinite(result.baseline.roi.full.mae));
  // The reference screenshot already contains an accurate cannon/hearth crop.
  // Test visual paint only; reject any alternative that loses source fidelity.
  assert.match(css,/background:linear-gradient\(170deg,#172b36ed,#061827f8 70%,#04101ff9\)/);
  for(const rec of result.records){
    for(const region of ['cannon','furnace','costs','dock'])assert.equal(rec.roi[region].changedPixels,0,region+' must stay pixel-identical to baseline');
  }

  assert.equal(result.bestIndex>=0,true);
  const report={approved:false,screensApproved:0,viewport:'384x512',reference:'04-melhorias-forja.webp',
    frame:'same Chromium 384x512 scene, paused animations; only live Forge plaque pigment changes',geometry,
    candidates:variants.map((paint,i)=>({...result.records[i],paint})),
    globalWinner:variants[result.globalWinnerIndex],safeWinner:variants[result.bestIndex],
    decision:result.bestIndex===0?'Keep released ambient plaque material; alternatives did not improve all protected metrics':'Measured improvement in real Forge plaque; candidate needs WORK0 review and human artistic approval'};
  writeFileSync(join(qa,'work4-forge-ambient-material-sweep-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-best-overlay-forge-ambient-384x512.png'),Buffer.from(result.grid,'base64'));

  // SECOND independent source study: the TRUE existing materials ledger, not
  // the cannon pixel painting or the fake 3-item inventory from reference art.
  // Cost values, labels, and button stay React-owned and immutable.
  await evaluate("(()=>{document.getElementById('work4-forge-plaque-candidate')?.remove();return true})()");
  const materialVariants=[
    {label:'retained-before-release',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#a86e3738 0%,transparent 77%),repeating-linear-gradient(2deg,transparent 0 10px,#c89b5410 10px 11px,transparent 12px 21px),linear-gradient(173deg,#1a1f23 0%,#131c24 52%,#0b161e 100%)'},
    {label:'iron-smoke',paint:'linear-gradient(173deg,#202528 0%,#151c24 52%,#081622 100%)'},
    {label:'source-warmth',paint:'linear-gradient(173deg,#252724 0%,#161e23 52%,#0b161e 100%)'},
    {label:'lighter-iron',paint:'linear-gradient(173deg,#272b2b 0%,#17242a 52%,#0b1722 100%)'},
    {label:'deep-charcoal',paint:'linear-gradient(173deg,#131b21 0%,#0f1820 52%,#080f19 100%)'},
    {label:'solid-ink',paint:'linear-gradient(173deg,#1b2126 0%,#151d23 52%,#0d1721 100%)'},
    {label:'amber-underlay',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#a86e371e 0%,transparent 77%),linear-gradient(173deg,#1a1f23 0%,#131c24 52%,#0b161e 100%)'},
    {label:'brass-flare',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#a86e374b 0%,transparent 77%),linear-gradient(173deg,#1a1f23 0%,#131c24 52%,#0b161e 100%)'},
    {label:'no-wood-grain',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#a86e3738 0%,transparent 77%),linear-gradient(173deg,#1a1f23 0%,#131c24 52%,#0b161e 100%)'},
    {label:'soft-wood-grain',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#a86e3738 0%,transparent 77%),repeating-linear-gradient(2deg,transparent 0 10px,#c89b5409 10px 11px,transparent 12px 21px),linear-gradient(173deg,#1a1f23 0%,#131c24 52%,#0b161e 100%)'},
    {label:'warm-iron-grain',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#b5844833 0%,transparent 77%),repeating-linear-gradient(2deg,transparent 0 10px,#c89b5410 10px 11px,transparent 12px 21px),linear-gradient(173deg,#202124 0%,#171e25 52%,#0c1720 100%)'},
    {label:'cool-steel-grain',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#9e795021 0%,transparent 77%),repeating-linear-gradient(2deg,transparent 0 10px,#c89b540c 10px 11px,transparent 12px 21px),linear-gradient(173deg,#17222b 0%,#101e29 52%,#0b161e 100%)'}
  ];
  const materialShots=[];
  for(const sample of materialVariants){
    const rule=sample.paint?'.w4-forge #w4-forge-panel > .w4-materials:where(*){background:'+sample.paint+'!important;}':'';
    await evaluate("(()=>{let s=document.getElementById('work4-material-candidate');if(!s){s=document.createElement('style');s.id='work4-material-candidate';document.head.append(s)}s.textContent="+JSON.stringify(rule)+";return true})()");
    await delay(90);
    materialShots.push((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string);
  }
  const materialScript="(async()=>{"+
    "const load=async(base64,mime)=>{const im=new Image();im.src='data:'+mime+';base64,'+base64;await im.decode();return im;};"+
    "const original=await load("+JSON.stringify(reference)+",'image/webp');"+
    "const images=await Promise.all("+JSON.stringify(materialShots)+".map(s=>load(s,'image/png')));"+
    "if(original.width!==384||original.height!==512||images.some(im=>im.width!==384||im.height!==512))throw Error('Native visual source size mismatch');"+
    "const pixel=im=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const originalPx=pixel(original),renderPx=images.map(pixel),boxes={full:[0,0,384,512],materials:[15,316,370,429],resource:[18,337,369,379],plaque:[179,145,373,316],cannon:[18,153,175,305],furnace:[129,168,171,294],button:[115,390,270,409],dock:[0,433,384,512]};"+
    "const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let i=0;i<3;i++){sum+=Math.abs(a[k+i]-b[k+i]);n++;}}return sum/n;};"+
    "const changed=(a,b,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++;}return n;};"+
    "const records=renderPx.map((v,i)=>{const roi={};for(const [name,box] of Object.entries(boxes))roi[name]={mae:mae(originalPx,v,box),changedPixels:changed(renderPx[0],v,box)};return {index:i,roi};});"+
    "const prev=records[0];const gates=['plaque','cannon','furnace','button','dock'];"+
    "const safe=records.filter(v=>gates.every(k=>v.roi[k].changedPixels===0)&&['full','materials','resource'].every(k=>v.roi[k].mae<=prev.roi[k].mae));"+
    "safe.sort((a,b)=>a.roi.full.mae-b.roi.full.mae||a.roi.materials.mae-b.roi.materials.mae);"+
    "const winner=safe[0];if(!winner)throw Error('Baseline must always pass its own gate');"+
    "const c=document.createElement('canvas');c.width=1536;c.height=512;const g=c.getContext('2d');g.drawImage(original,0,0);g.drawImage(images[0],384,0);g.drawImage(images[winner.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(images[winner.index],1152,0);"+
    "return {records,winnerIndex:winner.index,grid:c.toDataURL('image/png').split(',')[1]};})()";
  const materialResult=await evaluate(materialScript);
  assert.equal(materialResult.records.length,materialVariants.length);
  for(const r of materialResult.records)for(const key of ['plaque','cannon','furnace','button','dock'])
    assert.equal(r.roi[key].changedPixels,0,'materials-only treatment must preserve inner '+key);
  // Accepted production material paint is the previously measured safest candidate
  // relative to a forced EXACT copy of pre-change HEAD paint in the same frame.
  const accepted=materialResult.records[6],oldBoard=materialResult.records[0];
  assert.equal(materialVariants[6].label,'amber-underlay');
  assert.match(css,/#a86e371e 0%,transparent 77%/,'accepted paint is in WORK4 CSS');
  for(const region of ['full','materials','resource']){
    assert.ok(accepted.roi[region].mae<oldBoard.roi[region].mae,
      'accepted material finish must improve '+region+' source ROI');
  }
  for(const region of ['plaque','cannon','furnace','button','dock'])
    assert.equal(accepted.roi[region].changedPixels,0,region+' unchanged');
  assert.equal(materialResult.winnerIndex,6,'only measured winner should be in production');
  const materialReport={approved:false,screensApproved:0,reference:'04-melhorias-forja.webp',
    viewport:'384x512',comparison:'ORIGINAL|BEFORE|RENDER|OVERLAY, one paused frame and real local costs',
    candidates:materialVariants.map((paint,i)=>({...materialResult.records[i],paint})),
    safeWinner:materialVariants[materialResult.winnerIndex],decision:materialResult.winnerIndex===0?
      'Released material-board paint remains closer to source':'Alternative passes global/material/resource MAE gates; requires artistic approval before WORK0 integration'};
  writeFileSync(join(qa,'work4-forge-real-material-board-384x512.json'),JSON.stringify(materialReport,null,2)+'\n');
  writeFileSync(join(qa,'original-before-best-overlay-forge-materials-384x512.png'),Buffer.from(materialResult.grid,'base64'));
  console.log('WORK4_FORGE_MATERIALS_SWEEP '+JSON.stringify({winner:materialReport.safeWinner,baseline:materialReport.candidates[0],best:materialReport.candidates[materialResult.winnerIndex],scores:materialReport.candidates.map(v=>({paint:v.paint.label,full:v.roi.full.mae,materials:v.roi.materials.mae,resource:v.roi.resource.mae}))}));
  await evaluate("(()=>{document.getElementById('work4-material-candidate')?.remove();return true})()");

  // Responsive and touch regressions in exactly one native Chromium process.
  // Remove the transient A/B override so only the released code runs.
  await evaluate("(()=>{document.getElementById('work4-forge-plaque-candidate')?.remove();return true})()");
  const viewportReports=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await delay(150);
    const state=await evaluate("(()=>{const d=document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item');const tabs=[...document.querySelectorAll('.w4-forge-tabs button')];const c=document.querySelectorAll('.w4-forge .w4-resource-grid>div');return {dock:d.length,tabs:tabs.length,costs:c.length,hasCannon:document.querySelectorAll('.w4-reference-cannon').length,scrollWidth:document.documentElement.scrollWidth,innerWidth,innerHeight}})()");
    assert.equal(state.dock,5,'5 dock entries at '+width+'x'+height);
    assert.equal(state.tabs,4,'Forge tabs present at '+width+'x'+height);
    assert.equal(state.costs,3,'3 real costs at '+width+'x'+height);
    assert.ok(state.scrollWidth<=width+2,'no unintended horizontal scroll at '+width+'x'+height);
    const data=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'forge-responsive-'+width+'x'+height+'.png'),Buffer.from(data,'base64'));
    viewportReports.push({width,height,...state});
  }
  // Actual touch: the existing NAVIO tab and back to CANHÕES, never fabricate state.
  const center=await evaluate("(()=>{const e=document.querySelector('#w4-forge-tab-hull');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x,y:center.y,id:27}]});
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("document.querySelector('#w4-forge-tab-hull')?.getAttribute('aria-selected')==='true'");
  const cannonCenter=await evaluate("(()=>{const e=document.querySelector('#w4-forge-tab-cannons');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cannonCenter.x,y:cannonCenter.y,id:28}]});
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("document.querySelector('#w4-forge-tab-cannons')?.getAttribute('aria-selected')==='true'");
  writeFileSync(join(qa,'work4-forge-ambient-responsive-touch.json'),JSON.stringify({approved:false,screensApproved:0,viewportReports,touch:'hull-to-cannons PASS'},null,2)+'\n');
  console.log('WORK4_FORGE_RESPONSIVE_TOUCH '+JSON.stringify(viewportReports));
  console.log('WORK4_FORGE_AMBIENT_SWEEP '+JSON.stringify({globalWinner:report.globalWinner,safeWinner:report.safeWinner,decision:report.decision,baseline:report.candidates[0],winner:report.candidates[result.bestIndex],geometry,
    roiSummary:report.candidates.map(x=>({paint:x.paint,full:x.roi.full.mae,plaque:x.roi.plaque.mae,plaqueBorder:x.roi.plaqueBorder.mae,cannon:x.roi.cannon.mae,furnace:x.roi.furnace.mae}))}));
});
