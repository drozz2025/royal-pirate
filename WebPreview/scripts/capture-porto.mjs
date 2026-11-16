/**
 * Zero-dependency mobile viewport capture for the real Porto renderer.
 * Uses Chrome DevTools Protocol (Node 22 WebSocket), not a mock screenshot.
 * A failed WebGL context is recorded, never claimed as real-device QA.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const origin = process.env.PORTO_PREVIEW_URL || 'http://127.0.0.1:4173/royal-pirate/';
const out = process.env.PORTO_CAPTURE_DIR || 'porto-qa';
const chromeBinary = process.env.CHROME_BIN || 'google-chrome';
const profile = await mkdtemp(join(tmpdir(), 'royal-porto-chrome-'));
const chromePort=9231;
const chrome = spawn(chromeBinary, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-webgl', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--remote-allow-origins=*', '--remote-debugging-port=' + chromePort,
  '--user-data-dir=' + profile, 'about:blank'
], { stdio: ['ignore','ignore','pipe'] });
let chromeErrors='';
chrome.stderr.on('data', chunk=>{chromeErrors=(chromeErrors+chunk.toString()).slice(-3000);});
const events = [];
let ws;
try {
  let list;
  for (let i=0; i<200; i++) {
    if (chrome.exitCode !== null) throw new Error('Chromium quit: '+chromeErrors);
    try {
      const response=await fetch('http://127.0.0.1:' + chromePort + '/json/list',{signal:AbortSignal.timeout(600)});
      if(response.ok){list=await response.json();break;}
    } catch { /* Chrome is starting */ }
    await delay(150);
  }
  if (!list) throw new Error('Chrome debugging did not open: '+chromeErrors);
    const page = list.find(t=>t.type==='page');
  if (!page) throw new Error('No Chrome page target');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  const pending = new Map();
  let nextId=0;
  ws.addEventListener('message', e=>{
    const msg=JSON.parse(e.data);
    if (msg.method === 'Runtime.exceptionThrown') events.push(msg.params?.exceptionDetails?.text || 'JS exception');
    if (msg.method === 'Log.entryAdded') events.push('log: '+(msg.params?.entry?.text||''));
    if (msg.method === 'Network.loadingFailed') events.push('network: '+(msg.params?.errorText||''));
    if (msg.method === 'Network.responseReceived' && msg.params?.response?.status >= 400) events.push('HTTP '+msg.params.response.status+' '+msg.params.response.url);
    if(!msg.id)return;
    const callback=pending.get(msg.id);
    if(callback){pending.delete(msg.id);msg.error?callback.reject(new Error(msg.error.message)):callback.resolve(msg.result);}
  });
  const command=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++nextId;
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
    pending.set(id,{
      resolve:v=>{clearTimeout(timeout);resolve(v);},
      reject:e=>{clearTimeout(timeout);reject(e);}
    });
    ws.send(JSON.stringify({id,method,params}));
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Log.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride',{
    width:390,height:844,deviceScaleFactor:1,mobile:true,
    screenWidth:390,screenHeight:844
  });
  await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await command('Page.navigate',{url:origin});
  const evaluate=async expression=>{
    const v=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(v.exceptionDetails)throw new Error(v.exceptionDetails.text || 'Runtime evaluation failed');
    return v.result?.value;
  };
  // WORK 6 — compare every actual mobile render against the owner's exact
  // approved artwork. Side-by-side + transparent overlay, never a fake UI.
  // The reference can have a different aspect ratio; each panel is contained
  // without distortion. A mismatch is evidence for inspection, not a pass.
  const referenceFiles={
    porto:'01-porto.webp',battle:'02-batalha.webp',fleet:'03-frota.webp',
    forge:'04-melhorias-forja.webp',cards:'05-cartas.webp',shop:'06-loja.webp',
    missions:'07-missoes.webp',ranking:'08-ranking-perfil.webp'
  };
  const referenceComparisons=[];
  const captureReferenceComparison=async (key,screenshot)=>{
    const reference=await readFile(new URL('../../assets/design-approved/'+referenceFiles[key],import.meta.url));
    const referenceUrl='data:image/webp;base64,'+reference.toString('base64');
    const screenshotUrl='data:image/png;base64,'+screenshot.data;
    const comparison=await evaluate(`(async()=>{
      const load=src=>new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image failed to load'));
        img.src=src;
      });
      const [target,actual]=await Promise.all([load(${JSON.stringify(referenceUrl)}),load(${JSON.stringify(screenshotUrl)})]);
      const width=390,height=844;
      const canvas=document.createElement('canvas');canvas.width=3*width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)throw new Error('Missing 2D context');
      context.fillStyle='#081c34';context.fillRect(0,0,canvas.width,canvas.height);
      context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
      const drawContained=(img,column)=>{
        const scale=Math.min(width/img.naturalWidth,height/img.naturalHeight);
        const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
        context.drawImage(img,column*width+(width-w)/2,(height-h)/2,w,h);
      };
      drawContained(target,0);drawContained(actual,1);
      drawContained(target,2);context.globalAlpha=.5;drawContained(actual,2);context.globalAlpha=1;
      return {png:canvas.toDataURL('image/png').slice(22),
        referenceWidth:target.naturalWidth,referenceHeight:target.naturalHeight,
        liveWidth:actual.naturalWidth,liveHeight:actual.naturalHeight};
    })()`);
    await writeFile(join(out,'compare-'+key+'-390x844.png'),Buffer.from(comparison.png,'base64'));
    referenceComparisons.push({screen:key,reference:referenceFiles[key],
      referenceSize:[comparison.referenceWidth,comparison.referenceHeight],
      screenshotSize:[comparison.liveWidth,comparison.liveHeight],
      comparisonFile:'compare-'+key+'-390x844.png',
      method:'reference | live | 50 percent overlay, contained without stretching',
      approved:false});
  };
  let ready=false;
  for(let i=0;i<40;i++){
    await delay(250);
    ready=await evaluate("!!document.querySelector('.harbour-screen')");
    if(ready)break;
  }
  if(!ready)console.warn('Porto did not mount: capturing browser diagnostics rather than claiming 3D QA');
  await delay(1800);
  const report=await evaluate(`(()=>{
    const harbour=document.querySelector('.harbour-screen');
    const canvas=document.querySelector('canvas');
    const box=el=>{const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
    const targets=[...(harbour?.querySelectorAll('button')||[])].map(el=>({name:el.textContent.trim().replace(/\\s+/g,' ').slice(0,50),...box(el)}));
    const center=document.elementFromPoint(innerWidth*.5,innerHeight*.48);
    const gl=canvas?.getContext('webgl2');
    return {
      url:location.href,readyState:document.readyState,bodyExcerpt:document.body.textContent.slice(0,400),scripts:[...document.scripts].map(s=>s.src),error:document.querySelector('.error-panel')?.textContent||null,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      canvas:canvas?box(canvas):null,webgl2:!!gl,contextLost:gl?.isContextLost()??null,
      harbour:harbour?box(harbour):null,centerTouchTarget:center?.tagName??null,
      navbarItems:harbour?.querySelectorAll('.harbour-nav-item').length??0,
      leftActions:harbour?.querySelectorAll('.harbour-flank-left button').length??0,
      rightActions:harbour?.querySelectorAll('.harbour-flank-right button').length??0,
      touches:targets,bodyOverflow:document.documentElement.scrollWidth>innerWidth
    };
  })()`);
  report.javascriptExceptions=events;
  report.scriptResponses=await evaluate("Promise.all([...document.querySelectorAll('script[src]')].map(async s=>{try{const r=await fetch(s.src);return {url:s.src,status:r.status,type:r.headers.get('content-type')}}catch(e){return {url:s.src,error:String(e)}}}))");
  const screen=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await mkdir(out,{recursive:true});
  await writeFile(join(out,'porto-mobile-390x844.png'),Buffer.from(screen.data,'base64'));
  await captureReferenceComparison('porto',screen);
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.navbarItems!==5||report.leftActions!==3||report.rightActions!==3)throw new Error('Porto navigation/layout mismatch');

  // Visual handoff: compare the bottom navigation geometry on four real React
  // screens against Porto. These are 390x844 Chrome viewport screenshots,
  // not physical-device screenshots or static design mockups.
  const geometry=()=>evaluate(`(()=>{
    const nav=document.querySelector('.app-sheet > .harbour-nav')||
      document.querySelector('.harbour-screen .harbour-nav');
    if(!nav)return null;
    const r=nav.getBoundingClientRect();
    return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),
      height:Math.round(r.height),tabs:nav.querySelectorAll('.harbour-nav-item').length,
      labels:[...nav.querySelectorAll('.harbour-nav-item strong')].map(x=>x.textContent)};
  })()`);
  const portoNav=await geometry();
  report.navigationComparison=[{screen:'porto',...portoNav,matched:true}];
  for(const [screen,tab] of [['fleet',2],['cards',3],['shop',4],['ranking',5]]){
    const selector=report.navigationComparison.length===1
      ? '.harbour-screen .harbour-nav-item:nth-child('+tab+')'
      : '.app-sheet > .harbour-nav .harbour-nav-item:nth-child('+tab+')';
    const opened=await evaluate("(()=>{const b=document.querySelector("+JSON.stringify(selector)+");if(!b)return false;b.click();return true})()");
    if(!opened)throw new Error('Could not navigate to '+screen);
    await delay(250);
    const current=await geometry();
    if(!current||current.tabs!==5)throw new Error('Five tabs missing on '+screen);
    const same=['x','y','width','height'].every(key=>Math.abs(current[key]-portoNav[key])<=2);
    const labelsMatch=current.labels.join('|')===portoNav.labels.join('|');
    report.navigationComparison.push({screen,...current,matched:same&&labelsMatch});
    const capture=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    await writeFile(join(out,screen+'-mobile-390x844.png'),Buffer.from(capture.data,'base64'));
    await captureReferenceComparison(screen,capture);
    if(!same||!labelsMatch)throw new Error(screen+' navigation diverges from approved Porto sizing');
  }
  // WORK 8 visual evidence: reach the live Missions screen via Porto.
  // This only captures actual DOM rendering; it does not assert image parity.
  const toPorto=await evaluate("(()=>{const b=document.querySelector('.app-sheet > .harbour-nav .harbour-nav-item:first-child');if(!b)return false;b.click();return true})()");
  if(!toPorto)throw new Error('Could not return to Porto for Missions capture');
  await delay(300);
  const toMissions=await evaluate("(()=>{const b=[...document.querySelectorAll('.harbour-screen .harbour-flank-right button')].find(x=>x.textContent?.includes('MISSÕES'));if(!b)return false;b.click();return true})()");
  if(!toMissions)throw new Error('Could not open Missions via Porto');
  await delay(450);
  const missionLayout=await evaluate("(()=>({quests:document.querySelectorAll('.w8-approved-missions .w8-approved-quest').length,days:document.querySelectorAll('.w8-approved-days li').length,buttons:[...document.querySelectorAll('.w8-approved-missions button')].length,nav:!!document.querySelector('.app-sheet > .harbour-nav')}))()");
  report.work8Missions=missionLayout;
  if(missionLayout.quests!==3||missionLayout.days!==7||!missionLayout.nav)throw new Error('WORK 8 Missions layout missing real panels');
  const missionCapture=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await writeFile(join(out,'missions-mobile-390x844.png'),Buffer.from(missionCapture.data,'base64'));
  await captureReferenceComparison('missions',missionCapture);
  // Complete the 8/8 reference set. Forge is reached through the genuine
  // fleet action; battle is the live playable 3D scene, not its intro panel.
  const toFleet=await evaluate("(()=>{const b=document.querySelector('.app-sheet > .harbour-nav .harbour-nav-item:nth-child(2)');if(!b)return false;b.click();return true})()");
  if(!toFleet)throw new Error('Could not open Fleet for Forge evidence');
  await delay(450);
  const toForge=await evaluate("(()=>{const b=[...document.querySelectorAll('.w4-fleet button')].find(x=>x.textContent?.includes('ABRIR MELHORIAS'));if(!b)return false;b.click();return true})()");
  if(!toForge)throw new Error('Could not navigate from Fleet to Forge');
  await delay(500);
  if(!await evaluate("!!document.querySelector('.w4-forge')"))throw new Error('Forge did not mount');
  const forgeCapture=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await writeFile(join(out,'forge-mobile-390x844.png'),Buffer.from(forgeCapture.data,'base64'));
  await captureReferenceComparison('forge',forgeCapture);
  const returnToPorto=await evaluate("(()=>{const b=document.querySelector('.app-sheet > .harbour-nav .harbour-nav-item:first-child');if(!b)return false;b.click();return true})()");
  if(!returnToPorto)throw new Error('Could not return to Porto after Forge');
  await delay(450);
  const startRealBattle=await evaluate("(()=>{const b=document.querySelector('.harbour-screen .harbour-battle-button');if(!b)return false;b.click();return true})()");
  if(!startRealBattle)throw new Error('Could not start real battle from Porto');
  await delay(1300);
  const battleCapture=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await writeFile(join(out,'battle-mobile-390x844.png'),Buffer.from(battleCapture.data,'base64'));
  await captureReferenceComparison('battle',battleCapture);
  report.referenceComparisons=referenceComparisons.sort((a,b)=>Object.keys(referenceFiles).indexOf(a.screen)-Object.keys(referenceFiles).indexOf(b.screen));
  report.referenceStatus='Visual diff artefacts for all 8 screens; not a claim of pixel-exact approval';
  if(referenceComparisons.length!==8)throw new Error('Not all 8 approved reference comparisons were generated');
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');

  // WORK 0 mobile consistency gate. Capture the same real five-tab navigation
  // at narrow (320) and wide (430) phone widths, not just the 390px reference.
  // These screenshots are extra layout diagnostics; approval still requires
  // human inspection of the eight 390x844 reference overlays.
  report.responsiveNavigation=[];
  for(const viewport of [{width:320,height:568},{width:430,height:932}]){
    await command('Emulation.setDeviceMetricsOverride',{
      width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:true,
      screenWidth:viewport.width,screenHeight:viewport.height
    });
    await command('Page.navigate',{url:origin});
    for(let i=0;i<40;i++){
      if(await evaluate("!!document.querySelector('.harbour-screen .harbour-nav')"))break;
      await delay(200);
    }
    await delay(400);
    let targetNavigation;
    for(const [screen,tab] of [['porto',1],['fleet',2],['cards',3],['shop',4],['ranking',5]]){
      if(screen!=='porto'){
        const selector=targetNavigation==='porto'
          ? '.harbour-screen .harbour-nav-item:nth-child('+tab+')'
          : '.app-sheet > .harbour-nav .harbour-nav-item:nth-child('+tab+')';
        const opened=await evaluate("(()=>{const button=document.querySelector("+JSON.stringify(selector)+");if(!button)return false;button.click();return true})()");
        if(!opened)throw new Error('Could not navigate to '+screen+' at '+viewport.width+'px');
        await delay(250);
      }
      targetNavigation=screen;
      const geometry=await evaluate(`(()=>{
        const nav=document.querySelector('.app-sheet > .harbour-nav')||
          document.querySelector('.harbour-screen .harbour-nav');
        if(!nav)return null;
        const r=nav.getBoundingClientRect();
        return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),
          height:Math.round(r.height),tabs:nav.querySelectorAll('.harbour-nav-item').length,
          documentWidth:document.documentElement.scrollWidth,
          viewportWidth:innerWidth,viewportHeight:innerHeight,
          labels:[...nav.querySelectorAll('.harbour-nav-item strong')].map(x=>x.textContent)};
      })()`);
      if(!geometry)throw new Error('Missing navigation at '+viewport.width+'px / '+screen);
      const fits=Math.abs(geometry.x)<=2&&
        Math.abs(geometry.width-viewport.width)<=2&&
        Math.abs(geometry.y+geometry.height-viewport.height)<=2&&
        geometry.documentWidth<=viewport.width+2&&geometry.tabs===5;
      report.responsiveNavigation.push({screen,viewport, ...geometry,matched:fits});
      const screenshot=await command('Page.captureScreenshot',{
        format:'png',fromSurface:true,captureBeyondViewport:false
      });
      await writeFile(join(out,screen+'-mobile-'+viewport.width+'x'+viewport.height+'.png'),Buffer.from(screenshot.data,'base64'));
      if(!fits)throw new Error('Navigation overflow/misalignment at '+viewport.width+'px / '+screen+': '+JSON.stringify(geometry));
    }

    // WORK 0 / #104: capture REAL Forja at both responsive phone sizes.
    // The 390x844 visibility gate alone cannot validate the 320/430 artwork.
    // Record DOM geometry without treating a captured image as human approval.
    const openFleetForForge=await evaluate("(()=>{const b=document.querySelector('.app-sheet > .harbour-nav .harbour-nav-item:nth-child(2)');if(!b)return false;b.click();return true})()");
    if(!openFleetForForge)throw new Error('Could not enter Fleet for responsive Forge at '+viewport.width+'px');
    await delay(300);
    const openForge=await evaluate("(()=>{const b=[...document.querySelectorAll('.w4-fleet button')].find(x=>x.textContent?.includes('ABRIR MELHORIAS'));if(!b)return false;b.click();return true})()");
    if(!openForge)throw new Error('Could not enter responsive Forge at '+viewport.width+'px');
    await delay(500);
    const forgeGeometry=await evaluate(`(()=>{
      const box=e=>{const r=e?.getBoundingClientRect();return r?{left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),width:Math.round(r.width),height:Math.round(r.height)}:null};
      const nav=document.querySelector('.app-sheet > .harbour-nav');
      const stage=document.querySelector('.w4-forge .w4-forge-stage');
      const scene=document.querySelector('.w4-forge .w4-forge-scene');
      const cannon=document.querySelector('.w4-forge .w4-forge-scene > svg.w4-cannon-art');
      return {viewportWidth:innerWidth,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,
        nav:box(nav),stage:box(stage),scene:box(scene),cannon:box(cannon),
        cannonVisible:cannon?getComputedStyle(cannon).visibility!=='hidden'&&getComputedStyle(cannon).display!=='none':false,
        error:document.querySelector('.error-panel')?.textContent||null};
    })()`);
    const forgeFits=forgeGeometry?.nav&&forgeGeometry?.stage&&forgeGeometry?.scene&&forgeGeometry?.cannon&&
      forgeGeometry.cannon.width>20&&forgeGeometry.cannon.height>20&&forgeGeometry.cannonVisible&&
      !forgeGeometry.error&&forgeGeometry.documentWidth<=viewport.width+2&&
      Math.abs(forgeGeometry.nav.left)<=2&&Math.abs(forgeGeometry.nav.right-viewport.width)<=2&&
      Math.abs(forgeGeometry.nav.bottom-viewport.height)<=2;
    report.responsiveForge??=[];
    report.responsiveForge.push({viewport,...forgeGeometry,matched:Boolean(forgeFits),
      artworkApproved:false,screenshot:'forge-mobile-'+viewport.width+'x'+viewport.height+'.png'});
    const responsiveForgeShot=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    await writeFile(join(out,'forge-mobile-'+viewport.width+'x'+viewport.height+'.png'),Buffer.from(responsiveForgeShot.data,'base64'));
    if(!forgeFits)throw new Error('Forja missing/clipped at '+viewport.width+'px: '+JSON.stringify(forgeGeometry));

    // WORK 6: separately inspect the actual playable Batalha at 320 and 430.
    // The mobile cannon deck is real scene geometry, and UI hit targets must stay
    // in the viewport; a screenshot is evidence, not a claim of visual approval.
    await command('Page.navigate',{url:origin});
    for(let i=0;i<40;i++){
      if(await evaluate("!!document.querySelector('.harbour-screen .harbour-battle-button')"))break;
      await delay(200);
    }
    const battleStarted=await evaluate("(()=>{const b=document.querySelector('.harbour-screen .harbour-battle-button');if(!b)return false;b.click();return true})()");
    if(!battleStarted)throw new Error('Could not launch Batalha at '+viewport.width+'px');
    await delay(950);
    const battleGeometry=await evaluate(`(()=>{
      const rect=e=>{const b=e?.getBoundingClientRect();return b?{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}:null};
      const fire=document.querySelector('.in-battle .fire-button');
      const hud=document.querySelector('.in-battle .battle-hud');
      const deck=document.querySelector('.in-battle .command-deck');
      const views=[...document.querySelectorAll('.in-battle .view-controls button')];
      return {viewportWidth:innerWidth,viewportHeight:innerHeight,fire:rect(fire),hud:rect(hud),deck:rect(deck),
        views:views.map(rect),ready:fire&&!fire.disabled,canvas:!!document.querySelector('.ocean canvas'),
        error:document.querySelector('.error-panel')?.textContent||null,
        overflow:document.documentElement.scrollWidth>innerWidth+2};
    })()`);
    const inside=r=>r&&r.left>=-2&&r.right<=viewport.width+2&&r.top>=0&&r.bottom<=viewport.height+2;
    const battleFits=battleGeometry?.canvas&&battleGeometry.ready&&!battleGeometry.error&&!battleGeometry.overflow&&
      inside(battleGeometry.fire)&&inside(battleGeometry.hud)&&inside(battleGeometry.deck)&&
      battleGeometry.views.length===5&&battleGeometry.views.every(inside)&&
      // Approved Battle 02 has four circular utility controls ON the timber deck,
      // not above it. Keep FIRE centered, with tools clearly outside its hit area.
      battleGeometry.views.slice(0,4).every(r=>r.top>=battleGeometry.deck.top-5&&r.bottom<=battleGeometry.deck.bottom+2)&&
      battleGeometry.views[4].bottom<battleGeometry.hud.top+10&&
      Math.abs((battleGeometry.fire.left+battleGeometry.fire.right)/2-viewport.width/2)<=4&&
      battleGeometry.views.slice(0,4).every(r=>r.right<=battleGeometry.fire.left-3||r.left>=battleGeometry.fire.right+3);
    report.responsiveBattle??=[];
    report.responsiveBattle.push({viewport,...battleGeometry,matched:Boolean(battleFits)});
    const battleShot=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    await writeFile(join(out,'battle-mobile-'+viewport.width+'x'+viewport.height+'.png'),Buffer.from(battleShot.data,'base64'));
    if(!battleFits)throw new Error('Batalha UI clipped at '+viewport.width+'px: '+JSON.stringify(battleGeometry));
  }
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');

  if(report.bodyOverflow)throw new Error('Porto viewport scrolls horizontally');
  if(!report.webgl2||report.contextLost)console.warn('No confirmed WebGL2 context: screenshot is not proof of 3D performance');
} finally {
  if(ws){try{ws.close();}catch{}}
  chrome.kill('SIGTERM');
  await delay(250);
  if(chrome.exitCode===null)chrome.kill('SIGKILL');
  await rm(profile,{recursive:true,force:true});
}
