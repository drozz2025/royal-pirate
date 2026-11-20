import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/** WORK8/#104: 07-missoes source, SAME genuine Chromium DOM/frame.
 * The root switch changes ONLY the pigment of three existing objective objective-board widths. Real progress,
 * objective counts, rewards, claimability, touch targets and WORK0 five-item dock MUST be identical. No mocked app state, image backdrop or
 * APPROVED flag. */
test('07 Missions: three live mission emblems plus active controls improve approved 384x512 Chromium MAE', {timeout:220000}, async()=>{
  await delay(60000); // avoid interfering with concurrently running native Chromium visual suites
  for(const file of ['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp','01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']) {
    assert.ok(existsSync(new URL('../../assets/design-approved/'+file,import.meta.url)),'required reference '+file);
  }
  const chromeBin=process.env.CHROME_BIN || spawnSync('sh',['-c','command -v chromium || command -v google-chrome'],{encoding:'utf8'}).stdout.trim();
  assert.ok(chromeBin,'native Chromium is mandatory; never silently skip MAE QA');
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  const build=spawnSync('npm',['run','build','--','--base=/','--outDir=work8-border-dist'],{encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,'isolated full TS+Vite build required: '+build.stdout+'\n'+build.stderr);
  const profile=mkdtempSync(join(tmpdir(),'royal-w8-border-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','work8-border-dist','--host','127.0.0.1','--port','4295','--strictPort'],{stdio:'ignore'});
  let browser:ReturnType<typeof spawn>|undefined, ws:WebSocket|undefined;
  try {
    let ready=false;
    for(let n=0;n<120;n++){
      try{const r=await fetch('http://127.0.0.1:4295/');if(r.ok){ready=true;break;}}catch{}
      if(vite.exitCode!==null)break;
      await delay(120);
    }
    assert.ok(ready,'isolated Chromium preview must start');

    // On a busy Actions runner other visual tests may launch Chromium at
    // the same time. A PID-derived fixed CDP port can collide, leaving no
    // inspectable tab although this test's actual DOM and image checks work.
    // Chromium allocates an unused port and writes it to DevToolsActivePort.
    // Retry only browser startup; never skip the native Chromium MAE gate.
    let page:any;
    for(let attempt=1;attempt<=3&&!page;attempt++){
      const attemptProfile=join(profile,'launch-'+attempt);
      browser=spawn(chromeBin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
        '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
        '--remote-debugging-port=0','--remote-allow-origins=*',
        '--user-data-dir='+attemptProfile,'about:blank'],{stdio:'ignore'});
      for(let n=0;n<160;n++){
        try{
          const port=Number(readFileSync(join(attemptProfile,'DevToolsActivePort'),'utf8').split('\n')[0].trim());
          if(port>0){
            const r=await fetch('http://127.0.0.1:'+port+'/json/list');
            if(r.ok){
              const pages=await r.json();
              page=pages.find((p:any)=>p.type==='page'&&p.webSocketDebuggerUrl);
              if(page)break;
            }
          }
        }catch{}
        if(browser.exitCode!==null||browser.signalCode!==null)break;
        await delay(150);
      }
      if(!page){
        browser.kill('SIGTERM');
        await delay(250);
        if(browser.exitCode===null)browser.kill('SIGKILL');
        if(attempt<3)await delay(750*attempt);
      }
    }
    assert.ok(page,'genuine native Chromium CDP page after 3 isolated startup attempts');
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
    await cmd('Page.navigate',{url:'http://127.0.0.1:4295/'});
    await wait('.harbour-screen .harbour-nav-item');
    await evalJs('document.documentElement.classList.add("work8-missions-quest-readability-ab-baseline");true');
    const clicked=await evalJs('(()=>{const b=[...document.querySelectorAll(".harbour-screen button")].find(x=>x.textContent?.includes("MISSÕES"));b?.click();return !!b})()');
    assert.ok(clicked,'real Porto->Missões navigation required');
    await wait('.w8-approved-missions .w8-approved-quest-list');
    await evalJs('(async()=>{const u=[...new Set([...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(x=>x.getAttribute("href")).filter(Boolean))];await Promise.all(u.map(async src=>{const img=new Image();img.src=src;await img.decode()}));await document.fonts.ready;document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return u.length})()');
    await delay(250);
    const geometry=()=>evalJs('(()=>{const rect=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]};const nav=document.querySelector(".app-sheet > .harbour-nav");const quests=[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest")],days=[...document.querySelectorAll(".w8-approved-missions .w8-approved-days li")],buttons=[...document.querySelectorAll(".w8-approved-missions .w8-approved-tabs button, .w8-approved-missions .w8-approved-quest > button")],dockButtons=[...nav.querySelectorAll(".harbour-nav-item")];return {questCount:quests.length,days:days.length,dockCount:dockButtons.length,tabAndActionCount:buttons.length,tabBoxes:[...document.querySelectorAll(\".w8-approved-missions .w8-approved-tabs button\")].map(rect),questBoxes:quests.map(rect),dayBoxes:days.map(rect),rewardBoxes:[...document.querySelectorAll(".w8-approved-missions .w8-approved-quest-rewards")].map(rect),nav:rect(nav),meters:quests.map(q=>rect(q.querySelector(".w8-approved-meter"))),captions:days.map(d=>rect(d.querySelector("small"))),documentWidth:document.documentElement.scrollWidth,labels:quests.map(q=>q.querySelector(".w8-approved-quest-core strong")?.textContent),rewards:quests.map(q=>[...q.querySelectorAll(".w8-approved-quest-rewards strong")].map(s=>s.textContent)),glyphs:document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting-reward-coin,.w8-approved-missions svg.w8-approved-painting-reward-gem").length}})()');
    const beforeLayout=await geometry();
    const selectedBefore=await evalJs('getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-quest-art")).filter');
    const before=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove("work8-missions-quest-readability-ab-baseline");true');
    await delay(180);
    const afterLayout=await geometry();
    const selectedAfter=await evalJs('getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-quest-art")).filter');
    assert.notEqual(selectedAfter,selectedBefore,'live mission illustrations must gain approved-source luminosity');
    assert.match(selectedAfter,/brightness\(2\)/,'native Chromium must apply brightness(2) only to authentic mission artwork');
    const actionFilter=await evalJs('getComputedStyle(document.querySelector(".w8-approved-missions .w8-approved-quest[data-state=active] > button")).filter');
    assert.match(actionFilter,/brightness\(1\.5\)/,'native Chromium must illuminate only real active mission actions');
    const after=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    assert.deepEqual(afterLayout.nav,beforeLayout.nav,'shared dock geometry unchanged');
    assert.deepEqual(afterLayout.tabBoxes,beforeLayout.tabBoxes,'tab tap targets and layout must not shift');
    assert.deepEqual(afterLayout.dayBoxes,beforeLayout.dayBoxes,'seven reward boxes and scroll geometry must not shift');
    assert.deepEqual(afterLayout.questBoxes,beforeLayout.questBoxes,'original three mission cards retain same geometry');
    assert.deepEqual(afterLayout.captions,beforeLayout.captions,'seven real reward captions may not shift');
    assert.deepEqual(afterLayout.labels,beforeLayout.labels,'real mission objective labels unchanged');
    assert.deepEqual(afterLayout.rewards,beforeLayout.rewards,'real mission rewards unchanged');
    assert.equal(afterLayout.questCount,3);
    assert.equal(afterLayout.days,7);
    assert.equal(afterLayout.dockCount,5);
    assert.equal(afterLayout.tabAndActionCount,6);
    assert.equal(afterLayout.glyphs,0,'no source screenshot reward icons or fake currencies');
    assert.ok(afterLayout.dayBoxes.every((d:number[])=>d[0]>=-1&&d[0]+d[2]<=385));
    assert.ok(afterLayout.meters.every((d:number[])=>d[1]+d[3]<=afterLayout.nav[1]+3),'three progress track readouts must remain above dock');
    assert.ok(afterLayout.captions.every((d:number[])=>d[1]+d[3]<=afterLayout.nav[1]+3),'all seven day labels must remain above the WORK0 dock at 384x512');
    const original=readFileSync(new URL('../../assets/design-approved/07-missoes.webp',import.meta.url)).toString('base64');
    const script=String.raw`(async()=>{
      const make=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
      const images=await Promise.all([__ORIGINAL__,__BEFORE__,__AFTER__].map(make));
      const w=384,h=512;if(images.some(x=>x.width!==w||x.height!==h))throw Error('native images required');
      const px=images.map(i=>{const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.drawImage(i,0,0);return t.getImageData(0,0,w,h).data});
      const roi={full:[0,0,384,512],questRegistration:__ACTIVE_TAB_ROI__,missionRows:__TAB_STRIP_ROI__,missions:[12,155,372,321],daily:[12,326,373,436],chests:[20,356,370,427],header:[0,0,384,70],dock:[0,451,384,512]};
      function mae(a,b,r){let total=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const p=(y*w+x)*4;for(let z=0;z<3;z++){total+=Math.abs(a[p+z]-b[p+z]);n++}}return total/n}
      const metrics={};for(const [k,r] of Object.entries(roi)){const baseline=mae(px[0],px[1],r),candidate=mae(px[0],px[2],r);metrics[k]={baseline,candidate,delta:candidate-baseline}}
      const unchanged={header:mae(px[1],px[2],roi.header),dock:mae(px[1],px[2],roi.dock)};
      const overlays=[1,2].map(i=>{const c=document.createElement('canvas');c.width=w*3;c.height=h;const t=c.getContext('2d');t.drawImage(images[0],0,0);t.drawImage(images[i],w,0);t.drawImage(images[0],2*w,0);t.globalAlpha=.5;t.drawImage(images[i],2*w,0);return c.toDataURL('image/png').split(',')[1]});
      return {metrics,unchanged,overlays,sizes:images.map(i=>[i.width,i.height])};
    })()`;
    const rectRoi=(rect:number[])=>[Math.max(0,Math.floor(rect[0])),Math.max(0,Math.floor(rect[1])),Math.min(384,Math.ceil(rect[0]+rect[2])),Math.min(512,Math.ceil(rect[1]+rect[3]))];
    const minX=Math.min(...beforeLayout.questBoxes.map((r:number[])=>r[0]));
    const minY=Math.min(...beforeLayout.questBoxes.map((r:number[])=>r[1]));
    const maxX=Math.max(...beforeLayout.questBoxes.map((r:number[])=>r[0]+r[2]));
    const maxY=Math.max(...beforeLayout.questBoxes.map((r:number[])=>r[1]+r[3]));
    const activeRoi=rectRoi([minX-5,minY-5,maxX-minX+10,maxY-minY+10]);
    const questMinX=Math.min(...beforeLayout.questBoxes.map((r:number[])=>r[0]));
    const questMinY=Math.min(...beforeLayout.questBoxes.map((r:number[])=>r[1]));
    const stripRoi=rectRoi([
      questMinX,questMinY,
      Math.max(...beforeLayout.questBoxes.map((r:number[])=>r[0]+r[2]))-questMinX,
      Math.max(...beforeLayout.questBoxes.map((r:number[])=>r[1]+r[3]))-questMinY
    ]);
    assert.ok(activeRoi[2]>activeRoi[0]&&activeRoi[3]>activeRoi[1],'three true objective-board widths must be visible at native reference viewport');
    console.log('WORK8 real emblem and action ROI',JSON.stringify({activeRoi,stripRoi}));
    const injected=script.replace('__ORIGINAL__',JSON.stringify('data:image/webp;base64,'+original))
      .replace('__BEFORE__',JSON.stringify('data:image/png;base64,'+before))
      .replace('__AFTER__',JSON.stringify('data:image/png;base64,'+after))
      .replace('__ACTIVE_TAB_ROI__',JSON.stringify(activeRoi))
      .replace('__TAB_STRIP_ROI__',JSON.stringify(stripRoi));


    // Direct same-DOM/frame comparison of the actual current seven day captions against the approved original.
    const compared=await evalJs(injected);
    const save=(name:string,b64:string)=>writeFileSync(join(evidence,name),Buffer.from(b64,'base64'));
    save('missions-quest-readability-original-384x512.webp',original);
    save('missions-quest-readability-before-384x512.png',before);
    save('missions-quest-readability-render-384x512.png',after);
    save('missions-quest-readability-original-before-overlay.png',compared.overlays[0]);
    save('missions-quest-readability-original-render-overlay.png',compared.overlays[1]);
    // A four-panel artifact uses the SAME decoded, paused Chromium frame.
    // No synthetic state and no scaling of the native approved 384x512 artwork.
    const fourPanelSource='(async()=>{const src='+JSON.stringify([
      'data:image/webp;base64,'+original,
      'data:image/png;base64,'+before,
      'data:image/png;base64,'+after
    ])+';const pics=await Promise.all(src.map(v=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=v})));const c=document.createElement("canvas");c.width=1536;c.height=512;const x=c.getContext("2d");pics.forEach((im,n)=>x.drawImage(im,384*n,0));x.drawImage(pics[0],1152,0);x.globalAlpha=.5;x.drawImage(pics[2],1152,0);return c.toDataURL("image/png").split(",")[1]})()';
    save('missions-quest-readability-ORIGINAL-BEFORE-RENDER-OVERLAY-384x512.png',await evalJs(fourPanelSource));
    const report={
      issue:104,scope:'WORK8 exclusively 07 Missões: native source-cropped six-pixel frame of three genuine missions',
      reference:'assets/design-approved/07-missoes.webp',
      mandatoryRefs:['00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',...['01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp','05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp']].map(n=>'assets/design-approved/'+n),
      viewport:'Chromium 384x512 DPR1 same real DOM/paused animation frame',baselineClass:'work8-missions-quest-readability-ab-baseline',
      metrics:compared.metrics,unchanged:compared.unchanged,
      geometry:{before:beforeLayout,after:afterLayout},approved:false,approvedScreens:0,
      candidate:'Three original source-art pictograms brightened to source painting; real game data unchanged'
    };
    writeFileSync(join(evidence,'work8-missions-quest-readability-native-ab.json'),JSON.stringify(report,null,2));
    console.log('WORK8 07 real objective-board troughs native Chromium A/B '+JSON.stringify(compared.metrics));

    assert.ok(compared.unchanged.header<.05&&compared.unchanged.dock<.05,'header/dock pixel-identical');
    assert.ok(compared.metrics.questRegistration.delta<-.10,'real emblems plus active buttons must improve 07 mission ROI');
    assert.ok(compared.metrics.full.delta<-.04,'original three mission borders must improve full 07 source frame');
    assert.ok(compared.metrics.daily.delta<.10&&compared.metrics.chests.delta<.10,'daily reward strip cannot regress');
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:568,mobile:true,deviceScaleFactor:1,screenWidth:320,screenHeight:568});
    await delay(200);
    // Native finger taps must still switch to weekly and back to daily.
    for(const index of [2,1]){
      const target=await evalJs('(()=>{const b=document.querySelector(".w8-approved-missions .w8-approved-tabs button:nth-child('+index+')");const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
      await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x,y:target.y,radiusX:3,radiusY:3,force:1,id:1}]});
      await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await delay(140);
      assert.equal(await evalJs('document.querySelector(".w8-approved-missions .w8-approved-tabs button:nth-child('+index+')").getAttribute("aria-pressed")'),'true','native Missions tab touch must remain functional');
    }
    const narrow=await evalJs('(()=>{const days=document.querySelector(".w8-approved-days"),nav=document.querySelector(".app-sheet > .harbour-nav"),sheet=document.querySelector(".app-sheet-content");if(sheet)sheet.scrollTop=sheet.scrollHeight;if(days)days.scrollLeft=days.scrollWidth;const a=days.getBoundingClientRect(),b=days.lastElementChild.getBoundingClientRect();return {sevenVisible:b.left>=a.left-2&&b.right<=a.right+2,sevenAboveDock:b.bottom<=nav.getBoundingClientRect().top+2,dock:nav.querySelectorAll(".harbour-nav-item").length,quest:document.querySelectorAll(".w8-approved-quest").length,days:days.children.length,width:document.documentElement.scrollWidth}})()');
    assert.ok(narrow.sevenVisible&&narrow.sevenAboveDock&&narrow.width<=322&&narrow.dock===5&&narrow.quest===3&&narrow.days===7);
    save('missions-quest-readability-320x568.png',(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data);
    for(const viewport of [{width:390,height:844},{width:430,height:932}]){
      await cmd('Emulation.setDeviceMetricsOverride',{...viewport,mobile:true,deviceScaleFactor:1,screenWidth:viewport.width,screenHeight:viewport.height});
      await delay(180);
      assert.ok(await evalJs('document.documentElement.scrollWidth<='+String(viewport.width+2)));
      save('missions-quest-readability-'+viewport.width+'x'+viewport.height+'.png',(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data);
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
