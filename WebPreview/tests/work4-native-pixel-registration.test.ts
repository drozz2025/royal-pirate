import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,readFileSync as read,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4 / #104 — source-pixel registration of approved 03/04';
const block=(css.split(marker)[1]||'').split('/* WORK4 / #104 — 17 Nov 10h:')[0];
const nativeBaseline=[
  '@media (min-width:360px) and (max-width:399px) and (max-height:650px) {',
  '.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship {top:11px!important;}',
  '.w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon {left:-7px!important;top:5px!important;}',
  '}'
].join('\n');

test('WORK4 source-pixel registration changes only the two approved native crops',()=>{
  assert.ok(block,'a native source registration block is required');
  assert.match(block,/top:9px!important/);
  assert.match(block,/left:-9px!important/);
  assert.match(block,/top:2px!important/);
  assert.match(block,/@media \(min-width:360px\) and \(max-width:399px\) and \(max-height:650px\)/);
  assert.doesNotMatch(block,/\.app-|\.porto-|\.harbour-nav|\.bottom-nav|contain:paint|translateZ|\.w4-materials|position:fixed/);
  assert.equal((block.match(/\.w4-reference-ship/g)||[]).length,1);
  assert.equal((block.match(/\.w4-reference-cannon/g)||[]).length,1);
  assert.match(css,/w4-reference-sea/);
  assert.match(css,/contain:paint/);
  assert.match(css,/transform:translateZ\(0\)/);
});

const sleep=(ms:number)=>new Promise<void>(done=>setTimeout(done,ms));
const chrome=[process.env.CHROME_BIN,'google-chrome','chromium'].filter(Boolean)
  .find(p=>spawnSync('which',[p!],{encoding:'utf8'}).status===0);
const runBrowser=process.env.CI==='true' && Boolean(chrome);
const viewports:[[number,number],[number,number],[number,number],[number,number]]=[
  [384,512],[320,568],[390,844],[430,932]
];
const roi:Record<string,[number,number,number,number]>={
  fleet:[65,205,175,307],
  forge:[100,230,160,300]
};

test('WORK4 native same-frame Chromium original|before|after|overlay, ROI and four touch viewports',{
  skip:runBrowser?false:'Chromium evidence is recorded on CI',
  timeout:240_000
},async t=>{
  const build=spawnSync('npm',['run','build','--','--base=/royal-pirate/'],
    {cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:12000000});
  assert.equal(build.status,0,'production WebP assets must build: '+(build.stderr||build.stdout).slice(-2200));
  const folder=resolve('porto-qa/work4');mkdirSync(folder,{recursive:true});
  const port=await new Promise<number>((yes,no)=>{
    const socket=createServer();socket.once('error',no);
    socket.listen(0,'127.0.0.1',()=>{
      const address=socket.address();
      if(!address||typeof address==='string'){socket.close();return no(new Error('no preview port'));}
      socket.close(()=>yes(address.port));
    });
  });
  const server=spawn(join(process.cwd(),'node_modules','.bin','vite'),
    ['preview','--host','127.0.0.1','--port',String(port),'--strictPort','--base=/royal-pirate/'],
    {cwd:process.cwd(),stdio:'ignore'});
  const temp=mkdtempSync(join(tmpdir(),'royal-work4-reg-'));
  let browser:ReturnType<typeof spawn>|undefined;
  let ws:WebSocket|undefined;
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');server.kill('SIGTERM');await sleep(350);rmSync(temp,{force:true,recursive:true});});
  const origin='http://127.0.0.1:'+port+'/royal-pirate/';
  let live=false;
  for(let n=0;n<100;n++){
    try{if((await fetch(origin,{signal:AbortSignal.timeout(900)})).ok){live=true;break;}}catch{}
    await sleep(160);
  }
  assert.ok(live,'production Vite preview must become reachable');
  browser=spawn(chrome!,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
    '--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:'ignore'});
  let debuggerTarget:any;
  for(let n=0;n<300;n++){
    if(browser.exitCode!==null)throw Error('Chromium quit');
    try{
      const debugPort=Number(read(join(temp,'DevToolsActivePort'),'utf8').split('\n')[0]);
      if(debugPort>0){
        const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',{signal:AbortSignal.timeout(900)});
        if(response.ok)debuggerTarget=(await response.json() as any[]).find(p=>p.type==='page');
      }
    }catch{}
    if(debuggerTarget)break;
    await sleep(120);
  }
  assert.ok(debuggerTarget,'Chromium DevTools port exists');
  ws=new WebSocket(debuggerTarget.webSocketDebuggerUrl);
  await new Promise<void>((yes,no)=>{
    ws!.addEventListener('open',()=>yes(),{once:true});
    ws!.addEventListener('error',()=>no(new Error('websocket failed')),{once:true});
  });
  let seq=0;
  const pending=new Map<number,{resolve:(a:any)=>void,reject:(e:Error)=>void}>();
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(String(e.data));const item=pending.get(msg.id);
    if(!item)return;pending.delete(msg.id);
    msg.error?item.reject(Error(msg.error.message)):item.resolve(msg.result);
  });
  const command=(method:string,params:Record<string,unknown>={})=>new Promise<any>((yes,no)=>{
    const id=++seq;
    const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP timeout '+method));},30000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);yes(v);},reject:e=>{clearTimeout(timer);no(e);}});
    ws!.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async(expression:string)=>{
    const resp=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(resp.exceptionDetails)throw Error('Chrome evaluate: '+(resp.exceptionDetails.text||JSON.stringify(resp.exceptionDetails)));
    return resp.result?.value;
  };
  const wait=async(expression:string)=>{
    for(let n=0;n<100;n++){
      if(await evaluate(expression))return;
      await sleep(120);
    }
    throw Error('Missing target: '+expression);
  };
  const touch=async(selector:string)=>{
    const point=await evaluate("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");if(!e)return null;const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()");
    assert.ok(point,'real touch target '+selector);
    await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:9}]});
    await sleep(70);
    await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await command('Page.enable');await command('Runtime.enable');
  const references={
    fleet:readFileSync(new URL('../../assets/design-approved/03-frota.webp',import.meta.url)).toString('base64'),
    forge:readFileSync(new URL('../../assets/design-approved/04-melhorias-forja.webp',import.meta.url)).toString('base64')
  };
  const report:{approved:boolean;headBaseline:string;visual:any[]}={
    approved:false,headBaseline:'same-scene merged HEAD CSS values; no art, DOM or data change',visual:[]
  };
  for(const [width,height] of viewports){
    await command('Emulation.setDeviceMetricsOverride',{
      width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
    });
    await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    for(const screen of ['fleet','forge'] as const){
      await command('Page.navigate',{url:origin+'?work4='+screen+'-'+width});
      await wait("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(2)')");
      await touch('.harbour-screen .harbour-nav-item:nth-child(2)');
      await wait("!!document.querySelector('.w4-fleet .w4-reference-ship')");
      if(screen==='forge'){
        // This existing local button is not always above the fixed dock on short
        // screens, so activate its real React handler without moving scroll.
        assert.ok(await evaluate("(()=>{const e=document.querySelector('.w4-fleet-state .w4-primary');if(!e)return false;e.click();return true;})()"));
        await wait("!!document.querySelector('.w4-forge .w4-reference-cannon')");
      }
      await evaluate("(async()=>{await document.fonts.ready;"+
        "document.getAnimations().forEach(a=>a.pause());"+
        "const imgs=[...document.querySelectorAll('.w4-screen svg image')];"+
        "await Promise.all(imgs.map(async e=>{const href=e.getAttribute('href');"+
        "if(href){const r=await fetch(href);if(!r.ok)throw Error('approved image not loaded');}}));"+
        "return true;})()");
      await sleep(220);
      const geometry=await evaluate("(()=>{const q=s=>document.querySelector(s);"+
        "const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};"+
        "const scene=q('.w4-'+ "+JSON.stringify(screen)+" + ' .w4-'+("+JSON.stringify(screen)+"==='fleet'?'harbour':'forge')+'-stage');"+
        "const artwork=q("+JSON.stringify(screen==='fleet'?'.w4-reference-ship':'.w4-reference-cannon')+");"+
        "const dock=q('.harbour-nav.app-dock-porto');"+
        "return {width:innerWidth,height:innerHeight,scene:box(scene),artwork:box(artwork),"+
        "dock:box(dock),dockItems:q('.harbour-nav.app-dock-porto')?.querySelectorAll('.harbour-nav-item').length||0,"+
        "overflow:document.documentElement.scrollWidth>innerWidth+1,"+
        "materials:box(q('.w4-materials .w4-resource-grid'))};})()");
      assert.equal(geometry.dockItems,5,'five original dock items retained');
      assert.equal(geometry.overflow,false,'horizontal overflow at '+width+'x'+height);
      assert.ok(geometry.artwork?.width>110&&geometry.artwork?.height>120,'approved pictorial hero is present');
      if(screen==='forge'){
        assert.ok(geometry.materials,'true costs remain rendered');
        assert.ok(geometry.artwork.x>=-12,'cannon mouth remains within the left stage');
        assert.ok(geometry.artwork.x+geometry.artwork.width<=width-50,'no overlap with the right levels card');
      }
      let before:string|null=null;
      if(width===384&&height===512){
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');s.id='work4-native-before';s.textContent="+JSON.stringify(nativeBaseline)+";document.head.appendChild(s);return true;})()"));
        await sleep(180);
        before=(await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data;
        writeFileSync(join(folder,'before-'+screen+'-384x512.png'),Buffer.from(before,'base64'));
        await evaluate("(()=>{document.getElementById('work4-native-before').remove();return true})()");
        await sleep(180);
      }
      const screenshot=(await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
      writeFileSync(join(folder,screen+'-'+width+'x'+height+'.png'),Buffer.from(screenshot,'base64'));


      // WORK4 / #104 — same-frame 03 composition gate after rejecting the
      // stage-crop experiment (+1.78 global / +23.3 water ROI regression).
      // Restore ONLY merged-HEAD stats-panel paint/position in Chromium,
      // compare native 384x512 source art and verify ship/water/roster/dock
      // geometry and interactions are untouched.
      if(screen==='fleet' && width===384 && height===512){
        const boxOf="(()=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;"+
          "const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};"+
          "return {stage:box('.w4-fleet .w4-harbour-stage'),"+
          "ship:box('.w4-fleet .w4-reference-ship'),"+
          "label:box('.w4-fleet .w4-stage-label'),"+
          "roster:box('.w4-fleet .w4-ship-roster'),"+
          "dock:box('.harbour-nav.app-dock-porto'),"+
          "cards:document.querySelectorAll('.w4-fleet .w4-ship-roster .w4-ship-slot').length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const nowGeo=await evaluate(boxOf);
        assert.equal(nowGeo.cards,4,'all four Fleet slots remain');
        assert.equal(nowGeo.nav,5,'five original dock buttons remain');
        assert.ok(nowGeo.label?.bottom<=nowGeo.stage.bottom+3,
          'the real Fleet active status must remain inside its scene');
        const headPaint=[
          '.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label {'+
          'top:10%!important;background:linear-gradient(90deg,#08294385,#062640d9)!important;'+
          'border:0!important;border-left:1px solid #e5bf80!important;'+
          'border-radius:0 8px 8px 0!important;box-shadow:none!important;}'
        ].join('\\n');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-fleet-previous-stat-plate';s.textContent="+JSON.stringify(headPaint)+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(130);
        const oldGeo=await evaluate(boxOf);
        const oldFleetImage=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-fleet-inset-384x512.png'),
          Buffer.from(oldFleetImage,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-fleet-previous-stat-plate')?.remove();return true;})()"));
        assert.equal(oldGeo.cards,4);assert.equal(oldGeo.nav,5);
        assert.ok(nowGeo.label.y>oldGeo.label.y+8&&nowGeo.label.y<oldGeo.label.y+18,
          'reference panel must be inset lower without crossing the single ship');
        for(const key of ['stage','ship','roster','dock'] as const){
          assert.deepEqual(nowGeo[key],oldGeo[key],
            'paint and label correction must not change '+key+' geometry');
        }
        const compare="(async()=>{"+
          "const im=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [ref,prev,now]=await Promise.all(["+
          "im('data:image/webp;base64,"+references.fleet+"'),"+
          "im('data:image/png;base64,"+oldFleetImage+"'),"+
          "im('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,prev,now].some(i=>i.width!==384||i.height!==512))throw Error('384x512 source must not be scaled');"+
          "const data=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=data(ref),b=data(prev),c=data(now);"+
          "// Water ROI stops before x235 stats-panel left edge, so panel paint\n          // cannot contaminate sea-only comparisons.\n          const rois={global:[0,0,384,512],panel:[228,151,373,341],"+
          "ship:[65,205,175,307],water:[18,306,218,356],roster:[18,350,374,458]};"+
          "const mae=(u,v,r)=>{let s=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){s+=Math.abs(u[k+j]-v[k+j]);n++;}}return s/n;};"+
          "const before={},after={};for(const [name,r] of Object.entries(rois)){before[name]=mae(a,b,r);after[name]=mae(a,c,r);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(prev,384,0);g.drawImage(now,768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {rois,before,after,compare:out.toDataURL('image/png').split(',')[1]};})()";
        const ab=await evaluate(compare);
        writeFileSync(join(folder,'compare-fleet-panel-384x512.png'),
          Buffer.from(ab.compare,'base64'));
        delete ab.compare;
        const evidence={...ab,source:'assets/design-approved/03-frota.webp',
          previousGeometry:oldGeo,newGeometry:nowGeo,
          sameReactFrame:true,native:true,approved:false};
        writeFileSync(join(folder,'fleet-panel-controlled-ab.json'),
          JSON.stringify(evidence,null,2)+'\\n');
        console.log('WORK4_FLEET_PANEL_AB '+JSON.stringify(evidence));
        assert.ok(Math.abs(ab.after.ship-ab.before.ship)<.2,
          'single approved Royal Crown ROI must not move or regress');
        assert.ok(Math.abs(ab.after.water-ab.before.water)<.2,
          'approved sea/source bridge cannot regress');
        assert.ok(Math.abs(ab.after.roster-ab.before.roster)<.2,
          'four real ship slot pictures cannot regress');
      }

      // WORK4 15h: ORIGINAL | previous live vector | painted source | OVERLAY.
      // Same Chromium native scene/frame at DPR1; only artwork inside four
      // existing local card slots changes. A/B uses approved 03 pixels only.
      if(screen==='fleet' && width===384 && height===512){
        const previousPaint=[
          '.w4-fleet .w4-ship-roster > .w4-ship-slot > .w4-slot-art {background-image:none!important;}',
          '.w4-fleet .w4-ship-roster > .w4-ship-slot > .w4-slot-art > * {opacity:1!important;}',
          '.w4-fleet .w4-ship-roster > .w4-ship-slot.is-pending .w4-slot-unavailable {opacity:.48!important;filter:grayscale(.85) brightness(.78)!important;}'
        ].join('\n');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');s.id='work4-before-thumbnails';s.textContent="+
          JSON.stringify(previousPaint)+";document.head.appendChild(s);return true;})()"));
        await sleep(150);
        const previousFrame=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-source-thumbnails-fleet-384x512.png'),Buffer.from(previousFrame,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-thumbnails')?.remove();return true;})()"));
        await sleep(120);
        const compare="(async()=>{"+
          "const im=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [ref,old,now]=await Promise.all(["+
          "im('data:image/webp;base64,"+references.fleet+"'),"+
          "im('data:image/png;base64,"+previousFrame+"'),"+
          "im('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,old,now].some(i=>i.width!==384||i.height!==512))throw Error('native no scale');"+
          "const data=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=data(ref),b=data(old),c=data(now);"+
          "const rois={global:[0,0,384,512],ship:[65,205,175,307],sea:[18,300,218,339],"+
            "rosterArt:[18,347,367,414],activeArt:[283,347,367,414],dock:[0,430,384,512]};"+
          "const mae=(u,v,r)=>{let s=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){s+=Math.abs(u[k+j]-v[k+j]);n++;}}return s/n;};"+
          "const before={},after={};for(const [name,rect] of Object.entries(rois)){before[name]=mae(a,b,rect);after[name]=mae(a,c,rect);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(old,384,0);g.drawImage(now,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {rois,before,after,image:out.toDataURL('image/png').split(',')[1]};})()";
        const ab=await evaluate(compare);
        assert.ok(Number.isFinite(ab.after.rosterArt)&&Number.isFinite(ab.after.global),'ROI measured');
        for(const key of ['ship','sea','dock'] as const)
          assert.ok(Math.abs(ab.after[key]-ab.before[key])<.05,key+' protected ROI unchanged');
        writeFileSync(join(folder,'compare-source-thumbnails-fleet-384x512.png'),Buffer.from(ab.image,'base64'));
        delete ab.image;
        const evidence={...ab,source:'assets/design-approved/03-frota.webp',
          sameReactFrame:true,viewport:'384x512',approved:false};
        writeFileSync(join(folder,'fleet-source-thumbnails-ab.json'),JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_SOURCE_THUMBNAILS_AB '+JSON.stringify(evidence));
      }
      // WORK4 / 09h: real native Forge first-fold A/B on an IDENTICAL React
      // frame. Temporarily restore the previous material-note placement and
      // compact CSS, then undo both before measuring; no artificial gameplay
      // or currency changes, no edits to any shared shell, Porto or dock.
      let forgeMaterialsAB:any=null;
      let forgeFinishAB:any=null;
      if(screen==='forge' && width===384 && height===512){
        const baselineStyle=[
          '.w4-forge #w4-forge-panel{gap:5px!important}',
          '.w4-forge #w4-forge-panel>.w4-forge-stage{height:clamp(184px,34dvh,202px)!important;min-height:clamp(184px,34dvh,202px)!important}',
          '.w4-forge #w4-forge-panel>.w4-materials{margin:-2px 1px 0!important;padding:5px 6px 6px!important;background:linear-gradient(160deg,#204a68,#0b2845 65%,#081f3b)!important}',
          '.w4-forge #w4-forge-panel>.w4-materials h3{margin:0 0 4px!important;font-size:16px!important}',
          '.w4-forge #w4-forge-panel .w4-resource-grid>div{min-height:54px!important;padding:2px 3px!important;gap:3px!important}',
          '.w4-forge #w4-forge-panel .w4-resource-grid>div>span{height:20px!important;font-size:20px!important}',
          '.w4-forge #w4-forge-panel .w4-resource-grid small{font-size:8px!important;line-height:1.15!important}',
          '.w4-forge #w4-forge-panel .w4-resource-grid strong{font-size:16px!important;line-height:1.1!important}',
          '.w4-forge #w4-forge-panel>.w4-improve-button{width:94%!important;min-height:47px!important;margin:0 auto 3px!important;font-size:18px!important}'
        ].join('\n');
        const geometryOfAction="(()=>{const q=s=>document.querySelector(s);const action=q('#w4-forge-panel>.w4-improve-button');const dock=q('.harbour-nav.app-dock-porto');const material=q('.w4-materials');const note=q('.w4-materials-note');const stage=q('.w4-forge-stage');if(!action||!dock||!material||!note||!stage)return null;const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width}};return {button:box(action),dock:box(dock),material:box(material),stage:box(stage),note:box(note),noteText:note.textContent,buttonText:action.textContent};})()";
        const afterGeo=await evaluate(geometryOfAction);
        assert.ok(afterGeo?.button && afterGeo?.dock && afterGeo?.material,
          'real costs and actual upgrade action must remain in the DOM');
        assert.ok(afterGeo.button.height>=44,'native upgrade action preserves 44px touch target');
        assert.ok(afterGeo.button.bottom<=afterGeo.dock.top+2,
          'native upgrade action must be wholly visible ABOVE the protected dock');
        assert.ok(afterGeo.material.bottom<=afterGeo.button.top+3,
          'real material amounts must be before the actionable upgrade');
        assert.ok(afterGeo.noteText?.includes('Não existe inventário'),
          'honest local-currency explanation must remain available in scroll flow');
        assert.ok(await evaluate("(()=>{const note=document.querySelector('.w4-materials-note');const materials=document.querySelector('.w4-materials');if(!note||!materials)return false;materials.appendChild(note);return true;})()"));
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');s.id='work4-before-forge-first-fold';s.textContent="+JSON.stringify(baselineStyle)+";document.head.appendChild(s);return true;})()"));
        await sleep(150);
        const oldGeo=await evaluate(geometryOfAction);
        const previousFrame=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-materials-forge-384x512.png'),
          Buffer.from(previousFrame,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-forge-first-fold')?.remove();const n=document.querySelector('.w4-materials-note'),b=document.querySelector('#w4-forge-panel>.w4-improve-button');if(!n||!b)return false;b.after(n);return true;})()"));
        await sleep(100);
        const sample="(async()=>{"+
          "const load=async uri=>{const i=new Image();i.src=uri;await i.decode();return i;};"+
          "const [ref,previous,current]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.forge+"'),"+
          "load('data:image/png;base64,"+previousFrame+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,previous,current].some(i=>i.width!==384||i.height!==512))throw Error('Forge comparison scaled');"+
          "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=pixels(ref),b=pixels(previous),c=pixels(current);"+
          "const rois={global:[0,0,384,512],materials:[16,327,375,459],action:[105,415,290,461],cannon:[100,230,160,300],foundryPanel:[218,187,372,331]};"+
          "const mae=(x,y,r)=>{let sum=0,n=0;for(let yy=r[1];yy<r[3];yy++)for(let xx=r[0];xx<r[2];xx++){const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);n++;}}return sum/n;};"+
          "const before={},after={};for(const [name,rect] of Object.entries(rois)){before[name]=mae(a,b,rect);after[name]=mae(a,c,rect);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(previous,384,0);g.drawImage(current,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(current,1152,0);"+
          "return {rois,before,after,image:out.toDataURL('image/png').split(',')[1]};})()";
        const sampleResult=await evaluate(sample);
        assert.ok(sampleResult?.after?.materials>=0 && sampleResult?.after?.action>=0,
          'native approved-material and action ROIs must both be measured');
        writeFileSync(join(folder,'compare-forge-materials-384x512.png'),
          Buffer.from(sampleResult.image,'base64'));
        delete sampleResult.image;
        forgeMaterialsAB={...sampleResult,previousGeometry:oldGeo,newGeometry:afterGeo,
          approved:false,sameFrame:true,sourceWidth:384,sourceHeight:512};
        writeFileSync(join(folder,'forge-materials-ab-384x512.json'),
          JSON.stringify(forgeMaterialsAB,null,2)+'\n');
        console.log('WORK4_FORGE_MATERIALS_AB '+JSON.stringify(forgeMaterialsAB));

        // WORK4 11h / #104: same-source, same React state/frame A/B of
        // the NEW charcoal wood/iron finish against the exact merged HEAD.
        // Only temporary colour/material overrides are applied; geometry,
        // levels, action, 44px touch target, the cannon and dock are identical.
        const mergedHeadMaterialPaint=[
          '.w4-forge #w4-forge-panel > .w4-materials {'+
            'background:linear-gradient(90deg,#9b6c3855 0 1px,transparent 1px calc(100% - 1px),#9b6c3855 calc(100% - 1px)),'+
            'linear-gradient(170deg,#172d40 0%,#102538 45%,#081b2f 100%)!important;'+
            'border-color:#d2a46b!important;'+
            'box-shadow:inset 0 1px #f5d5a466,0 2px 4px #05101d8a!important;}',
          '.w4-forge #w4-forge-panel > .w4-materials h3 {'+
            'color:#f5da9b!important;text-shadow:none!important;}',
          '.w4-forge #w4-forge-panel .w4-resource-grid > div {'+
            'background:transparent!important;box-shadow:none!important;}',
          '.w4-forge #w4-forge-panel .w4-resource-grid small {color:#d3e5f3!important;}',
          '.w4-forge #w4-forge-panel .w4-resource-grid strong {'+
            'color:#fff0c7!important;text-shadow:none!important;}'
        ].join('\n');
        const paintGeometryExpression="(()=>{const b=s=>{const e=document.querySelector(s);"+
          "if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];};"+
          "return {materials:b('.w4-materials'),"+
          "action:b('#w4-forge-panel>.w4-improve-button'),"+
          "cannon:b('.w4-reference-cannon'),"+
          "dock:b('.harbour-nav.app-dock-porto'),"+
          "fiveItems:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const afterFinishGeometry=await evaluate(paintGeometryExpression);
        assert.ok(await evaluate("(()=>{const style=document.createElement('style');"+
          "style.id='work4-before-timber-finish';style.textContent="+
          JSON.stringify(mergedHeadMaterialPaint)+";document.head.appendChild(style);return true;})()"));
        await sleep(130);
        const beforeFinishGeometry=await evaluate(paintGeometryExpression);
        const timberBefore=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-timber-384x512.png'),
          Buffer.from(timberBefore,'base64'));
        await evaluate("(()=>{document.getElementById('work4-before-timber-finish')?.remove();return true;})()");
        assert.deepEqual(beforeFinishGeometry,afterFinishGeometry,
          'paint-only Forge update must not change real cannon/cost/action/dock bounds');
        assert.equal(afterFinishGeometry.fiveItems,5,
          'all five existing dock actions stay untouched');
        const timberSample=await evaluate(sample.replace(previousFrame,timberBefore));
        assert.ok(timberSample?.before?.materials>=0&&timberSample?.after?.materials>=0);
        assert.ok(Math.abs(timberSample.before.cannon-timberSample.after.cannon)<0.05,
          'Forge cannon registration must remain unchanged');
        writeFileSync(join(folder,'compare-forge-timber-384x512.png'),
          Buffer.from(timberSample.image,'base64'));
        delete timberSample.image;
        forgeFinishAB={...timberSample,source:'HEAD merged Forge paint vs real WORK4 finish',
          originalWidth:384,originalHeight:512,sameReactFrame:true,approved:false,
          geometry:afterFinishGeometry};
        writeFileSync(join(folder,'forge-timber-controlled-ab.json'),
          JSON.stringify(forgeFinishAB,null,2)+'\n');
        console.log('WORK4_FORGE_TIMBER_AB '+JSON.stringify(forgeFinishAB));

        // New 04 foundry-plate A/B: physically darkened right panel versus
        // the SAME release HEAD's bright navy panel, with untouched DOM,
        // levels and exact cannon/interactive hitboxes.
        const stageHeadPaint=[
          '.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description {'+
            'background:linear-gradient(145deg,#102c47ed,#071c33f2)!important;'+
            'border-color:#d5af78!important;'+
            'box-shadow:inset 0 2px #ffedab45,0 4px 10px #090f1fa8!important;}',
          '.w4-forge #w4-forge-panel > .w4-forge-stage .w4-forge-live-level {'+
            'background:linear-gradient(100deg,#153c59,#0b2946)!important;'+
            'border-color:#6e92a5a8!important;}',
          '.w4-forge #w4-forge-panel > .w4-forge-stage .w4-forge-live-level.is-current {'+
            'background:linear-gradient(100deg,#35576d,#133957)!important;'+
            'border-color:#f9d383!important;}'
        ].join('\n');
        const foundryGeometryExpression="(()=>{const box=s=>{const e=document.querySelector(s);"+
          "if(!e)return null;const b=e.getBoundingClientRect();return [b.left,b.top,b.width,b.height];};"+
          "return {panel:box('.w4-forge-description'),cannon:box('.w4-reference-cannon'),"+
          "materials:box('.w4-materials'),button:box('#w4-forge-panel>.w4-improve-button'),"+
          "dock:box('.harbour-nav.app-dock-porto'),"+
          "bars:document.querySelectorAll('.w4-forge-live-level>i').length, "+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const afterFoundryGeom=await evaluate(foundryGeometryExpression);
        assert.ok(await evaluate("(()=>{const e=document.createElement('style');"+
          "e.id='work4-before-foundry-plate';e.textContent="+JSON.stringify(stageHeadPaint)+
          ";document.head.appendChild(e);return true;})()"));
        await sleep(150);
        const beforeFoundryGeom=await evaluate(foundryGeometryExpression);
        const foundryBefore=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-foundry-plate-384x512.png'),Buffer.from(foundryBefore,'base64'));
        await evaluate("(()=>{document.getElementById('work4-before-foundry-plate')?.remove();return true;})()");
        assert.deepEqual(afterFoundryGeom,beforeFoundryGeom,
          'paint cannot relocate cannon, Forge levels, materials, upgrade action or dock');
        assert.equal(afterFoundryGeom.bars,3,'all three genuine levels remain present');
        assert.equal(afterFoundryGeom.nav,5,'the five existing dock actions stay untouched');
        const plateSample=await evaluate(sample.replace(previousFrame,foundryBefore));
        assert.ok(plateSample?.before?.foundryPanel>=0&&plateSample?.after?.foundryPanel>=0,
          'same-frame native foundry panel ROI must be measured');
        assert.ok(Math.abs(plateSample.before.cannon-plateSample.after.cannon)<0.05,
          'single genuine cannon painting must remain pixel-registered');
        writeFileSync(join(folder,'compare-foundry-panel-384x512.png'),
          Buffer.from(plateSample.image,'base64'));
        delete plateSample.image;
        const foundryPlateAB={...plateSample,sameReactFrame:true,viewport:'384x512',
          geometry:afterFoundryGeom,approved:false};
        writeFileSync(join(folder,'forge-panel-controlled-ab.json'),
          JSON.stringify(foundryPlateAB,null,2)+'\n');
        console.log('WORK4_FORGE_PANEL_AB '+JSON.stringify(foundryPlateAB));


      }
      /* WORK4 / #104: native A/B of fake VECTOR ripples versus approved
         pictorial water. The current React state, original scene, CSS crops,
         paused animations, dock and geometry are identical in both frames. */
      let pictorialWaterAB:any=null;
      if(screen==='fleet' && width===384 && height===512){
        /* Restore the exact authored opacity for every decorative SVG group;
           presentational attributes were .65/.50/.48/.34/.51 before cleanup. */
        const originalRipples=[
          '.w4-fleet .w4-tropical-art .w4-r03-water-perspective{opacity:1!important}',
          '.w4-fleet .w4-tropical-art > g[stroke="#9ff5fa"]{opacity:.65!important}',
          '.w4-fleet .w4-tropical-art > g[fill="#f4e5ae"]{opacity:.5!important}',
          '.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[stroke="#b0f9f0"]{opacity:.48!important}',
          '.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[stroke="#e6ffff"]{opacity:.34!important}',
          '.w4-fleet .w4-tropical-art .w4-r03-coastal-depth > path[stroke="#d5fff4"]{opacity:.51!important}'
        ].join('\n');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-before-synthetic-water';s.textContent="+JSON.stringify(originalRipples)+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(130);
        const previousRipples=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-synthetic-water-fleet-384x512.png'),
          Buffer.from(previousRipples,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-synthetic-water')?.remove();return true;})()"));
        await sleep(130);
        const compare="(async()=>{"+
          "const load=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [ref,prev,now]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.fleet+"'),"+
          "load('data:image/png;base64,"+previousRipples+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,prev,now].some(i=>i.width!==384||i.height!==512))throw Error('native pixel alignment required');"+
          "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=pixels(ref),b=pixels(prev),c=pixels(now);"+
          "const boxes={global:[0,0,384,512],sea:[20,294,370,370],ship:[65,205,175,307]};"+
          "const mae=(x,y,r)=>{let total=0,count=0;for(let j=r[1];j<r[3];j++)for(let i=r[0];i<r[2];i++){const k=(j*384+i)*4;for(let q=0;q<3;q++){total+=Math.abs(x[k+q]-y[k+q]);count++;}}return total/count;};"+
          "const before={},after={};for(const [key,rect] of Object.entries(boxes)){before[key]=mae(a,b,rect);after[key]=mae(a,c,rect);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');g.drawImage(ref,0,0);g.drawImage(prev,384,0);g.drawImage(now,768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {boxes,before,after,comparison:out.toDataURL('image/png').split(',')[1]};})()";
        pictorialWaterAB=await evaluate(compare);
        assert.ok(pictorialWaterAB?.before?.sea>=0&&pictorialWaterAB?.after?.sea>=0,
          'both original/ripple and approved-source sea states must be measured');
        writeFileSync(join(folder,'compare-clean-water-384x512.png'),
          Buffer.from(pictorialWaterAB.comparison,'base64'));
        delete pictorialWaterAB.comparison;
        pictorialWaterAB={...pictorialWaterAB,sameFrame:true,approved:false,viewport:'384x512'};
        writeFileSync(join(folder,'native-approved-water-cleanup.json'),
          JSON.stringify(pictorialWaterAB,null,2)+'\n');
        console.log('WORK4_PAINTED_SEA_AB '+JSON.stringify(pictorialWaterAB));
      }
      /* Controlled water A/B at the same frame: reinstate ONLY the previous
         vertically stretched 29%-height sea, then remove that temporary CSS.
         Registration, state, approved source painting and dock stay identical. */
      let stretchedSea:string|null=null;
      let seaAspect:any=null;
      if(screen==='fleet'){
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');s.id='work4-before-water-aspect';s.textContent="+
          JSON.stringify('.w4-fleet .w4-harbour-stage > svg.w4-reference-sea{height:29%!important;aspect-ratio:auto!important;max-height:none!important;}')+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(120);
        stretchedSea=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-water-fleet-'+width+'x'+height+'.png'),
          Buffer.from(stretchedSea,'base64'));
        await evaluate("(()=>{document.getElementById('work4-before-water-aspect').remove();return true})()");
        if(width===384&&height===512){
          const compare="(async()=>{"+
            "const load=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
            "const [ref,bef,aft]=await Promise.all(["+
              "load('data:image/webp;base64,"+references.fleet+"'),"+
              "load('data:image/png;base64,"+stretchedSea+"'),"+
              "load('data:image/png;base64,"+screenshot+"')]);"+
            "if([ref,bef,aft].some(i=>i.width!==384||i.height!==512))throw Error('non-native water comparison');"+
            "const pix=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data;};"+
            "const a=pix(ref),b=pix(bef),c=pix(aft);"+
            "const roi=[28,313,238,358];"+
            "const mae=(u,v,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){sum+=Math.abs(u[k+j]-v[k+j]);n++;}}return sum/n;};"+
            "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const g=cv.getContext('2d');"+
            "g.drawImage(ref,0,0);g.drawImage(bef,384,0);g.drawImage(aft,768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(aft,1152,0);"+
            "return {waterROI:roi,before:{global:mae(a,b,[0,0,384,512]),water:mae(a,b,roi)},"+
            "after:{global:mae(a,c,[0,0,384,512]),water:mae(a,c,roi)},"+
            "comparison:cv.toDataURL('image/png').split(',')[1]};})()";
          seaAspect=await evaluate(compare);
          assert.ok(seaAspect?.before?.water>=0&&seaAspect?.after?.water>=0);
          writeFileSync(join(folder,'compare-water-fleet-384x512.png'),
            Buffer.from(seaAspect.comparison,'base64'));
          delete seaAspect.comparison;
          console.log('WORK4_WATER_AB '+JSON.stringify(seaAspect));
        }
      }
      let antiBlue:any=null;
      if(screen==='forge'){
        // A gross blue compositor rectangle must not replace the warm foundry
        // in any viewport; source windows may legitimately contain some blue.
        const check="(async()=>{const im=new Image();im.src='data:image/png;base64,"+screenshot+"';await im.decode();"+
          "const c=document.createElement('canvas');c.width=im.width;c.height=im.height;"+
          "const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);"+
          "const pixels=x.getImageData(0,0,im.width,im.height).data;"+
          "const e=document.querySelector('.w4-forge-scene'),r=e.getBoundingClientRect();"+
          "const x0=Math.max(0,Math.ceil(r.left+12)),x1=Math.min(im.width,Math.floor(r.left+Math.min(132,r.width*.45)));"+
          "const y0=Math.max(0,Math.ceil(r.top+12)),y1=Math.min(im.height,Math.floor(r.top+Math.min(144,r.height*.64)));"+
          "let blue=0,total=0;for(let y=y0;y<y1;y++)for(let xx=x0;xx<x1;xx++){"+
          "const p=(y*im.width+xx)*4,red=pixels[p],green=pixels[p+1],b=pixels[p+2];"+
          "if(b>red*1.25&&b>green*1.12&&b>90)blue++;total++;}"+
          "return {ratio:blue/total,blue,total};})()";
        antiBlue=await evaluate(check);
        assert.ok(antiBlue&&antiBlue.ratio<.5,
          'gross blue compositor rectangle must not replace the Forge scenery at '+width+'x'+height);
      }
      let measurement:any=null;
      if(width===384&&height===512){
        const code="(async()=>{"+
          "const load=async(uri)=>{const im=new Image();im.src=uri;await im.decode();return im;};"+
          "const [ref,bef,aft]=await Promise.all(["+
          "load('data:image/webp;base64,"+references[screen]+"'),"+
          "load('data:image/png;base64,"+before+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,bef,aft].some(i=>i.width!==384||i.height!==512))throw Error('native 1:1 violation');"+
          "const pixels=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,384,512).data;};"+
          "const a=pixels(ref),b=pixels(bef),c=pixels(aft);"+
          "const bounds={global:[0,0,384,512],roi:"+JSON.stringify(roi[screen])+"};"+
          "const mae=(u,v,box)=>{let sum=0,n=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){const k=(y*384+x)*4;for(let t=0;t<3;t++){sum+=Math.abs(u[k+t]-v[k+t]);n++;}}return sum/n;};"+
          "const beforeMetrics={},afterMetrics={};for(const [n,box] of Object.entries(bounds)){beforeMetrics[n]=mae(a,b,box);afterMetrics[n]=mae(a,c,box);}"+
          "const out=document.createElement('canvas');out.width=1152;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(aft,384,0);g.drawImage(ref,768,0);g.globalAlpha=.5;g.drawImage(aft,768,0);g.globalAlpha=1;"+
          "const sep=out.toDataURL('image/png').split(',')[1];"+
          "return {before:beforeMetrics,after:afterMetrics,comparison:sep};})()";
        measurement=await evaluate(code);
        assert.ok(measurement?.after?.roi>=0,'actual native ROI measured');
        writeFileSync(join(folder,'compare-'+screen+'-384x512.png'),Buffer.from(measurement.comparison,'base64'));
        const {before:old,after:now}=measurement;
        assert.ok(now.roi<old.roi,'source registration improves '+screen+' local ROI');
        assert.ok(now.global<old.global,'source registration improves '+screen+' full-frame MAE');
        console.log('WORK4_NATIVE_AB '+screen+' '+JSON.stringify({before:old,after:now}));
      }
      report.visual.push({screen,width,height,geometry,
        before:measurement?.before||null,after:measurement?.after||null,seaAspect,antiBlue,pictorialWaterAB,forgeMaterialsAB,
        approved:false,source:'approved art from original 384x512; no reference rescaling at 384'});
    }
  }
  writeFileSync(join(folder,'work4-pixel-registration.json'),JSON.stringify(report,null,2)+'\n');
  assert.equal(report.visual.length,8,'four Chromium viewports for both Work4 screens');
});
