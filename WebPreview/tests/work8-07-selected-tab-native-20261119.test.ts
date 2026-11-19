import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/** WORK8 / issue #104 — ONLY 07 Missões, selected real Daily tab.
 * This visual experiment uses actual source assets and actual Chromium pixels,
 * NOT mocked values or screenshot backgrounds. The CSS opt-out is measured
 * on the identical paused DOM/frame, 384x512 native DPR1.
 * WORK0 retains all merge, release and HTTP responsibilities.
 * approved:false; zero of eight human-approved.
 */
test('WORK8 07 authentic selected-tab ink — source-ledger and mobile touch', {timeout:240000}, async()=>{
  await delay(52000); // avoid simultaneous Chrome instances in repository tests
  const required=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
  for(const file of required)assert.ok(existsSync(new URL('../../assets/design-approved/'+file,import.meta.url)),'mandatory reference absent: '+file);
  const chrome=process.env.CHROME_BIN || spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chrome,'native Chromium required, no visual QA skip');
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const build=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-selected-tab-dist'],{encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,'actual app build: '+build.stdout+'\n'+build.stderr);
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-selected-tab-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','work8-selected-tab-dist','--host','127.0.0.1','--port','4198','--strictPort'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
  try {
    let ready=false;
    for(let i=0;i<110;i++){
      try{if((await fetch('http://127.0.0.1:4198/')).ok){ready=true;break;}}catch{}
      if(vite.exitCode!==null)break;
      await delay(130);
    }
    assert.ok(ready,'isolated preview running');
    const port=9850+(process.pid%1300);
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+port,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let pages:any[];
    for(let i=0;i<120;i++){
      try{let r=await fetch('http://127.0.0.1:'+port+'/json/list');if(r.ok){pages=await r.json();break;}}catch{}
      if(browser.exitCode!==null)break;
      await delay(130);
    }
    const page=pages?.find((p:any)=>p.type==='page');assert.ok(page,'native Chrome CDP page');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((ok,no)=>{ws!.addEventListener('open',()=>ok(),{once:true});ws!.addEventListener('error',no,{once:true});});
    let id=0;
    const pending=new Map<number,{ok:(v:any)=>void,no:(e:Error)=>void}>();
    ws.addEventListener('message',(ev:any)=>{let r=JSON.parse(ev.data.toString()),p=pending.get(r.id);if(p){pending.delete(r.id);r.error?p.no(Error(r.error.message)):p.ok(r.result)}});
    const cmd=(method:string,params:any={})=>new Promise<any>((ok,no)=>{
      const i=++id,t=setTimeout(()=>{pending.delete(i);no(Error('CDP timeout '+method))},22000);
      pending.set(i,{ok:v=>{clearTimeout(t);ok(v)},no:e=>{clearTimeout(t);no(e)}});
      ws!.send(JSON.stringify({id:i,method,params}));
    });
    const evaluate=async(src:string)=>{let r=await cmd('Runtime.evaluate',{expression:src,awaitPromise:true,returnByValue:true});assert.ok(!r.exceptionDetails,'Chromium eval failed '+r.exceptionDetails?.text);return r.result.value};
    const wait=async(sel:string)=>{for(let i=0;i<120;i++){if(await evaluate('!!document.querySelector('+JSON.stringify(sel)+')'))return;await delay(130)}throw Error('missing UI '+sel)};
    const setSize=async(w:number,h:number)=>cmd('Emulation.setDeviceMetricsOverride',{width:w,height:h,screenWidth:w,screenHeight:h,mobile:true,deviceScaleFactor:1});
    const capture=async()=>(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
    const save=(name:string,b64:string)=>writeFileSync(join(evidence,name),Buffer.from(b64,'base64'));
    await cmd('Page.enable');await cmd('Runtime.enable');await setSize(384,512);
    await cmd('Page.navigate',{url:'http://127.0.0.1:4198/'});
    await wait('.harbour-screen .harbour-nav-item');
    assert.ok(await evaluate('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()'),'real navigation to missions');
    await wait('.w8-approved-missions .w8-approved-quest-list');
    const loaded=await evaluate('(async()=>{const refs=[...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(e=>e.getAttribute("href")).filter(Boolean);await Promise.all([...new Set(refs)].map(async s=>{let i=new Image();i.src=s;await i.decode()}));await document.fonts.ready;document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return refs.length})()');
    assert.ok(loaded>=8,'real source crops loaded');
    await delay(220);
    const geometry=()=>evaluate('(()=>{const rect=x=>{const r=x?.getBoundingClientRect();return r?{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null};const d=document.querySelector(".w8-approved-days"),nav=document.querySelector(".app-sheet > .harbour-nav"),tab=document.querySelector(".w8-approved-missions .w8-approved-tabs button[aria-pressed=true]");return {quests:document.querySelectorAll(".w8-approved-missions .w8-approved-quest").length,days:d?.children.length,navCount:nav?.querySelectorAll(".harbour-nav-item").length,questTexts:[...document.querySelectorAll(".w8-approved-quest")].map(e=>e.textContent),dayTexts:[...d.querySelectorAll("li")].map(e=>e.textContent),nav:rect(nav),tab:rect(tab),activeCount:document.querySelectorAll(".w8-approved-missions .w8-approved-tabs button[aria-pressed=true]").length,chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(rect),dayCaptions:[...document.querySelectorAll(".w8-approved-days li small")].map(rect),width:document.documentElement.scrollWidth}})()');
    const flag='work8-missions-active-tab-source-ab-baseline';
    const target='.w8-approved-missions .w8-approved-tabs button[aria-pressed=true]';
    await evaluate('document.documentElement.classList.add('+JSON.stringify(flag)+');true');
    await delay(140);
    const beforeGeometry=await geometry();
    const beforeCss=await evaluate('getComputedStyle(document.querySelector('+JSON.stringify(target)+')).backgroundImage');
    const before=await capture();
    const ref=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const original='data:image/webp;base64,'+ref;
    const measureCode=String.raw`(async()=>{
      const urls=__URLS__;
      const images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})));
      const w=384,h=512;if(images.some(i=>i.width!==w||i.height!==h))throw Error('NOT native 384x512');
      const pixels=images.map(i=>{let c=document.createElement('canvas');c.width=w;c.height=h;let p=c.getContext('2d');p.drawImage(i,0,0);return p.getImageData(0,0,w,h).data});
      const roi={full:[0,0,384,512],activeTabs:[12,115,373,157],missions:[12,155,372,321],daily:[13,325,373,436],chests:[20,356,370,427],dock:[0,451,384,512],header:[0,0,384,70]};
      const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){let j=4*(y*w+x);for(let k=0;k<3;k++){sum+=Math.abs(a[j+k]-b[j+k]);n++}}return sum/n};
      const out={};for(const [k,r] of Object.entries(roi))out[k]={before:mae(pixels[0],pixels[1],r),after:mae(pixels[0],pixels[2],r),delta:mae(pixels[0],pixels[2],r)-mae(pixels[0],pixels[1],r),changed:mae(pixels[1],pixels[2],r)};
      const c=document.createElement('canvas');c.width=w*4;c.height=h;let p=c.getContext('2d');images.forEach((i,k)=>p.drawImage(i,w*k,0));p.drawImage(images[0],w*3,0);p.globalAlpha=.5;p.drawImage(images[2],w*3,0);
      return {roi:out,montage:c.toDataURL('image/png').split(',')[1]};
    })()`;
    const sampleCode=(b:string,a:string)=>measureCode.replace('__URLS__',JSON.stringify([original,'data:image/png;base64,'+b,'data:image/png;base64,'+a]));
    // Research: varied genuine selected-tab pigment, same source frame, no states changed.
    const baseStops=[[18,105,154],[7,89,139],[6,62,102]];
    const shifts=[-30,-24,-18,-12,-6,0,6,12,18,24,30,36];
    const palette=(offset:number)=>'linear-gradient(180deg,'+baseStops.map((stop,i)=>{
      const hex='#'+stop.map(v=>Math.max(0,Math.min(255,v+offset)).toString(16).padStart(2,'0')).join('');
      return hex+(i===1?' 52%':'');
    }).join(',')+')';
    const study:any[]=[];
    for(const shift of shifts){
      const css=':root '+target+'{background:'+palette(shift)+'!important;}';
      await evaluate('(()=>{let s=document.getElementById("work8-07-active-study");if(!s){s=document.createElement("style");s.id="work8-07-active-study";document.head.appendChild(s)}s.textContent='+JSON.stringify(css)+';return true})()');
      await delay(85);
      const shot=await capture();
      const metrics=await evaluate(sampleCode(before,shot));
      study.push({shift,gradient:palette(shift),score:metrics.roi});
    }
    await evaluate('document.getElementById("work8-07-active-study")?.remove();true');
    await evaluate('document.documentElement.classList.remove('+JSON.stringify(flag)+');true');
    await delay(160);
    const afterGeometry=await geometry();
    const afterCss=await evaluate('getComputedStyle(document.querySelector('+JSON.stringify(target)+')).backgroundImage');
    const after=await capture();
    const measured=await evaluate(sampleCode(before,after));
    save('work8-07-active-ORIGINAL-384x512.webp',ref);
    save('work8-07-active-BEFORE-384x512.png',before);
    save('work8-07-active-RENDER-384x512.png',after);
    save('work8-07-active-ORIGINAL-BEFORE-RENDER-OVERLAY-384x512.png',measured.montage);
    const win=[...study].sort((a,b)=>a.score.activeTabs.after-b.score.activeTabs.after)[0];
    const report={issue:104,scope:'07 Missões selected Daily tab only',baseHead:'ea73565eeede881468a6e54f425d1c01c0f5a91b',
      requiredReferences:required.map(n=>'assets/design-approved/'+n),
      comparedAgainst:'assets/design-approved/07-missoes.webp',
      browser:'native Chromium 384x512 DPR1 same paused frame',beforeCss,afterCss,results:measured.roi,
      sampleWinner:win,study,geometry:{before:beforeGeometry,render:afterGeometry},
      approved:false,approvedScreens:0};
    writeFileSync(join(evidence,'work8-07-active-tab-controlled-roi.json'),JSON.stringify(report,null,2));
    console.log('WORK8_07_ACTIVE_TAB_PRODUCTION '+JSON.stringify(measured.roi));
    console.log('WORK8_07_ACTIVE_TAB_SWEEP '+JSON.stringify(study.map(s=>({shift:s.shift,tabs:s.score.activeTabs.after,full:s.score.full.after}))));
    console.log('WORK8_07_ACTIVE_TAB_WINNER '+JSON.stringify({shift:win.shift,score:win.score}));
    assert.notEqual(afterCss,beforeCss,'real shipped CSS must change the selected tab');
    assert.deepEqual(afterGeometry,beforeGeometry,'no hitbox, label, nav or layout movement');
    assert.equal(afterGeometry.quests,3);
    assert.equal(afterGeometry.days,7);
    assert.equal(afterGeometry.navCount,5);
    assert.equal(afterGeometry.activeCount,1);
    assert.ok(afterGeometry.chests.every((c:any)=>c.bottom<=afterGeometry.nav.y+2),'seven genuine chests not hidden by dock');
    assert.equal(win.shift,-12,'measured source winner must match production -12 RGB');
    assert.ok(measured.roi.full.delta<-.001 && measured.roi.activeTabs.delta<-.025,'source RGB MAE must improve in full frame and target region');
    assert.ok(Math.abs(measured.roi.missions.delta)<.02 && measured.roi.missions.changed<.16,
      'quest pigment must not measurably regress (native screenshot noise tolerance)');
    for(const region of ['daily','chests','dock','header'])assert.ok(measured.roi[region].changed<.03,'no regression outside selected tab: '+region);
    for(const [w,h] of [[320,568],[390,844],[430,932]]){
      await setSize(w,h);await delay(170);
      const r=await evaluate('(()=>{const d=document.querySelector(".w8-approved-days"),area=document.querySelector(".app-sheet-content");if(area)area.scrollTop=0;if(d)d.scrollLeft=d.scrollWidth;const last=d?.lastElementChild?.getBoundingClientRect(),container=d?.getBoundingClientRect(),nav=document.querySelector(".app-sheet > .harbour-nav"),selected=document.querySelector(".w8-approved-missions .w8-approved-tabs button[aria-pressed=true]");return {width:document.documentElement.scrollWidth,quests:document.querySelectorAll(".w8-approved-quest").length,days:d?.children.length,navCount:nav?.querySelectorAll(".harbour-nav-item").length,day7Visible:!!(last&&container&&last.left>=container.left-2&&last.right<=container.right+2),pointer:getComputedStyle(selected).pointerEvents,selectedRect:selected?.getBoundingClientRect().toJSON()}})()');
      assert.ok(r.width<=w+2&&r.quests===3&&r.days===7&&r.navCount===5,'mobile layout '+w+'x'+h);
      if(w===320)assert.ok(r.day7Visible,'seven reward chests reachable via horizontal scroll at 320');
      assert.notEqual(r.pointer,'none','mission tab remains touch enabled');
      // Real CDP touch on the already selected Daily tab; does not mutate rewards.
      const x=Math.round(r.selectedRect.x+r.selectedRect.width/2),y=Math.round(r.selectedRect.y+r.selectedRect.height/2);
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(100);
      assert.equal(await evaluate('document.querySelectorAll(".w8-approved-quest").length'),3,'real native touch preserves three quests');
      save('work8-07-active-'+w+'x'+h+'.png',await capture());
    }
  } finally {
    try{ws?.close()}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');await delay(120);
    if(browser?.exitCode===null)browser.kill('SIGKILL');if(vite.exitCode===null)vite.kill('SIGKILL');
    try{rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:250})}catch(e){console.warn('Chromium profile cleanup postponed',String(e))}
  }
});
