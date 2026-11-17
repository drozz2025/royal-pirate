import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,readFileSync as read,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';

const css=readFileSync(new URL('../src/work4-fleet-forge.css',import.meta.url),'utf8');
const marker='WORK4 / #104 — source-pixel registration of approved 03/04';
const block=css.split(marker)[1]||'';
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
        before:measurement?.before||null,after:measurement?.after||null,antiBlue,
        approved:false,source:'approved art from original 384x512; no reference rescaling at 384'});
    }
  }
  writeFileSync(join(folder,'work4-pixel-registration.json'),JSON.stringify(report,null,2)+'\n');
  assert.equal(report.visual.length,8,'four Chromium viewports for both Work4 screens');
});
