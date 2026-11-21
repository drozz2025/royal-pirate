#!/usr/bin/env node
/**
 * WORK8/#104. Real Chromium CDP, 384x512 DPR1, same decoded Missions DOM,
 * paused animations. Baseline toggles only the new 07-only seascape blue correction.
 * No fake profile, screenshot background, virtual economy or Ranking changes.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

const out=process.env.WORK8_CAPTURE_DIR||'work8-qa';
const origin=process.env.PORTO_PREVIEW_URL||'http://127.0.0.1:4178/royal-pirate/';
const chromeBin=process.env.CHROME_BIN||
  spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],
    {encoding:'utf8'}).stdout.trim();
assert.ok(chromeBin,'Native Chromium required for this visual gate');
mkdirSync(out,{recursive:true});
const profile=mkdtempSync(join(tmpdir(),'rp-work8-active-tab-ink-'));
const port=9491+(process.pid%2000);
const chrome=spawn(chromeBin,[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
  '--remote-allow-origins=*','--remote-debugging-port='+port,
  '--user-data-dir='+profile,'about:blank'
],{stdio:'ignore'});
let ws;
try{
  let pages;
  for(let n=0;n<100;n++){
    try{
      const r=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1000)});
      if(r.ok){pages=await r.json();break;}
    }catch{}
    assert.equal(chrome.exitCode,null,'Chromium exited before CDP startup');
    await delay(150);
  }
  const page=pages?.find(p=>p.type==='page');
  assert.ok(page,'Browser tab required');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{
    ws.addEventListener('open',res,{once:true});
    ws.addEventListener('error',rej,{once:true});
  });
  let seq=0;
  const pending=new Map();
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);const p=pending.get(m.id);
    if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
  });
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq,timeout=setTimeout(()=>{
      pending.delete(id);reject(Error('CDP timeout '+method));
    },25000);
    pending.set(id,{
      resolve:v=>{clearTimeout(timeout);resolve(v);},
      reject:e=>{clearTimeout(timeout);reject(e);}
    });
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    assert.ok(!r.exceptionDetails,'Chromium exception: '+r.exceptionDetails?.text);
    return r.result.value;
  };
  const wait=async selector=>{
    for(let n=0;n<75;n++){
      if(await evaluate('!!document.querySelector('+JSON.stringify(selector)+')'))return;
      await delay(100);
    }
    throw Error('Missing live element '+selector);
  };
  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:384,height:512,mobile:true,deviceScaleFactor:1,
    screenWidth:384,screenHeight:512
  });
  await cmd('Page.navigate',{url:origin});
  await wait('.harbour-screen .harbour-nav-item');
  await delay(450);
  assert.ok(await evaluate('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()'),
    'Reach the real 07 screen from Porto via an actual click');
  await wait('.w8-approved-missions .w8-approved-days li:nth-child(7)');
  const decoded=await evaluate('(async()=>{'+
    'const refs=[...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(n=>n.getAttribute("href")).filter(Boolean);'+
    'await Promise.all([...new Set(refs)].map(src=>{const im=new Image();im.src=src;return im.decode()}));'+
    'await document.fonts.ready;'+
    'const st=document.createElement("style");st.textContent="*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}";document.head.append(st);'+
    'document.querySelectorAll("*").forEach(el=>el.getAnimations?.().forEach(a=>a.pause()));return refs.length;})()');
  assert.ok(decoded>=8,'Genuine source-art WebP images must have been decoded');
  const geometry='(()=>{const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null};'+
    'const days=[...document.querySelectorAll(".w8-approved-days li")];'+
    'const nav=document.querySelector(".app-sheet > .harbour-nav");'+
    'return {quests:document.querySelectorAll(".w8-approved-quest").length,days:days.map(rect),'+
    'chests:days.map(e=>rect(e.querySelector(".w8-approved-chest"))),'+
    'labels:days.map(e=>rect(e.querySelector("small"))),'+
    'nav:rect(nav),navButtons:nav?.querySelectorAll(".harbour-nav-item").length,'+
    'questButtons:[...document.querySelectorAll(".w8-approved-quest > button")].map(rect),'+
    'tabs:[...document.querySelectorAll(".w8-approved-tabs button")].map(rect),'+
    'docWidth:document.documentElement.scrollWidth,'+
    'selectedTabFilter:getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-tabs button[aria-pressed=true]")).filter};})()';
  const capture=async()=> (await cmd('Page.captureScreenshot',{
    format:'png',fromSurface:true,captureBeyondViewport:false
  })).data;
  await evaluate('document.documentElement.classList.add("work8-missions-active-tab-ink-ab-baseline");true');
  await delay(140);
  const beforeGeometry=await evaluate(geometry);
  const before=await capture();
  await evaluate('document.documentElement.classList.remove("work8-missions-active-tab-ink-ab-baseline");true');
  await delay(140);
  const afterGeometry=await evaluate(geometry);
  const render=await capture();
  assert.notEqual(beforeGeometry.selectedTabFilter,afterGeometry.selectedTabFilter,
    'Candidate must change the real 07 active tab filter');
  const approved=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
  const compareSource='(async()=>{'+
    'const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});'+
    'const ims=await Promise.all(['+
      JSON.stringify('data:image/webp;base64,'+approved)+','+
      JSON.stringify('data:image/png;base64,'+before)+','+
      JSON.stringify('data:image/png;base64,'+render)+'].map(load));'+
    'const w=384,h=512;if(ims.some(i=>i.width!==w||i.height!==h))throw Error("No scaled comparison allowed");'+
    'const pixels=ims.map(im=>{const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(im,0,0);return x.getImageData(0,0,w,h).data;});'+
    'const roi={full:[0,0,384,512],activeTab:[16,116,120,154],otherTabs:[120,116,372,154],quests:[12,156,372,321],daily:[13,325,373,430],header:[0,0,384,70],dock:[0,430,384,512]};'+
    'function mae(a,b,r){let total=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const p=4*(y*w+x);for(let c=0;c<3;c++){total+=Math.abs(a[p+c]-b[p+c]);n++;}}return total/n;};'+
    'const scores={};for(const [name,r] of Object.entries(roi)){const baseline=mae(pixels[0],pixels[1],r),candidate=mae(pixels[0],pixels[2],r);scores[name]={baseline,candidate,delta:candidate-baseline};}'+
    'let changed=0;for(let i=0;i<pixels[1].length;i+=4){if(pixels[1][i]!==pixels[2][i]||pixels[1][i+1]!==pixels[2][i+1]||pixels[1][i+2]!==pixels[2][i+2])changed++;}'+
    'const canvas=document.createElement("canvas");canvas.width=4*w;canvas.height=h;const x=canvas.getContext("2d");'+
    'x.drawImage(ims[0],0,0);x.drawImage(ims[1],w,0);x.drawImage(ims[2],2*w,0);x.drawImage(ims[0],3*w,0);x.globalAlpha=.5;x.drawImage(ims[2],3*w,0);'+
    'return {scores,changed,montage:canvas.toDataURL("image/png").split(",")[1],sizes:ims.map(i=>[i.width,i.height])};})()';
  const ab=await evaluate(compareSource);
  writeFileSync(join(out,'work8-active-tab-ink-before-384x512.png'),Buffer.from(before,'base64'));
  writeFileSync(join(out,'work8-active-tab-ink-render-384x512.png'),Buffer.from(render,'base64'));
  writeFileSync(join(out,'work8-active-tab-ink-original-before-render-overlay-384x512.png'),Buffer.from(ab.montage,'base64'));
  const result={
    issue:104,scope:'WORK8 07 Missões only, selected real daily tab enamel only',
    base:'work6/web-3d-preview',reference:'assets/design-approved/07-missoes.webp',
    frame:'same genuine Chromium document/frame; native 384x512 DPR1; WebP decoded; animations paused',
    scores:ab.scores,changedPixels:ab.changed,referenceAndRenderSizes:ab.sizes,
    before:beforeGeometry,after:afterGeometry,approved:false,approvedScreens:0
  };
  writeFileSync(join(out,'work8-active-tab-ink-mae-roi.json'),JSON.stringify(result,null,2));
  console.log('WORK8 07 real same-frame metrics '+JSON.stringify(ab.scores));
  console.log('WORK8 changed pixels '+ab.changed);
  const {selectedTabFilter:beforePaint,...oldPosition}=beforeGeometry;
  const {selectedTabFilter:afterPaint,...newPosition}=afterGeometry;
  assert.deepEqual(oldPosition,newPosition,'Do not shift any live tap target, day, quest or dock geometry');
  assert.equal(afterGeometry.quests,3,'Only 3 genuine missions');
  assert.equal(afterGeometry.days.length,7,'All 7 true day slots');
  assert.equal(afterGeometry.navButtons,5,'Unchanged five-item dock');
  assert.ok(afterGeometry.docWidth<=386,'No horizontal overflow');
  assert.ok(afterGeometry.days.every(d=>d.x>=0&&d.right<=384),'Seven day slots in 384 viewport');
  assert.ok([...afterGeometry.chests,...afterGeometry.labels].every(r=>r&&r.bottom<=afterGeometry.nav.y+2),
    'All seven chest art and labels above the dock');
  assert.ok(ab.changed>150,'This is an actual 07 active tab visual change');
  assert.ok(ab.scores.full.delta<0&&ab.scores.activeTab.delta<-.7,
    'Candidate must REDUCE native-reference MAE for full and selected tab ROI');
  assert.ok(Math.abs(ab.scores.header.delta)<.01&&Math.abs(ab.scores.dock.delta)<.01,
    'Header, dock, real objective data and Ranking remain unaffected');
  // Explicit narrow-phone interaction: actual CDP touch events and 320px scrolling.
  // 384x512 A/B evidence above is sealed before this viewport change.
  await cmd('Emulation.setDeviceMetricsOverride',{
    width:320,height:568,mobile:true,deviceScaleFactor:1,
    screenWidth:320,screenHeight:568
  });
  await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await delay(220);
  const tapTab=async (n)=>{
    const center=await evaluate('(()=>{const el=document.querySelector(".w8-approved-tabs button:nth-child('+n+')");'+
      'if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
    assert.ok(center,'Narrow-screen tab '+n+' must exist');
    await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
    await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await delay(130);
    return evaluate('document.querySelector(".w8-approved-tabs button:nth-child('+n+')")?.getAttribute("aria-pressed")');
  };
  assert.equal(await tapTab(2),'true','320px weekly tab must respond to native touch');
  assert.equal(await tapTab(1),'true','320px daily tab must respond to native touch and restore rewards');
  await wait('.w8-approved-days li:nth-child(7)');
  const scroll320=await evaluate('(()=>{const panel=document.querySelector(".app-sheet-content");'+
    'const nav=document.querySelector(".app-sheet > .harbour-nav");'+
    'const chests=[...document.querySelectorAll(".w8-approved-days li")];'+
    'if(!panel||!nav)return null;const navBox=nav.getBoundingClientRect();'+
    'const before=panel.scrollTop;panel.scrollTop=panel.scrollHeight;'+
    'const last=chests[6]?.getBoundingClientRect();'+
    'return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,'+
    'scrollBefore:before,scrollAfter:panel.scrollTop,scrollHeight:panel.scrollHeight,'+
    'clientHeight:panel.clientHeight,quests:document.querySelectorAll(".w8-approved-quest").length,'+
    'rewards:chests.length,navItems:nav.querySelectorAll(".harbour-nav-item").length,'+
    'navBottom:navBox.bottom,lastRewardBottom:last?.bottom,navTop:navBox.top};})()');
  assert.ok(scroll320,'320px real scrolling container must exist');
  assert.equal(scroll320.width,320);
  assert.equal(scroll320.height,568);
  assert.ok(scroll320.documentWidth<=322,'320px horizontal overflow regression');
  assert.equal(scroll320.quests,3,'3 genuine objectives after narrow touch navigation');
  assert.equal(scroll320.rewards,7,'7 real rewards after narrow touch navigation');
  assert.equal(scroll320.navItems,5,'all five WORK0 dock controls retained at 320');
  assert.ok(Math.abs(scroll320.navBottom-568)<2,'WORK0 dock stays pinned at bottom');
  assert.ok(scroll320.scrollHeight<=scroll320.clientHeight+1 ||
    scroll320.scrollAfter>scroll320.scrollBefore,
    '320px overflow must respond to scroll');
  assert.ok(scroll320.lastRewardBottom<=scroll320.navTop+2 ||
    scroll320.scrollAfter>scroll320.scrollBefore,
    'last real reward must fit above dock or be reachable through real scroll');
  result.scroll320=scroll320;
  writeFileSync(join(out,'work8-active-tab-ink-mae-roi.json'),JSON.stringify(result,null,2));
  writeFileSync(join(out,'work8-active-tab-ink-scroll-320x568.png'),
    Buffer.from(await capture(),'base64'));
  console.log('WORK8 320 real touch/scroll PASS '+JSON.stringify(scroll320));

  console.log('WORK8 PASS: native 07 active daily tab ink tuned. approved:false 0/8.');
}finally{
  try{ws?.close();}catch{}
  chrome.kill('SIGTERM');
  await delay(250);
  if(chrome.exitCode===null)chrome.kill('SIGKILL');
  rmSync(profile,{recursive:true,force:true});
}
