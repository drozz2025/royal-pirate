/**
 * WORK 5 — real, isolated Chromium headless interaction (when installed).
 * This is an automated emulated touch/viewport smoke test, NOT physical iPhone
 * validation or an approval of artwork, WebGL frame quality or ship pinch.
 * No component / CSS / gameplay / deployment code is modified.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {createServer} from 'vite';

test('WORK5: Chromium emulated touchscreen opens eight approved views, preserves profile and fires once', {timeout:120_000}, async t=>{
  const detect=spawnSync('sh',['-c','command -v google-chrome || command -v chromium || command -v chromium-browser'],{encoding:'utf8'});
  const chromeBin=process.env.CHROME_BIN||detect.stdout.trim().split('\n')[0];
  if(!chromeBin){t.skip('Chromium not installed: no claim of browser/mobile QA');return;}
  const root=fileURLToPath(new URL('../',import.meta.url));
  const profileDir=await mkdtemp(join(tmpdir(),'royal-work5-mobile-'));
  let vite:any=null, chrome:any=null, socket:WebSocket|null=null;
  const exceptions:string[]=[];
  try{
    vite=await createServer({root,server:{host:'127.0.0.1',port:0,strictPort:false},logLevel:'error'});
    await vite.listen();
    const addr=vite.httpServer.address();
    assert.ok(addr&&typeof addr==='object','Vite must bind a real local port');
    const url='http://127.0.0.1:'+addr.port+'/';
    chrome=spawn(chromeBin,[
      '--headless=new','--no-sandbox','--disable-dev-shm-usage',
      '--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
      '--remote-allow-origins=*','--remote-debugging-port=0',
      '--user-data-dir='+profileDir,'about:blank'
    ],{stdio:'ignore'});
    chrome.on('error',()=>{});
    let port=0;
    for(let i=0;i<130;i++){
      if(chrome.exitCode!==null)throw new Error('Chromium exited before starting');
      try{
        const active=await readFile(join(profileDir,'DevToolsActivePort'),'utf8');
        port=Number(active.split('\n')[0]);if(port>0)break;
      }catch{}
      await pause(100);
    }
    assert.ok(port>0,'Chromium DevTools port did not start');
    let page:any=null;
    for(let i=0;i<45;i++){
      try{
        const response=await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1500)});
        if(response.ok){page=(await response.json()).find((entry:any)=>entry.type==='page');if(page)break;}
      }catch{}
      await pause(120);
    }
    assert.ok(page?.webSocketDebuggerUrl,'No Chromium page target');
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{
      socket!.addEventListener('open',()=>resolve(),{once:true});
      socket!.addEventListener('error',()=>reject(new Error('Chromium CDP connection failed')),{once:true});
    });
    const pending=new Map<number,{resolve:(x:any)=>void;reject:(x:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
    let serial=0;
    socket.addEventListener('message',(event:any)=>{
      const msg=JSON.parse(event.data);
      if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params?.exceptionDetails?.text||'Runtime exception');
      if(!msg.id)return;
      const wait=pending.get(msg.id);
      if(!wait)return;
      pending.delete(msg.id);clearTimeout(wait.timer);
      msg.error?wait.reject(new Error(msg.error.message)):wait.resolve(msg.result);
    });
    const command=(method:string,params:any={}):Promise<any>=>new Promise((resolve,reject)=>{
      const id=++serial;
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},18000);
      pending.set(id,{resolve,reject,timer});
      socket!.send(JSON.stringify({id,method,params}));
    });
    const evalInPage=async(js:string):Promise<any>=>{
      const result=await command('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'Browser JS exception');
      return result.result?.value;
    };
    const waitFor=async(js:string,label:string,ms=11000)=>{
      const end=Date.now()+ms;
      while(Date.now()<end){
        if(await evalInPage(js).catch(()=>false))return;
        await pause(130);
      }
      const text=await evalInPage('document.body?.innerText?.slice(0,260)').catch(()=>'?');
      throw new Error('Timed out: '+label+'; page excerpt: '+text);
    };
    const tap=async(selector:string)=>{
      const point=await evalInPage('(()=>{'+
        'const e=document.querySelector('+JSON.stringify(selector)+');if(!e)return null;'+
        'const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);'+
        'const top=document.elementFromPoint(x,y);'+
        'return{x,y,width:r.width,height:r.height,disabled:!!e.disabled,visible:r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:top===e||e.contains(top)};'+
        '})()');
      assert.ok(point,'Missing touch target: '+selector);
      assert.equal(point.disabled,false,'Disabled touch target: '+selector);
      assert.ok(point.visible,'Off-screen touch target '+selector+': '+JSON.stringify(point));
      assert.ok(point.hit,'Touch blocked by overlay '+selector+': '+JSON.stringify(point));
      await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:1}]});
      await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    const opened=async(label:string)=>{
      await waitFor('document.querySelector(".app-sheet .app-screen-title-accessible")?.textContent?.includes('+JSON.stringify(label)+')','screen '+label);
      const inspect=await evalInPage('(()=>({'+
        'tabs:document.querySelectorAll(".app-sheet .harbour-nav-item").length,'+
        'modal:document.querySelector(".app-sheet")?.getAttribute("aria-modal"),'+
        'horizontal:document.documentElement.scrollWidth>innerWidth+2,'+
        'dockBottom:Math.round(document.querySelector(".app-sheet .harbour-nav")?.getBoundingClientRect().bottom??0)'+
        '}))()');
      assert.equal(inspect.tabs,5,'All screens need five real navigation tabs: '+label);
      assert.equal(inspect.modal,'true','Sheet must have modal accessibility contract');
      assert.equal(inspect.horizontal,false,'Horizontal overflow on '+label);
      assert.ok(inspect.dockBottom<=845,'Dock clipped below viewport on '+label);
    };
    const back=async()=>{
      await tap('.app-sheet .harbour-nav-item:first-child');
      await waitFor('!!document.querySelector(".harbour-screen:not([aria-hidden=true]) .harbour-nav")','return to Porto');
    };

    await command('Page.enable');
    await command('Runtime.enable');
    await command('Emulation.setDeviceMetricsOverride',{
      width:390,height:844,screenWidth:390,screenHeight:844,deviceScaleFactor:1,mobile:true
    });
    await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    await command('Page.navigate',{url});
    await waitFor('!!document.querySelector(".harbour-screen .harbour-nav")','Porto mounted');
    await waitFor('!document.querySelector(".loading")','initial scene loaded',18000);
    assert.equal(await evalInPage('document.querySelectorAll(".harbour-nav-item").length'),5);

    // Actually send CDP touch events; DOM .click() would not validate hit targets.
    await tap('.harbour-screen .harbour-nav-item:nth-child(2)');
    await opened('Frota');
    const tagForge=await evalInPage('(()=>{const b=[...document.querySelectorAll(".w4-fleet button")].find(el=>el.textContent?.includes("ABRIR MELHORIAS"));if(!b)return false;b.setAttribute("data-work5-qa-target","forge");return true})()');
    assert.ok(tagForge,'Frota has no actionable Forja transition');
    await tap('[data-work5-qa-target="forge"]');
    await opened('Forja');
    await tap('.app-sheet .harbour-nav-item:nth-child(3)');
    await opened('Cartas');
    await tap('.app-sheet .harbour-nav-item:nth-child(4)');
    await opened('Loja');
    await tap('.app-sheet .harbour-nav-item:nth-child(5)');
    await opened('Ranking');
    await back();

    await tap('.harbour-screen .harbour-flank-right button:nth-child(2)');
    await opened('Missões');
    await back();

    // Browser-backed persistence: edit in React, confirm storage, reload and verify the real Porto.
    await tap('.harbour-screen .harbour-profile');
    await opened('O meu perfil');
    const inputValue=await evalInPage('(()=>{const el=document.querySelector("#app-player-name");if(!el)return null;'+
      'Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,"Capitao QA");'+
      'el.dispatchEvent(new Event("input",{bubbles:true}));return el.value;})()');
    assert.equal(inputValue,'Capitao QA');
    await waitFor('!document.querySelector(".app-player-name-edit button[type=submit]")?.disabled','profile submit enabled');
    await tap('.app-player-name-edit button[type=submit]');
    await waitFor('JSON.parse(localStorage.getItem("royal-pirate:local-profile:v1")||"{}").playerName==="Capitao QA"','profile saved');
    // Page.reload acknowledges the command before the old document disappears.
    // A sentinel prevents accidentally reading the previous React tree mid-reload.
    await evalInPage('document.documentElement.setAttribute("data-work5-pre-reload","1")');
    await command('Page.reload',{ignoreCache:true});
    await waitFor('!document.documentElement.hasAttribute("data-work5-pre-reload") && !!document.querySelector(".harbour-screen .harbour-battle-button")','new document mounted after reload',18000);
    await waitFor('document.querySelector(".harbour-player-name")?.textContent==="Capitao QA"','profile reloaded',18000);

    // The actual 3D battle scene and its fire action, not just the briefing modal.
    await waitFor('!document.querySelector(".loading")','3D ready after reload',18000);
    await tap('.harbour-screen .harbour-battle-button');
    await waitFor('!!document.querySelector(".in-battle .fire-button")','3D battle');
    await waitFor('document.querySelector(".fire-button")?.disabled===false','battle controls ready',18000);
    await tap('.in-battle .fire-button');
    await waitFor('document.querySelector(".fire-button")?.disabled===true','single fire enters flight');
    assert.equal(await evalInPage('document.querySelector(".in-battle #bearing")?.min'),'-25');
    assert.equal(await evalInPage('document.querySelector(".in-battle #power")?.max'),'100');
    await tap('.return-harbour');
    await waitFor('!!document.querySelector(".harbour-screen:not([aria-hidden=true]) .harbour-nav")','return after battle');

    // Short iPhone-like viewport: the five tab centres must all be genuinely hittable.
    await command('Emulation.setDeviceMetricsOverride',{
      width:384,height:512,screenWidth:384,screenHeight:512,deviceScaleFactor:1,mobile:true
    });
    await pause(250);
    const small=await evalInPage('(()=>{const nav=document.querySelector(".harbour-screen .harbour-nav");'+
      'const r=nav.getBoundingClientRect();return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,'+
      'bottom:r.bottom,tabs:[...nav.querySelectorAll("button")].map(b=>{const q=b.getBoundingClientRect();'+
      'const x=q.left+q.width/2,y=q.top+q.height/2,h=document.elementFromPoint(x,y);'+
      'return{width:q.width,height:q.height,hit:h===b||b.contains(h)}})}})()');
    assert.equal(small.width,384);
    assert.equal(small.height,512);
    assert.ok(small.scrollWidth<=386,'Horizontal overflow 384x512: '+JSON.stringify(small));
    assert.ok(Math.abs(small.bottom-512)<=2,'Mobile dock not anchored: '+JSON.stringify(small));
    assert.equal(small.tabs.length,5);
    assert.ok(small.tabs.every((b:any)=>b.hit&&b.width>=35&&b.height>=35),
      'Dock tab too small or blocked at 384x512: '+JSON.stringify(small));
    assert.deepEqual(exceptions,[],'Actual browser runtime exceptions');
  }finally{
    try{socket?.close();}catch{}
    if(chrome){try{chrome.kill('SIGTERM');}catch{}}
    if(vite)await vite.close();
    await pause(150);
    await rm(profileDir,{recursive:true,force:true}).catch(()=>{});
  }
});

test.todo('WORK5: measured camera zoom after real two-finger pinch on 3D ship is not yet verified');
test.todo('WORK5: the 10-second turn clock and ten-shot limit require implementation before browser assertion');
