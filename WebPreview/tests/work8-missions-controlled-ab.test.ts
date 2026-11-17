import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/* WORK8 / #104: A/B in one genuine live Missions scene and one Chrome tab.
   The baseline root class disables ONLY the new WORK8 Missions-only CSS.
   No fictional mission states, no screenshot replacement, no navigation edits.
   Each screenshot is native 384x512 and checked against 07-missoes.webp. */
test('07 Missions: controlled same-frame 384x512 original/Chromium A/B improves ROI without dock or day regressions', {timeout:150000}, async()=>{
  // Avoid overlapping Chrome GPU/CDP with the existing WORK7 test (Node runs test files concurrently).
  await delay(48000);
  const chromeBin=process.env.CHROME_BIN ||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  if(!chromeBin){console.log('Chromium unavailable: cannot claim visual QA');return;}
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-ab-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4186','--strictPort'],{stdio:'ignore'});
  let browser,ws;
  const cdpPort=9300+(process.pid%3000);
  try {
    let ready=false;
    for(let n=0;n<100;n++){
      try{const r=await fetch('http://127.0.0.1:4186/');if(r.ok){ready=true;break;}}catch{}
      if(vite.exitCode!==null)break;
      await delay(120);
    }
    assert.ok(ready,'Vite server must be running to compare real Missions');
    browser=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+cdpPort,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let pages;
    for(let n=0;n<100;n++){
      try{const r=await fetch('http://127.0.0.1:'+cdpPort+'/json/list');if(r.ok){pages=await r.json();break;}}catch{}
      if(browser.exitCode!==null)break;
      await delay(130);
    }
    const page=pages?.find((p:{type:string})=>p.type==='page');
    assert.ok(page,'real Chromium CDP session required');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{ws!.addEventListener('open',()=>resolve(),{once:true});ws!.addEventListener('error',reject,{once:true});});
    let id=0;
    const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>();
    ws.addEventListener('message',(ev:any)=>{
      const reply=JSON.parse(ev.data.toString());const p=pending.get(reply.id);
      if(p){pending.delete(reply.id);reply.error?p.reject(new Error(reply.error.message)):p.resolve(reply.result);}
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{
      const seq=++id,timeout=setTimeout(()=>{pending.delete(seq);reject(Error('CDP timeout: '+method));},16000);
      pending.set(seq,{resolve:v=>{clearTimeout(timeout);resolve(v)},reject:e=>{clearTimeout(timeout);reject(e)}});
      ws!.send(JSON.stringify({id:seq,method,params}));
    });
    const evalJs=async(source:string)=>{
      const r=await cmd('Runtime.evaluate',{expression:source,awaitPromise:true,returnByValue:true});
      assert.ok(!r.exceptionDetails,'Chromium JS failed '+r.exceptionDetails?.text);
      return r.result?.value;
    };
    const wait=async(selector:string)=>{
      for(let n=0;n<70;n++){if(await evalJs('!!document.querySelector('+JSON.stringify(selector)+')'))return;await delay(120);}
      throw new Error('UI missing: '+selector);
    };
    await cmd('Page.enable');await cmd('Runtime.enable');
    const size={width:384,height:512};
    await cmd('Emulation.setDeviceMetricsOverride',{...size,mobile:true,deviceScaleFactor:1,screenWidth:384,screenHeight:512});
    await cmd('Page.navigate',{url:'http://127.0.0.1:4186/'});
    await wait('.harbour-screen .harbour-nav-item');
    await delay(420);
    const clicked=await evalJs('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(b=>b.textContent?.includes("MISSÕES"));b?.click();return !!b})()');
    assert.ok(clicked,'Navigate via the real Porto Missions button');
    await wait('.w8-approved-missions .w8-approved-quest-list');
    await delay(260);
    await evalJs('(()=>{document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return true})()');
    const readLayout=()=>evalJs('(()=>{const r=s=>{const e=document.querySelector(s),x=e?.getBoundingClientRect();return x?{x:x.left,y:x.top,right:x.right,bottom:x.bottom}:null},day=[...document.querySelectorAll(".w8-approved-days li")].map(e=>{const x=e.getBoundingClientRect();return {x:x.left,y:x.top,right:x.right,bottom:x.bottom}});return {dayContent:[...document.querySelectorAll(".w8-approved-days li")].map(e=>[e.querySelector(".w8-approved-chest"),e.querySelector("small")].map(el=>{const x=el?.getBoundingClientRect();return x?{top:x.top,bottom:x.bottom}:null})),quests:document.querySelectorAll(".w8-approved-quest").length,days:day,nav:r(".app-sheet > .harbour-nav"),navCount:document.querySelectorAll(".app-sheet > .harbour-nav .harbour-nav-item").length,daySeven:r(".w8-approved-days li:last-child"),documentWidth:document.documentElement.scrollWidth}})()');
    const baselineClass='work8-missions-ab-baseline';
    await evalJs('document.documentElement.classList.add('+JSON.stringify(baselineClass)+');true');
    await delay(110);
    const beforeLayout=await readLayout();
    const before=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(baselineClass)+');true');
    await delay(110);
    const afterLayout=await readLayout();
    const after=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const orig=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const source='(async()=>{'+
      'const load=s=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=s});'+
      'const images=await Promise.all(['+
      JSON.stringify('data:image/webp;base64,'+orig)+','+
      JSON.stringify('data:image/png;base64,'+before)+','+
      JSON.stringify('data:image/png;base64,'+after)+'].map(load));'+
      'const w=384,h=512; if(images.some(i=>i.width!==w||i.height!==h))throw Error("Native 384x512 is mandatory");'+
      'const pix=images.map(i=>{const c=document.createElement("canvas");c.width=w;c.height=h;const t=c.getContext("2d");t.drawImage(i,0,0);return t.getImageData(0,0,w,h).data});'+
      'const regions={full:[0,0,384,512],quests:[12,155,372,321],daily:[13,325,373,436],chests:[20,356,370,427],dock:[0,451,384,512],header:[0,0,384,70]};'+
      'function mae(a,b,roi){let sum=0,count=0;for(let y=roi[1];y<roi[3];y++)for(let x=roi[0];x<roi[2];x++){const p=(y*w+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(a[p+c]-b[p+c]);count++}}return sum/count;}'+
      'const metrics={};for(const [name,roi] of Object.entries(regions))metrics[name]={baseline:mae(pix[0],pix[1],roi),candidate:mae(pix[0],pix[2],roi),delta:mae(pix[0],pix[2],roi)-mae(pix[0],pix[1],roi)};'+
      'const unchanged={dock:mae(pix[1],pix[2],regions.dock),header:mae(pix[1],pix[2],regions.header)};'+
      'const overlays=[];for(const i of [1,2]){const c=document.createElement("canvas");c.width=w*3;c.height=h;const t=c.getContext("2d");t.drawImage(images[0],0,0);t.drawImage(images[i],w,0);t.drawImage(images[0],2*w,0);t.globalAlpha=.5;t.drawImage(images[i],2*w,0);overlays.push(c.toDataURL("image/png").split(",")[1]);}'+
      'return {metrics,unchanged,overlays,sizes:images.map(i=>[i.width,i.height])};})()';
    const comparisons=await evalJs(source);
    writeFileSync(join(evidence,'missions-ab-baseline-384x512.png'),Buffer.from(before,'base64'));
    writeFileSync(join(evidence,'missions-ab-candidate-384x512.png'),Buffer.from(after,'base64'));
    writeFileSync(join(evidence,'missions-ab-original-render-overlay-before-384x512.png'),Buffer.from(comparisons.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-ab-original-render-overlay-after-384x512.png'),Buffer.from(comparisons.overlays[1],'base64'));
    const delta=(region:string)=>comparisons.metrics[region].delta;
    const result={base:'work6/web-3d-preview',baselineClass,frame:'identical loaded DOM; paused animations; same viewport, canvas and deviceScaleFactor',roi:comparisons.metrics,unchanged:comparisons.unchanged,referenceSize:comparisons.sizes[0],renderSize:comparisons.sizes[2],beforeLayout,afterLayout,approved:false};
    writeFileSync(join(evidence,'work8-missions-controlled-ab.json'),JSON.stringify(result,null,2));
    console.log('WORK8 native same-scene A/B '+JSON.stringify(result.roi));
    assert.equal(afterLayout.quests,3,'only the three existing true missions');
    assert.equal(afterLayout.days.length,7,'all seven real daily rewards');
    assert.equal(afterLayout.navCount,5,'untouched 5-item dock');
    assert.ok(afterLayout.documentWidth<=386,'no horizontal overflow');
    assert.ok(afterLayout.days.every((d:any)=>d.x>=-1&&d.right<=385),'seven days visible horizontally at 384');
    console.log('WORK8 day 384 actual geometry '+JSON.stringify({days:afterLayout.days,content:afterLayout.dayContent,dock:afterLayout.nav}));
    assert.ok(afterLayout.dayContent.every((pair:any)=>pair.every((item:any)=>item && item.top>=0 && item.bottom<=afterLayout.nav.y+2)),
      'all seven CHEST ARTWORKS and DAY LABELS visible above unchanged dock at 384');
    assert.ok(Math.abs(afterLayout.nav.y-beforeLayout.nav.y)<.1,'same dock geometry');
    assert.ok(comparisons.unchanged.dock<0.1&&comparisons.unchanged.header<0.1,'only Missions content may change');
    assert.ok(delta('full') < -0.15 && delta('quests') < -0.25 && delta('daily') < -0.25,
      'Missions candidate MUST improve full MAE and both active content ROIs');
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:568,mobile:true,deviceScaleFactor:1,screenWidth:320,screenHeight:568});
    await delay(200);
    const narrow=await evalJs('(()=>{const d=document.querySelector(".w8-approved-days"),a=document.querySelector(".app-sheet-content");if(a)a.scrollTop=a.scrollHeight;if(d)d.scrollLeft=d.scrollWidth;const last=d?.lastElementChild?.getBoundingClientRect(),container=d?.getBoundingClientRect(),dock=document.querySelector(".app-sheet > .harbour-nav")?.getBoundingClientRect();return {items:d?.children.length,scrollWidth:d?.scrollWidth,clientWidth:d?.clientWidth,day7Visible:last&&container?last.left>=container.left-2&&last.right<=container.right+2:false,navCount:document.querySelectorAll(".app-sheet > .harbour-nav .harbour-nav-item").length,dockBottom:dock?.bottom,width:document.documentElement.scrollWidth}})()');
    writeFileSync(join(evidence,'work8-missions-320-scroll.json'),JSON.stringify(narrow,null,2));
    assert.equal(narrow.items,7);
    assert.equal(narrow.navCount,5);
    assert.ok(narrow.width<=322&&narrow.day7Visible&&Math.abs(narrow.dockBottom-568)<=2,'320 scroll, day seven and five-item dock usable');
  } finally {
    try{ws?.close();}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');
    await delay(180);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    rmSync(profile,{recursive:true,force:true});
  }
});
