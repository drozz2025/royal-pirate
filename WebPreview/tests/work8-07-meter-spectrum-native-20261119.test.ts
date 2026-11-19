import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

// WORK8 #104: experiment on the LIVE three quest meters, NEVER ranking 08.
// The original approved WebP is decoded at native DPR=1. CSS paint variants
// are measured in one paused Chromium scene/frame; no fabricated game state.
test('07 Missions: native meter-spectrum source A/B, seven chests, mobile touch', {timeout:240000},async()=>{
  const refs=['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'];
  for(const f of refs)assert.ok(existsSync(new URL('../../assets/design-approved/'+f,import.meta.url)),'required approved art '+f);
  const chrome=process.env.CHROME_BIN||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chrome,'native Chromium must exist; no silent screenshot fallback');
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const built=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-meter-spectrum-dist'],{encoding:'utf8',timeout:130000});
  assert.equal(built.status,0,'fresh production build must pass: '+built.stdout+'\n'+built.stderr);
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-meter-'));
  const port=4700+(process.pid%250),debug=12700+(process.pid%250);
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','work8-meter-spectrum-dist',
    '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined,ws:WebSocket|undefined;
  try {
    let ready=false;
    for(let i=0;i<100;i++){
      try{if((await fetch('http://127.0.0.1:'+port+'/')).ok){ready=true;break}}catch{}
      if(vite.exitCode!==null)break;
      await delay(150);
    }
    assert.ok(ready,'local native app preview not available');
    browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader',
      '--use-gl=angle','--use-angle=swiftshader','--remote-debugging-port='+debug,
      '--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let page:any;
    for(let i=0;i<100;i++){
      try{const a=await fetch('http://127.0.0.1:'+debug+'/json/list');
        if(a.ok){page=(await a.json()).find((x:any)=>x.type==='page');if(page)break}}catch{}
      if(browser.exitCode!==null)break;
      await delay(150);
    }
    assert.ok(page,'real Chromium CDP required');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((ok,no)=>{
      ws!.addEventListener('open',()=>ok(),{once:true});
      ws!.addEventListener('error',no,{once:true});
    });
    let id=0;
    const pending=new Map<number,{ok:(v:any)=>void,no:(e:Error)=>void}>();
    ws.addEventListener('message',(event:any)=>{
      const msg=JSON.parse(event.data.toString()),p=pending.get(msg.id);
      if(!p)return;pending.delete(msg.id);
      msg.error?p.no(Error(msg.error.message)):p.ok(msg.result);
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((ok,no)=>{
      const seq=++id,t=setTimeout(()=>{pending.delete(seq);no(Error('CDP timeout '+method));},25000);
      pending.set(seq,{ok:v=>{clearTimeout(t);ok(v)},no:e=>{clearTimeout(t);no(e)}});
      ws!.send(JSON.stringify({id:seq,method,params}));
    });
    const ev=async(expression:string)=>{
      const result=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      assert.ok(!result.exceptionDetails,'real Chromium JS: '+result.exceptionDetails?.text);
      return result.result.value;
    };
    const cap=async()=>String((await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data);
    const save=(file:string,data:string)=>writeFileSync(join(evidence,file),Buffer.from(data,'base64'));
    const size=async(w:number,h:number)=>cmd('Emulation.setDeviceMetricsOverride',{
      width:w,height:h,screenWidth:w,screenHeight:h,mobile:true,deviceScaleFactor:1});
    const wait=async(selector:string)=>{
      for(let i=0;i<110;i++){if(await ev('!!document.querySelector('+JSON.stringify(selector)+')'))return;await delay(150)}
      throw Error('Missing live selector '+selector);
    };
    await cmd('Page.enable');await cmd('Runtime.enable');
    await size(384,512);
    await cmd('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
    await wait('.harbour-screen .harbour-nav-item');
    assert.ok(await ev('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()'));
    await wait('.w8-approved-missions .w8-approved-meter>span');
    assert.ok(await ev('(async()=>{const urls=[...new Set([...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(x=>x.getAttribute("href")).filter(Boolean))];await Promise.all(urls.map(async src=>{const i=new Image();i.src=src;await i.decode()}));await document.fonts.ready;document.getAnimations().forEach(x=>x.pause());return urls.length>=8})()'));
    await delay(250);
    const state=()=>ev('(()=>{const rect=x=>{const r=x.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(Math.round)};const nav=document.querySelector(".app-sheet>.harbour-nav");return {questCount:document.querySelectorAll(".w8-approved-quest").length,dayCount:document.querySelectorAll(".w8-approved-days li").length,navCount:nav?.querySelectorAll(".harbour-nav-item").length,nav:rect(nav),meters:[...document.querySelectorAll(".w8-approved-meter")].map(rect),chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(rect),docWidth:document.documentElement.scrollWidth,questText:[...document.querySelectorAll(".w8-approved-quest")].map(x=>x.textContent),dayText:[...document.querySelectorAll(".w8-approved-days li")].map(x=>x.textContent)} })()');
    const geometry=await state();
    assert.equal(geometry.questCount,3,'three genuine missions');
    assert.equal(geometry.dayCount,7,'seven genuine rewards');
    assert.equal(geometry.navCount,5,'five live dock buttons');
    assert.equal(geometry.meters.length,3,'actual three progress tracks');
    assert.ok(geometry.chests.every((x:number[])=>x[3]<=geometry.nav[1]+2),'seven chest paintings must remain above dock');
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const originalUrl='data:image/webp;base64,'+original;
    const options=[
      ['baseline','none'],['bright-80','brightness(.80)'],['bright-88','brightness(.88)'],
      ['bright-94','brightness(.94)'],['bright-105','brightness(1.05)'],
      ['bright-112','brightness(1.12)'],['sat-80','saturate(.80)'],
      ['sat-115','saturate(1.15)'],['green-deep','brightness(.90) saturate(1.15)'],
      ['green-soft','brightness(.98) saturate(.88)'],['contrast-110','contrast(1.10)'],
      ['contrast-90','contrast(.90)'],['green-gold','sepia(.15) saturate(1.20)']
    ];
    // Calculate pixel MAE for the actual approved source, 3 progress bar
    // rectangles (ROI), quest board, reward board and entire native frame.
    const sample=async(name:string,filter:string)=>{
      const applied=await ev('(()=>{const els=[...document.querySelectorAll(".w8-approved-missions .w8-approved-meter>span")];for(const e of els)e.style.filter='+JSON.stringify(filter)+';return els.map(e=>getComputedStyle(e).filter)})()');
      assert.equal(applied.length,3);
      await delay(70);
      const screenshot=await cap();
      const expr='(async()=>{const images=await Promise.all('+JSON.stringify([originalUrl,'data:image/png;base64,'+screenshot])+'.map(src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})));if(images.some(x=>x.width!==384||x.height!==512))throw Error("source frame must be native 384x512");const data=images.map(im=>{const c=document.createElement("canvas");c.width=384;c.height=512;const t=c.getContext("2d");t.drawImage(im,0,0);return t.getImageData(0,0,384,512).data});const areas={full:[[0,0,384,512]],quests:[[12,155,372,321]],daily:[[13,325,373,436]],chests:[[20,356,370,427]],dock:[[0,451,384,512]],meters:'+JSON.stringify(geometry.meters)+'};const mae=(regs)=>{let v=0,n=0;for(const a of regs)for(let y=Math.max(0,a[1]);y<Math.min(512,a[3]);y++)for(let x=Math.max(0,a[0]);x<Math.min(384,a[2]);x++){const p=4*(y*384+x);for(let k=0;k<3;k++){v+=Math.abs(data[0][p+k]-data[1][p+k]);n++}}return v/n};return Object.fromEntries(Object.entries(areas).map(([k,v])=>[k,mae(v)]))})()';
      return {name,filter,score:await ev(expr),screenshot};
    };
    const samples=[];
    for(const [name,filter] of options){
      const shot=await sample(name,filter);
      samples.push(shot);
    }
    // The exact starting state must render the same at the end: no game clock
    // or slider animation is permitted to contaminate the A/B experiment.
    const again=await sample('baseline-repeat','none');
    const base=samples[0];
    const stable=Math.abs(again.score.full-base.score.full);
    assert.ok(stable<.15,'fixed animated frame must be stable: '+stable);
    const ordered=[...samples].sort((a,b)=>a.score.meters-b.score.meters);
    const winning=ordered.find(x=>x.score.full<=base.score.full+.001)??base;
    const improvements={full:winning.score.full-base.score.full,
      meters:winning.score.meters-base.score.meters,
      quests:winning.score.quests-base.score.quests,
      daily:winning.score.daily-base.score.daily,
      chests:winning.score.chests-base.score.chests,
      dock:winning.score.dock-base.score.dock};
    const evidenceReport={baseSha:'6f56708605fa2bf160b9463a6e37c9c3b2a838a6',
      issue:104,screen:'07 Missões ONLY',ref:'assets/design-approved/07-missoes.webp',
      requiredReferences:refs,viewport:'native Chromium 384×512, DPR1',
      frozenAnimations:true,scope:'real 3 quest meter fills; no fake state',geometry,
      samples:samples.map(({name,filter,score})=>({name,filter,score})),
      winning:{name:winning.name,filter:winning.filter,score:winning.score,delta:improvements},
      baselineRepeat:again.score,approved:false,approvedScreens:0};
    const m='work8-07-meter-spectrum-384x512';
    save(m+'-ORIGINAL.webp',original);
    save(m+'-BEFORE.png',base.screenshot);
    save(m+'-RENDER.png',winning.screenshot);
    const overlay='(async()=>{const urls='+JSON.stringify([originalUrl,'data:image/png;base64,'+base.screenshot,'data:image/png;base64,'+winning.screenshot])+',images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})));const c=document.createElement("canvas");c.width=1536;c.height=512;const x=c.getContext("2d");images.forEach((im,n)=>x.drawImage(im,n*384,0));x.drawImage(images[0],1152,0);x.globalAlpha=.5;x.drawImage(images[2],1152,0);return c.toDataURL("image/png").split(",")[1]})()';
    save(m+'-ORIGINAL-BEFORE-RENDER-OVERLAY.png',await ev(overlay));
    console.log('WORK8_METER_SWEEP_384_NATIVE '+JSON.stringify(evidenceReport.winning));
    console.log('WORK8_METER_SWEEP_BASELINE '+JSON.stringify(base.score));
    assert.deepEqual(await state(),geometry,'changing paint may not move actual quest/reward/navigation geometry');
    await ev('document.querySelectorAll(".w8-approved-missions .w8-approved-meter>span").forEach(e=>e.style.removeProperty("filter"));true');
    for(const [w,h] of [[320,568],[390,844],[430,932]]){
      await size(w,h);await delay(200);
      const g=await ev('(()=>{const d=document.querySelector(".w8-approved-days"),nav=document.querySelector(".app-sheet>.harbour-nav"),tab=document.querySelector(".w8-approved-tabs button[aria-pressed=true]"),t=tab?.getBoundingClientRect();d.scrollLeft=d.scrollWidth;const x=d.lastElementChild.getBoundingClientRect(),r=d.getBoundingClientRect();return {quests:document.querySelectorAll(".w8-approved-quest").length,days:d.children.length,dock:nav.querySelectorAll(".harbour-nav-item").length,docWidth:document.documentElement.scrollWidth,day7:x.left>=r.left-2&&x.right<=r.right+2,hit:t?{x:Math.round(t.x+t.width/2),y:Math.round(t.y+t.height/2)}:null}})()');
      assert.equal(g.quests,3);assert.equal(g.days,7);assert.equal(g.dock,5);
      assert.ok(g.docWidth<=w+2,'no overflow at '+w);
      if(w===320)assert.ok(g.day7,'scroll to all seven reward chests at 320');
      assert.ok(g.hit,'active Missions tab has a touch target');
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[g.hit]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      save('work8-07-meter-spectrum-'+w+'x'+h+'.png',await cap());
      evidenceReport['viewport'+w+'x'+h as keyof typeof evidenceReport]=g as never;
    }
    writeFileSync(join(evidence,'work8-07-meter-spectrum-native.json'),JSON.stringify(evidenceReport,null,2));
    console.log('WORK8_APPROVAL false / 0 of 8');
  } finally {
    try{ws?.close()}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');await delay(180);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:150});
  }
});
