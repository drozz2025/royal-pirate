import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,mkdirSync,mkdtempSync,writeFileSync,readFileSync as read,rmSync} from 'node:fs';
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

test('WORK4 uses the two master approved references and all eight unmodified WebP screens',()=>{
  const names=[
    '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp',
    '04-melhorias-forja.webp','05-cartas.webp','06-loja.webp',
    '07-missoes.webp','08-ranking-perfil.webp'
  ];
  for(const name of names){
    const image=readFileSync(new URL('../../assets/design-approved/'+name,import.meta.url));
    assert.equal(image.subarray(0,4).toString('ascii'),'RIFF',name+' RIFF signature');
    assert.equal(image.subarray(8,12).toString('ascii'),'WEBP',name+' WebP format');
    assert.ok(image.length>10000,name+' source art must not be a stub');
  }
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
  t.after(async()=>{ws?.close();browser?.kill('SIGTERM');server.kill('SIGTERM');await sleep(500);rmSync(temp,{force:true,recursive:true,maxRetries:12,retryDelay:250});});
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

      // WORK4/#104 native Forge stage: real original/before/render/overlay.
      // Old and new pigments are toggled in the same paused Chromium frame.
      if(screen==='forge'&&width===384&&height===512){
        const bounds="(()=>{const b=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {stage:b('.w4-forge-stage'),cannon:b('.w4-reference-cannon'),"+
          "furnace:b('.w4-forge-scene'),costs:b('.w4-materials'),button:b('.w4-improve-button'),"+
          "dock:b('.harbour-nav.app-dock-porto'),prices:document.querySelectorAll('.w4-resource-grid>div').length,"+
          "menu:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const afterGeometry=await evaluate(bounds);
        assert.equal(afterGeometry.prices,3,'three true costs');
        assert.equal(afterGeometry.menu,5,'five original navigation items');
        const oldPaint='.w4-forge #w4-forge-panel > .w4-forge-stage {border-color:#e6b872!important;}'+
          '.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-scene {background-color:#b77f4c!important;}';
        await evaluate("(()=>{const x=document.createElement('style');x.id='w4-before-stage';"+
          "x.textContent="+JSON.stringify(oldPaint)+";document.head.appendChild(x);return true;})()");
        await sleep(120);
        assert.deepEqual(await evaluate(bounds),afterGeometry,'no cannon, costs, action or dock movement');
        const previous=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-stage-384x512.png'),Buffer.from(previous,'base64'));
        await evaluate("(()=>{document.getElementById('w4-before-stage').remove();return true;})()");
        const compare="(async()=>{const d="+JSON.stringify({source:references.forge,before:previous,after:screenshot})+";"+
          "const load=async(type,s)=>{const i=new Image();i.src='data:image/'+type+';base64,'+s;await i.decode();return i;};"+
          "const [a,b,c]=await Promise.all([load('webp',d.source),load('png',d.before),load('png',d.after)]);"+
          "if([a,b,c].some(i=>i.width!==384||i.height!==512))throw Error('native dimensions');"+
          "const px=i=>{const cv=document.createElement('canvas');cv.width=384;cv.height=512;"+
          "const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const ref=px(a),old=px(b),now=px(c);"+
          "const regions={global:[0,0,384,512],workshop:[14,150,377,327],"+
          "cannon:[30,230,166,309],furnace:[116,225,171,302],"+
          "materials:[16,320,369,378],dock:[0,430,384,512]};"+
          "const mae=(img,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){"+
          "const p=(y*384+x)*4;for(let t=0;t<3;t++){sum+=Math.abs(ref[p+t]-img[p+t]);n++;}}return sum/n;};"+
          "const before={},after={};for(const [k,r] of Object.entries(regions)){before[k]=mae(old,r);after[k]=mae(now,r);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(a,0,0);g.drawImage(b,384,0);g.drawImage(c,768,0);"+
          "g.drawImage(a,1152,0);g.globalAlpha=.5;g.drawImage(c,1152,0);"+
          "return {regions,before,after,proof:out.toDataURL('image/png').split(',')[1]};})()";
        const evidence=await evaluate(compare);
        assert.ok(Number.isFinite(evidence?.before?.global)&&Number.isFinite(evidence?.after?.workshop),
          'native RGB MAE for both states');
        assert.ok(evidence.after.global<evidence.before.global-0.7,
          'charcoal native workshop must lower the approved-source global MAE');
        assert.ok(evidence.after.workshop<evidence.before.workshop-1.0,
          'true cannon workshop ROI must approach the original art');
        for(const protectedRoi of ['cannon','furnace','materials','dock']){
          assert.ok(Math.abs(evidence.after[protectedRoi]-evidence.before[protectedRoi])<0.15,
            'protect native '+protectedRoi+' source pixels');
        }
        writeFileSync(join(folder,'original-before-render-overlay-forge-stage-384x512.png'),
          Buffer.from(evidence.proof,'base64'));
        delete evidence.proof;
        const output={...evidence,source:'assets/design-approved/04-melhorias-forja.webp',
          geometry:afterGeometry,viewport:'384x512',samePausedFrame:true,
          approved:false,approvedScreens:0};
        writeFileSync(join(folder,'forge-stage-controlled-ab.json'),JSON.stringify(output,null,2)+'\n');
        console.log('WORK4_NATIVE_FORGE_STAGE_AB '+JSON.stringify(output));
      }

      // WORK4 06h: compare actual HEAD before/after sky shade in ONE paused frame.
      if(screen==='fleet'&&width===384&&height===512){
        const geom=()=>evaluate("(()=>{const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null};return {ship:box('.w4-reference-ship'),sea:box('.w4-reference-sea'),stage:box('.w4-harbour-stage'),roster:box('.w4-ship-roster'),dock:box('.harbour-nav.app-dock-porto'),nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,cards:document.querySelectorAll('.w4-ship-slot').length};})()");
        const afterGeom=await geom();
        assert.equal(afterGeom.nav,5);assert.equal(afterGeom.cards,4);
        const oldPaint='.w4-fleet #w4-fleet-panel > .w4-harbour-stage::after{background:none!important;}';
        await evaluate("(()=>{const s=document.createElement('style');s.id='w4-before-sky';s.textContent="+JSON.stringify(oldPaint)+";document.head.appendChild(s);return true;})()");
        await sleep(150);
        assert.deepEqual(await geom(),afterGeom,'sky-only paint keeps geometry intact');
        const oldShot=(await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})).data as string;
        writeFileSync(join(folder,'before-fleet-sky-384x512.png'),Buffer.from(oldShot,'base64'));
        await evaluate("(()=>{document.getElementById('w4-before-sky').remove();return true})()");
        const calc="(async()=>{"+
          "const img=async u=>{const i=new Image();i.src=u;await i.decode();return i};"+
          "const [ref,bef,now]=await Promise.all(["+
          "img('data:image/webp;base64,"+references.fleet+"'),"+
          "img('data:image/png;base64,"+oldShot+"'),"+
          "img('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,bef,now].some(i=>i.width!==384||i.height!==512))throw Error('non-native');"+
          "const px=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
          "const r=px(ref),b=px(bef),n=px(now);"+
          "const rois={global:[0,0,384,512],sky:[240,135,369,180],topSeam:[240,135,369,159],ship:[65,205,175,307],water:[18,306,218,356],roster:[18,350,374,429],dock:[0,430,384,512]};"+
          "const mae=(a,v,q)=>{let s=0,k=0;for(let y=q[1];y<q[3];y++)for(let x=q[0];x<q[2];x++){const p=(y*384+x)*4;for(let j=0;j<3;j++){s+=Math.abs(a[p+j]-v[p+j]);k++}}return s/k};"+
          "const before={},after={};for(const [key,q] of Object.entries(rois)){before[key]=mae(r,b,q);after[key]=mae(r,n,q)};"+
          "const cv=document.createElement('canvas');cv.width=1536;cv.height=512;const g=cv.getContext('2d');g.drawImage(ref,0,0);g.drawImage(bef,384,0);g.drawImage(now,768,0);g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {rois,before,after,png:cv.toDataURL('image/png').split(',')[1]};})()";
        const ab=await evaluate(calc);
        writeFileSync(join(folder,'original-before-render-overlay-sky-384x512.png'),Buffer.from(ab.png,'base64'));
        delete ab.png;
        const result={...ab,source:'assets/design-approved/03-frota.webp',samePausedFrame:true,approved:false,approvedScreens:0,geometry:afterGeom};
        writeFileSync(join(folder,'fleet-sky-controlled-ab.json'),JSON.stringify(result,null,2)+'\n');
        console.log('WORK4_SKYSEAM_AB '+JSON.stringify(result));
        assert.ok(ab.after.sky<ab.before.sky,'upper-right seam improves against source');
        assert.ok(ab.after.global<ab.before.global,'whole-frame MAE improves');
        for(const key of ['ship','water','roster','dock']){
          assert.ok(Math.abs(ab.after[key]-ab.before[key])<.2,'protected '+key+' ROI');
        }
      }




      // WORK4/#104: pigment-only native A/B with the actual three priced
      // cells and upgrade button still mounted in the same paused React frame.
      if(screen==='forge' && width===384 && height===512){
        const rectExpr="(()=>{const rect=s=>{const e=document.querySelector(s);"+
          "const r=e?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {board:rect('.w4-forge .w4-materials'),"+
          "cannon:rect('.w4-reference-cannon'),"+
          "furnace:rect('.w4-forge-scene'),"+
          "button:rect('.w4-forge .w4-improve-button'),"+
          "dock:rect('.harbour-nav.app-dock-porto'),"+
          "costs:document.querySelectorAll('.w4-forge .w4-resource-grid > div').length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const newLayout=await evaluate(rectExpr);
        assert.equal(newLayout.costs,3,'three true costs retained');
        assert.equal(newLayout.nav,5,'WORK0 five-item dock retained');
        const olderBackground=[
          '.w4-forge #w4-forge-panel > .w4-materials:where(*) {',
          'background:radial-gradient(ellipse 76% 94% at 32% 0%,#a86e3738 0%,transparent 77%),',
          'repeating-linear-gradient(2deg,transparent 0 10px,#c89b5410 10px 11px,transparent 12px 21px),',
          'linear-gradient(173deg,#2b3030 0%,#1a282c 52%,#0d1e2a 100%)!important;}'
        ].join('');
        assert.ok(await evaluate("(()=>{const e=document.createElement('style');"+
          "e.id='work4-before-navy-ledger';e.textContent="+JSON.stringify(olderBackground)+
          ";document.head.appendChild(e);return true;})()"));
        await sleep(120);
        const oldLayout=await evaluate(rectExpr);
        const previousFrame=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-ledger-384x512.png'),
          Buffer.from(previousFrame,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-navy-ledger')?.remove();return true;})()"));
        for(const key of ['board','cannon','furnace','button','dock'] as const){
          assert.deepEqual(newLayout[key],oldLayout[key],
            'pigment cannot change the geometry of '+key);
        }
        const compare="(async()=>{"+
          "const load=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [reference,previous,current]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.forge+"'),"+
          "load('data:image/png;base64,"+previousFrame+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([reference,previous,current].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 required');"+
          "const px=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;"+
          "const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const ref=px(reference),bef=px(previous),aft=px(current);"+
          "const rois={global:[0,0,384,512],materials:[16,320,369,378],"+
          "cannon:[30,230,166,309],furnace:[116,225,171,302],dock:[0,430,384,512]};"+
          "const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){"+
          "const p=(y*384+x)*4;for(let k=0;k<3;k++){sum+=Math.abs(a[p+k]-b[p+k]);n++;}}return sum/n;};"+
          "const before={},after={};for(const [key,r] of Object.entries(rois)){"+
          "before[key]=mae(ref,bef,r);after[key]=mae(ref,aft,r);}"+
          "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;"+
          "const g=canvas.getContext('2d');g.drawImage(reference,0,0);g.drawImage(previous,384,0);"+
          "g.drawImage(current,768,0);g.drawImage(reference,1152,0);g.globalAlpha=.5;g.drawImage(current,1152,0);"+
          "return {rois,before,after,comparison:canvas.toDataURL('image/png').split(',')[1]};})()";
        const actual=await evaluate(compare);
        assert.ok(actual?.after?.materials>=0,'source ROI computed in native pixels');
        writeFileSync(join(folder,'compare-forge-ledger-384x512.png'),
          Buffer.from(actual.comparison,'base64'));
        delete actual.comparison;
        const proof={...actual,source:'assets/design-approved/04-melhorias-forja.webp',
          samePausedFrame:true,originalResolution:[384,512],oldLayout,newLayout,
          approved:false,approvedScreens:0};
        writeFileSync(join(folder,'forge-ledger-controlled-ab.json'),
          JSON.stringify(proof,null,2)+'\n');
        console.log('WORK4_FORGE_LEDGER_AB '+JSON.stringify(proof));

        assert.ok(actual.after.materials<actual.before.materials,
          'the source pigments must improve the native materials ROI');
        assert.ok(actual.after.global<=actual.before.global,
          'do not trade full-screen regression for a local pigment improvement');
        for(const key of ['cannon','furnace','dock'] as const){
          assert.ok(Math.abs(actual.after[key]-actual.before[key])<.2,
            key+' approved art and WORK0 dock remain unchanged');
        }
      }

      // WORK4/#104: remove only the TWO additive SVG glows over the already
      // source-lit cannon and furnace. Compare the same Chromium React frame,
      // same CSS except for opacity=1 versus opacity=0, native WebP 384x512.
      if(screen==='forge' && width===384 && height===512){
        const nativeLightSelector='.w4-forge .w4-forge-scene > svg.w4-cannon-art.w4-reference-cannon > ellipse';
        const lightGeometry="(()=>{const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {cannon:box('.w4-reference-cannon'),furnace:box('.w4-forge-scene'),"+
          "costs:box('.w4-resource-grid'),button:box('.w4-improve-button'),"+
          "dock:box('.harbour-nav.app-dock-porto'),"+
          "lights:document.querySelectorAll("+JSON.stringify(nativeLightSelector)+").length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,"+
          "costCount:document.querySelectorAll('.w4-resource-grid>div').length};})()";
        const nowGeometry=await evaluate(lightGeometry);
        assert.equal(nowGeometry.lights,2,'exactly the two duplicate local SVG light ellipses');
        assert.equal(nowGeometry.costCount,3,'no invented or missing cost tiles');
        assert.equal(nowGeometry.nav,5,'five protected menu items remain');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-restore-double-light';s.textContent="+
          JSON.stringify(nativeLightSelector+'{opacity:1!important}')+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(140);
        const oldGeometry=await evaluate(lightGeometry);
        assert.deepEqual(nowGeometry,oldGeometry,
          'cannon, furnace, cost board, action, dock bounds unchanged by lighting');
        const previousLight=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-double-light-forge-384x512.png'),
          Buffer.from(previousLight,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-restore-double-light')?.remove();return true;})()"));
        await sleep(140);
        const cleanLight=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'render-single-light-forge-384x512.png'),
          Buffer.from(cleanLight,'base64'));
        const evaluateLight="(async()=>{"+
          "const load=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [ref,bef,aft]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.forge+"'),"+
          "load('data:image/png;base64,"+previousLight+"'),"+
          "load('data:image/png;base64,"+cleanLight+"')]);"+
          "if([ref,bef,aft].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 exact comparison required');"+
          "const px=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;"+
          "const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=px(ref),b=px(bef),c=px(aft);"+
          "const rois={global:[0,0,384,512],cannon:[30,230,166,309],"+
          "furnace:[116,225,171,302],ironCore:[35,251,140,290],"+
          "costs:[16,320,369,378],dock:[0,430,384,512]};"+
          "const mae=(x,y,r)=>{let sum=0,count=0;for(let yy=r[1];yy<r[3];yy++)for(let xx=r[0];xx<r[2];xx++){"+
          "const k=(yy*384+xx)*4;for(let j=0;j<3;j++){sum+=Math.abs(x[k+j]-y[k+j]);count++;}}return sum/count;};"+
          "const before={},after={};for(const [name,r] of Object.entries(rois)){before[name]=mae(a,b,r);after[name]=mae(a,c,r);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(bef,384,0);g.drawImage(aft,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(aft,1152,0);"+
          "return {before,after,rois,compare:out.toDataURL('image/png').split(',')[1]};})()";
        const sample=await evaluate(evaluateLight);
        assert.ok(sample?.before?.cannon>=0&&sample?.after?.cannon>=0,
          'real approved cannon ROI must be sampled before and after');
        writeFileSync(join(folder,'compare-source-light-forge-384x512.png'),
          Buffer.from(sample.compare,'base64'));
        delete sample.compare;
        const measured={...sample,oldGeometry,nowGeometry,sameFrame:true,
          original:'assets/design-approved/04-melhorias-forja.webp',
          viewport:'384x512',approved:false};
        writeFileSync(join(folder,'forge-source-light-controlled-ab.json'),
          JSON.stringify(measured,null,2)+'\n');
        console.log('WORK4_NATIVE_FORGE_LIGHT_AB '+JSON.stringify(measured));
        assert.ok(sample.after.cannon<=sample.before.cannon+0.03,
          'removing duplicate cannon lighting cannot regress actual cannon ROI');
        assert.ok(sample.after.furnace<=sample.before.furnace+0.03,
          'removing extra light must not hide or regress furnace ROI');
        assert.ok(sample.after.global<=sample.before.global+0.02,
          'no full-frame visual regression after the light cleanup');
        for(const key of ['costs','dock'] as const){
          assert.ok(Math.abs(sample.after[key]-sample.before[key])<0.02,
            'source light cleanup must preserve protected '+key+' pixels');
        }
      }

      

      // WORK4 #104 — compare approved source with the merged color and 7
      // controlled alternatives in ONE paused native Chromium scene/frame.
      if(screen==='forge'&&width===384&&height===512){
        const palette=[
          ['merged','linear-gradient(170deg,#183b51d9,#071e35f4 70%,#071728f4)'],
          ['slate','linear-gradient(170deg,#143247e0,#061a2ef4 70%,#051427f8)'],
          ['darker','linear-gradient(170deg,#102c40e7,#061a30f5 70%,#041422fa)'],
          ['blue','linear-gradient(170deg,#1c465adb,#0b2a45f1 70%,#071c32f6)'],
          ['amber','linear-gradient(170deg,#302e2adf,#10242df2 70%,#071b2af6)'],
          ['navy','linear-gradient(170deg,#123c5bdd,#092638f4 70%,#071728f4)'],
          ['charcoal','linear-gradient(170deg,#172b36ed,#061827f8 70%,#04101ff9)'],
          ['warm','linear-gradient(170deg,#263c45dc,#0b2535f4 70%,#071728f5)']
        ];
        const selector='.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description';
        const geomExpr="(()=>{const b=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {plaque:b('.w4-forge-description'),cannon:b('.w4-reference-cannon'),"+
          "costs:b('.w4-resource-grid'),dock:b('.harbour-nav.app-dock-porto'),"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,"+
          "costCount:document.querySelectorAll('.w4-resource-grid>div').length};})()";
        const geometry=await evaluate(geomExpr);
        assert.equal(geometry.nav,5,'five menu items retained');
        assert.equal(geometry.costCount,3,'three true cost cells retained');
        const screenshots:Record<string,string>={};
        for(const [key,background] of palette){
          assert.ok(await evaluate("(()=>{let s=document.getElementById('w4-ink-palette');"+
            "if(!s){s=document.createElement('style');s.id='w4-ink-palette';document.head.appendChild(s);}"+
            "s.textContent="+JSON.stringify(selector+'{background:'+background+'!important}')+";return true;})()"));
          await sleep(100);
          assert.deepEqual(await evaluate(geomExpr),geometry,'no movement of art, prices, menu');
          screenshots[key]=(await command('Page.captureScreenshot',{
            format:'png',fromSurface:true,captureBeyondViewport:false
          })).data as string;
        }
        assert.ok(await evaluate("(()=>{document.getElementById('w4-ink-palette')?.remove();return true;})()"));
        const data={source:references.forge,screenshots};
        const expr="(async()=>{const input="+JSON.stringify(data)+";"+
          "const load=async(fmt,b64)=>{const i=new Image();i.src='data:image/'+fmt+';base64,'+b64;await i.decode();return i;};"+
          "const px=i=>{if(i.width!==384||i.height!==512)throw Error('native dimensions');"+
          "const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});"+
          "g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const refImg=await load('webp',input.source);const ref=px(refImg);"+
          "const rois={global:[0,0,384,512],plaque:[174,145,374,314],"+
          "identity:[174,145,374,255],cannon:[32,225,170,312],"+
          "hearth:[116,225,173,302],costs:[16,320,369,378],dock:[0,430,384,512]};"+
          "const mae=(a,b,r)=>{let sum=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){"+
          "const p=(y*384+x)*4;for(let k=0;k<3;k++){sum+=Math.abs(a[p+k]-b[p+k]);n++;}}return sum/n;};"+
          "const out={};for(const [name,b64] of Object.entries(input.screenshots)){const img=await load('png',b64);const pic=px(img);"+
          "out[name]={};for(const [k,r] of Object.entries(rois))out[name][k]=mae(ref,pic,r);}return out;})()";
        const measurements=await evaluate(expr);
        const record={measurements,palette,geometry,viewport:'384x512',sameFrame:true,
          original:'assets/design-approved/04-melhorias-forja.webp',approved:false,approvedScreens:0};
        console.log('WORK4_FORGE_INK_SWEEP '+JSON.stringify(record));
        writeFileSync(join(folder,'forge-ink-palette-same-frame.json'),JSON.stringify(record,null,2)+'\n');
        writeFileSync(join(folder,'before-forge-ink-384x512.png'),Buffer.from(screenshots.merged,'base64'));
        writeFileSync(join(folder,'render-forge-ink-384x512.png'),Buffer.from(screenshots.charcoal,'base64'));

        // FINAL, source-measured candidate: charcoal wins all 3 illustrated
        // ROIs in this exact-frame sweep; do not accept the prior grid layout.
        const dataForProof={source:references.forge,before:screenshots.merged,after:screenshots.charcoal};
        const proof="(async()=>{const data="+JSON.stringify(dataForProof)+";"+
          "const load=async(type,b64)=>{const i=new Image();i.src='data:image/'+type+';base64,'+b64;await i.decode();return i;};"+
          "const [original,before,render]=await Promise.all([load('webp',data.source),load('png',data.before),load('png',data.after)]);"+
          "if([original,before,render].some(i=>i.width!==384||i.height!==512))throw Error('native pixels only');"+
          "const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=512;"+
          "const g=canvas.getContext('2d');"+
          "g.drawImage(original,0,0);g.drawImage(before,384,0);g.drawImage(render,768,0);"+
          "g.drawImage(original,1152,0);g.globalAlpha=.5;g.drawImage(render,1152,0);"+
          "return canvas.toDataURL('image/png').split(',')[1];})()";
        const proofData=await evaluate(proof);
        writeFileSync(join(folder,'compare-forge-source-ink-384x512.png'),Buffer.from(proofData,'base64'));
        assert.ok(measurements.charcoal.global<measurements.merged.global-0.30,
          'native global MAE must materially improve');
        assert.ok(measurements.charcoal.plaque<measurements.merged.plaque-1.5,
          'live plaque ROI must approach original');
        assert.ok(measurements.charcoal.identity<measurements.merged.identity-2.5,
          'real medallion/status identity region must improve');
        for(const roi of ['cannon','hearth','costs','dock'] as const)
          assert.ok(Math.abs(measurements.merged[roi]-measurements.charcoal[roi])<0.03,
            'unchanged protected '+roi+' pixels');

        assert.equal(Object.keys(measurements).length,8,'8 native paint samples recorded');
        for(const roi of ['cannon','hearth','costs','dock'] as const)
          assert.ok(Math.abs(measurements.merged[roi]-measurements.slate[roi])<0.05,
            'must preserve protected '+roi+' pixels');
      }

      // WORK4/#104 — Forge 04: one real plaque over the approved right inset.
      // A/B must be native, within this SAME paused React/Chromium frame:
      // ORIGINAL | MERGED HEAD (43%) | RENDER (53%) | OVERLAY.
      // No second cannon, false costs or changes to the WORK0 shell/dock.
      if(screen==='forge' && width===384 && height===512){
        const boxExpr="(()=>{const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();"+
          "return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {panel:box('.w4-forge .w4-forge-description'),"+
          "stage:box('.w4-forge .w4-forge-stage'),"+
          "cannon:box('.w4-forge .w4-reference-cannon'),"+
          "materials:box('.w4-forge .w4-materials'),"+
          "dock:box('.harbour-nav.app-dock-porto'),"+
          "levels:document.querySelectorAll('.w4-forge-live-level').length,"+
          "costs:document.querySelectorAll('.w4-resource-grid > div').length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const newGeom=await evaluate(boxExpr);
        assert.equal(newGeom.levels,3,'real Forge levels remain');
        assert.equal(newGeom.costs,3,'real costs remain');
        assert.equal(newGeom.nav,5,'WORK0 dock retains five items');
        assert.ok(newGeom.panel[0]>=170&&newGeom.panel[0]<=195,
          'native status inset begins beside furnace, near approved x176');
        const oldStyle=[
          '.w4-forge #w4-forge-panel > .w4-forge-stage > .w4-forge-description{',
          'width:43%!important;right:1.5%!important;',
          'border-color:#c5a173!important;',
          'box-shadow:inset 1px 0 #e4c18b54,inset -2px 0 #070e18aa,0 3px 7px #06101999!important;}'
        ].join('');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-prior-forge-inset';s.textContent="+JSON.stringify(oldStyle)+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(140);
        const oldGeom=await evaluate(boxExpr);
        const prior=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-inset-384x512.png'),Buffer.from(prior,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-prior-forge-inset')?.remove();return true;})()"));
        for(const key of ['stage','cannon','materials','dock'] as const){
          assert.deepEqual(newGeom[key],oldGeom[key],
            'Forge inset cannot alter '+key+' geometry');
        }
        assert.ok(oldGeom.panel[0]-newGeom.panel[0]>25,
          'approved status panel occupies the earlier missing right inset');
        assert.ok(newGeom.panel[0]>170,
          'inset does not cover the visible furnace opening');
        assert.ok(newGeom.panel[1]+newGeom.panel[3]<=newGeom.stage[1]+newGeom.stage[3]+1,
          'real level card remains inside the workshop');
        const measure="(async()=>{"+
          "const load=async u=>{const i=new Image();i.src=u;await i.decode();return i;};"+
          "const [o,b,c]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.forge+"'),"+
          "load('data:image/png;base64,"+prior+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([o,b,c].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
          "const pixels=i=>{const el=document.createElement('canvas');el.width=384;el.height=512;"+
          "const g=el.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=pixels(o),p=pixels(b),n=pixels(c);"+
          "const rois={global:[0,0,384,512],panel:[175,148,373,315],"+
          "cannon:[30,230,166,309],furnace:[116,225,171,302],"+
          "materials:[16,320,369,378],dock:[0,430,384,512]};"+
          "const mae=(u,v,r)=>{let s=0,count=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){"+
          "const q=(y*384+x)*4;for(let j=0;j<3;j++){s+=Math.abs(u[q+j]-v[q+j]);count++;}}return s/count;};"+
          "const before={},after={};for(const [key,r] of Object.entries(rois)){"+
          "before[key]=mae(a,p,r);after[key]=mae(a,n,r);}"+
          "const composite=document.createElement('canvas');composite.width=1536;composite.height=512;"+
          "const g=composite.getContext('2d');g.drawImage(o,0,0);g.drawImage(b,384,0);"+
          "g.drawImage(c,768,0);g.drawImage(o,1152,0);g.globalAlpha=.5;g.drawImage(c,1152,0);"+
          "return {rois,before,after,compare:composite.toDataURL('image/png').split(',')[1]};})()";
        const result=await evaluate(measure);
        assert.ok(result?.before?.panel>=0&&result?.after?.panel>=0,'real ROI computed');
        writeFileSync(join(folder,'compare-forge-inset-384x512.png'),Buffer.from(result.compare,'base64'));
        delete result.compare;
        const proof={...result,oldGeom,newGeom,sameReactFrame:true,native:'384x512',
          source:'assets/design-approved/04-melhorias-forja.webp',approved:false};
        writeFileSync(join(folder,'forge-inset-controlled-ab.json'),JSON.stringify(proof,null,2)+'\n');
        console.log('WORK4_FORGE_INSET_AB '+JSON.stringify(proof));
        assert.ok(result.after.panel<result.before.panel,
          'wider authentic status inset must improve Forge panel ROI MAE');
        assert.ok(result.after.global<result.before.global,
          'Forge correction must improve full-screen MAE, not just shape');
        for(const key of ['cannon','furnace','materials','dock'] as const){
          assert.ok(Math.abs(result.before[key]-result.after[key])<.25,
            key+' picture, real costs and dock must not regress');
        }
      }

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
          JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_FLEET_PANEL_AB '+JSON.stringify(evidence));
        assert.ok(Math.abs(ab.after.ship-ab.before.ship)<.2,
          'single approved Royal Crown ROI must not move or regress');
        assert.ok(Math.abs(ab.after.water-ab.before.water)<.2,
          'approved sea/source bridge cannot regress');
        assert.ok(Math.abs(ab.after.roster-ab.before.roster)<.2,
          'four real ship slot pictures cannot regress');
      }


      // WORK4 19h / issue #104: coast seam A/B in the EXACT SAME native
      // Chromium scene/frame. Reinstall the merged-HEAD source mask for BEFORE,
      // remove only that temporary override for RENDER. The single Royal Crown,
      // genuine painted sea, React levels, four ship slots and dock stay fixed.
      if(screen==='fleet' && width===384 && height===512){
        const originalMask=[
          '.w4-fleet .w4-harbour-stage > svg.w4-ship-art.w4-reference-ship{',
          '-webkit-mask-image:radial-gradient(ellipse 75% 105% at 30% 50%,#000 0%,#000 75%,transparent 99%),',
          'linear-gradient(to bottom,transparent 0%,#000 7%,#000 88%,transparent 100%)!important;',
          'mask-image:radial-gradient(ellipse 75% 105% at 30% 50%,#000 0%,#000 75%,transparent 99%),',
          'linear-gradient(to bottom,transparent 0%,#000 7%,#000 88%,transparent 100%)!important;}'
        ].join('');
        const sceneGeometry="(()=>{const b=s=>{const r=document.querySelector(s)?.getBoundingClientRect();"+
          "return r?[r.x,r.y,r.width,r.height]:null;};"+
          "return {ship:b('.w4-reference-ship'),sea:b('.w4-reference-sea'),"+
          "stage:b('.w4-harbour-stage'),roster:b('.w4-ship-roster'),"+
          "dock:b('.harbour-nav.app-dock-porto'),"+
          "cards:document.querySelectorAll('.w4-ship-slot').length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const sceneNew=await evaluate(sceneGeometry);
        assert.equal(sceneNew.cards,4);
        assert.equal(sceneNew.nav,5);
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-before-edge-feather';s.textContent="+JSON.stringify(originalMask)+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(130);
        const sceneOld=await evaluate(sceneGeometry);
        assert.deepEqual(sceneNew,sceneOld,'source edge feather must not move ship, sea, roster or dock');
        const prior=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-ship-edge-fleet-384x512.png'),Buffer.from(prior,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-edge-feather')?.remove();return true;})()"));
        await sleep(130);
        const measure="(async()=>{"+
          "const load=async uri=>{const i=new Image();i.src=uri;await i.decode();return i;};"+
          "const [ref,previous,current]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.fleet+"'),"+
          "load('data:image/png;base64,"+prior+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,previous,current].some(i=>i.width!==384||i.height!==512))throw Error('must be 1:1 native');"+
          "const px=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data;};"+
          "const a=px(ref),b=px(previous),c=px(current);"+
          "const rois={global:[0,0,384,512],ship:[65,205,175,307],coast:[18,137,235,338],edge:[180,153,235,338],water:[18,306,218,356],dock:[0,430,384,512]};"+
          "const mae=(u,v,r)=>{let total=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){total+=Math.abs(u[k+j]-v[k+j]);n++;}}return total/n;};"+
          "const before={},after={};for(const [key,r] of Object.entries(rois)){before[key]=mae(a,b,r);after[key]=mae(a,c,r);}"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(previous,384,0);g.drawImage(current,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(current,1152,0);"+
          "return {before,after,rois,image:out.toDataURL('image/png').split(',')[1]};})()";
        const sample=await evaluate(measure);
        assert.ok(sample?.before?.edge>=0&&sample?.after?.edge>=0,
          'both source coastline masks measured at same native frame');
        writeFileSync(join(folder,'compare-ship-edge-fleet-384x512.png'),
          Buffer.from(sample.image,'base64'));
        delete sample.image;
        const evidence={...sample,sameReactFrame:true,viewport:'384x512',
          source:'assets/design-approved/03-frota.webp',approved:false,
          priorGeometry:sceneOld,newGeometry:sceneNew};
        writeFileSync(join(folder,'fleet-edge-controlled-ab.json'),
          JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_FLEET_EDGE_AB '+JSON.stringify(evidence));
        assert.ok(sample.after.global<sample.before.global,
          'native full-frame MAE must improve, not just seam appearance');
        assert.ok(sample.after.edge+1<sample.before.edge,
          'the painted source coastline must remove the obvious hard crop edge');
        assert.ok(sample.after.water<sample.before.water,
          'approved source sea must improve the sea ROI, not become a false painted wave');
        assert.ok(Math.abs(sample.before.ship-sample.after.ship)<0.2,
          'source-aligned unique Royal Crown hull must remain unchanged');
        assert.ok(Math.abs(sample.before.dock-sample.after.dock)<0.05,
          'protected five-item dock pixels must remain unchanged');
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
        // Regression gate: the approved native card art must genuinely beat
        // the previous vector thumbnails; a working build alone is not proof.
        assert.ok(ab.before.rosterArt-ab.after.rosterArt>10,
          'approved 03 ship miniatures must reduce the native card-art MAE by >10');
        assert.ok(ab.before.global-ab.after.global>1,
          'approved 03 ship miniatures must improve full-frame native MAE');
        for(const key of ['ship','sea','dock'] as const)
          assert.ok(Math.abs(ab.after[key]-ab.before[key])<.05,key+' protected ROI unchanged');
        writeFileSync(join(folder,'compare-source-thumbnails-fleet-384x512.png'),Buffer.from(ab.image,'base64'));
        delete ab.image;
        const evidence={...ab,source:'assets/design-approved/03-frota.webp',
          sameReactFrame:true,viewport:'384x512',approved:false};
        writeFileSync(join(folder,'fleet-source-thumbnails-ab.json'),JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_SOURCE_THUMBNAILS_AB '+JSON.stringify(evidence));
      }
      // WORK4 / #104: source-right Fleet attributes plate, native 384x512.
      // Freeze the SAME React frame; swap only the preceding plate width/right
      // for the "before" image, then remove local style for the "after" image.
      // No actual user data, ship scene, water, roster or dock is changed.
      if(screen==='fleet' && width===384 && height===512){
        const selector='.w4-fleet #w4-fleet-panel > .w4-harbour-stage > .w4-stage-label';
        const boxExpr="(()=>{const get=s=>{const n=document.querySelector(s);if(!n)return null;"+
          "const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};"+
          "return {plate:get("+JSON.stringify(selector)+"),scene:get('.w4-fleet .w4-harbour-stage'),"+
          "ship:get('.w4-reference-ship'),roster:get('.w4-ship-roster'),"+
          "dock:get('.harbour-nav.app-dock-porto'),"+
          "items:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length};})()";
        const current=await evaluate(boxExpr);
        const older=selector+'{width:36%!important;right:1.5%!important;'+
          'border:2px solid #d5ad72!important;border-radius:9px!important;'+
          'box-shadow:inset 0 1px #ffe1a66c,0 4px 8px #04132366!important}';
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-plate-old';s.textContent="+JSON.stringify(older)+
          ";document.head.appendChild(s);return true;})()"));
        await sleep(160);
        const previous=await evaluate(boxExpr);
        const previousPng=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-fleet-plate-384x512.png'),Buffer.from(previousPng,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-plate-old')?.remove();return true;})()"));
        await sleep(140);
        assert.deepEqual(await evaluate(boxExpr),current,'plate CSS toggling restores the same scene');
        assert.equal(current.items,5,'WORK0 dock unchanged with five buttons');
        for(const key of ['scene','ship','roster','dock'] as const)
          assert.deepEqual(current[key],previous[key],key+' geometry untouched');
        assert.ok(current.plate.width<=previous.plate.width,'single stats inset metal outline is softened');
        assert.ok(current.plate.bottom<=current.scene.bottom+1,'all live stats remain inside stage');
        const calculate="(async()=>{"+
          "const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};"+
          "const [ref,old,now]=await Promise.all(["+
          "load('data:image/webp;base64,"+references.fleet+"'),"+
          "load('data:image/png;base64,"+previousPng+"'),"+
          "load('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,old,now].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512');"+
          "const pix=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
          "const [a,b,c]=[pix(ref),pix(old),pix(now)];"+
          "const rois={global:[0,0,384,512],plate:[225,155,378,341],ship:[65,205,175,307],"+
            "water:[18,300,218,339],roster:[18,347,367,414],dock:[0,430,384,512]};"+
          "const mae=(p,q,r)=>{let s=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let ch=0;ch<3;ch++){s+=Math.abs(p[k+ch]-q[k+ch]);n++}}return s/n};"+
          "const before={},after={};for(const [key,roi] of Object.entries(rois)){before[key]=mae(a,b,roi);after[key]=mae(a,c,roi)};"+
          "const out=document.createElement('canvas');out.width=1536;out.height=512;const g=out.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(old,384,0);g.drawImage(now,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {rois,before,after,png:out.toDataURL('image/png').split(',')[1]};})()";
        const ab=await evaluate(calculate);
        writeFileSync(join(folder,'compare-fleet-plate-384x512.png'),Buffer.from(ab.png,'base64'));
        delete ab.png;
        const evidence={...ab,source:'assets/design-approved/03-frota.webp',
          sameReactFrame:true,viewport:'384x512',approved:false,
          previousPlate:previous.plate,currentPlate:current.plate};
        writeFileSync(join(folder,'fleet-plate-ab.json'),JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_FLEET_PLATE_AB '+JSON.stringify(evidence));
        assert.ok(ab.after.plate<ab.before.plate,'source-right Fleet plate ROI must improve');
        assert.ok(ab.after.global<ab.before.global,'native Fleet global must not regress');
        for(const key of ['ship','water','roster','dock'] as const)
          assert.ok(Math.abs(ab.after[key]-ab.before[key])<.12,
            'protected '+key+' native ROI must not regress');
      }
      // WORK4 / #104: native 384x512 approved Forge enamel comparison.
      // Do not change React state, forge cost values, cannon, or the shared
      // dock. Restore only the previous grey/81% button with a local STYLE,
      // screenshot the same frame, remove STYLE, and compare to approved 04.
      if(screen==='forge' && width===384 && height===512){
        const plaqueSelector='.w4-forge #w4-forge-panel > .w4-improve-button';
        const geometryExpr="(()=>{const r=s=>{const e=document.querySelector(s);"+
          "if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};};"+
          "const button=document.querySelector("+JSON.stringify(plaqueSelector)+");"+
          "return {button:r("+JSON.stringify(plaqueSelector)+"),materials:r('.w4-forge .w4-materials'),"+
          "cannon:r('.w4-reference-cannon'),dock:r('.harbour-nav.app-dock-porto'),"+
          "dockItems:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,"+
          "disabled:button?.disabled,text:button?.textContent?.trim()};})()";
        const current=await evaluate(geometryExpr);
        const oldCSS=[
          plaqueSelector+'{width:81%!important}',
          plaqueSelector+':disabled{background:linear-gradient(#596f69,#304d50)!important;'+
            'border-color:#f6d88e!important;color:#dfecdc!important;text-shadow:inherit!important;'+
            'box-shadow:0 3px #584327,0 5px 12px #091b2d,inset 0 2px #edffbd99!important}'
        ].join('\n');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');s.id='work4-previous-grey-plaque';"+
          "s.textContent="+JSON.stringify(oldCSS)+";document.head.appendChild(s);return true;})()"));
        await sleep(170);
        const previous=await evaluate(geometryExpr);
        const previousImage=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-enamel-384x512.png'),Buffer.from(previousImage,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-previous-grey-plaque')?.remove();return true;})()"));
        await sleep(120);
        const restored=await evaluate(geometryExpr);
        assert.deepEqual(restored,current,'same original frame, no changed geometry');
        assert.equal(current.dockItems,5,'original dock stays five-item');
        assert.equal(current.disabled,true,'insufficient-coin action stays genuinely disabled');
        assert.match(String(current.text),/MOEDAS INSUFICIENTES/,'honest upgrade status unchanged');
        assert.ok(current.button.width>=170 && current.button.width<=235,'native plaque is narrower');
        assert.ok(current.button.height>=44,'touch target stays 44px');
        assert.ok(current.button.bottom<=current.dock.y-1,'button visible above dock');
        assert.deepEqual(current.cannon,previous.cannon,'approved single cannon remains untouched');
        assert.deepEqual(current.materials,previous.materials,'three live cost fields stay in place');
        assert.deepEqual(current.dock,previous.dock,'dock is WORK0-owned and untouched');

        const expr="(async()=>{"+
          "const image=async uri=>{const i=new Image();i.src=uri;await i.decode();return i;};"+
          "const [ref,old,now]=await Promise.all(["+
            "image('data:image/webp;base64,"+references.forge+"'),"+
            "image('data:image/png;base64,"+previousImage+"'),"+
            "image('data:image/png;base64,"+screenshot+"')]);"+
          "if([ref,old,now].some(i=>i.width!==384||i.height!==512))throw Error('native 384x512 only');"+
          "const rgba=i=>{const c=document.createElement('canvas');c.width=384;c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return g.getImageData(0,0,384,512).data};"+
          "const [a,b,c]=[rgba(ref),rgba(old),rgba(now)];"+
          "const rois={global:[0,0,384,512],button:[47,381,338,429],plaque:[96,381,308,429],"+
          "cannon:[100,230,160,300],costs:[18,317,368,378],dock:[0,430,384,512]};"+
          "const mae=(u,v,r)=>{let total=0,n=0;for(let y=r[1];y<r[3];y++)for(let x=r[0];x<r[2];x++){const k=(y*384+x)*4;for(let j=0;j<3;j++){total+=Math.abs(u[k+j]-v[k+j]);n++;}}return total/n};"+
          "const before={},after={};for(const [key,r] of Object.entries(rois)){before[key]=mae(a,b,r);after[key]=mae(a,c,r)};"+
          "const result=document.createElement('canvas');result.width=1536;result.height=512;const g=result.getContext('2d');"+
          "g.drawImage(ref,0,0);g.drawImage(old,384,0);g.drawImage(now,768,0);"+
          "g.drawImage(ref,1152,0);g.globalAlpha=.5;g.drawImage(now,1152,0);"+
          "return {rois,before,after,png:result.toDataURL('image/png').split(',')[1]};})()";
        const ab=await evaluate(expr);
        writeFileSync(join(folder,'compare-forge-enamel-384x512.png'),Buffer.from(ab.png,'base64'));
        delete ab.png;
        const evidence={...ab,previous,new:current,source:'assets/design-approved/04-melhorias-forja.webp',
          sameReactFrame:true,viewport:'384x512',approved:false};
        writeFileSync(join(folder,'forge-enamel-controlled-ab.json'),JSON.stringify(evidence,null,2)+'\n');
        console.log('WORK4_FORGE_ENAMEL_AB '+JSON.stringify(evidence));
        assert.ok(ab.after.button<ab.before.button,
          'Forge native button frame must improve against approved source');
        assert.ok(ab.after.global<ab.before.global,
          'Forge native global must not regress against approved source');
        // The materials' DOM geometry and live values are exactly equal.
        // Chromium rasterization can shift source-vs-render MAE by <0.1px
        // across a large adjacent ROI after a compositing style recalc;
        // keep a strict 0.15 ceiling for costs, 0.05 for cannon and dock.
        for(const k of ['cannon','costs','dock'])
          assert.ok(Math.abs(ab.after[k]-ab.before[k])<(k==='costs'?.15:.05),
            'protected '+k+' ROI remains within native raster tolerance');
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

        // WORK4 18h: paint-only continuation of the approved charcoal resource
        // board behind its real upgrade action. Toggle ONLY the new decorative
        // ::after layer; costs, genuine cannon, touch bounds and WORK0 dock
        // remain frozen in the SAME React/animation frame at native 384x512.
        const boardGeometry="(()=>{const b=s=>{const e=document.querySelector(s);"+
          "if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};"+
          "const m=document.querySelector('.w4-forge #w4-forge-panel>.w4-materials');"+
          "return {materials:b('.w4-forge #w4-forge-panel>.w4-materials'),"+
          "action:b('.w4-forge #w4-forge-panel>.w4-improve-button'),"+
          "cannon:b('.w4-forge .w4-reference-cannon'),"+
          "dock:b('.harbour-nav.app-dock-porto'),"+
          "numbers:document.querySelectorAll('.w4-forge .w4-resource-grid>div').length,"+
          "nav:document.querySelectorAll('.harbour-nav.app-dock-porto .harbour-nav-item').length,"+
          "underlay:m?getComputedStyle(m,'::after').content:null};})()";
        const boardNow=await evaluate(boardGeometry);
        assert.equal(boardNow.numbers,3,'preserve three actual currency fields');
        assert.equal(boardNow.nav,5,'preserve all WORK0 navigation items');
        assert.ok(boardNow.action.height>=44,'upgrade touch target remains >=44px');
        assert.ok(boardNow.action.bottom<=boardNow.dock.y+1,
          'cost action remains visible before the fixed dock');
        assert.ok(await evaluate("(()=>{const s=document.createElement('style');"+
          "s.id='work4-before-board-extension';"+
          "s.textContent='.w4-forge #w4-forge-panel>.w4-materials::after{content:none!important}';"+
          "document.head.appendChild(s);return true;})()"));
        await sleep(130);
        const boardOld=await evaluate(boardGeometry);
        const boardBefore=(await command('Page.captureScreenshot',{
          format:'png',fromSurface:true,captureBeyondViewport:false
        })).data as string;
        writeFileSync(join(folder,'before-forge-board-384x512.png'),
          Buffer.from(boardBefore,'base64'));
        assert.ok(await evaluate("(()=>{document.getElementById('work4-before-board-extension')?.remove();return true;})()"));
        await sleep(120);
        const boardRestored=await evaluate(boardGeometry);
        assert.deepEqual(boardRestored,boardNow,'must restore same Forge scene and underlay');
        for(const k of ['materials','action','cannon','dock'] as const)
          assert.deepEqual(boardNow[k],boardOld[k],
            'decorative board cannot move real '+k);
        assert.equal(boardOld.underlay,'none');
        const boardCompare=await evaluate(sample.replace(previousFrame,boardBefore));
        writeFileSync(join(folder,'compare-forge-board-384x512.png'),
          Buffer.from(boardCompare.image,'base64'));
        delete boardCompare.image;
        const boardEvidence={...boardCompare,source:'assets/design-approved/04-melhorias-forja.webp',
          sameReactFrame:true,native:'384x512',before:boardCompare.before,
          after:boardCompare.after,geometry:boardNow,approved:false};
        writeFileSync(join(folder,'forge-board-controlled-ab.json'),
          JSON.stringify(boardEvidence,null,2)+'\n');
        console.log('WORK4_FORGE_BOARD_CONTINUITY_AB '+JSON.stringify(boardEvidence));
        for(const k of ['cannon','foundryPanel'] as const)
          assert.ok(Math.abs(boardCompare.after[k]-boardCompare.before[k])<.05,
            'protected '+k+' ROI unchanged');
        assert.ok(boardCompare.after.materials<boardCompare.before.materials,
          'connected real costs/button surface must improve source materials ROI');
        assert.ok(boardCompare.after.global<boardCompare.before.global,
          'connected real costs/button surface must improve native global MAE');

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
  // The Chromium A/B artifact is the review deliverable: all JSON records
  // must actually parse (a trailing literal backslash-n is not valid JSON).
  for(const filename of readdirSync(folder).filter(name=>name.endsWith('.json'))){
    const proof=JSON.parse(readFileSync(join(folder,filename),'utf8'));
    if(Object.hasOwn(proof,'approved')){
      assert.equal(proof.approved,false,filename+' requires human artistic sign-off');
    }
  }
  assert.equal(report.visual.length,8,'four Chromium viewports for both Work4 screens');
});

test('WORK4 native Forge avoids painting a second furnace glow onto approved source',()=>{
  assert.ok(css.includes('native Forge 04: eliminate a duplicate glow'));
  assert.match(css, /@media \(width:384px\) and \(height:512px\)[\s\S]*?svg\.w4-cannon-art\.w4-reference-cannon > ellipse \{\s*opacity:0;/);
  assert.doesNotMatch(css.split('native Forge 04: eliminate a duplicate glow')[1], /\.app-|\.harbour-nav|\.w4-resource-grid/);
});

test('WORK4 Forge native charcoal only changes local material paint, never compositor or menu',()=>{
  const block=css.split('WORK4/#104 — 18 Nov native Forge stage:')[1];
  assert.ok(block);
  assert.match(block,/@media \(width:384px\) and \(height:512px\)/);
  assert.match(block,/border-color:#364750/);
  assert.match(block,/background-color:#4a352f!important/);
  assert.doesNotMatch(block.split('*/')[1]||'',/(?:\.app-|\.porto-|\.harbour-nav|\.bottom-nav|contain:paint|translateZ|position:fixed)/);
});
