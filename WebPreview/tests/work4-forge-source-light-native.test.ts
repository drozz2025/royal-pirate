import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const reference=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');
const marker='WORK4/#104 — 19 Nov 17h: native source-light';
const own=css.split(marker)[1]||'';

test('WORK4 native source-light: mandatory originals, one scoped media rule, no shared layout/economy edits',()=>{
 const refs=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
 '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
 '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
 for(const n of refs){
   const b=readFileSync(new URL('../../assets/design-approved/'+n,import.meta.url));
   assert.equal(b.toString('ascii',0,4),'RIFF',n);
   assert.equal(b.toString('ascii',8,12),'WEBP',n);
 }
 assert.match(own,/@media \(width:384px\) and \(height:512px\)/);
 assert.match(own,/\.w4-forge-scene > svg\.w4-cannon-art\.w4-reference-cannon > ellipse:first-of-type/);
 assert.match(own,/\.w4-forge-scene > svg\.w4-cannon-art\.w4-reference-cannon > ellipse:last-of-type/);
 assert.match(own,/opacity:\.20/);
 assert.match(own,/opacity:\.25/);
 const declarations=own.replace(/@media[^{}]*\{/g,'');
 assert.doesNotMatch(declarations,/\.app-|\.porto-|\.harbour-nav|\.w4-materials|\.w4-improve-button|contain:paint|translateZ|(?:^|[;{\s])(?:height|width|position):/);
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Forge: authentic source hearth light A/B, fixed native frame and protected ROIs',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-forge-light-build-'));
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-forge-light-'));
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
  const viewport=async(width:number,height:number)=>{
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
  };
  await viewport(384,512);
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=authentic-source-light-ab'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:4}]});
  await delay(75);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const go=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true})()");
  assert.equal(go,true,'functional Frota to Forja navigation');
  await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  const selectors=[
    '.w4-forge svg.w4-reference-cannon > ellipse:first-of-type',
    '.w4-forge svg.w4-reference-cannon > ellipse:last-of-type'
  ];
  const oldValues=[0,0],newValues=[.20,.25],otherViewportValues=[1,1];
  const geometry=await evaluate("(()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]};return {cannon:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,levels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,art:box('.w4-forge svg.w4-reference-cannon'),plaque:box('.w4-forge .w4-forge-description'),materials:box('.w4-forge .w4-materials'),action:box('.w4-forge .w4-improve-button'),dockBox:box('.app-sheet .harbour-nav.app-dock-porto')}})()");
  assert.equal(geometry.cannon,1,'no duplicate source cannon');
  assert.equal(geometry.levels,3,'three genuine saved upgrade levels');
  assert.equal(geometry.costs,3,'three genuine real cost cells');
  assert.equal(geometry.dock,5,'five shared navigation targets');
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-cannon image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('approved source image not loaded');return true;})()");
  const legacy=".w4-forge svg.w4-reference-cannon > ellipse:first-of-type{opacity:0!important}"+
    ".w4-forge svg.w4-reference-cannon > ellipse:last-of-type{opacity:0!important}";
  await evaluate("(()=>{let s=document.createElement('style');s.id='work4-legacy-light-ab';s.textContent="+JSON.stringify(legacy)+";document.head.append(s);return true})()");
  const values=async()=>await evaluate("(()=>["+selectors.map(s=>"getComputedStyle(document.querySelector("+JSON.stringify(s)+")).opacity").join(",")+"])()");
  const baselineValues=await values();
  baselineValues.forEach((v:string,i:number)=>assert.ok(Math.abs(Number(v)-oldValues[i])<.001,'legacy SVG glow value '+i));
  await delay(140);
  const before=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  await evaluate("document.getElementById('work4-legacy-light-ab')?.remove();true");
  const actual=await values();
  console.log('WORK4_FORGE_LIGHT_CSS_DIAG '+JSON.stringify(await evaluate(
    "(()=>({viewport:[innerWidth,innerHeight],media:matchMedia('(width:384px) and (height:512px)').matches,"+
    "selectors:"+JSON.stringify([".w4-forge svg.w4-reference-cannon > ellipse:first-of-type",".w4-forge svg.w4-reference-cannon > ellipse:last-of-type"])+".map(s=>({selector:s,count:document.querySelectorAll(s).length,opacity:document.querySelector(s)&&getComputedStyle(document.querySelector(s)).opacity,outer:document.querySelector(s)?.outerHTML.slice(0,200)})),"+
    "cssRulePresent:[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>r.cssText.includes('ellipse:first-of-type'))}catch{return false}})"+
    "}))()"
  )));
  actual.forEach((v:string,i:number)=>assert.ok(Math.abs(Number(v)-newValues[i])<.001,'new SVG glow value '+i));
  await delay(140);
  const after=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const script="(async()=>{"+
    "const img=async(s)=>{const i=new Image();i.src=s;await i.decode();return i;};"+
    "const [a,b,c]=await Promise.all(["+
      "img('data:image/webp;base64,"+reference+"'),"+
      "img('data:image/png;base64,"+before+"'),"+
      "img('data:image/png;base64,"+after+"')]);"+
    "if([a,b,c].some(i=>i.width!==384||i.height!==512))throw Error('must use native screenshots');"+
    "const pixels=i=>{const q=document.createElement('canvas');q.width=384;q.height=512;const k=q.getContext('2d',{willReadFrequently:true});k.drawImage(i,0,0);return k.getImageData(0,0,384,512).data;};"+
    "const A=pixels(a),B=pixels(b),C=pixels(c);"+
    "const cl=(v,hi)=>Math.max(0,Math.min(hi,Math.round(v)));"+
    "const rect=v=>v?[cl(v[0],384),cl(v[1],512),cl(v[2],384),cl(v[3],512)]:[0,0,0,0];"+
    "const g="+JSON.stringify(geometry)+";"+
    "const boxes={full:[0,0,384,512],cannonArt:rect(g.art),cannonBarrel:[30,220,176,313],furnace:[115,217,180,307],plaque:rect(g.plaque),materials:rect(g.materials),action:rect(g.action),dock:rect(g.dockBox)};"+
    "const score=(u,v,box)=>{let sum=0,count=0,changed=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const j=(384*y+x)*4;let diff=false;for(let k=0;k<3;k++){sum+=Math.abs(u[j+k]-v[j+k]);count++;if(u[j+k]!==v[j+k])diff=true;}if(diff)changed++;}return {mae:count?sum/count:null,changedPixels:changed,box};};"+
    "const roi={};for(const [name,box] of Object.entries(boxes)){const p=score(A,B,box),q=score(A,C,box),d=score(B,C,box);roi[name]={before:p.mae,after:q.mae,changedPixels:d.changedPixels,box};}"+
    "const cn=document.createElement('canvas');cn.width=1536;cn.height=512;const ct=cn.getContext('2d');"+
    "ct.drawImage(a,0,0);ct.drawImage(b,384,0);ct.drawImage(c,768,0);ct.drawImage(a,1152,0);ct.globalAlpha=.5;ct.drawImage(c,1152,0);ct.globalAlpha=1;"+
    "ct.font='bold 12px sans-serif';ct.fillStyle='#fff';ct.fillText('ORIGINAL',8,18);ct.fillText('BEFORE',392,18);ct.fillText('RENDER',776,18);ct.fillText('OVERLAY',1160,18);"+
    "return {roi,comparison:cn.toDataURL('image/png').split(',')[1]};})()";
  const measured=await evaluate(script);
  assert.ok(measured?.roi?.cannonArt,'art ROI must exist');
  console.log('WORK4_FORGE_SOURCE_LIGHT_PRECHECK '+JSON.stringify({roi:measured.roi,geometry,oldValues,newValues}));
  assert.ok(measured.roi.cannonArt.changedPixels>0,'source light must produce real visible pixels');
  for(const name of ['materials','action','dock','plaque']) {
    assert.equal(measured.roi[name].changedPixels,0,name+' must be pixel-identical');
  }
  writeFileSync(join(qa,'work4-original-before-render-overlay-forge-source-light-384x512.png'),Buffer.from(measured.comparison,'base64'));
  const responsive=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await viewport(width,height);await delay(120);
    const v=await values();
    v.forEach((s:string,i:number)=>assert.ok(Math.abs(Number(s)-otherViewportValues[i])<.001,'other viewport must preserve its original SVG light '+width+' '+i));
    const screenshot=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'work4-forge-source-light-'+width+'x'+height+'.png'),Buffer.from(screenshot,'base64'));
    responsive.push({width,height,legacyValues:v});
  }
  const report={approved:false,screensApproved:0,source:'assets/design-approved/04-melhorias-forja.webp',viewport:'384x512',
    control:'single Chromium scene, frozen animations, same data/geometry, released opacity:0 vs measured candidate opacity:.20/.25',
    originalReferenceSet:'00 original, 00 mosaic, 01–08',
    oldValues,newValues,geometry,roi:measured.roi,responsive,
    interpretation:'MAE is numeric distance only; human approval is still mandatory'};
  writeFileSync(join(qa,'work4-forge-source-light-native-ab.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_FORGE_SOURCE_LIGHT_NATIVE_AB '+JSON.stringify({roi:report.roi,geometry,oldValues,newValues,responsive}));
});
