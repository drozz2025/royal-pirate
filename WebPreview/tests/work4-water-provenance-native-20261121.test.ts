import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4/#104 — 18 Nov 21h: connect the ONE original Royal Crown';
const paint=css.split(marker)[1]?.split('/*')[0]||'';

const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 water provenance references and protected local crop remain stable',()=>{
  assert.ok(paint,'native source inset must exist');
  assert.match(paint,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(paint,/background:linear-gradient\(90deg,#075684ec/);
  assert.match(paint,/100%\)!important/);
  assert.equal((paint.match(/\.w4-stage-label/g)||[]).length,1);
  assert.doesNotMatch(paint,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-sea|\.w4-reference-ship|\.w4-cannon-art|contain:paint|transform:|position:|pointer-events:)/);
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'approved Royal Crown source contour must survive');
  assert.ok(css.includes('svg.w4-reference-sea'),'source water must survive');
  assert.match(css,/background:#08527a!important/);
  for(const n of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']){const file=readFileSync(new URL('../../assets/design-approved/'+n,import.meta.url));assert.equal(file.toString('ascii',0,4),'RIFF',n);assert.equal(file.toString('ascii',8,12),'WEBP',n);}
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet one-frame source-water provenance ablation: no synthetic second sea',{
  skip:process.env.CI==='true'&&chrome?false:'CI Chromium screenshot evidence only',
  timeout:240_000
},async t=>{
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/'],{
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
    'preview','--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'
  ],{stdio:'ignore'});
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-live-seam-'));
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
  await cmd('Page.navigate',{url:origin+'?work4=source-inset-live-ab'});
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

  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const e=document.querySelector('svg.w4-reference-ship image');const src=e?.getAttribute('href')||e?.href?.baseVal;if(!src||!(await fetch(src)).ok)throw Error('approved fleet source missing');return true;})()");
  // TRUE old-HEAD baseline: restore the release's native procedural stage
  // underpaint only. Keep identical sources, state, compositor and frame.
  const beforeStyle=await evaluate("(()=>{const s=document.createElement('style');s.id='work4-native-original-underpaint';s.textContent="+JSON.stringify('.w4-fleet #w4-fleet-panel > .w4-harbour-stage{background:radial-gradient(ellipse 50% 22% at 46% 12%,#e3fcffbb,transparent 95%),linear-gradient(180deg,#0877c1 0%,#109bc7 39%,#10b2bf 53%,#095989 83%,#052a4d)!important;')+"}';document.head.append(s);return true;})()");
  assert.equal(beforeStyle,true);
  await delay(180);
  const before=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  await evaluate("document.getElementById('work4-native-original-underpaint')?.remove();true");
  // All trials are injected into the exact SAME paused native scene; no route,
  // profile, animation clock, reference image, ship, or viewport is replaced.
  const stage='.w4-fleet #w4-fleet-panel > .w4-harbour-stage';
  const water=stage+' > svg.w4-reference-sea';
  const ship=stage+' > svg.w4-ship-art.w4-reference-ship';
  const variants=[
    {id:'ablate-secondary-water',css:water+'{opacity:0!important;}'},
    {id:'source-water-top-0',css:water+'{-webkit-mask-image:none!important;mask-image:none!important;}'},
    {id:'source-water-feather-18',css:water+'{-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 18%,#000 100%)!important;mask-image:linear-gradient(to bottom,transparent 0%,#000 18%,#000 100%)!important;}'},
    {id:'source-water-feather-34',css:water+'{-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 34%,#000 100%)!important;mask-image:linear-gradient(to bottom,transparent 0%,#000 34%,#000 100%)!important;}'},
    {id:'source-water-opacity-86',css:water+'{opacity:.86!important;}'},
    {id:'source-water-left-0',css:water+'{left:0!important;}'},
    {id:'source-water-bottom-0',css:water+'{bottom:0!important;}'},
    {id:'source-water-backdrop-ink',css:stage+'{background:#08527a!important;}'},
    {id:'remove-photo-mask',css:ship+'{-webkit-mask-image:none!important;mask-image:none!important;}'}
  ] as const;
  const boxes:Record<string,[number,number,number,number]>={
    full:[0,0,384,512],shipComposition:[36,183,216,309],
    crownCore:[112,235,171,290],authenticWater:[25,304,238,337],
    lowerWaterJoin:[26,307,241,347],photoEdge:[217,167,246,337],
    coastline:[18,210,79,318],liveInset:[247,164,373,333],dock:[0,433,384,512]
  };
  const metricExpression=(trial:string,compose:boolean)=>"(async()=>{"+
    "const load=async s=>{const i=new Image();i.src=s;await i.decode();if(i.width!==384||i.height!==512)throw Error('not 384x512');return i;};"+
    "const [original,before,trial]=await Promise.all([load('data:image/webp;base64,"+approved+"'),load('data:image/png;base64,"+before+"'),load('data:image/png;base64,"+trial+"')]);"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data;};"+
    "const [a,b,c]=[original,before,trial].map(pixels);const boxes="+JSON.stringify(boxes)+";"+
    "const diff=(v,w,r)=>{let n=0,t=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;for(let q=0;q<3;q++){t+=Math.abs(v[k+q]-w[k+q]);n++;}}return t/n;};"+
    "const changed=r=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let k=(y*384+x)*4;if(b[k]!==c[k]||b[k+1]!==c[k+1]||b[k+2]!==c[k+2])n++;}return n;};"+
    "const metrics=Object.fromEntries(Object.entries(boxes).map(([name,r])=>[name,{before:diff(a,b,r),trial:diff(a,c,r),delta:diff(a,b,r)-diff(a,c,r),changedPixels:changed(r)}]));"+
    (compose?"const out=document.createElement('canvas');out.width=1536;out.height=512;const p=out.getContext('2d');p.drawImage(original,0,0);p.drawImage(before,384,0);p.drawImage(trial,768,0);p.drawImage(original,1152,0);p.globalAlpha=.5;p.drawImage(trial,1152,0);return {metrics,comparison:out.toDataURL('image/png').split(',')[1]};":"return {metrics};")+
    "})()";
  const results:Array<{id:string;metrics:any;screenshot:string}>=[];
  for(const variant of variants){
    await evaluate("(()=>{document.getElementById('work4-water-provenance-trial')?.remove();const e=document.createElement('style');e.id='work4-water-provenance-trial';e.textContent="+JSON.stringify(variant.css)+";document.head.append(e);return true;})()");
    await delay(70);
    const shot=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    const m=await evaluate(metricExpression(shot,false));
    results.push({id:variant.id,metrics:m.metrics,screenshot:shot});
  }
  await evaluate("document.getElementById('work4-water-provenance-trial')?.remove();true");
  const protectedRois=['crownCore','dock'];
  const eligible=results.filter(r=>
    protectedRois.every(name=>r.metrics[name].changedPixels===0)&&
    r.metrics.full.delta>0.20&&
    r.metrics.photoEdge.delta>0.30&&
    r.metrics.authenticWater.delta>=0&&
    r.metrics.lowerWaterJoin.delta>=-0.01
  ).sort((a,b)=>b.metrics.photoEdge.delta-a.metrics.photoEdge.delta);
  const selected=eligible[0];
  // Evidence never silently promotes a trial into production. Human review
  // and a separate tracked CSS change are required even if the trial qualifies.
  const strongest=selected??results.slice().sort((a,b)=>b.metrics.lowerWaterJoin.delta-a.metrics.lowerWaterJoin.delta)[0];
  const panel=await evaluate(metricExpression(strongest.screenshot,true));
  writeFileSync(join(qa,'original-before-trial-overlay-water-provenance-384x512.png'),Buffer.from(panel.comparison,'base64'));
  const viewportResults:any[]=[];
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true,screenWidth:w,screenHeight:h});
    await delay(140);
    const g=await evaluate("(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,ship:document.querySelectorAll('.w4-fleet .w4-reference-ship').length,sea:document.querySelectorAll('.w4-fleet .w4-reference-sea').length,roster:document.querySelectorAll('.w4-fleet .w4-ship-roster>.w4-ship-slot').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
    assert.equal(g.ship,1,'one original Crown on '+w+'x'+h);
    assert.equal(g.sea,1,'one original sea bridge on '+w+'x'+h);
    assert.equal(g.roster,4,'four real ship slots on '+w+'x'+h);
    assert.equal(g.dock,5,'five real navigation items on '+w+'x'+h);
    assert.ok(g.scrollWidth<=g.width+2,'no horizontal overflow on '+w+'x'+h);
    const shot=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
    writeFileSync(join(qa,'water-provenance-mobile-'+w+'x'+h+'.png'),Buffer.from(shot,'base64'));
    viewportResults.push(g);
  }

  // Independent reference ROI for the other WORK4-owned composition (04).
  // No trial CSS is left installed when navigating; this proves the one
  // cannon, lit furnace, three real resource costs and five-item dock coexist.
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
  });
  const enteredForge=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true;})()");
  assert.equal(enteredForge,true,'real Frota-to-Forja action survives');
  await until("!!document.querySelector('.w4-forge svg.w4-reference-cannon')");
  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const e=document.querySelector('svg.w4-reference-cannon image');const src=e?.getAttribute('href')||e?.href?.baseVal;if(!src||!(await fetch(src)).ok)throw Error('approved Forge cannon source missing');return true;})()");
  const forgeGeometry=await evaluate("(()=>({cannons:document.querySelectorAll('.w4-forge svg.w4-reference-cannon').length,realCosts:document.querySelectorAll('.w4-forge .w4-resource-grid>div').length,levels:document.querySelectorAll('.w4-forge .w4-forge-live-level').length,dock:document.querySelectorAll('.app-sheet .harbour-nav.app-dock-porto .harbour-nav-item').length}))()");
  assert.deepEqual(forgeGeometry,{cannons:1,realCosts:3,levels:3,dock:5});
  await delay(130);
  const forgeShot=(await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data as string;
  const forgeApproved=readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64');
  const forgeExpression="(async()=>{"+
    "const load=async s=>{const i=new Image();i.src=s;await i.decode();if(i.width!==384||i.height!==512)throw Error('Forge not 384x512');return i;};"+
    "const [a,b]=await Promise.all([load('data:image/webp;base64,"+forgeApproved+"'),load('data:image/png;base64,"+forgeShot+"')]);"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data;};"+
    "const [x,y]=[a,b].map(pixels);const boxes={full:[0,0,384,512],cannonComposition:[24,171,171,306],furnace:[135,193,190,305],scene:[18,152,373,334],realCostBoard:[24,315,363,430],dock:[0,433,384,512]};"+
    "const mae=r=>{let n=0,t=0;for(let yy=r[1];yy<r[3];yy++)for(let xx=r[0];xx<r[2];xx++){let k=(yy*384+xx)*4;for(let q=0;q<3;q++){t+=Math.abs(x[k+q]-y[k+q]);n++;}}return t/n;};"+
    "const out=document.createElement('canvas');out.width=1152;out.height=512;const p=out.getContext('2d');p.drawImage(a,0,0);p.drawImage(b,384,0);p.drawImage(a,768,0);p.globalAlpha=.5;p.drawImage(b,768,0);"+
    "return {mae:Object.fromEntries(Object.entries(boxes).map(([name,roi])=>[name,mae(roi)])),comparison:out.toDataURL('image/png').split(',')[1]};})()";
  const forge=await evaluate(forgeExpression);
  assert.ok(Number.isFinite(forge.mae.cannonComposition),'cannon ROI must be measured, not a global-only MAE');
  writeFileSync(join(qa,'original-render-overlay-forge-cannon-384x512.png'),Buffer.from(forge.comparison,'base64'));

  const report={approved:false,approvedScreens:0,sourceFiles:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'],viewport:'384x512',scene:'single paused Chromium frame, unchanged source/profile',geometry,forgeGeometry,forgeRoiMae:forge.mae,viewportResults,selectedForFurtherArtReview:selected?.id??null,shownTrial:strongest.id,thresholds:{full:0.20,photoEdge:0.30,authenticWaterMinDelta:0,lowerWaterJoinMinDelta:-0.01},results:results.map(({id,metrics})=>({id,metrics})),note:'The reviewed deep-blue stage underpaint is now WORK4 production CSS only at native 384x512; all other CSS variants are temporary injected trials. MAE is not human artistic approval.'};
  writeFileSync(join(qa,'work4-water-provenance-ab.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORK4_WATER_PROVENANCE_AB '+JSON.stringify(report));
});
