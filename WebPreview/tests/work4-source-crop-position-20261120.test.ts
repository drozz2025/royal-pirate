import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';

const chrome=[process.env.CHROME_BIN,'google-chrome','chromium'].filter(Boolean)
  .find(x=>spawnSync('which',[x!],{encoding:'utf8'}).status===0);
const sleep=(ms:number)=>new Promise<void>(yes=>setTimeout(yes,ms));
const approvedNames=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
const src=(name:string)=>readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));

test('WORK4 #104 crop A/B uses every genuine approved design asset',()=>{
  for(const name of approvedNames){
    const data=src(name);
    assert.equal(data.toString('ascii',0,4),'RIFF',name);
    assert.equal(data.toString('ascii',8,12),'WEBP',name);
    assert.ok(data.length>10000,name);
  }
});

test('WORK4 #104 same-frame source registration: ship/cannon and immutable functional regions',{
  skip:process.env.CI==='true'&&chrome?false:'Chromium real-pixel sweep runs in CI only',
  timeout:240_000
},async t=>{
  const dist=mkdtempSync(join(tmpdir(),'rp-work4-crop-build-'));
  const profile=mkdtempSync(join(tmpdir(),'rp-work4-crop-chrome-'));
  const folder=resolve('porto-qa/work4');
  mkdirSync(folder,{recursive:true});
  let preview:ReturnType<typeof spawn>|undefined, browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{
    ws?.close();browser?.kill('SIGTERM');preview?.kill('SIGTERM');
    await sleep(350);
    for(const path of [profile,dist])rmSync(path,{recursive:true,force:true,maxRetries:12,retryDelay:200});
  });
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/','--outDir',dist],
    {cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:10000000});
  assert.equal(build.status,0,'original production build: '+(build.stderr||build.stdout).slice(-1400));
  const port=await new Promise<number>((yes,no)=>{
    const sock=createServer();sock.once('error',no);
    sock.listen(0,'127.0.0.1',()=>{
      const a=sock.address();if(!a||typeof a==='string'){sock.close();return no(Error('port'));}
      sock.close(()=>yes(a.port));
    });
  });
  preview=spawn(join(process.cwd(),'node_modules','.bin','vite'),
    ['preview','--outDir',dist,'--host','127.0.0.1','--port',String(port),
      '--strictPort','--base=/royal-pirate/'],{stdio:'ignore'});
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let ready=false;
  for(let i=0;i<140;i++){
    try{ready=(await fetch(origin,{signal:AbortSignal.timeout(850)})).ok;if(ready)break;}catch{}
    await sleep(130);
  }
  assert.ok(ready,'the real app preview must load');
  browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--remote-allow-origins=*','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let target:any;
  for(let i=0;i<290;i++){
    assert.equal(browser.exitCode,null,'Chromium must remain running');
    try{
      const port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(port>0){
        const response=await fetch('http://127.0.0.1:'+port+'/json/list',
          {signal:AbortSignal.timeout(900)});
        if(response.ok)target=(await response.json() as any[]).find(v=>v.type==='page');
      }
    }catch{}
    if(target)break;
    await sleep(100);
  }
  assert.ok(target?.webSocketDebuggerUrl,'native Chromium debugging target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(Error('CDP websocket failed')),{once:true});
  });
  let sequence=0;
  const pending=new Map<number,{resolve:(x:any)=>void,reject:(e:Error)=>void}>();
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(String(e.data)),p=pending.get(msg.id);
    if(!p)return;
    pending.delete(msg.id);
    msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);
  });
  const cmd=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},30000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);yes(r);},
      reject:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(script:string)=>{
    const r=await cmd('Runtime.evaluate',{expression:script,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Runtime.evaluate '+JSON.stringify(r.exceptionDetails).slice(0,800));
    return r.result?.value;
  };
  const until=async(expr:string)=>{
    for(let n=0;n<180;n++){if(await evaluate(expr))return;await sleep(110);}
    throw Error('real UI missing: '+expr);
  };
  const shot=async()=>((await cmd('Page.captureScreenshot',
    {format:'png',captureBeyondViewport:false,fromSurface:true})).data as string);
  const geometry=async()=>await evaluate("(()=>{const r=s=>{const el=document.querySelector(s);if(!el)return null;const b=el.getBoundingClientRect();return [b.x,b.y,b.width,b.height]};return {stage:r('.w4-screen .w4-harbour-stage,.w4-screen .w4-forge-stage'),ship:r('.w4-reference-ship'),cannon:r('.w4-reference-cannon'),roster:r('.w4-ship-roster'),costs:r('.w4-resource-grid'),dock:r('.harbour-nav.app-dock-porto'),dockItems:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,cards:document.querySelectorAll('.w4-ship-slot').length,overflow:document.documentElement.scrollWidth>innerWidth+1}})()");
  const touch=async(selector:string)=>{
    const p=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
    assert.ok(p,'actual touch target '+selector);
    await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:4}]});
    await sleep(70);
    await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,deviceScaleFactor:1,mobile:true,screenWidth:384,screenHeight:512
  });
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await cmd('Page.navigate',{url:origin+'?work4=source-crop-sweep'});
  await until("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
  await touch('.harbour-screen .harbour-nav-item:nth-child(2)');
  await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
  const results:any[]=[];
  for(const screen of ['fleet','forge'] as const){
    if(screen==='forge'){
      assert.equal(await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true;})()"),true);
      await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
    }
    await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());"+
      "for(const e of document.querySelectorAll('.w4-screen svg image')){const url=e.getAttribute('href');if(url&&!(await fetch(url)).ok)throw Error('approved crop not loaded')}return true;})()");
    await sleep(130);
    const initial=await geometry();

    // WORK4_NATIVE_LABEL_A11Y: measure readable native labels without any
    // interference with the real five-item dock or click-target geometry.
    const readability=await evaluate("(()=>{const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const px=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null};return {namePx:px('.w4-fleet .w4-ship-slot strong'),statusPx:px('.w4-fleet .w4-ship-slot small'),costPx:px('.w4-forge .w4-resource-grid small'),slot:rect('.w4-fleet .w4-ship-slot.is-active'),dock:rect('.harbour-nav.app-dock-porto'),button:rect('.w4-forge .w4-improve-button')}})()");
    if(screen==='fleet'){
      assert.ok(readability.namePx>=10,'native ship names retain the measured reference geometry');
      assert.ok(readability.statusPx>=7,'native availability text preserves the existing source-card geometry');
      assert.ok(readability.slot?.height>=44,'Royal Crown remains a viable touch target');
      assert.ok(readability.slot.bottom<=readability.dock.top+1,
        'ship selection must not be hidden beneath the WORK0 dock');
    }else{
      assert.ok(readability.costPx>=9,'real material/cost captions must remain legible');
      assert.ok(readability.button?.height>=44,'real upgrade button remains touch sized');
    }
    console.log('WORK4_NATIVE_LABEL_A11Y '+JSON.stringify({screen,...readability}));

    assert.equal(initial.dockItems,5,'WORK0 menu has exactly five live options');
    assert.equal(initial.overflow,false,'native scene has no horizontal overflow');
    if(screen==='fleet'){assert.equal(initial.cards,4);assert.ok(initial.ship);}
    else {assert.ok(initial.cannon);assert.ok(initial.costs);}
    const selector=screen==='fleet'
      ?'.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship'
      :'.w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon';
    const variants=screen==='fleet'
      ?[{id:'HEAD',x:null,y:null},{id:'left-2',x:'-2px',y:'9px'},
        {id:'right-2',x:'2px',y:'9px'},{id:'up-2',x:'0px',y:'7px'},
        {id:'down-2',x:'0px',y:'11px'},{id:'up-4',x:'0px',y:'5px'},
        {id:'left-up',x:'-2px',y:'7px'},{id:'right-down',x:'2px',y:'11px'}]
      :[{id:'HEAD',x:null,y:null},{id:'left-2',x:'-11px',y:'2px'},
        {id:'right-2',x:'-7px',y:'2px'},{id:'up-2',x:'-9px',y:'0px'},
        {id:'down-2',x:'-9px',y:'4px'},{id:'up-4',x:'-9px',y:'-2px'},
        {id:'left-up',x:'-11px',y:'0px'},{id:'right-down',x:'-7px',y:'4px'}];
    const images:[string,string][]=[];
    for(const candidate of variants){
      if(candidate.id!=='HEAD'){
        const css=selector+'{left:'+candidate.x+'!important;top:'+candidate.y+'!important;}';
        await evaluate("(()=>{const style=document.createElement('style');style.id='work4-crop-offset-ab';style.textContent="+JSON.stringify(css)+";document.head.appendChild(style);return true;})()");
        const applied=await evaluate("(()=>{const s=getComputedStyle(document.querySelector("+JSON.stringify(selector)+"));return {x:s.left,y:s.top}})()");
        assert.equal(applied.x,candidate.x,'candidate must actually override existing important ship/cannon CSS');
        assert.equal(applied.y,candidate.y,'candidate must change the actual rendered crop top');
      }
      await sleep(120);
      images.push([candidate.id,await shot()]);
      if(candidate.id!=='HEAD'){
        await evaluate("(()=>{document.getElementById('work4-crop-offset-ab')?.remove();return true;})()");
        await sleep(50);
      }
      const now=await geometry();
      for(const key of ['stage','roster','costs','dock','dockItems','cards','overflow']){
        assert.deepEqual(now[key],initial[key],'cannot disturb protected layout: '+key);
      }
    }
    const rois=screen==='fleet'
      ?{full:[0,0,384,512],painting:[18,135,241,344],ship:[65,205,175,307],
        coast:[18,137,235,205],edge:[180,155,241,339],
        sea:[18,307,238,358],cards:[18,350,374,429],dock:[0,433,384,512]}
      :{full:[0,0,384,512],painting:[16,137,242,340],
        cannon:[18,153,175,305],furnace:[129,168,171,294],
        edge:[178,163,244,320],costs:[16,329,375,430],dock:[0,433,384,512]};
    const script="(async()=>{const input="+JSON.stringify({
      reference:src(screen==='fleet'?'03-frota.webp':'04-melhorias-forja.webp').toString('base64'),
      shots:images,rois})+";const img=async(t,b)=>{const i=new Image();i.src='data:image/'+t+';base64,'+b;await i.decode();if(i.width!==384||i.height!==512)throw Error('native pixel dimensions');return i};"+
      "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);return ctx.getImageData(0,0,384,512).data};"+
      "const reference=await img('webp',input.reference),ref=pixels(reference);"+
      "const frames=[];for(const [id,bytes] of input.shots){const raw=await img('png',bytes);const p=pixels(raw);const scores={};for(const [name,b] of Object.entries(input.rois)){let sum=0,n=0;for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){const k=(y*384+x)*4;for(let ch=0;ch<3;ch++){sum+=Math.abs(p[k+ch]-ref[k+ch]);n++}}scores[name]=sum/n}frames.push({id,scores,pixels:p})}"+
      "const base=frames[0];const changed=(candidate,b)=>{let count=0;for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){const k=(y*384+x)*4;let diff=false;for(let c=0;c<3;c++)if(candidate.pixels[k+c]!==base.pixels[k+c])diff=true;if(diff)count++;}return count};"+
      "const records=frames.map(item=>({id:item.id,...item.scores,protectedChanged:{dock:changed(item,input.rois.dock),"+
      (screen==='fleet'?"cards:changed(item,input.rois.cards)":"costs:changed(item,input.rois.costs)")+"}}));"+
      "const roi="+JSON.stringify(screen==='fleet'?['full','painting','ship','coast','edge']:['full','painting','cannon','furnace','edge'])+";"+
      "const winner=records.filter(r=>r.protectedChanged.dock===0&&r.protectedChanged."+(screen==='fleet'?'cards':'costs')+"===0&&roi.every(k=>r[k]<=records[0][k]+.01)).sort((a,b)=>a.full-b.full)[0];"+
      "const pick=frames.find(x=>x.id===(winner?.id||'HEAD'));const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const c=cv.getContext('2d');c.drawImage(reference,0,0);"+
      "for(const [i,p] of [[1,frames[0]],[2,pick]]){const raw=document.createElement('canvas');raw.width=384;raw.height=512;raw.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(p.pixels),384,512),0,0);c.drawImage(raw,i*384,0)}"+
      "c.drawImage(reference,1152,0);c.globalAlpha=.5;const overlay=document.createElement('canvas');overlay.width=384;overlay.height=512;overlay.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pick.pixels),384,512),0,0);c.drawImage(overlay,1152,0);"+
      "return {records,winner:winner?.id||null,rois:input.rois,grid:cv.toDataURL('image/png').split(',')[1]}})()";
    const output=await evaluate(script);
    const grid=output.grid;delete output.grid;
    const report={screen,approved:false,approvedScreens:0,
      samePausedFrame:true,candidateOnly:true,base:'exact committed HEAD',
      geometry:initial,...output};
    assert.equal(report.records.length,8);
    assert.equal(report.records[0].protectedChanged.dock,0);
    writeFileSync(join(folder,'work4-'+screen+'-crop-position-384x512.json'),JSON.stringify(report,null,2)+'\n');
    writeFileSync(join(folder,'work4-'+screen+'-original-head-candidate-overlay-384x512.png'),
      Buffer.from(grid,'base64'));
    results.push(report);
    // WORK4 #104: compare LIVE coastal inset and foundry material underpaint
    // against the original approved WebP, in the SAME frozen Chromium frame.
    // Probe CSS never ships: only a candidate with measured positive ROI can
    // later be promoted into WORK4-owned CSS after WORK0 reviews it.
    const paintSelector=screen==='fleet'
      ?'.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label'
      :'.w4-forge #w4-forge-panel > .w4-materials:where(*)';
    const paintCandidates=screen==='fleet'
      ?[
        {id:'HEAD',paint:null},
        {id:'prior-HEAD',paint:'linear-gradient(90deg,#082c48de 0%,#09253ff1 20%,#061d33f8 55%,#031529fc 100%)'},
        {id:'deep-coast',paint:'linear-gradient(90deg,#073d52ec 0%,#092a41f2 22%,#071d33f8 55%,#031529fc 100%)'},
        {id:'source-blue',paint:'linear-gradient(90deg,#06506adf 0%,#08344bee 20%,#081f36f9 55%,#031529fc 100%)'},
        {id:'muted-slate',paint:'linear-gradient(90deg,#0a354bea 0%,#0b2a42f3 22%,#071c34f9 55%,#031529fc 100%)'},
        {id:'waterfall',paint:'linear-gradient(90deg,#0b4963dc 0%,#092a44f4 35%,#071e34fb 65%,#031529fc 100%)'},
        {id:'coast-soft-azure',paint:'linear-gradient(90deg,#075b70d0 0%,#07394de9 18%,#071f34f7 56%,#031529fc 100%)'},
        {id:'coast-deep-indigo',paint:'linear-gradient(90deg,#06314be5 0%,#08263fed 18%,#061c31f8 56%,#031529fc 100%)'},
        {id:'coast-timber-edge',paint:'linear-gradient(90deg,#154451d9 0%,#102e42ef 20%,#081d32f8 56%,#031529fc 100%)'}
      ]
      :[
        {id:'HEAD',paint:null},
        {id:'forged-steel',paint:'linear-gradient(173deg,#273238 0%,#17252c 52%,#0b1921 100%)'},
        {id:'smoke-iron',paint:'linear-gradient(173deg,#26292b 0%,#1b242a 52%,#0a1924 100%)'},
        {id:'warm-foundry',paint:'radial-gradient(ellipse 76% 94% at 32% 0%,#b66d3235 0%,transparent 77%),linear-gradient(173deg,#25292a 0%,#172126 52%,#0b161e 100%)'},
        {id:'warm-slate',paint:'linear-gradient(173deg,#303234 0%,#1a242b 52%,#0b1921 100%)'},
        {id:'steel-sheen',paint:'radial-gradient(ellipse 70% 65% at 48% 0%,#c48a4b24 0%,transparent 75%),linear-gradient(173deg,#283038 0%,#18222b 55%,#0a1721 100%)'},
        {id:'forge-charcoal',paint:'linear-gradient(173deg,#252929 0%,#161f25 50%,#091621 100%)'},
        {id:'forge-warm-edge',paint:'radial-gradient(ellipse 72% 72% at 8% 88%,#bb68302b 0%,transparent 78%),linear-gradient(173deg,#292e2f 0%,#18252a 55%,#0b1722 100%)'}
      ];
    const paintShots:[string,string][]=[['HEAD',images[0][1]]];
    for(const candidate of paintCandidates.slice(1)){
      const rule=paintSelector+'{background:'+candidate.paint+'!important;}';
      await evaluate("(()=>{const s=document.createElement('style');s.id='work4-pigment-ab';s.textContent="+
        JSON.stringify(rule)+";document.head.appendChild(s);return true})()");
      const applied=await evaluate("(()=>getComputedStyle(document.querySelector("+
        JSON.stringify(paintSelector)+")).backgroundImage)()");
      assert.ok(applied.includes('gradient('),'candidate must really repaint its DOM element');
      paintShots.push([candidate.id,await shot()]);
      await evaluate("(()=>{document.getElementById('work4-pigment-ab')?.remove();return true;})()");
      for(const key of ['stage','roster','costs','dock','dockItems','cards','overflow']){
        assert.deepEqual((await geometry())[key],initial[key],
          'paint-only candidate cannot move '+key);
      }
    }
    const paintRois=screen==='fleet'
      ?{full:[0,0,384,512],inset:[242,163,368,340],seam:[232,162,257,340],
        ship:[65,205,175,307],sea:[18,307,218,358],
        cards:[18,350,374,429],dock:[0,433,384,512]}
      :{full:[0,0,384,512],materials:[16,340,375,404],
        cannon:[18,153,175,305],furnace:[129,168,171,294],
        costs:[16,340,375,404],dock:[0,433,384,512]};
    const paintMetric="(async()=>{const input="+JSON.stringify({
      ref:src(screen==='fleet'?'03-frota.webp':'04-melhorias-forja.webp').toString('base64'),
      shots:paintShots,rois:paintRois})+";const load=async(t,b)=>{const i=new Image();i.src='data:image/'+t+';base64,'+b;await i.decode();if(i.width!==384||i.height!==512)throw Error('not native 384x512');return i};"+
      "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
      "const source=await load('webp',input.ref),reference=pixels(source);const frames=[];"+
      "for(const [id,b] of input.shots){const i=await load('png',b),p=pixels(i);const scores={};for(const [key,r] of Object.entries(input.rois)){let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(p[k+c]-reference[k+c]);n++}}scores[key]=sum/n}frames.push({id,scores,pixels:p})}"+
      "const orig=frames[0],changed=(p,r)=>{let n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;if([0,1,2].some(c=>p[k+c]!==orig.pixels[k+c]))n++}return n};"+
      "const records=frames.map(f=>({id:f.id,...f.scores,changedFromHead:changed(f.pixels,input.rois.full),"+
      "shipOrCannonChanged:changed(f.pixels,input.rois."+(screen==='fleet'?'ship':'cannon')+"),"+
      "dockChanged:changed(f.pixels,input.rois.dock)}));"+
      "const region="+JSON.stringify(screen==='fleet'?'seam':'materials')+";"+
      "const candidates=records.filter(r=>r.dockChanged===0&&r.shipOrCannonChanged===0&&r.full<=records[0].full+.05);"+
      "const best=candidates.sort((a,b)=>a[region]-b[region])[0]||records[0];"+
      "const chosen=frames.find(f=>f.id===best.id),c=document.createElement('canvas');c.width=1536;c.height=512;const g=c.getContext('2d');g.drawImage(source,0,0);"+
      "for(const [j,p] of [[1,orig],[2,chosen]]){const cv=document.createElement('canvas');cv.width=384;cv.height=512;cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(p.pixels),384,512),0,0);g.drawImage(cv,j*384,0)}"+
      "g.drawImage(source,1152,0);g.globalAlpha=.5;const layer=document.createElement('canvas');layer.width=384;layer.height=512;layer.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(chosen.pixels),384,512),0,0);g.drawImage(layer,1152,0);"+
      "return {records,best:best.id,grid:c.toDataURL('image/png').split(',')[1]}})()";
    const pigments=await evaluate(paintMetric);
    const paintGrid=pigments.grid;delete pigments.grid;
    assert.equal(pigments.records.length,paintCandidates.length);
    if(screen==='fleet'){
      const before=pigments.records.find((r:any)=>r.id==='prior-HEAD');
      const after=pigments.records.find((r:any)=>r.id==='HEAD');
      assert.ok(before&&after,'same-frame previous coast pigment must be captured');
      assert.ok(after.seam<before.seam-.3,
        'WORK4 source-coast seam must improve against real prior-HEAD');
      assert.ok(after.full<=before.full+.02,
        'small protected native visual adjustment must not materially regress frame MAE');
    }

    for(const record of pigments.records.slice(1)){
      assert.ok(record.changedFromHead>0,'paint A/B candidate must change real pixels: '+record.id);
      assert.equal(record.shipOrCannonChanged,0,'ship/cannon source region is immutable');
      assert.equal(record.dockChanged,0,'WORK0 dock pixels must stay identical');
    }
    writeFileSync(join(folder,'work4-'+screen+'-pigment-ab-384x512.json'),
      JSON.stringify({approved:false,approvedScreens:0,samePausedFrame:true,
        source:'assets/design-approved/'+(screen==='fleet'?'03-frota.webp':'04-melhorias-forja.webp'),
        variants:paintCandidates,rois:paintRois,...pigments},null,2)+'\n');
    writeFileSync(join(folder,'work4-'+screen+'-pigment-original-head-render-overlay-384x512.png'),
      Buffer.from(paintGrid,'base64'));
    console.log('WORK4_PHOTO_MATERIAL_PIGMENT_AB '+JSON.stringify({screen,best:pigments.best,records:pigments.records}));
    console.log('WORK4_SOURCE_CROP_A_B '+JSON.stringify({screen,winner:report.winner,records:report.records}));
  }
  // Visit BOTH owned screens at each real mobile viewport. The previous sweep
  // only captured Forja and could miss Frota's roster/dock regression at 320/390/430.
  // Preserve WORK0 dock and genuine live navigation; never modify another WORK's CSS.
  const responsive=[];
  for(const [width,height] of [[320,568],[390,844],[430,932]]){
    await cmd('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await sleep(120);
    const forge=await geometry();
    assert.equal(forge.dockItems,5,'Forja real WORK0 nav at '+width);
    assert.equal(forge.overflow,false,'Forja horizontal overflow at '+width);
    assert.ok(forge.cannon?.[2]>100,'original forge cannon present at '+width);
    assert.ok(forge.costs,'actual upgrade prices remain in DOM at '+width);
    writeFileSync(join(folder,'work4-forge-crop-qa-'+width+'x'+height+'.png'),
      Buffer.from(await shot(),'base64'));
    responsive.push({width,height,screen:'forge',...forge});
    await touch('.harbour-screen .harbour-nav-item:nth-child(2)');
    await until("!!document.querySelector('.w4-fleet .w4-reference-ship')");
    await sleep(110);
    const fleet=await geometry();
    assert.equal(fleet.dockItems,5,'Frota real WORK0 nav at '+width);
    assert.equal(fleet.overflow,false,'Frota horizontal overflow at '+width);
    assert.equal(fleet.cards,4,'Frota four live ship slots at '+width);
    assert.ok(fleet.ship?.[2]>100,'one genuine Royal Crown at '+width);
    writeFileSync(join(folder,'work4-fleet-crop-qa-'+width+'x'+height+'.png'),
      Buffer.from(await shot(),'base64'));
    responsive.push({width,height,screen:'fleet',...fleet});
    const open=await evaluate("(()=>{const b=document.querySelector('.w4-fleet .w4-action-pair button.w4-primary');if(!b)return false;b.click();return true;})()");
    assert.equal(open,true,'Frota to Forja navigation at '+width);
    await until("!!document.querySelector('.w4-forge .w4-reference-cannon')");
  }
  writeFileSync(join(folder,'work4-source-crop-qa-summary.json'),
    JSON.stringify({approved:false,approvedScreens:0,sourceAssets:approvedNames,
      compositions:results.map(x=>({screen:x.screen,winner:x.winner,records:x.records})),
      responsive},null,2)+'\n');
});
