/* WORK8 #104 — native 384x512 same-frame sea backdrop experiment.
   No gameplay mocks, source screenshots as page backgrounds, 08 Ranking,
   WORK0 header/dock, publication, external services, or paid assets. */
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';

const dir='work8-qa'; mkdirSync(dir,{recursive:true});
const chromeBin=process.env.CHROME_BIN || spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
assert.ok(chromeBin,'Native Chromium is mandatory');
const folder=mkdtempSync(join(tmpdir(),'royal-work8-coast-'));
const chrome=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
  '--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+folder,'about:blank'],{stdio:'ignore'});
let socket;
try {
  let tab;
  for(let i=0;i<150&&!tab;i++){
    try{
      const port=Number(readFileSync(join(folder,'DevToolsActivePort'),'utf8').split('\n')[0]);
      const response=await fetch('http://127.0.0.1:'+port+'/json/list');
      if(response.ok)tab=(await response.json()).find(p=>p.type==='page'&&p.webSocketDebuggerUrl);
    }catch{}
    if(!tab)await sleep(140);
  }
  assert.ok(tab,'Native Chromium CDP page not available');
  socket=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    socket.addEventListener('open',resolve,{once:true});
    socket.addEventListener('error',reject,{once:true});
  });
  const pending=new Map();
  let seq=0;
  socket.addEventListener('message',e=>{
    const msg=JSON.parse(e.data.toString());
    const p=pending.get(msg.id);
    if(p){pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)}
  });
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq,timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},25000);
    pending.set(id,{resolve:r=>{clearTimeout(timeout);resolve(r)},reject:e=>{clearTimeout(timeout);reject(e)}});
    socket.send(JSON.stringify({id,method,params}));
  });
  const run=async code=>{
    const r=await cdp('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Chromium evaluate: '+r.exceptionDetails.text);
    return r.result.value;
  };
  const grab=async name=>{
    const b64=(await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    if(name)writeFileSync(join(dir,name),Buffer.from(b64,'base64'));
    return b64;
  };
  const viewport=async (w,h)=>{
    await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1,screenWidth:w,screenHeight:h});
    await sleep(150);
  };
  const wait=async sel=>{
    for(let k=0;k<140;k++){
      if(await run('!!document.querySelector('+JSON.stringify(sel)+')'))return;
      await sleep(110);
    }
    throw Error('Missing native DOM '+sel);
  };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await viewport(384,512);
  await cdp('Page.navigate',{url:'http://127.0.0.1:4178/royal-pirate/'});
  await wait('.harbour-screen .harbour-nav-item');
  const entered=await run('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()');
  assert.ok(entered,'real Porto must navigate to Missões');
  await wait('.w8-approved-missions .w8-approved-quest-list');
  await run('(async()=>{await document.fonts.ready;const sources=[...new Set([...document.querySelectorAll(".w8-approved-missions image")].map(i=>i.getAttribute("href")).filter(Boolean))];await Promise.all(sources.map(src=>new Promise(resolve=>{const i=new Image();i.onload=i.onerror=resolve;i.src=src})));document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return sources.length})()');

  const status=()=>run('(()=>{const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]};const quest=[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest")];const days=[...document.querySelectorAll(".w8-approved-missions .w8-approved-days li")];const nav=q(".app-sheet > .harbour-nav");return {quest:quest.length,days:days.length,navCount:nav.querySelectorAll(".harbour-nav-item").length,nav:rect(nav),header:rect(q(".app-sheet-header")),questBoxes:quest.map(rect),dayBoxes:days.map(rect),chests:days.map(d=>rect(d.querySelector(".w8-approved-chest"))),captions:days.map(d=>rect(d.querySelector("small"))),text:quest.map(d=>d.querySelector("strong").textContent),rewards:quest.map(d=>[...d.querySelectorAll(".w8-approved-quest-rewards strong")].map(x=>x.textContent)),overflow:document.documentElement.scrollWidth};})()');
  await run('document.documentElement.classList.add("work8-missions-title-register-ab-baseline");true');
  await sleep(150);
  const geometryBefore=await status();
  const before=await grab('missions-coast-BEFORE-384x512.png');
  await run('document.documentElement.classList.remove("work8-missions-title-register-ab-baseline");true');
  await sleep(150);
  const geometryAfter=await status();
  const after=await grab('missions-coast-RENDER-384x512.png');
  assert.deepEqual(geometryAfter,geometryBefore,'scenic colour must never change touch geometry, game data or dock');
  assert.equal(geometryAfter.quest,3);assert.equal(geometryAfter.days,7);assert.equal(geometryAfter.navCount,5);
  assert.ok(geometryAfter.overflow<=386);
  const navY=geometryAfter.nav[1];
  assert.ok(geometryAfter.captions.every(r=>r[1]+r[3]<=navY+3),'all seven rewards must be above dock at native 384');
  const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
  writeFileSync(join(dir,'missions-coast-ORIGINAL-384x512.webp'),Buffer.from(original,'base64'));

  const source=String.raw`(async()=>{
    const load=s=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=s});
    const images=await Promise.all([__SOURCE__,__BEFORE__,__AFTER__].map(load));
    const W=384,H=512;
    if(images.some(i=>i.width!==W||i.height!==H))throw Error('original and native Chromium must both be 384x512');
    const imagePixels=images.map(i=>{const c=document.createElement('canvas');c.width=W;c.height=H;const t=c.getContext('2d');t.drawImage(i,0,0);return t.getImageData(0,0,W,H).data});
    const roi={full:[0,0,384,512],title:[15,72,369,120],quest:[12,155,372,326],daily:[12,326,373,437],chests:[18,354,371,430],header:[0,0,384,70],dock:[0,452,384,512]};
    const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const p=4*(y*W+x);for(let k=0;k<3;k++){sum+=Math.abs(a[p+k]-b[p+k]);n++}}return sum/n};
    const scores={};for(const [name,r] of Object.entries(roi)){const baseline=mae(imagePixels[0],imagePixels[1],r),candidate=mae(imagePixels[0],imagePixels[2],r);scores[name]={baseline,candidate,delta:candidate-baseline}}
    const unchanged={header:mae(imagePixels[1],imagePixels[2],roi.header),dock:mae(imagePixels[1],imagePixels[2],roi.dock),quest:mae(imagePixels[1],imagePixels[2],roi.quest),daily:mae(imagePixels[1],imagePixels[2],roi.daily)};
    let overlay=null,diff=null;
    if(__MAKE_ART__){
      const c=document.createElement('canvas');c.width=W*4;c.height=H;
      const t=c.getContext('2d');for(let i=0;i<3;i++)t.drawImage(images[i],i*W,0);
      t.drawImage(images[0],3*W,0);t.globalAlpha=.5;t.drawImage(images[2],3*W,0);
      overlay=c.toDataURL('image/png').split(',')[1];
      const d=document.createElement('canvas');d.width=W;d.height=H;const dt=d.getContext('2d');const pixels=dt.createImageData(W,H);
      for(let i=0;i<pixels.data.length;i+=4){for(let ch=0;ch<3;ch++)pixels.data[i+ch]=Math.min(255,Math.abs(imagePixels[0][i+ch]-imagePixels[2][i+ch])*3);pixels.data[i+3]=255}
      dt.putImageData(pixels,0,0);diff=d.toDataURL('image/png').split(',')[1];
    }
    return {scores,unchanged,overlay,diff};
  })()`;
  const compare=async(a,b,makeArt=false)=>{
    const code=source.replace('__SOURCE__',JSON.stringify('data:image/webp;base64,'+original))
      .replace('__BEFORE__',JSON.stringify('data:image/png;base64,'+a))
      .replace('__AFTER__',JSON.stringify('data:image/png;base64,'+b))
      .replace('__MAKE_ART__',String(makeArt));
    return await run(code);
  };
  const measured=await compare(before,after,true);
  if(measured.overlay)writeFileSync(join(dir,'missions-coast-ORIGINAL-BEFORE-RENDER-OVERLAY-384x512.png'),Buffer.from(measured.overlay,'base64'));
  if(measured.diff)writeFileSync(join(dir,'missions-coast-DIFF-384x512.png'),Buffer.from(measured.diff,'base64'));
  console.log('WORK8 #104 TITLE ORIGINAL/BEFORE/RENDER 384x512 '+JSON.stringify(measured.scores));

  // Controlled colour exploration. These are investigative variants, not
  // production app states. The same DOM, profile, viewport and frozen frame
  // are used for every sample and are compared to the source artwork.
  const sweep=[];
  const svg='.w8-approved-missions .w8-approved-title > svg.w8-approved-painting-title-missions';
  for(const dx of [-6,-4,-2,0,2,4,6]){
    for(const dy of [-6,-4,-2,0,2,4,6]){
      const transform='translateX(calc(-50% + '+dx+'px)) translateY('+dy+'px)';
      await run('document.querySelector('+JSON.stringify(svg)+').style.transform='+JSON.stringify(transform)+';true');
      await sleep(35);
      const shot=await grab(null);
      const score=await compare(before,shot,false);
      sweep.push({dx,dy,full:score.scores.full.delta,title:score.scores.title.delta});
    }
  }
  await run('document.querySelector('+JSON.stringify(svg)+').style.removeProperty("transform");true');
  sweep.sort((x,y)=>x.full-y.full);
  console.log('WORK8 #104 TITLE 30 native parameter candidates, best 12 '+JSON.stringify(sweep.slice(0,12)));
  const report={issue:104,branch:'WORK8 coast tint',base:'HEAD verified by source PR metadata',
    original:'assets/design-approved/07-missoes.webp',
    mandatoryReferences:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'].map(n=>'assets/design-approved/'+n),
    viewport:'384x512 DPR1; one genuine native Chromium scene/frame, animations paused',
    comparison:'ORIGINAL / BEFORE toggled opt-out root class / RENDER production style / OVERLAY',
    effect:'decorative 07 07 title artwork only; no 08 Ranking, game-state or WORK0 dock edits',
    measured:measured.scores,unchanged:measured.unchanged,
    baseline:geometryBefore,candidate:geometryAfter,topSweep:sweep.slice(0,15),approved:false,approvedScreens:0};
  writeFileSync(join(dir,'work8-missions-coast-native-ab.json'),JSON.stringify(report,null,2));
  assert.ok(measured.unchanged.header<.05&&measured.unchanged.dock<.05,'WORK0 HUD and dock must remain pixel-identical');
  // Translucent boards can show the recoloured scenery behind them; live objective text, reward amounts and hitboxes remain identical via geometryBefore/After.
  assert.deepEqual(geometryAfter.text,geometryBefore.text);
  assert.deepEqual(geometryAfter.rewards,geometryBefore.rewards);
  // Record narrow and tall-screen geometry even if the chosen pigment fails
  // native MAE; the caller can reject a regressive candidate honestly.
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    await viewport(w,h);
    const responsive=await run('(()=>{const q=s=>document.querySelector(s),days=q(".w8-approved-days"),nav=q(".app-sheet > .harbour-nav"),sheet=q(".app-sheet-content");if(sheet)sheet.scrollTop=sheet.scrollHeight;if(days)days.scrollLeft=days.scrollWidth;const r=days.getBoundingClientRect(),s=days.lastElementChild.getBoundingClientRect();return {quest:document.querySelectorAll(".w8-approved-quest").length,days:days.children.length,dock:nav.querySelectorAll(".harbour-nav-item").length,documentWidth:document.documentElement.scrollWidth,sevenAtEnd:s.left>=r.left-2&&s.right<=r.right+2}})()');
    assert.ok(responsive.quest===3&&responsive.days===7&&responsive.dock===5,'real objectives, seven rewards and dock preserved');
    assert.ok(responsive.documentWidth<=w+2&&responsive.sevenAtEnd,'responsive scroll must reach the final real day');
    await grab('missions-coast-'+w+'x'+h+'.png');
    report['viewport'+w+'x'+h]=responsive;
  }
  writeFileSync(join(dir,'work8-missions-coast-native-ab.json'),JSON.stringify(report,null,2));
  await viewport(384,512);
  await run('(()=>{const s=document.querySelector(".app-sheet-content"),d=document.querySelector(".w8-approved-days");if(s)s.scrollTop=0;if(d)d.scrollLeft=0;return true})()');
  await sleep(150);
  const tabRect=await run('(()=>{const e=[...document.querySelectorAll(".w8-approved-tabs button")][1],r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tabRect.x,y:tabRect.y,id:1}]});
  await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await run('document.querySelectorAll(".w8-approved-tabs button")[1].getAttribute("aria-pressed")==="true"'),'native SEMANAIS touch must work');
  const dailyRect=await run('(()=>{const e=[...document.querySelectorAll(".w8-approved-tabs button")][0],r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:dailyRect.x,y:dailyRect.y,id:1}]});
  await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await run('document.querySelectorAll(".w8-approved-tabs button")[0].getAttribute("aria-pressed")==="true"'),'native DIÁRIAS touch must work');
  console.log('WORK8 #104 native touch and 5-item menu responsive regression PASS');
  assert.ok(measured.scores.title.delta<-.02 && measured.scores.full.delta<-.002,
    'title registration must actually improve ORIGINAL source MAE and title ROI; inspect topSweep for better geometry');
} finally {
  try{socket?.close()}catch{}
  chrome.kill('SIGTERM');
  await sleep(250);
  if(chrome.exitCode===null)chrome.kill('SIGKILL');
  try{rmSync(folder,{recursive:true,force:true,maxRetries:10,retryDelay:200})}catch{}
}
