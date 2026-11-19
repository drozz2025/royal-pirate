import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const source=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > svg.w4-reference-sea';
test('WORK4 approved master, mosaic and all 8 references are present, source sea 213:31 and WORK0 compositor protected',()=>{
  for(const name of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){
    const b=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  }
  assert.match(css,/w4-reference-sea/);assert.match(css,/aspect-ratio:213 \/ 31/);
  assert.match(css,/contain:paint/);assert.match(css,/transform:translateZ\(0\)/);
});
const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet native 12-way ocean-water edge same-frame A/B, 320/390/430 checks',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  // Independent Vite output avoids races with other Chromium QA suites.
  const buildDir=mkdtempSync(join(tmpdir(),'rp-work4-ocean-build-'));
  t.after(()=>rmSync(buildDir,{recursive:true,force:true,maxRetries:10,retryDelay:250}));
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',buildDir],{
    cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000
  });
  assert.equal(build.status,0,'build must pass before native comparison: '+(build.stderr||build.stdout).slice(-1200));
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
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-ocean-edge-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=ocean-edge-ab'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  const nav=await evaluate("(()=>{const e=document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)');const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:nav.x,y:nav.y,id:3}]});
  await delay(60);
  await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const geometry=await evaluate("(()=>{const stage=document.querySelector('.w4-harbour-stage');const label=document.querySelector('.w4-stage-label');const r=stage.getBoundingClientRect(),p=label.getBoundingClientRect();return {stage:{x:r.x,y:r.y,width:r.width,height:r.height},label:{x:p.x,y:p.y,width:p.width,height:p.height},ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,realLevels:document.querySelectorAll('.w4-fleet .w4-stage-stats > span').length}})()");
  assert.equal(geometry.ship,1,'exactly one Royal Crown source painting');
  assert.equal(geometry.sea,1,'exactly one approved source sea');
  assert.equal(geometry.dock,5,'five dock buttons still present and touchable');
  assert.equal(geometry.realLevels,3,'existing real levels preserved');

  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const href=document.querySelector('svg.w4-reference-sea image')?.getAttribute('href');if(!href||!(await fetch(href)).ok)throw Error('reference sea failed');return true})()");
  const variants=[0,1,2,3,4,5,7,9,12,16,20,26];
  const capture=async()=>String((await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data);
  const shots=[await capture()];
  for(const n of variants.slice(1)){
    const mask='linear-gradient(to bottom,transparent 0%,#000 8%,#000 100%),linear-gradient(to right,#000 0%,#000 '+(100-n)+'%,transparent 100%)';
    const rule=selector+'{-webkit-mask-image:'+mask+'!important;mask-image:'+mask+'!important;-webkit-mask-composite:source-in;mask-composite:intersect;}';
    await evaluate("(()=>{let e=document.getElementById('work4-ocean-edge-candidate');if(!e){e=document.createElement('style');e.id='work4-ocean-edge-candidate';document.head.append(e)}e.textContent="+JSON.stringify(rule)+";return true})()");
    await delay(90);
    shots.push(await capture());
  }
  const script="(async()=>{"+
    "const load=async(uri)=>{const i=new Image();i.src=uri;await i.decode();return i;};"+
    "const original=await load('data:image/webp;base64,"+source+"');"+
    "const imgs=await Promise.all("+JSON.stringify(shots)+".map(x=>load('data:image/png;base64,'+x)));"+
    "if(original.width!==384||original.height!==512||imgs.some(x=>x.width!==384||x.height!==512))throw Error('not native 384');"+
    "const pix=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
    "const ref=pix(original),p=imgs.map(pix),boxes={full:[0,0,384,512],sea:[24,298,237,341],rightEdge:[207,296,242,342],leftEdge:[18,296,54,342],ship:[65,205,175,290],levels:[239,165,366,298],dock:[0,433,384,512]};"+
    "const mae=(a,b,q)=>{let s=0,n=0;for(let y=q[1];y<q[3];y++)for(let x=q[0];x<q[2];x++){const k=(y*384+x)*4;for(let i=0;i<3;i++){s+=Math.abs(a[k+i]-b[k+i]);n++;}}return s/n;};"+
    "const changed=(a,b,q)=>{let n=0;for(let y=q[1];y<q[3];y++)for(let x=q[0];x<q[2];x++){const k=(y*384+x)*4;if(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2])n++;}return n;};"+
    "const results=p.map((b,index)=>{const roi={};for(const [name,q] of Object.entries(boxes))roi[name]={mae:mae(ref,b,q),changedPixels:changed(p[0],b,q)};return {index,roi};});"+
    "const baseline=results[0],eligible=results.filter(r=>r.roi.dock.changedPixels===0&&r.roi.full.mae<=baseline.roi.full.mae&&r.roi.sea.mae<=baseline.roi.sea.mae&&r.roi.rightEdge.mae<=baseline.roi.rightEdge.mae);"+
    "eligible.sort((a,b)=>a.roi.rightEdge.mae-b.roi.rightEdge.mae||a.roi.sea.mae-b.roi.sea.mae);const best=eligible[0]||baseline;"+
    "const c=document.createElement('canvas');c.width=1536;c.height=512;const g=c.getContext('2d');g.drawImage(original,0,0);g.drawImage(imgs[0],384,0);g.drawImage(imgs[best.index],768,0);g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(imgs[best.index],1152,0);"+
    "return {results,bestIndex:best.index,grid:c.toDataURL('image/png').split(',')[1]};})()";
  const r=await evaluate(script);
  assert.equal(r.results.length,12);
  console.log('WORK4_OCEAN_EDGE_CANDIDATES '+JSON.stringify({baseline:r.results[0],best:r.results[r.bestIndex],all:r.results.map((v,i)=>({n:variants[i],roi:v.roi}))}));
  for(const x of r.results){
    assert.equal(x.roi.dock.changedPixels,0,'WORK0 dock must be pixel-identical');
    assert.ok(Number.isFinite(x.roi.full.mae),'actual MAE');
  }
  // The SOURCE-SEA mask is the only candidate selector. Real levels and
  // ship DOM geometry are asserted separately; background animation/alpha
  // can cause screenshot differences beneath translucent foreground HUD.
  await evaluate("document.getElementById('work4-ocean-edge-candidate')?.remove();true");
  const other=[];
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true,screenWidth:w,screenHeight:h});
    await delay(140);
    const x=await evaluate("(()=>({ship:document.querySelectorAll('.w4-fleet svg.w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet svg.w4-reference-sea').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length,overflow:document.documentElement.scrollWidth>innerWidth+1}))()");
    assert.equal(x.ship,1);assert.equal(x.sea,1);assert.equal(x.dock,5);assert.equal(x.overflow,false);
    other.push({w,h,...x});writeFileSync(join(qa,'fleet-ocean-'+w+'x'+h+'.png'),Buffer.from(await capture(),'base64'));
  }
  const report={approved:false,screensApproved:0,reference:'03-frota.webp',viewport:'384x512',
    method:'same Chromium scene, paused animation, original/HEAD/candidates/overlay',geometry,
    candidates:variants.map((n,i)=>({rightFeatherPercent:n,...r.results[i]})),bestIndex:r.bestIndex,viewports:other};
  writeFileSync(join(qa,'fleet-ocean-source-edge-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-ocean-source-edge-384x512.png'),Buffer.from(r.grid,'base64'));
  console.log('WORK4_OCEAN_EDGE_SOURCE_AB '+JSON.stringify({baseline:report.candidates[0],best:report.candidates[r.bestIndex],viewports:other}));
});
