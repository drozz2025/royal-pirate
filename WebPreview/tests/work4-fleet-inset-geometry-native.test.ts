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
const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
const oldGradient='linear-gradient(155deg,#09263cfb,#031b30fa)';
const approved=readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64');

test('WORK4 Fleet source seam uses local native paint, never ship geometry, sea or shared UI',()=>{
  assert.ok(paint,'native source inset must exist');
  assert.match(paint,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(paint,/background:linear-gradient\(90deg,#075684ec/);
  assert.match(paint,/100%\)!important/);
  assert.equal((paint.match(/\.w4-stage-label/g)||[]).length,1);
  assert.doesNotMatch(paint,/(?:\.app-|\.porto-|\.harbour-nav|\.w4-reference-sea|\.w4-reference-ship|\.w4-cannon-art|contain:paint|transform:|position:|pointer-events:)/);
  assert.ok(css.includes('radial-gradient(ellipse 110% 123% at 30% 50%'),'approved Royal Crown source contour must survive');
  assert.ok(css.includes('svg.w4-reference-sea'),'source water must survive');
});

const chrome=[process.env.CHROME_BIN,'chromium','google-chrome'].filter(Boolean)
  .find(bin=>spawnSync('which',[bin!],{encoding:'utf8'}).status===0);
const delay=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));

test('WORK4 Fleet 03: real Royal Crown inset-composition geometry sweep, Chromium 384x512',{
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
  const variants=[
    {id:'merged-head',top:null,width:null,right:null},
    {id:'up2-wide2',top:13,width:38,right:1.5},
    {id:'up4-wide4',top:11,width:40,right:1.5},
    {id:'up6-wide5',top:9,width:41,right:1.5},
    {id:'up7-wide6',top:8,width:42,right:1},
    {id:'up8-wide7',top:7,width:43,right:1},
    {id:'up5-wide6',top:10,width:42,right:0},
    {id:'up7-wide4',top:8,width:40,right:0},
    {id:'up9-wide4',top:6,width:40,right:0},
    {id:'up6-wide3',top:9,width:39,right:1},
    {id:'up3-wide5',top:12,width:41,right:0.5},
    {id:'up8-wide5',top:7,width:41,right:0.5},
    {id:'up5-wide3',top:10,width:39,right:0.5},
    {id:'up9-wide6',top:6,width:42,right:0.5},
    {id:'up7-wide7',top:8,width:43,right:0}
  ];
  const shots:Record<string,string>={};
  const boxes:Record<string,unknown>={};
  const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
  for(const v of variants){
    const change=v.top===null?'':selector+'{top:'+v.top+'%!important;width:'+v.width+'%!important;right:'+v.right+'%!important;}';
    await evaluate("(()=>{let tag=document.getElementById('work4-inset-geometry-ab');if(!tag){tag=document.createElement('style');tag.id='work4-inset-geometry-ab';document.head.append(tag);}tag.textContent="+JSON.stringify(change)+";return true;})()");
    await delay(110);
    boxes[v.id]=await evaluate("(()=>{const e=document.querySelector('.w4-fleet .w4-stage-label');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()");
    shots[v.id]=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
  }
  await evaluate("document.getElementById('work4-inset-geometry-ab')?.remove();true");
  const scoring="(async()=>{const open=async(src)=>{const i=new Image();i.src=src;await i.decode();return i;};"+
    "const ref=await open('data:image/webp;base64,"+approved+"');"+
    "const pics=await Promise.all("+JSON.stringify(variants.map(v=>v.id))+".map(id=>open('data:image/png;base64,'+("+JSON.stringify(shots)+")[id])));"+
    "if(ref.width!==384||ref.height!==512||pics.some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 comparison required');"+
    "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;let g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
    "const r=pixels(ref),b=pixels(pics[0]);"+
    "const rois={full:[0,0,384,512],inset:[214,145,375,337],upper:[214,145,375,218],levels:[230,210,371,310],ship:[65,205,175,307],sea:[18,308,218,336],roster:[18,344,373,428],dock:[0,432,384,512]};"+
    "const mae=(p,q,z)=>{let t=0,n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){const k=(y*384+x)*4;for(let c=0;c<3;c++){t+=Math.abs(p[k+c]-q[k+c]);n++}}return t/n};"+
    "const changed=(p,z)=>{let n=0;for(let y=z[1];y<z[3];y++)for(let x=z[0];x<z[2];x++){const k=(y*384+x)*4;if(p[k]!==b[k]||p[k+1]!==b[k+1]||p[k+2]!==b[k+2])n++}return n};"+
    "const records=pics.map((img,index)=>{const p=pixels(img),roi={};for(const [name,z]of Object.entries(rois))roi[name]={mae:mae(r,p,z),changedPixels:changed(p,z)};return {index,roi}});"+
    "const base=records[0];const safe=records.filter(q=>q.roi.ship.changedPixels===0&&q.roi.sea.changedPixels===0&&q.roi.roster.changedPixels===0&&q.roi.dock.changedPixels===0&&q.roi.full.mae<=base.roi.full.mae&&q.roi.inset.mae<=base.roi.inset.mae).sort((a,b)=>a.roi.inset.mae-b.roi.inset.mae);"+
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
    method:'Native Chromium; same React scene, same frozen animation frame; one actual Royal Crown; no fake numbers; controlled inset geometry only',
    previousPrs:['#260','#266','#484','#495'],geometry,rectangles:boxes,rois:result.roi,
    variants:variants.map((v,i)=>({...v,...result.records[i]})),
    safeWinner:variants[result.bestIndex],
    decision:result.bestIndex===0?'Keep merged baseline: no geometrical alternative meets full/inset/protected ROI gates':'Candidate improves compositional ROI; WORK0/human approval required'};
  writeFileSync(join(qa,'work4-fleet-inset-geometry-384x512.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(qa,'original-before-render-overlay-fleet-geometry-384x512.png'),Buffer.from(result.quad,'base64'));
  console.log('WORK4_FLEET_GEOMETRY_NATIVE_AB '+JSON.stringify({winner:report.safeWinner,baseline:baseline.roi,final:result.records[result.bestIndex].roi,rectangles:{before:boxes[variants[0].id],after:boxes[variants[result.bestIndex].id]},decision:report.decision}));
});
