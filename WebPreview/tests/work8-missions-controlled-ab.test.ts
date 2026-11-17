import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

/* WORK8 / #104: A/B in one genuine live Missions scene and one Chrome tab.
   The baseline root class disables ONLY this PR's frame-pigment CSS; integrated #269/#271 stay active in both frames.
   No fictional mission states, no screenshot replacement, no navigation edits.
   Each screenshot is native 384x512 and checked against 07-missoes.webp. */
test('07 Missions: controlled same-frame 384x512 original/Chromium A/B improves ROI without dock or day regressions', {timeout:150000}, async()=>{
  // Avoid overlapping Chrome GPU/CDP with the existing WORK7 test (Node runs test files concurrently).
  await delay(48000);
  const chromeBin=process.env.CHROME_BIN ||
    spawnSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).stdout.trim();
  if(!chromeBin){console.log('Chromium unavailable: cannot claim visual QA');return;}
  const evidence='work8-qa';mkdirSync(evidence,{recursive:true});
  // Vite dev may not serve the approved ../../assets WebP from outside
  // WebPreview. Compare the same *built* image-bearing app used in the
  // responsive capture, not temporary fallback SVG artwork.
  const built=spawnSync('npm',['run','build','--','--base=/'],{encoding:'utf8',timeout:120000});
  assert.equal(built.status,0,'production preview build required: '+built.stderr+' '+built.stdout);
  const profile=mkdtempSync(join(tmpdir(),'rp-work8-ab-'));
  const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4186','--strictPort'],{stdio:'ignore'});
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
    // A first Vite render may paint SVG fallbacks before the approved WebP
    // crops are decoded. Do not compare an incomplete artwork frame.
    const decoded=await evalJs('(async()=>{'+
      'const refs=[...document.querySelectorAll(".w8-approved-missions svg.w8-approved-painting image")].map(i=>i.getAttribute("href")).filter(Boolean);'+
      'await Promise.all([...new Set(refs)].map(src=>{const image=new Image();image.src=src;return image.decode()}));'+
      'await document.fonts.ready;return refs.length;})()');
    assert.ok(decoded>=8,'title, three quest illustrations and four source chest crops must have loaded');
    await delay(340); // allow SVG image paint following source decode
    await evalJs('(()=>{document.querySelectorAll("*").forEach(e=>e.getAnimations?.().forEach(a=>a.pause()));return true})()');
    const readLayout=()=>evalJs('(()=>{const r=s=>{const e=document.querySelector(s),x=e?.getBoundingClientRect();return x?{x:x.left,y:x.top,right:x.right,bottom:x.bottom}:null},day=[...document.querySelectorAll(".w8-approved-days li")].map(e=>{const x=e.getBoundingClientRect();return {x:x.left,y:x.top,right:x.right,bottom:x.bottom}});return {dayContent:[...document.querySelectorAll(".w8-approved-days li")].map(e=>[e.querySelector(".w8-approved-chest"),e.querySelector("small")].map(el=>{const x=el?.getBoundingClientRect();return x?{top:x.top,bottom:x.bottom}:null})),quests:document.querySelectorAll(".w8-approved-quest").length,days:day,nav:r(".app-sheet > .harbour-nav"),navCount:document.querySelectorAll(".app-sheet > .harbour-nav .harbour-nav-item").length,daySeven:r(".w8-approved-days li:last-child"),documentWidth:document.documentElement.scrollWidth}})()');
    const baselineClass='work8-missions-frame-ab-baseline';
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
    const result={base:'work6/web-3d-preview',comparison:'HEAD v0.1.60 versus native-frame pigment CSS only',baselineClass,frame:'identical loaded DOM; paused animations; same viewport, canvas and deviceScaleFactor',roi:comparisons.metrics,unchanged:comparisons.unchanged,referenceSize:comparisons.sizes[0],renderSize:comparisons.sizes[2],beforeLayout,afterLayout,approved:false};
    writeFileSync(join(evidence,'work8-missions-controlled-ab.json'),JSON.stringify(result,null,2));
    console.log('WORK8 native-frame same-scene A/B '+JSON.stringify(result.roi));
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
    assert.ok(delta('full') < -0.15 && delta('quests') < -0.25 && delta('daily') < -0.25 && delta('chests') < -0.20,
      'Missions candidate MUST improve full MAE and both active content ROIs');

    /* WORK8 07: isolated extra ink-pass A/B in the SAME loaded, paused
       Chromium scene. Only this appended CSS is switched; the integrated
       #275 frame tuning and every other app style remain active in both. */
    const inkBaselineClass='work8-missions-ink-ab-baseline';
    await evalJs('document.documentElement.classList.add('+JSON.stringify(inkBaselineClass)+');true');
    await delay(130);
    const inkBeforeLayout=await readLayout();
    const inkBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(inkBaselineClass)+');true');
    await delay(130);
    const inkAfterLayout=await readLayout();
    const inkAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const inkSource=source
      .replace(JSON.stringify('data:image/png;base64,'+before),JSON.stringify('data:image/png;base64,'+inkBefore))
      .replace(JSON.stringify('data:image/png;base64,'+after),JSON.stringify('data:image/png;base64,'+inkAfter));
    assert.notEqual(inkSource,source,'isolated same-scene A/B must use its own native screenshots');
    const inkCompare=await evalJs(inkSource);
    writeFileSync(join(evidence,'missions-ink-ab-baseline-384x512.png'),Buffer.from(inkBefore,'base64'));
    writeFileSync(join(evidence,'missions-ink-ab-candidate-384x512.png'),Buffer.from(inkAfter,'base64'));
    writeFileSync(join(evidence,'missions-ink-original-render-overlay-before-384x512.png'),Buffer.from(inkCompare.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-ink-original-render-overlay-after-384x512.png'),Buffer.from(inkCompare.overlays[1],'base64'));
    const inkResult={
      base:'work6/web-3d-preview',
      scope:'07 Missions only; integrated prior changes ON in BOTH captures',
      candidate:'lower navy-board brightness; no boxes or interactive changes',
      frame:'identical real scene, decoded original art, paused animations, unscaled 384x512',
      baselineClass:inkBaselineClass,roi:inkCompare.metrics,
      unchanged:inkCompare.unchanged,referenceSize:inkCompare.sizes[0],
      renderSize:inkCompare.sizes[2],beforeLayout:inkBeforeLayout,
      afterLayout:inkAfterLayout,approved:false
    };
    writeFileSync(join(evidence,'work8-missions-ink-controlled-ab.json'),JSON.stringify(inkResult,null,2));
    console.log('WORK8 07 isolated native ink A/B '+JSON.stringify(inkResult.roi));
    for(const region of ['full','quests','daily','chests']){
      assert.ok(inkCompare.metrics[region].delta<-0.20,
        '07 new ink pass must reduce exact-source RGB MAE for '+region);
    }
    assert.ok(inkCompare.unchanged.dock<0.1&&inkCompare.unchanged.header<0.1,
      'original header and five-button dock unchanged in same-frame A/B');
    assert.equal(inkAfterLayout.quests,3);
    assert.equal(inkAfterLayout.days.length,7);
    assert.equal(inkAfterLayout.navCount,5);
    assert.ok(inkAfterLayout.documentWidth<=386);
    assert.ok(inkAfterLayout.dayContent.every((pair:any)=>
      pair.every((item:any)=>item && item.top>=0 && item.bottom<=inkAfterLayout.nav.y+2)),
      'seven chest images and seven captions fully above dock at 384');
    assert.deepEqual(inkBeforeLayout.days,inkAfterLayout.days,
      'pigment correction cannot move real day slots or alter tap hitboxes');
    assert.deepEqual(inkBeforeLayout.nav,inkAfterLayout.nav,
      'pigment correction cannot move the five-item dock');
    /* Native 384x512 ORIGINAL | RENDER | OVERLAY on the SAME decoded,
       paused Missions frame. This phase toggles ONLY the new heading ink
       registration; integrated #269/#271/#275/#280 remain live both times. */
    const headingBaselineClass='work8-missions-heading-ab-baseline';
    const headingLayout=()=>evalJs('(()=>{const rect=e=>{const r=e?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null};return {heading:rect(document.querySelector(".w8-approved-daily h3")),chests:[...document.querySelectorAll(".w8-approved-days .w8-approved-chest")].map(rect),days:[...document.querySelectorAll(".w8-approved-days li")].map(rect),nav:rect(document.querySelector(".app-sheet > .harbour-nav")),tabs:[...document.querySelectorAll(".w8-approved-tabs button")].map(rect),questButtons:[...document.querySelectorAll(".w8-approved-quest button")].map(rect),questCount:document.querySelectorAll(".w8-approved-quest").length,dayCount:document.querySelectorAll(".w8-approved-days li").length,dockCount:document.querySelectorAll(".app-sheet > .harbour-nav .harbour-nav-item").length,documentWidth:document.documentElement.scrollWidth};})()');
    await evalJs('document.documentElement.classList.add('+JSON.stringify(headingBaselineClass)+');true');
    await delay(130);
    const headingBeforeLayout=await headingLayout();
    const headingBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(headingBaselineClass)+');true');
    await delay(130);
    const headingAfterLayout=await headingLayout();
    const headingAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const headingSource=source
      .replace(JSON.stringify('data:image/png;base64,'+before),JSON.stringify('data:image/png;base64,'+headingBefore))
      .replace(JSON.stringify('data:image/png;base64,'+after),JSON.stringify('data:image/png;base64,'+headingAfter))
      .replace('chests:[20,356,370,427],dock:', 'chests:[20,356,370,427],dailyHeading:[25,324,370,365],dock:');
    assert.notEqual(headingSource,source,'native heading A/B must use independent baseline and candidate pixels');
    const headingCompare=await evalJs(headingSource);
    writeFileSync(join(evidence,'missions-heading-ab-baseline-384x512.png'),Buffer.from(headingBefore,'base64'));
    writeFileSync(join(evidence,'missions-heading-ab-candidate-384x512.png'),Buffer.from(headingAfter,'base64'));
    writeFileSync(join(evidence,'missions-heading-original-render-overlay-before-384x512.png'),Buffer.from(headingCompare.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-heading-original-render-overlay-after-384x512.png'),Buffer.from(headingCompare.overlays[1],'base64'));
    const headingResult={
      base:'work6/web-3d-preview',
      scope:'07 Missões heading only; full integrated paint/pigment active in A/B',
      reference:'assets/design-approved/07-missoes.webp; original 384x512 without scaling',
      scene:'single real Chromium document, decoded images, frozen animations, identical scene/frame',
      baselineClass:headingBaselineClass,roi:headingCompare.metrics,
      unchanged:headingCompare.unchanged,
      beforeLayout:headingBeforeLayout,afterLayout:headingAfterLayout,
      approved:false,approvedScreens:0
    };
    writeFileSync(join(evidence,'work8-missions-heading-controlled-ab.json'),JSON.stringify(headingResult,null,2));
    console.log('WORK8 genuine heading registration A/B '+JSON.stringify({roi:headingResult.roi,headingBefore:headingBeforeLayout.heading,headingAfter:headingAfterLayout.heading}));
    assert.equal(headingAfterLayout.questCount,3);
    assert.equal(headingAfterLayout.dayCount,7);
    assert.equal(headingAfterLayout.dockCount,5);
    assert.ok(headingAfterLayout.documentWidth<=386);
    assert.deepEqual(headingAfterLayout.days,headingBeforeLayout.days,
      'heading must not alter any real chest slot or hitbox');
    assert.deepEqual(headingAfterLayout.nav,headingBeforeLayout.nav,
      'shared five-button dock must not move');
    assert.deepEqual(headingAfterLayout.tabs,headingBeforeLayout.tabs,
      'mission tab touch targets must remain unchanged');
    assert.deepEqual(headingAfterLayout.questButtons,headingBeforeLayout.questButtons,
      'the three genuine mission CTA hitboxes must not move');
    assert.ok(headingAfterLayout.tabs.every((b:any)=>b.bottom<=headingAfterLayout.nav.top&&b.bottom-b.top>=30),
      'all three tab buttons remain usable above dock');
    assert.ok(headingAfterLayout.questButtons.every((b:any)=>b.bottom<=headingAfterLayout.nav.top&&b.bottom-b.top>=30),
      'all three quest CTA buttons remain usable above dock');
    assert.ok(headingAfterLayout.chests.every((c:any)=>c.bottom<=headingAfterLayout.nav.top+2),
      'all seven reward pictures are still clear of dock');
    assert.ok(headingAfterLayout.heading.bottom < headingBeforeLayout.heading.bottom-12,
      'heading ink must visibly move above the seven reward pictures');
    assert.ok(headingCompare.unchanged.dock<0.1&&headingCompare.unchanged.header<0.1,
      'Porto/header and unchanged global dock cannot repaint');
    assert.ok(headingCompare.metrics.dailyHeading.delta < -0.20,
      'the actual daily heading ROI must approach native approved source');
    assert.ok(headingCompare.metrics.full.delta < -0.03 &&
      headingCompare.metrics.daily.delta < -0.08,
      'native full-screen and daily panel MAE cannot regress');


    /* WORK8: precisely registered quest engraving, independent of the earlier
       heading/enamel gates, in the SAME genuine decoded/paused 384x512 scene. */
    const questClass='work8-missions-quest-engraving-ab-baseline';
    await evalJs('document.documentElement.classList.add('+JSON.stringify(questClass)+');true');
    await delay(150);
    const questLayoutBefore=await headingLayout();
    const questBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(questClass)+');true');
    await delay(150);
    const questLayoutAfter=await headingLayout();
    const questAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const questSource=source
      .replace(JSON.stringify('data:image/png;base64,'+before),JSON.stringify('data:image/png;base64,'+questBefore))
      .replace(JSON.stringify('data:image/png;base64,'+after),JSON.stringify('data:image/png;base64,'+questAfter))
      .replace('quests:[12,155,372,321],daily:', 'quests:[12,155,372,321],questRows:[25,158,370,323],daily:');
    const questCompare=await evalJs(questSource);
    writeFileSync(join(evidence,'missions-quest-engraving-baseline-384x512.png'),Buffer.from(questBefore,'base64'));
    writeFileSync(join(evidence,'missions-quest-engraving-candidate-384x512.png'),Buffer.from(questAfter,'base64'));
    writeFileSync(join(evidence,'missions-quest-original-render-overlay-before-384x512.png'),Buffer.from(questCompare.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-quest-original-render-overlay-after-384x512.png'),Buffer.from(questCompare.overlays[1],'base64'));
    const questResult={
      base: "ef4bc501fafb6363933c2411f6e6a6efb8119dd2",ref:'assets/design-approved/07-missoes.webp',
      sourceSizes:questCompare.sizes,scene:'same Chromium document and frame; native 384x512; images decoded, animations frozen',
      scope:'07 Missões genuine quest paint, width distribution and legibility ONLY',
      metrics:questCompare.metrics,unchanged:questCompare.unchanged,
      layoutBefore:questLayoutBefore,layoutAfter:questLayoutAfter,approved:false,approvedScreens:0
    };
    writeFileSync(join(evidence,'work8-missions-quest-engraving-controlled-ab.json'),JSON.stringify(questResult,null,2));
    console.log('WORK8 new quest engraving MAE/ROI '+JSON.stringify(questResult.metrics));
    assert.equal(questLayoutAfter.questCount,3);
    assert.equal(questLayoutAfter.dayCount,7);
    assert.equal(questLayoutAfter.dockCount,5);
    assert.ok(questLayoutAfter.documentWidth<=386,'no sideways overflow at native 384');
    assert.deepEqual(questLayoutBefore.days,questLayoutAfter.days,'do not move seven actual chest touch targets');
    assert.deepEqual(questLayoutBefore.nav,questLayoutAfter.nav,'five-button dock geometry untouched');
    assert.deepEqual(questLayoutBefore.tabs,questLayoutAfter.tabs,'the tab touch areas must not change');
    assert.ok(questLayoutAfter.chests.every((c:any)=>c.bottom<=questLayoutAfter.nav.top+2),'all seven chests visible over the dock');
    assert.ok(questLayoutAfter.questButtons.every((b:any)=>b.bottom<=questLayoutAfter.nav.top&&b.bottom-b.top>=30),'three genuine CTA hit targets remain usable');
    assert.ok(questCompare.unchanged.dock<0.1&&questCompare.unchanged.header<0.1,'shared header/dock must have zero paint regressions');
    assert.ok(questCompare.metrics.full.delta<-.03 && questCompare.metrics.quests.delta<-.12,
      'visual changes must improve true 384x512 original-frame quest and full-screen MAE');
    assert.ok(Math.abs(questCompare.metrics.daily.delta)<.03&&Math.abs(questCompare.metrics.chests.delta)<.03,
      'seven daily rewards must not suffer a visual regression');


    /* WORK8 / 07 Missões — source-registered gold title WITHOUT the opaque
       rectangular crop. The painted reference, test baseline, and candidate
       are drawn from the SAME paused, decoded Chromium scene at 384x512.
       No mock rewards, no scaling and no changes to other WORK screens. */
    const titleInkClass='work8-missions-title-ink-ab-baseline';
    const inkPaintingRect=()=>evalJs('(()=>{const n=document.querySelector(".w8-approved-missions .w8-approved-daily h3 > svg.w8-approved-painting-daily-heading"),r=n?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null;})()');
    await evalJs('document.documentElement.classList.add('+JSON.stringify(titleInkClass)+');true');
    await delay(160);
    const titleInkBeforeLayout=await headingLayout();
    const titleInkBeforePainting=await inkPaintingRect();
    const titleInkBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(titleInkClass)+');true');
    await delay(160);
    const titleInkAfterLayout=await headingLayout();
    const titleInkAfterPainting=await inkPaintingRect();
    const titleInkAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const titleInkSource=source
      .replace(JSON.stringify('data:image/png;base64,'+before),JSON.stringify('data:image/png;base64,'+titleInkBefore))
      .replace(JSON.stringify('data:image/png;base64,'+after),JSON.stringify('data:image/png;base64,'+titleInkAfter))
      .replace('chests:[20,356,370,427],dock:', 'chests:[20,356,370,427],dailyInk:[42,319,343,363],dock:');
    assert.notEqual(titleInkSource,source,'title ink A/B must be genuinely isolated');
    const titleInkCompare=await evalJs(titleInkSource);
    writeFileSync(join(evidence,'missions-title-ink-before-384x512.png'),Buffer.from(titleInkBefore,'base64'));
    writeFileSync(join(evidence,'missions-title-ink-after-384x512.png'),Buffer.from(titleInkAfter,'base64'));
    writeFileSync(join(evidence,'missions-title-ink-original-render-overlay-before-384x512.png'),Buffer.from(titleInkCompare.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-title-ink-original-render-overlay-after-384x512.png'),Buffer.from(titleInkCompare.overlays[1],'base64'));
    const titleInkReport={
      baseCommit:'0ad0602f6238aecd24a47fe4e9ce6872f0c09550',
      art:'assets/design-approved/07-missoes.webp',
      scope:'ONLY 07 Missions engraved Recompensa Diaria source inscription',
      scene:'same native Chromium 384x512 document/frame, 1x device scale, SVG WebP art decoded, animations paused',
      baselineClass:titleInkClass,roi:titleInkCompare.metrics,unchanged:titleInkCompare.unchanged,
      sourceSize:titleInkCompare.sizes[0],renderSize:titleInkCompare.sizes[2],
      paintingBefore:titleInkBeforePainting,paintingAfter:titleInkAfterPainting,
      beforeLayout:titleInkBeforeLayout,afterLayout:titleInkAfterLayout,
      approved:false,approvedScreens:0
    };
    writeFileSync(join(evidence,'work8-missions-title-ink-controlled-ab.json'),JSON.stringify(titleInkReport,null,2));
    console.log('WORK8 new title-ink same-frame MAE/ROI '+JSON.stringify(titleInkReport.roi));
    assert.equal(titleInkAfterLayout.questCount,3,'exactly the 3 true local objectives');
    assert.equal(titleInkAfterLayout.dayCount,7,'all 7 actual daily chest slots');
    assert.equal(titleInkAfterLayout.dockCount,5,'five unchanged dock entries');
    assert.deepEqual(titleInkBeforePainting,titleInkAfterPainting,'static painted title geometry must not move');
    assert.deepEqual(titleInkBeforeLayout.days,titleInkAfterLayout.days,'real seven-day geometries identical');
    assert.deepEqual(titleInkBeforeLayout.chests,titleInkAfterLayout.chests,'chest paintings are not moved');
    assert.deepEqual(titleInkBeforeLayout.questButtons,titleInkAfterLayout.questButtons,'quest touch targets unchanged');
    assert.deepEqual(titleInkBeforeLayout.tabs,titleInkAfterLayout.tabs,'mission tab touch targets unchanged');
    assert.deepEqual(titleInkBeforeLayout.nav,titleInkAfterLayout.nav,'dock geometry unchanged');
    assert.ok(titleInkAfterLayout.documentWidth<=386,'no 384px sideways scrolling');
    assert.ok(titleInkAfterLayout.chests.every((c:any)=>c.bottom<=titleInkAfterLayout.nav.top+2),
      'seven chest drawings remain clear of the five-button dock');
    assert.ok(titleInkCompare.unchanged.header<.1&&titleInkCompare.unchanged.dock<.1,
      'unowned header and dock must remain pixel-identical');
    assert.ok(titleInkCompare.metrics.dailyInk.delta<-.18,
      'native 384px daily-heading ROI must improve after removing the rectangle');
    assert.ok(titleInkCompare.metrics.full.delta<-.02&&titleInkCompare.metrics.daily.delta<-.06,
      'daily heading improvement must improve the entire frame and daily panel');
    assert.ok(titleInkCompare.metrics.quests.delta<.06&&titleInkCompare.metrics.chests.delta<.06,
      'other three quests and seven chest icons must not regress');


    /* WORK8 #104: source-registered geometry A/B in the identical paused
       and decoded 384x512 Chromium scene. Only mission tabs and the three
       genuine objective rows move in paint space; the seven rewards do not. */
    const positionClass='work8-missions-position-ab-baseline';
    await evalJs('document.documentElement.classList.add('+JSON.stringify(positionClass)+');true');
    await delay(150);
    const posBeforeLayout=await headingLayout();
    const posBefore=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    await evalJs('document.documentElement.classList.remove('+JSON.stringify(positionClass)+');true');
    await delay(150);
    const posAfterLayout=await headingLayout();
    const posAfter=(await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
    const posSource=source
      .replace(JSON.stringify('data:image/png;base64,'+before),JSON.stringify('data:image/png;base64,'+posBefore))
      .replace(JSON.stringify('data:image/png;base64,'+after),JSON.stringify('data:image/png;base64,'+posAfter))
      .replace('quests:[12,155,372,321],daily:', 'quests:[12,155,372,321],tabs:[12,115,372,166],questUpper:[12,155,372,264],daily:');
    assert.notEqual(posSource,source,'native A/B must compare two genuinely captured frames');
    const posCompare=await evalJs(posSource);
    writeFileSync(join(evidence,'missions-position-before-384x512.png'),Buffer.from(posBefore,'base64'));
    writeFileSync(join(evidence,'missions-position-after-384x512.png'),Buffer.from(posAfter,'base64'));
    writeFileSync(join(evidence,'missions-position-original-render-overlay-before-384x512.png'),Buffer.from(posCompare.overlays[0],'base64'));
    writeFileSync(join(evidence,'missions-position-original-render-overlay-after-384x512.png'),Buffer.from(posCompare.overlays[1],'base64'));
    const positionReport={
      baseCommit:"dda438e66bb20752a55a6160ec62758eb80a0ab1",scope:'07 Missões only: source-space positioning of THREE existing navigation tabs',
      source:'assets/design-approved/07-missoes.webp; native unscaled 384x512',
      scene:'same paused/decoded Chromium document and frame; deviceScaleFactor=1',
      roi:posCompare.metrics,unchanged:posCompare.unchanged,
      beforeLayout:posBeforeLayout,afterLayout:posAfterLayout,approved:false,approvedScreens:0
    };
    writeFileSync(join(evidence,'work8-missions-position-controlled-ab.json'),JSON.stringify(positionReport,null,2));
    console.log('WORK8 native 07 position/form A/B '+JSON.stringify(positionReport.roi));
    assert.deepEqual(posBeforeLayout.days,posAfterLayout.days,'all seven reward slots unchanged');
    assert.deepEqual(posBeforeLayout.chests,posAfterLayout.chests,'all seven chest illustrations stay fixed');
    assert.deepEqual(posBeforeLayout.nav,posAfterLayout.nav,'five-item dock untouched');
    assert.equal(posAfterLayout.questCount,3,'three genuine local objectives');
    assert.equal(posAfterLayout.dayCount,7,'seven genuine rewards');
    assert.equal(posAfterLayout.dockCount,5,'five global dock buttons');
    assert.ok(posAfterLayout.documentWidth<=386,'no horizontal overflow at 384');
    assert.ok(posAfterLayout.chests.every((c:any)=>c.bottom<=posAfterLayout.nav.top+2),
      'every chest illustration remains visible above dock');
    assert.ok(posAfterLayout.tabs.every((b:any)=>b.top>=70&&b.bottom<=posAfterLayout.nav.top&&b.bottom-b.top>=30),
      'three mission tab hitboxes remain usable');
    assert.ok(posAfterLayout.questButtons.every((b:any)=>b.top>=70&&b.bottom<=posAfterLayout.nav.top&&b.bottom-b.top>=30),
      'three mission CTA hitboxes remain usable');
    assert.ok(posBeforeLayout.tabs.every((b:any,i:number)=>Math.abs(b.top-posAfterLayout.tabs[i].top-11)<.2),
      'real tab hitbox registration equals eleven native pixels');
    assert.deepEqual(posBeforeLayout.questButtons,posAfterLayout.questButtons,
      'three real quest CTA hitboxes cannot move after rejected quest-board shift');
    assert.ok(posCompare.unchanged.header<.1&&posCompare.unchanged.dock<.1,
      'unowned header and dock must be pixel-identical');
    assert.ok(posCompare.metrics.full.delta<0&&posCompare.metrics.tabs.delta<-.1&&posCompare.metrics.quests.delta<.18,
      'original-frame MAE must improve globally and tab ROI without regressing three quest rows');
    assert.ok(Math.abs(posCompare.metrics.chests.delta)<.08&&Math.abs(posCompare.metrics.daily.delta)<.25,
      'seven rewards and daily panel must not visually regress');

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
