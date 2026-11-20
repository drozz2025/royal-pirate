import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/* WORK8/#104: genuine same-DOM, paused-frame Chromium A/B. This test never
   modifies player progress, paints a fake reward, or edits another WORK.
   The HTML root flag opts out of this PR's isolated foreground CSS only. */
test('WORK8 07 real quest foreground contrast: 384 A/B + 320/390/430, all 7 rewards', {timeout:260000}, async()=>{
  await delay(65000); // isolate from earlier Chromium GPU visual regression suite
  const chrome=process.env.CHROME_BIN ||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chrome,'Native Chromium required; cannot mark visual QA complete without it');
  const build=spawnSync('npm',['run','build','--','--base=/'],{encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,'Production build required: '+build.stdout+'\n'+build.stderr);
  const out='work8-qa';mkdirSync(out,{recursive:true});
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-foreground-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4188','--strictPort'],{stdio:'ignore'});
  let browser:any,ws:WebSocket|undefined;
  try{
    let ready=false;
    for(let i=0;i<120;i++){
      try{const r=await fetch('http://127.0.0.1:4188/');if(r.ok){ready=true;break}}catch{}
      await delay(130);
    }
    assert.ok(ready,'Real Vite production preview must start');
    const port=10200+(process.pid%3000);
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+port,'--remote-allow-origins=*','--user-data-dir='+profile,
      'about:blank'],{stdio:'ignore'});
    let pages:any[];
    for(let i=0;i<120;i++){
      try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');if(r.ok){pages=await r.json();break}}catch{}
      await delay(130);
    }
    const page=pages!.find((p:any)=>p.type==='page');
    assert.ok(page,'Native Chromium CDP page required');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((ok,fail)=>{ws!.addEventListener('open',()=>ok(),{once:true});ws!.addEventListener('error',fail,{once:true})});
    let seq=0;
    const pending=new Map<number,{resolve:(x:any)=>void,reject:(e:Error)=>void}>();
    ws.addEventListener('message',(ev:any)=>{
      const v=JSON.parse(ev.data.toString()),p=pending.get(v.id);
      if(p){pending.delete(v.id);v.error?p.reject(Error(v.error.message)):p.resolve(v.result)}
    });
    const cdp=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{
      const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},16000);
      pending.set(id,{resolve:x=>{clearTimeout(timeout);resolve(x)},reject:e=>{clearTimeout(timeout);reject(e)}});
      ws!.send(JSON.stringify({id,method,params}));
    });
    const ev=async(code:string)=>{
      const r=await cdp('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
      assert.ok(!r.exceptionDetails,'Browser expression: '+r.exceptionDetails?.text);
      return r.result?.value;
    };
    await cdp('Page.enable');await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride',{width:384,height:512,mobile:true,deviceScaleFactor:1,screenWidth:384,screenHeight:512});
    await cdp('Page.navigate',{url:'http://127.0.0.1:4188/'});
    let readyUi=false;
    for(let i=0;i<80;i++){if(await ev('!!document.querySelector(".harbour-screen .harbour-nav-item")')){readyUi=true;break}await delay(100)}
    assert.ok(readyUi,'Porto navigation must be real and mounted');
    const clicked=await ev('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(b=>b.textContent?.includes("MISSÕES"));b?.click();return !!b})()');
    assert.ok(clicked,'Enter Missions via real navigation, not a mock screen');
    for(let i=0;i<80;i++){if(await ev('!!document.querySelector(".w8-approved-missions .w8-approved-quest-list")'))break;await delay(120)}
    assert.ok(await ev('!!document.querySelector(".w8-approved-missions .w8-approved-quest-list")'));
    const decoded=await ev('(async()=>{const x=[...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(i=>i.getAttribute("href")).filter(Boolean);await Promise.all([...new Set(x)].map(async s=>{const i=new Image();i.src=s;await i.decode()}));await document.fonts.ready;return x.length})()');
    assert.ok(decoded>=8,'Real approved WEBP artwork must decode');
    await delay(360);
    await ev('(()=>{document.querySelectorAll("*").forEach(x=>x.getAnimations?.().forEach(a=>a.pause()));return true})()');
    const rects=()=>ev('(()=>{const r=e=>{const a=e?.getBoundingClientRect();return a?{left:a.left,top:a.top,right:a.right,bottom:a.bottom}:null};return {quests:[...document.querySelectorAll(".w8-approved-quest")].map(r),buttons:[...document.querySelectorAll(".w8-approved-quest>button")].map(r),days:[...document.querySelectorAll(".w8-approved-days li")].map(r),chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(r),labels:[...document.querySelectorAll(".w8-approved-days li small")].map(r),tabs:[...document.querySelectorAll(".w8-approved-tabs button")].map(r),dock:r(document.querySelector(".app-sheet>.harbour-nav")),dockItems:document.querySelectorAll(".app-sheet>.harbour-nav .harbour-nav-item").length,documentWidth:document.documentElement.scrollWidth,captionFilter:getComputedStyle(document.querySelector(".w8-approved-quest-core>strong")).filter,rewardsFilter:getComputedStyle(document.querySelector(".w8-approved-quest-rewards")).filter}})()');
    const flag='work8-missions-foreground-contrast-ab-baseline';
    await ev('document.documentElement.classList.add('+JSON.stringify(flag)+');true');
    await delay(180);
    const beforeLayout=await rects();
    const before=(await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await ev('document.documentElement.classList.remove('+JSON.stringify(flag)+');true');
    await delay(180);
    const renderLayout=await rects();
    const render=(await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const metrics=await ev('(async()=>{const urls='+JSON.stringify([
      'data:image/webp;base64,'+original,
      'data:image/png;base64,'+before,
      'data:image/png;base64,'+render
    ])+';const imgs=await Promise.all(urls.map(s=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=fail;i.src=s})));'+
      'if(imgs.some(i=>i.width!==384||i.height!==512))throw Error("Reference and captures MUST remain native 384x512");'+
      'const d=imgs.map(i=>{const c=document.createElement("canvas");c.width=384;c.height=512;const x=c.getContext("2d");x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data});'+
      'const roi={full:[0,0,384,512],quests:[12,155,372,321],questInk:[67,163,366,315],daily:[13,325,373,436],chests:[20,356,370,427],header:[0,0,384,70],dock:[0,451,384,512]};'+
      'function mae(a,b,r){let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const j=4*(y*384+x);for(let k=0;k<3;k++){sum+=Math.abs(a[j+k]-b[j+k]);n++}}return sum/n}'+
      'const values={};for(const [k,r] of Object.entries(roi)){const base=mae(d[0],d[1],r),candidate=mae(d[0],d[2],r);values[k]={before:base,render:candidate,delta:candidate-base,paintChange:mae(d[1],d[2],r)}}'+
      'const out=document.createElement("canvas");out.width=1536;out.height=512;const c=out.getContext("2d");imgs.forEach((i,n)=>c.drawImage(i,384*n,0));c.drawImage(imgs[0],1152,0);c.globalAlpha=.5;c.drawImage(imgs[2],1152,0);return {values,montage:out.toDataURL("image/png").split(",")[1]}})()');
    writeFileSync(join(out,'missions-foreground-ORIGINAL-BEFORE-RENDER-OVERLAY-384x512.png'),Buffer.from(metrics.montage,'base64'));
    writeFileSync(join(out,'missions-foreground-BEFORE-384x512.png'),Buffer.from(before,'base64'));
    writeFileSync(join(out,'missions-foreground-RENDER-384x512.png'),Buffer.from(render,'base64'));
    const report={issue:104,scope:'only 07 Missions three authentic quest foreground groups',
      headBase:'7d19bbce028e39d6149c82c96bdbf660c208d034',
      reference:'assets/design-approved/07-missoes.webp',
      source:'same loaded and decoded Chromium 384x512 DOM; animations paused; no scale',
      roi:metrics.values,baselineLayout:beforeLayout,candidateLayout:renderLayout,approved:false,approvedScreens:0};
    writeFileSync(join(out,'missions-foreground-native-ab.json'),JSON.stringify(report,null,2));
    console.log('WORK8_FOREGROUND_NATIVE_AB '+JSON.stringify({roi:report.roi,filters:{before:beforeLayout.captionFilter,render:renderLayout.captionFilter}}));
    const comparable=(x:any)=>({...x,captionFilter:null,rewardsFilter:null});
    assert.deepEqual(comparable(beforeLayout),comparable(renderLayout),'No geometric changes to 3 missions, 7 chests, tabs, buttons or WORK0 dock');
    assert.equal(renderLayout.quests.length,3);
    assert.equal(renderLayout.days.length,7);
    assert.equal(renderLayout.dockItems,5);
    assert.ok(renderLayout.documentWidth<=386);
    assert.ok(renderLayout.chests.every((r:any)=>r.bottom<=renderLayout.dock.top+2),'Seven real chest illustrations above dock');
    assert.ok(renderLayout.labels.every((r:any)=>r.bottom<=renderLayout.dock.top+2),'Seven day labels above dock');
    assert.ok(renderLayout.buttons.every((r:any)=>r.bottom<=renderLayout.dock.top&&r.bottom-r.top>=30),'Three mission buttons touchable');
    assert.notEqual(beforeLayout.captionFilter,renderLayout.captionFilter,'Ensure browser applied this CSS, not a false A/B');
    assert.ok(metrics.values.full.delta<-.025&&metrics.values.quests.delta<-.06&&metrics.values.questInk.delta<-.06,
      'Reference MAE of the whole frame and real three-quest ink must improve, not just change');
    assert.ok(Math.abs(metrics.values.daily.delta)<.03&&Math.abs(metrics.values.chests.delta)<.03,
      'All seven daily real reward tiles must remain visually identical');
    assert.ok(metrics.values.dock.paintChange<.08&&metrics.values.header.paintChange<.08,
      'Unowned dock/header must remain pixel-identical');

    // Run real live touch/navigational assertions without changing game state.
    const touch=await ev('(()=>{const x=[...document.querySelectorAll(".w8-approved-tabs button")];const before=x[0]?.getAttribute("aria-pressed");x[1]?.click();const switched=x[1]?.getAttribute("aria-pressed");x[0]?.click();return {count:x.length,before,switched,restored:x[0]?.getAttribute("aria-pressed")}})()');
    assert.equal(touch.count,3);
    assert.equal(touch.switched,'true');
    assert.equal(touch.restored,'true');
    for(const vp of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
      await cdp('Emulation.setDeviceMetricsOverride',{...vp,mobile:true,deviceScaleFactor:1,screenWidth:vp.width,screenHeight:vp.height});
      await delay(250);
      const data=await ev('(()=>{const d=document.querySelector(".w8-approved-days"),a=document.querySelector(".app-sheet-content");if(a)a.scrollTop=a.scrollHeight;if(d)d.scrollLeft=d.scrollWidth;const rect=d?.getBoundingClientRect(),last=d?.lastElementChild?.getBoundingClientRect();return {width:document.documentElement.scrollWidth,missions:document.querySelectorAll(".w8-approved-quest").length,days:d?.children.length,dock:document.querySelectorAll(".app-sheet>.harbour-nav .harbour-nav-item").length,day7Reachable:!!(last&&rect&&last.left>=rect.left-2&&last.right<=rect.right+2)}})()');
      assert.equal(data.missions,3);
      assert.equal(data.days,7);
      assert.equal(data.dock,5);
      assert.ok(data.width<=vp.width+2,'No horizontal page overflow '+vp.width);
      assert.ok(data.day7Reachable,'Real seventh day is horizontally scroll-reachable at '+vp.width);
      writeFileSync(join(out,'missions-foreground-'+vp.width+'x'+vp.height+'.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data,'base64'));
      writeFileSync(join(out,'missions-foreground-'+vp.width+'x'+vp.height+'.json'),JSON.stringify(data,null,2));
    }
  }finally{
    try{ws?.close()}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');await delay(200);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    try{rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}catch{}
  }
});
