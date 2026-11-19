import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');
const sourceSelector='.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship';
const approvedImages=[
  '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
  '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
  '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'
];
test('WORK4 photo contour study preserves all ten real approved WebP references',()=>{
  for(const path of approvedImages){
    const bytes=readFileSync(new URL('../../assets/design-approved/'+path,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',path);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
    assert.ok(bytes.length>10000,path+' must be the approved original, not a stub');
  }
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'native pre-study source contour must be present');
  assert.ok(css.includes('svg.w4-reference-sea'),'single original sea bridge must survive');
  assert.ok(css.includes('contain:paint') && css.includes('transform:translateZ(0)'),'work0 paint isolation remains intact');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet 03: true-source photograph edge contour sweep, native Chromium 384x512',{
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

  await evaluate("(async()=>{await document.fonts.ready;document.getAnimations().forEach(a=>a.pause());const image=document.querySelector('svg.w4-reference-ship image');if(!image||!(await fetch(image.getAttribute('href')||'')).ok)throw Error('real approved source not loaded');return true;})()");
  // Baseline is the merged HEAD's ACTUAL computed position; candidates
  // modify only the real Fleet status inset. No duplicate ship or fake HUD.
  // Same scene and paused frame: vary ONLY the original photograph's organic
  // right-edge contour and top-edge feather. No screenshot-as-HUD, no new ship.
  const variants=[
    {id:'merged-head',radius:110,top:2},
    {id:'radius104',radius:104,top:2},
    {id:'radius98',radius:98,top:2},
    {id:'radius94',radius:94,top:2},
    {id:'radius90',radius:90,top:2},
    {id:'radius86',radius:86,top:2},
    {id:'radius82',radius:82,top:2},
    {id:'radius80',radius:80,top:2},
    {id:'radius86-top5',radius:86,top:5},
    {id:'radius82-top5',radius:82,top:5},
    {id:'radius90-top6',radius:90,top:6},
    {id:'radius82-top7',radius:82,top:7}
  ];
  const shots:Record<string,string>={};
  const boxes:Record<string,unknown>={};
  const selector=sourceSelector;
  for(const v of variants){
    const mask='radial-gradient(ellipse '+v.radius+'% 123% at 30% 50%,#000 0%,#000 84%,transparent 99%),'+
      'linear-gradient(to bottom,transparent 0%,#000 '+v.top+'%,#000 97%,transparent 100%)';
    const change=selector+'{-webkit-mask-image:'+mask+'!important;mask-image:'+mask+'!important;}';
    await evaluate("(()=>{let tag=document.getElementById('work4-inset-geometry-ab');if(!tag){tag=document.createElement('style');tag.id='work4-inset-geometry-ab';document.head.append(tag);}tag.textContent="+JSON.stringify(change)+";return true;})()");
    await delay(110);
    boxes[v.id]=await evaluate("(()=>{const e=document.querySelector('.w4-fleet svg.w4-reference-ship');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()");
    shots[v.id]=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
  }
  await evaluate("document.getElementById('work4-inset-geometry-ab')?.remove();true");
  const scoring="(async()=>{const open=async(src)=>{const i=new Image();i.src=src;await i.decode();return i;};"+
    "const ref=await open('data:image/webp;base64,"+approved+"');"+
    "const pics=await Promise.all("+JSON.stringify(variants.map(v=>v.id))+".map(id=>open('data:image/png;base64,'+("+JSON.stringify(shots)+")[id])));"+
    "if(ref.width!==384||ref.height!==512||pics.some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 comparison required');"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;let g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const r=pixels(ref),b=pixels(pics[0]);"+
    "const rois={full:[0,0,384,512],seam:[207,150,245,338],topSeam:[20,149,240,174],bow:[180,215,233,316],ship:[65,205,175,307],sea:[18,310,155,337],roster:[18,344,373,428],dock:[0,432,384,512]};"+
    "const mae=(p,q,z)=>{let t=0,n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){const k=(y*384+x)*4;for(let c=0;c<3;c++){t+=Math.abs(p[k+c]-q[k+c]);n++}}return t/n};"+
    "const changed=(p,z)=>{let n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){const k=(y*384+x)*4;if(p[k]!==b[k]||p[k+1]!==b[k+1]||p[k+2]!==b[k+2])n++}return n};"+
    "const records=pics.map((img,index)=>{const p=pixels(img),roi={};for(const [name,z]of Object.entries(rois))roi[name]={mae:mae(r,p,z),changedPixels:changed(p,z)};return {index,roi}});"+
    "const base=records[0];const safe=records.filter(q=>q.roi.ship.changedPixels===0&&q.roi.sea.changedPixels===0&&q.roi.roster.changedPixels===0&&q.roi.dock.changedPixels===0&&q.roi.full.mae<=base.roi.full.mae&&q.roi.seam.mae<=base.roi.seam.mae&&q.roi.bow.mae<=base.roi.bow.mae+0.5).sort((a,b)=>a.roi.seam.mae-b.roi.seam.mae);"+
    "const best=safe[0]||base;const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;const g=canvas.getContext('2d');g.drawImage(ref,0,0);g.drawImage(pics[0],384,0);g.drawImage(pics[best.index],768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(pics[best.index],1152,0);"+
    "return {records,bestIndex:best.index,roi:rois,quad:canvas.toDataURL('image/png').split(',')[1]};})()";
  const result=await evaluate(scoring);
  assert.equal(result.records.length,variants.length);
  const baseline=result.records[0];
  assert.ok(Number.isFinite(baseline.roi.full.mae));
  assert.equal(geometry.ship,1);
  assert.equal(geometry.sea,1);
  assert.equal(geometry.dock,5);
  const report={approved:false,screensApproved:0,screen:'03 Frota',viewport:'384x512',
    reference:'assets/design-approved/03-frota.webp',
    method:'Native Chromium; same React scene, same paused animation frame, source image and single ship; only original photograph mask varies',
    baselineHead:'d03f4cb24448465d822f982618977f093e5db381',
    protect:['central Royal Crown','source-water core','four roster cards','five dock buttons'],
    referenceAssets:approvedImages,geometry,rectangles:boxes,rois:result.roi,
    variants:variants.map((v,i)=>({...v,...result.records[i]})),
    safeWinner:variants[result.bestIndex],
    decision:result.bestIndex===0?'All safer edge contours rejected: keep the merged photo and do NOT commit a new mask':'Safer image-edge candidate found: require WORK0 review before production CSS change'};
  writeFileSync(join(qa,'work4-fleet-photo-contour-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-contour-384x512.png'),Buffer.from(result.quad,'base64'));
  console.log('WORK4_FLEET_PHOTO_CONTOUR_NATIVE_AB '+JSON.stringify({winner:report.safeWinner,baseline:baseline.roi,final:result.records[result.bestIndex].roi,comparisons:result.records.map((r,i)=>({id:variants[i].id,full:r.roi.full.mae,seam:r.roi.seam.mae,bow:r.roi.bow.mae,shipChanged:r.roi.ship.changedPixels})),decision:report.decision}));
  // Actual native BEFORE/RENDER from the identical frozen scene: the production
  // change ONLY fades the inset left pixels; no CSS on approved ship/sea/dock.
  const oldInsetPaint=".w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label{background:linear-gradient(90deg,#075684ec 0%,#0a4b74ed 12%,#0b3655f6 28%,#06263ff9 44%,#031b30fa 70%,#031729fb 100%)!important;}";
  await evaluate("(()=>{const style=document.createElement('style');style.id='work4-native-inset-pigment-before';style.textContent="+JSON.stringify(oldInsetPaint)+";document.head.append(style);return true;})()");
  await delay(120);
  const pigmentBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
  await evaluate("document.getElementById('work4-native-inset-pigment-before')?.remove();true");
  await delay(120);
  const pigmentAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
  const pigmentScoring="(async()=>{const load=async(u)=>{const i=new Image();i.src=u;await i.decode();return i;};"+
    "const [ref,before,render]=await Promise.all([load('data:image/webp;base64,"+approved+"'),"+
    "load('data:image/png;base64,"+pigmentBefore+"'),load('data:image/png;base64,"+pigmentAfter+"')]);"+
    "if([ref,before,render].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;let g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const a=pixels(ref),b=pixels(before),p=pixels(render);"+
    "const regions={full:[0,0,384,512],photoJoin:[233,168,266,333],levels:[237,170,369,337],ship:[65,205,175,307],sea:[18,310,155,337],roster:[18,344,373,428],dock:[0,432,384,512]};"+
    "const mae=(u,v,z)=>{let s=0,n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){let k=(y*384+x)*4;for(let c=0;c<3;c++){s+=Math.abs(u[k+c]-v[k+c]);n++}}return s/n};"+
    "const edges=(u,v,z)=>{let s=0,n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0]+1;x<z[2];x++){let k=(y*384+x)*4;for(let c=0;c<3;c++){s+=Math.abs((u[k+c]-u[k+c-4])-(v[k+c]-v[k+c-4]));n++}}return s/n};"+
    "const changed=z=>{let n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){let k=(y*384+x)*4;if(b[k]!==p[k]||b[k+1]!==p[k+1]||b[k+2]!==p[k+2])n++}return n};"+
    "let measurements={};for(let [name,z]of Object.entries(regions)){measurements[name]={before:mae(a,b,z),after:mae(a,p,z),edgeBefore:edges(a,b,z),edgeAfter:edges(a,p,z),changedPixels:changed(z)}}"+
    "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const g=cv.getContext('2d');g.drawImage(ref,0,0);g.drawImage(before,384,0);g.drawImage(render,768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(render,1152,0);"+
    "return {measurements,png:cv.toDataURL('image/png').split(',')[1]};})()";
  const pigment=await evaluate(pigmentScoring);
  for(const zone of ['ship','sea','roster','dock']){
    assert.equal(pigment.measurements[zone].changedPixels,0,zone+' is WORK0/approved-protected');
  }
  assert.ok(pigment.measurements.photoJoin.changedPixels>0,'inset photo border must genuinely change');
  assert.ok(pigment.measurements.full.after<pigment.measurements.full.before,
    'native 384x512 whole-screen MAE must improve against approved art');
  assert.ok(pigment.measurements.photoJoin.after<pigment.measurements.photoJoin.before,
    'native 384x512 source-photo join MAE must improve');
  assert.ok(pigment.measurements.levels.after<=pigment.measurements.levels.before,
    'live level-card composition may not regress');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-inset-soft-edge-384x512.png'),Buffer.from(pigment.png,'base64'));
  const pigmentReport={
    approved:false,screensApproved:0,source:'assets/design-approved/03-frota.webp',
    viewport:'384x512',method:'same Chromium page, same real ship, paused frame; old opaque live inset versus feathered live inset only',
    referenceAssets:approvedImages,geometry,regions:pigment.measurements,
    decision:'visual-only proposal for WORK0 review; do not claim approved/published'
  };
  writeFileSync(join(qa,'work4-fleet-inset-soft-edge-384x512.json'),JSON.stringify(pigmentReport,null,2)+'\n');
  console.log('WORK4_FLEET_INSET_SOFT_EDGE_NATIVE_AB '+JSON.stringify(pigmentReport));

});
