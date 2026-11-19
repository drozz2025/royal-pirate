import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/** WORK8/#104: unscaled 07-missoes source, SAME real Chromium DOM/frame.
 * The root switch only hides/reveals decorative reward-coin and reward-gem
 * WebP crops. Real progress, numerical values, gem availability and five-item
 * shared dock MUST be identical. No mocked app state, image backdrop or
 * APPROVED flag. */
test('07 Missions: actual source-painted coin motif in three real reward columns / Chromium native', {timeout:220000}, async()=>{
  await delay(1500); // CI serializes visual suites; allow fonts and imagery to load
  for(const file of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']) {
    assert.ok(existsSync(new URL('../../assets/design-approved/'+file,import.meta.url)),'required reference '+file);
  }
  const chromeBin=process.env.CHROME_BIN || spawnSync('sh',['-c','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chromeBin,'native Chromium is mandatory; never silently skip MAE QA');
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const build=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-reward-dist'],{encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,'isolated full TS+Vite build required: '+build.stdout+'\n'+build.stderr);
  const profile=mkdtempSync(join(tmpdir(),'royal-w8-reward-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','work8-reward-dist','--host','127.0.0.1','--port','4199','--strictPort'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined, ws:WebSocket|undefined;
  const port=9700+(process.pid%1000);
  try {
    let ready=false;
    for(let n=0;n<120;n++){
      try{const r=await fetch('http://127.0.0.1:4199/');if(r.ok){ready=true;break;}}catch{}
      if(vite.exitCode!==null)break;
      await delay(120);
    }
    assert.ok(ready,'isolated Chromium preview must start');
    browser=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-debugging-port='+port,'--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    let pages:any[];
    for(let n=0;n<120;n++){
      try{const r=await fetch('http://127.0.0.1:'+port+'/json/list');if(r.ok){pages=await r.json();break;}}catch{}
      if(browser.exitCode!==null)break;
      await delay(130);
    }
    const page=pages?.find((p:any)=>p.type==='page');
    assert.ok(page,'genuine native Chromium CDP page');
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{ws!.addEventListener('open',()=>resolve(),{once:true});ws!.addEventListener('error',reject,{once:true});});
    let id=0;
    const pending=new Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>();
    ws.addEventListener('message',(event:any)=>{
      const msg=JSON.parse(event.data.toString()),p=pending.get(msg.id);
      if(p){pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}
    });
    const cmd=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{
      const seq=++id,t=setTimeout(()=>{pending.delete(seq);reject(Error('CDP timeout '+method));},20000);
      pending.set(seq,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});
      ws!.send(JSON.stringify({id:seq,method,params}));
    });
    const evalJs=async(src:string)=>{
      const o=await cmd('Runtime.evaluate',{expression:src,awaitPromise:true,returnByValue:true});
      assert.ok(!o.exceptionDetails,'native JS error '+o.exceptionDetails?.text);
      return o.result.value;
    };
    const wait=async(selector:string)=>{
      for(let n=0;n<140;n++){
        if(await evalJs('!!document.querySelector('+JSON.stringify(selector)+')'))return;
        await delay(120);
      }
      throw Error('missing real DOM: '+selector);
    };
    await cmd('Page.enable');await cmd('Runtime.enable');
    await cmd('Emulation.setDeviceMetricsOverride',{width:384,height:512,mobile:true,deviceScaleFactor:1,screenWidth:384,screenHeight:512});
    await cmd('Page.navigate',{url:'http://127.0.0.1:4199/'});
    await wait('.harbour-screen .harbour-nav-item');
    await evalJs('document.documentElement.classList.add("work8-missions-real-coin-ab-baseline");true');
    const clicked=await evalJs('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()');
    assert.ok(clicked,'real Porto->Missões navigation required');
    await wait('.w8-approved-missions .w8-approved-quest-list');
    await evalJs('(async()=>{const u=[...new Set([...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(x=>x.getAttribute("href")).filter(Boolean))];await Promise.all(u.map(async src=>{const img=new Image();img.src=src;await img.decode()}));await document.fonts.ready;document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return u.length})()');
    await delay(250);
    const geometry=()=>evalJs('(()=>{const rect=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]};const nav=document.querySelector(".app-sheet > .harbour-nav");const quests=[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest")],days=[...document.querySelectorAll(".w8-approved-missions .w8-approved-days li")],buttons=[...document.querySelectorAll(".w8-approved-missions .w8-approved-tabs button, .w8-approved-missions .w8-approved-quest > button")],dockButtons=[...nav.querySelectorAll(".harbour-nav-item")];return {questCount:quests.length,days:days.length,dockCount:dockButtons.length,tabAndActionCount:buttons.length,questBoxes:quests.map(rect),dayBoxes:days.map(rect),rewardBoxes:[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest-rewards")].map(rect),nav:rect(nav),captions:days.map(d=>rect(d.querySelector("small"))),documentWidth:document.documentElement.scrollWidth,labels:quests.map(q=>q.querySelector(".w8-approved-quest-core strong")?.textContent),rewards:quests.map(q=>[...q.querySelectorAll(".w8-approved-quest-rewards strong")].map(s=>s.textContent)),glyphs:document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting-reward-coin,.w8-approved-missions svg.w8-approved-painting-reward-gem").length}})()');
    const beforeLayout=await geometry();
    const beforeInk=await evalJs('getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-coin"),"::before").backgroundImage');
    const before=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove("work8-missions-real-coin-ab-baseline");true');
    await delay(180);
    const afterLayout=await geometry();
    const afterInk=await evalJs('getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-coin"),"::before").backgroundImage');
    assert.notEqual(afterInk,beforeInk,'real source-painted coin must be present in production only');
    assert.match(afterInk,/07-missoes/,'source artwork must come from approved source file');
    const after=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    assert.deepEqual(afterLayout.nav,beforeLayout.nav,'shared dock geometry unchanged');
    assert.deepEqual(afterLayout.labels,beforeLayout.labels,'real mission objective labels unchanged');
    assert.deepEqual(afterLayout.rewards,beforeLayout.rewards,'real mission rewards unchanged');
    assert.equal(afterLayout.questCount,3);
    assert.equal(afterLayout.days,7);
    assert.equal(afterLayout.dockCount,5);
    assert.equal(afterLayout.tabAndActionCount,6);
    assert.equal(afterLayout.glyphs,0,'do not use source screenshot icon overlays or fake currency');
    assert.ok(afterLayout.dayBoxes.every((d:number[])=>d[0]>=-1&&d[0]+d[2]<=385));
    assert.ok(afterLayout.captions.every((d:number[])=>d[1]+d[3]<=afterLayout.nav[1]+3),'seven day labels must not be hidden by dock');
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const script=String.raw`(async()=>{
      const make=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
      const images=await Promise.all([__ORIGINAL__,__BEFORE__,__AFTER__].map(make));
      const w=384,h=512;if(images.some(x=>x.width!==w||x.height!==h))throw Error('native images required');
      const px=images.map(i=>{const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.drawImage(i,0,0);return t.getImageData(0,0,w,h).data});
      const roi={full:[0,0,384,512],coinIcons:[200,159,242,313],rewardLayout:[185,155,292,321],missions:[12,155,372,321],daily:[12,326,373,436],chests:[20,356,370,427],header:[0,0,384,70],dock:[0,451,384,512]};
      function mae(a,b,r){let total=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const p=(y*w+x)*4;for(let z=0;z<3;z++){total+=Math.abs(a[p+z]-b[p+z]);n++}}return total/n}
      const metrics={};for(const [k,r] of Object.entries(roi)){const baseline=mae(px[0],px[1],r),candidate=mae(px[0],px[2],r);metrics[k]={baseline,candidate,delta:candidate-baseline}}
      const unchanged={header:mae(px[1],px[2],roi.header),dock:mae(px[1],px[2],roi.dock)};
      const overlays=[1,2].map(i=>{const c=document.createElement('canvas');c.width=w*3;c.height=h;const t=c.getContext('2d');t.drawImage(images[0],0,0);t.drawImage(images[i],w,0);t.drawImage(images[0],2*w,0);t.globalAlpha=.5;t.drawImage(images[i],2*w,0);return c.toDataURL('image/png').split(',')[1]});
      return {metrics,unchanged,overlays,sizes:images.map(i=>[i.width,i.height])};
    })()`;
    const injected=script.replace('__ORIGINAL__',JSON.stringify('data:image/webp;base64,'+original))
      .replace('__BEFORE__',JSON.stringify('data:image/png;base64,'+before))
      .replace('__AFTER__',JSON.stringify('data:image/png;base64,'+after));


    // Earlier native 33-variant sweep rejected all regressions; 96px/space-around had the best full+reward ROI without shifting the seven daily chests.
    const compared=await evalJs(injected);
    const save=(name:string,b64:string)=>writeFileSync(join(evidence,name),Buffer.from(b64,'base64'));
    save('missions-real-coin-art-original-384x512.webp',original);
    save('missions-real-coin-art-before-384x512.png',before);
    save('missions-real-coin-art-render-384x512.png',after);
    save('missions-real-coin-art-original-before-overlay.png',compared.overlays[0]);
    save('missions-real-coin-art-original-render-overlay.png',compared.overlays[1]);
    const report={
      issue:104,scope:'WORK8 exclusively 07 Missões only, approved gold-coin icon artwork (actual real local amounts)',
      reference:'assets/design-approved/07-missoes.webp',
      mandatoryRefs:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',...['01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']].map(n=>'assets/design-approved/'+n),
      viewport:'Chromium 384x512 DPR1 same real DOM/paused animation frame',baselineClass:'work8-missions-real-coin-ab-baseline',
      metrics:compared.metrics,unchanged:compared.unchanged,
      geometry:{before:beforeLayout,after:afterLayout},coinArt:{before:beforeInk,after:afterInk},approved:false,approvedScreens:0
    };
    writeFileSync(join(evidence,'work8-missions-real-coin-art-native-ab.json'),JSON.stringify(report,null,2));
    console.log('WORK8 07 reward grid controlled Chromium A/B '+JSON.stringify(compared.metrics));
    assert.ok(compared.unchanged.header<.05&&compared.unchanged.dock<.05,'header/dock pixel-identical');
    assert.ok(compared.metrics.coinIcons.delta<-.05,'coin source-art ROI must strictly improve');
    assert.ok(compared.metrics.full.delta<-.005,'real coin source sprites must improve full frame');
    assert.ok(compared.metrics.daily.delta<.10&&compared.metrics.chests.delta<.10,'daily reward strip cannot regress');
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:568,mobile:true,deviceScaleFactor:1,screenWidth:320,screenHeight:568});
    await delay(200);
    // Real native touch events: weekly and return to daily without changing state.
    for(const [index,expected] of [[2,'true'],[1,'true']] as const){
      const target=await evalJs('(()=>{const b=document.querySelector(".w8-approved-missions .w8-approved-tabs button:nth-child('+index+')");const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,radiusX:3,radiusY:3,force:1,id:1}]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(100);
      assert.equal(await evalJs('document.querySelector(".w8-approved-missions .w8-approved-tabs button:nth-child('+index+')").getAttribute("aria-pressed")'),expected,'native tab touch must work');
    }
    const narrow=await evalJs('(()=>{const days=document.querySelector(".w8-approved-days"),nav=document.querySelector(".app-sheet > .harbour-nav"),sheet=document.querySelector(".app-sheet-content");if(sheet)sheet.scrollTop=sheet.scrollHeight;if(days)days.scrollLeft=days.scrollWidth;const a=days.getBoundingClientRect(),b=days.lastElementChild.getBoundingClientRect();return {sevenVisible:b.left>=a.left-2&&b.right<=a.right+2,dock:nav.querySelectorAll(".harbour-nav-item").length,quest:document.querySelectorAll(".w8-approved-quest").length,days:days.children.length,width:document.documentElement.scrollWidth}})()');
    assert.ok(narrow.sevenVisible&&narrow.width<=322&&narrow.dock===5&&narrow.quest===3&&narrow.days===7);
    save('missions-real-coin-art-320x568.png',(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data);
    for(const viewport of [{width:390,height:844},{width:430,height:932}]){
      await cmd('Emulation.setDeviceMetricsOverride',{...viewport,mobile:true,deviceScaleFactor:1,screenWidth:viewport.width,screenHeight:viewport.height});
      await delay(180);
      assert.ok(await evalJs('document.documentElement.scrollWidth<='+String(viewport.width+2)));
      save('missions-real-coin-art-'+viewport.width+'x'+viewport.height+'.png',(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data);
    }
  } finally {
    try{ws?.close()}catch{}
    browser?.kill('SIGTERM');vite.kill('SIGTERM');
    await delay(150);
    if(browser?.exitCode===null)browser.kill('SIGKILL');
    if(vite.exitCode===null)vite.kill('SIGKILL');
    // A dying Chromium process may keep recreating Default/* while Node
    // recursively removes the temporary profile, yielding ENOTEMPTY even
    // though all visual assertions and gameplay checks have passed.
    // Cleanup must remain best effort; ephemeral CI runner removes /tmp.
    try {
      rmSync(profile,{recursive:true,force:true,maxRetries:24,retryDelay:250});
    } catch(error) {
      console.warn('WORK8 ephemeral Chromium profile cleanup deferred:',String(error));
    }
  }
});
