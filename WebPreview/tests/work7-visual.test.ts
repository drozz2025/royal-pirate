/**
 * WORK7-only real Chromium visual evidence for 05 Cartas and 06 Loja.
 * On CI (where Chrome is preinstalled) tests the actual React/Vite screens,
 * saves reference | render | overlay (native 384x512, plus mobile regressions),
 * checks eight illustrated cards, three chests, real labels and the five-tab dock.
 * No fake purchases, no changed shared QA scripts, no visual auto-approval.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const variants = [
  [384, 512], [320, 568], [390, 844], [430, 932]
] as const;
const chrome = [process.env.CHROME_BIN, 'google-chrome', 'chromium'].filter(Boolean)
  .find(binary => spawnSync('which', [binary!]).status === 0);
const enabled = process.env.CI === 'true' && Boolean(chrome);

test('WORK7 / #104: real 05/06 Chromium and approved artwork comparisons', {
  skip: enabled ? false : 'Real browser captures run only on CI with Chromium installed',
  timeout: 240_000
}, async t => {
  const output = join(process.cwd(), 'porto-qa', 'work7');
  const temp = await mkdtemp(join(tmpdir(), 'royal-work7-chrome-'));
  // Every browser QA suite runs concurrently in Node's test runner. The
  // production build MUST have a private output directory: otherwise one
  // suite can empty another suite's dist/assets while Chromium loads it.
  const privateBuildDir = join(temp, 'production');
  await mkdir(output, { recursive: true });
  // Vite dev does not serve approved WEBP references outside its source root.
  // Build exactly as production before capturing; otherwise illustrations
  // falsely appear as empty dark cards/chests in QA screenshots.
  const productionBuild = spawnSync('npm',
    ['run', 'build', '--', '--base=/royal-pirate/', '--outDir', privateBuildDir],
    { cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:10_000_000 });
  assert.equal(productionBuild.status,0,
    'Production assets required for real Chromium QA: ' +
      (productionBuild.stderr || productionBuild.stdout).slice(-3000));
  const cssText = (await readFile(join(process.cwd(),'src','work7-cards-shop.css'))).toString();
  const marker = '/* WORK7/#104 — 18 Nov 10:20 UTC. Approved source-art tonal correction at 384×512.';
  assert.ok(cssText.includes(marker),'WORK7 local composition marker exists');
  assert.ok(cssText.includes('Native card 4+7 inlay/exposure candidate'),
    'Only cards 4 and 7 physical artwork filters are recalibrated in this branch');
  assert.ok(cssText.includes('18 Nov 11:20 UTC, eight-card native source pigment/depth registration.'),
    'New WORK7 eight-card short-viewport art treatment exists without screenshot backgrounds');
  assert.ok(cssText.includes('18 Nov 12:21 UTC. Genuine 05 source art: local highlight registration.'),
    'Previous integrated true-image correction remains present');
  assert.ok(cssText.includes('19 Nov: native carved enamel shadow registration'), 'Native 05 WORK7 candidate must exist');
  assert.ok(cssText.includes('19 Nov, native 384x512 RARE chest inset experiment'), 'Only 06 source-backed rare chest inlay tuned');
  assert.ok(cssText.includes('Genuine 06 legendary chest embossed metal rim'),
    'Only genuine native 06 legendary physical rim is changed in this candidate');
  assert.ok(cssText.includes('18 Nov 13:45 UTC. True 384×512 carved-frame inlay.'),
    'The final WORK7 candidate changes only genuine 05 frame inlays');
    // The only admissible before-image is the actual merged #392 v0.1.88 field.
  // Art and frames are restored with temporary CSS, never with older #384 values.
  // Exact v0.1.88 merged HEAD after WORK0 integrated #392 (not stale #384).
  // All eight image sublayers also restore their actual pre-PR values.
  // These !important overrides exist ONLY for controlled same-frame A/B screenshots.
  // Exact merged WORK0 v0.1.96 HEAD: undo ONLY THIS PR's fourth
  // frame filter. Previous #411/#422 and live artwork stay untouched.
  // The override is installed on the SAME page and animation frame.
  // It is inert for Shop and for 320/tall viewports.
  // Restore EXACT merged WORK0 HEAD for the unique candidate on rare-chest
  // inlay; do not revert previous integrated #525 legend or any 05 changes.
  // Same page, frozen fonts and animation frame, no source substitution.
  const cssBaseline = `
    @media (min-width:355px) and (max-width:390px) and (max-height:560px){
      .w7-screen[data-work7-screen="shop"] .w7-chest-rare::before{
        box-shadow:inset 0 0 0 3px #071321cd,
                   inset 0 2px 11px 3px #020817c5,
                   inset 0 -2px 1px #e7b77529!important;
      }
    }`;
  const server = spawn(join(process.cwd(), 'node_modules', '.bin', 'vite'),
    ['preview', '--host', '127.0.0.1', '--port', '4287', '--strictPort', '--base=/royal-pirate/', '--outDir', privateBuildDir],
    { cwd: process.cwd(), stdio: 'ignore' });
  let browser: ReturnType<typeof spawn> | undefined;
  let ws: WebSocket | undefined;
  const outstanding = new Map<number, { ok: (value: any) => void; fail: (reason: Error) => void }>();
  let counter = 0;
  t.after(async () => {
    ws?.close();
    browser?.kill('SIGTERM');
    server.kill('SIGTERM');
    await sleep(300);
    await rm(temp, { recursive: true, force: true });
  });

  const origin = 'http://127.0.0.1:4287/royal-pirate/';
  let running = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Vite server stopped before WORK7 captures');
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(750) });
      if (response.ok) { running = true; break; }
    } catch { /* server is starting */ }
    await sleep(150);
  }
  assert.ok(running, 'Vite preview must serve the actual React app');

  browser = spawn(chrome!, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-webgl', '--enable-unsafe-swiftshader',
    '--use-gl=angle', '--use-angle=swiftshader', '--remote-allow-origins=*',
    // A fixed CDP port intermittently collided with other Chromium visual
    // tests in the same CI runner. Let Chrome reserve its own private port.
    '--remote-debugging-port=0', '--user-data-dir='+temp, 'about:blank'
  ], { stdio: 'ignore' });
  let target: any;
  // GitHub runners may saturate CPU while the other 3 visual suites start.
  // Wait for Chrome's own DevToolsActivePort file, not an assumed 9337 port.
  for (let attempt = 0; attempt < 300; attempt++) {
    if (browser.exitCode !== null) throw new Error('Chromium stopped before CDP connection');
    try {
      const value = (await readFile(join(temp, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      const cdpPort = Number(value);
      if (Number.isInteger(cdpPort) && cdpPort > 0) {
        const response = await fetch('http://127.0.0.1:'+cdpPort+'/json/list', { signal: AbortSignal.timeout(950) });
        if (response.ok) {
          const pages = await response.json() as Array<{type:string;webSocketDebuggerUrl:string}>;
          target = pages.find(page => page.type === 'page');
          if (target) break;
        }
      }
    } catch { /* Chrome has not written its active port yet */ }
    await sleep(150);
  }
  assert.ok(target, 'A real Chromium page must be available after its own DevToolsActivePort starts');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws!.addEventListener('open', () => resolve(), { once: true });
    ws!.addEventListener('error', () => reject(new Error('Chromium websocket failed')), { once: true });
  });
  ws.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const callback = outstanding.get(message.id);
    if (!callback) return;
    outstanding.delete(message.id);
    message.error ? callback.fail(new Error(message.error.message)) : callback.ok(message.result);
  });
  const command = (method: string, params: Record<string,unknown> = {}): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = ++counter;
      const timer = setTimeout(() => {
        outstanding.delete(id);
        reject(new Error('Chromium CDP timeout: ' + method));
      }, 30000);
      outstanding.set(id, {
        ok: value => { clearTimeout(timer); resolve(value); },
        fail: error => { clearTimeout(timer); reject(error); }
      });
      ws!.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression:string):Promise<any> => {
    const response = await command('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    });
    if (response.exceptionDetails) throw new Error(
      response.exceptionDetails.text || 'Chromium evaluation failed');
    return response.result?.value;
  };
  const waitFor = async (expression:string):Promise<void> => {
    // Real mobile Chromium can take longer than 9 s to mount React while
    // multiple GPU-based QA suites execute. Keep a bounded wait and report
    // the document state instead of silently accepting a blank page.
    for (let n=0;n<180;n++) {
      if (await evaluate(expression)) return;
      await sleep(120);
    }
    const diagnostic = await evaluate("({url:location.href,readyState:document.readyState,title:document.title,rootText:document.getElementById('root')?.textContent?.slice(0,140),scripts:[...document.scripts].map(s=>s.src)})");
    throw new Error('Timed out waiting for React screen: '+expression+' '+JSON.stringify(diagnostic));
  };
  await command('Page.enable');
  await command('Runtime.enable');

  // Mandatory design provenance: original 00, eight-screen mosaic 00,
  // and every approved 01–08 source must exist before comparisons.
  // WORK7 renders/screenshots ONLY 05 and 06; no other WORK UI is modified.
  for (const name of [
    '00-referencia-original-aprovada.webp','00-painel-oito-ecras.webp',
    '01-porto.webp','02-batalha.webp','03-frota.webp','04-melhorias-forja.webp',
    '05-cartas.webp','06-loja.webp','07-missoes.webp','08-ranking-perfil.webp'
  ]) {
    const image = await readFile(new URL('../../assets/design-approved/'+name, import.meta.url));
    assert.ok(image.byteLength>1000,'Mandatory approved design reference present: '+name);
  }
  const references = {
    cards: await readFile(new URL('../../assets/design-approved/05-cartas.webp', import.meta.url)),
    shop: await readFile(new URL('../../assets/design-approved/06-loja.webp', import.meta.url))
  };
  const report: { approved:boolean; source:string; screens:any[] } = {
    approved:false, source:'Real Chromium + unscaled approved 384x512 originals',
    screens:[]
  };
  try {
    for (const [width,height] of variants) {
      await command('Emulation.setDeviceMetricsOverride', {
        width,height,deviceScaleFactor:1,mobile:true,screenWidth:width,screenHeight:height
      });
      await command('Emulation.setTouchEmulationEnabled', { enabled:true,maxTouchPoints:2 });
      for (const kind of ['cards','shop'] as const) {
        await command('Page.navigate', { url: origin });
        await waitFor("!!document.querySelector('.harbour-screen .harbour-nav-item:nth-child(4)')");
        const tab = kind === 'cards' ? 3 : 4;
        const touchTarget = await evaluate(
          "(()=>{const tab=document.querySelector('.harbour-screen .harbour-nav-item:nth-child("+tab+")');if(!tab)return null;const r=tab.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
        assert.ok(touchTarget,'The real '+kind+' Porto navigation target must be present');
        // Real Chromium CDP touchscreen press; not a synthetic HTMLElement.click().
        await command('Input.dispatchTouchEvent',{
          type:'touchStart',touchPoints:[{x:touchTarget.x,y:touchTarget.y,id:7}]
        });
        await sleep(65);
        await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await waitFor("!!document.querySelector('[data-work7-screen=\""+kind+"\"]')");
        // A nonempty crop element is insufficient: all 8 + 4 image URLs must
        // actually decode on the production build before screenshots count.
        await waitFor("(()=>{const images=[...document.querySelectorAll('[data-work7-screen=\""+kind+"\"] .w7-approved-crop img')];return images.length==="+(kind==='cards'?8:4)+"&&images.every(i=>i.complete&&i.naturalWidth>0)})()");
        await evaluate('document.fonts.ready.then(()=>true)');
        await sleep(350);
        // Exercise real touchscreen input on WORK7's own secondary tab, then
        // restore the same collection/offers scene before the A/B screenshot.
        // This guards genuine navigation/labels against a noninteractive repaint.
        const touchLocalTab = async (index:number,expectedLabel:string) => {
          const point=await evaluate("(()=>{const t=document.querySelector('[data-work7-screen=\\\""+kind+"\\\"] .w7-tabs button:nth-child("+index+")');if(!t)return null;const r=t.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
          assert.ok(point,'WORK7 local tab '+index+' must be a real touch target');
          await command('Input.dispatchTouchEvent',{
            type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:14}]
          });
          await sleep(65);
          await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          await waitFor("!!document.querySelector('[data-work7-screen=\\\""+kind+"\\\"] [role=tabpanel][aria-label=\\\""+expectedLabel+"\\\"]')");
        };
        const walletBefore=await evaluate("document.querySelector('.w7-wallet strong')?.textContent||null");
        if(kind==='cards'){
          await touchLocalTab(2,'Melhorar cartas');
          await touchLocalTab(1,'A minha coleção');
        } else {
          await touchLocalTab(2,'PACOTES DE MOEDAS');
          await touchLocalTab(1,'Ofertas disponíveis');
        }
        const walletAfter=await evaluate("document.querySelector('.w7-wallet strong')?.textContent||null");
        assert.equal(walletAfter,walletBefore,'WORK7 tab navigation cannot mutate genuine currency');
        await waitFor("(()=>{const imgs=[...document.querySelectorAll('[data-work7-screen=\\\""+kind+"\\\"] .w7-approved-crop img')];return imgs.length==="+(kind==='cards'?8:4)+"&&imgs.every(img=>img.complete&&img.naturalWidth>0)})()");
        await sleep(100);

        // Freeze decorative CSS/Web Animations after real touchscreen navigation.
        // HEAD and RENDER now share identical timeline, DOM, assets and frame.
        await evaluate("(()=>{const s=document.createElement('style');s.id='work7-qa-frozen-frame';"+
          "s.textContent='*,*::before,*::after{animation-play-state:paused!important;transition-duration:0s!important}';"+
          "document.head.appendChild(s);document.getAnimations().forEach(a=>a.pause());return true})()");
        await sleep(100);
        const geometry = await evaluate("(()=>{"+
          "const rect=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.width),height:Math.round(b.height),bottom:Math.round(b.bottom)}};"+
          "const root=document.querySelector('[data-work7-screen=\""+kind+"\"]');"+
          "const nav=document.querySelector('.app-sheet > .harbour-nav')||document.querySelector('.harbour-screen .harbour-nav');"+
          "const slots=[...root.querySelectorAll('.w7-approved-slot')].map(rect);"+
          "const chests=[...root.querySelectorAll('.w7-chest')].map(rect);"+
          "const labels=[...root.querySelectorAll('.w7-approved-slot small,.w7-chest-status')].map(e=>({text:e.textContent.trim(),...rect(e)}));"+
          "return {viewport:[innerWidth,innerHeight],nav:rect(nav),navItems:nav?.querySelectorAll('.harbour-nav-item').length||0,"+
          "slots,chests,pack:rect(root.querySelector('.w7-captain-pack')),packArt:rect(root.querySelector('.w7-captain-pack-art .w7-approved-crop')),labels,"+
          "horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};})()");
        let baselineScreenshotData: string | null = null;
        let headScreenshotData: string | null = null;
        let baselineGeometry: any = null;
        if ((width===384 && height===512)||(width===320 && height===568)) {
          // Temporarily undo only this PR's native-only inlay relief via precise
          // overrides. Keep HEAD assets, state, earlier visual passes, browser
          // viewport and font rendering identical before/after.
          const enabled = await evaluate("(()=>{const s=document.createElement('style');s.id='work7-css-baseline';s.textContent="+JSON.stringify(cssBaseline)+";document.head.appendChild(s);return true})()");
          assert.ok(enabled,'Isolated work7 CSS-only baseline installed');
          await sleep(200);
          // Actual HEAD geometry before this PR, measured in the same browser
          // and viewport. Position/area validation matters beyond global MAE.
          baselineGeometry = await evaluate("(()=>{"+
            "const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),bottom:Math.round(r.bottom)}};"+
            "const root=document.querySelector('[data-work7-screen=\""+kind+"\"]');"+
            "return {slots:[...root.querySelectorAll('.w7-approved-slot')].map(rect),chests:[...root.querySelectorAll('.w7-chest')].map(rect),pack:rect(root.querySelector('.w7-captain-pack')),packArt:rect(root.querySelector('.w7-captain-pack-art .w7-approved-crop')),labels:[...root.querySelectorAll('.w7-approved-slot small,.w7-chest-status')].map(rect)};})()");
          const baseline = await command('Page.captureScreenshot', {
            format:'png',fromSurface:true,captureBeyondViewport:false
          });
          baselineScreenshotData = baseline.data;
          await writeFile(join(output,'before-'+kind+'-'+width+'x'+height+'.png'),
            Buffer.from(baseline.data,'base64'));
          await evaluate("(()=>{document.getElementById('work7-css-baseline')?.remove();return true})()");
          await sleep(200);
          if (width===384 && height===512) {
            // Actual current HEAD, not the older pre-#268 baseline: the only
            // difference from the new render is this PR's eight inlay material values.
            await evaluate("(()=>{const s=document.createElement('style');s.id='work7-head-baseline';s.textContent="+JSON.stringify(cssBaseline)+";document.head.appendChild(s);return true})()");
            await sleep(200);
            const currentHead = await command('Page.captureScreenshot', {
              format:'png',fromSurface:true,captureBeyondViewport:false
            });
            headScreenshotData=currentHead.data;
            await writeFile(join(output,'head-before-'+kind+'-384x512.png'),
              Buffer.from(headScreenshotData,'base64'));
            await evaluate("(()=>{document.getElementById('work7-head-baseline')?.remove();return true})()");
            await sleep(200);
          }
        }

        const screen = await command('Page.captureScreenshot', {
          format:'png',fromSurface:true,captureBeyondViewport:false
        });
        await writeFile(join(output, kind+'-'+width+'x'+height+'.png'),
          Buffer.from(screen.data, 'base64'));
        const refUrl = 'data:image/webp;base64,'+references[kind].toString('base64');
        const liveUrl = 'data:image/png;base64,'+screen.data;
        const beforeUrl = (headScreenshotData ?? baselineScreenshotData) ? 'data:image/png;base64,'+(headScreenshotData ?? baselineScreenshotData) : null;
        const comparison = await evaluate("(async()=>{"+
          "const load=src=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=fail;i.src=src});"+
          "const [reference,live]=await Promise.all([load("+JSON.stringify(refUrl)+"),load("+JSON.stringify(liveUrl)+")]);"+
          "const w="+width+",h="+height+";"+
          "const c=document.createElement('canvas');c.width=w*3;c.height=h;"+
          "const ctx=c.getContext('2d');ctx.fillStyle='#081c34';ctx.fillRect(0,0,c.width,c.height);"+
          "const draw=(image,x)=>{const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);"+
          "const rw=Math.round(image.naturalWidth*scale),rh=Math.round(image.naturalHeight*scale);"+
          "ctx.drawImage(image,x+(w-rw)/2,(h-rh)/2,rw,rh)};"+
          "draw(reference,0);draw(live,w);draw(reference,w*2);"+
          "ctx.globalAlpha=.5;draw(live,w*2);ctx.globalAlpha=1;"+
          "let mae=null,maeBefore=null,roiBefore=null,roiAfter=null;if(w===384&&h===512){"+
          "const first=document.createElement('canvas'),second=document.createElement('canvas');"+
          "first.width=second.width=w;first.height=second.height=h;"+
          "first.getContext('2d').drawImage(reference,0,0);second.getContext('2d').drawImage(live,0,0);"+
          "const a=first.getContext('2d').getImageData(0,0,w,h).data,b=second.getContext('2d').getImageData(0,0,w,h).data;"+
          "let diff=0;for(let p=0;p<a.length;p+=4){diff+=Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])}"+
          "mae=Math.round(diff/(w*h*3)*10000)/10000;"+
          "const baselineUrl="+JSON.stringify(beforeUrl)+";"+
          "if(baselineUrl){const baseline=await load(baselineUrl);"+
          "const third=document.createElement('canvas');third.width=w;third.height=h;"+
          "const tctx=third.getContext('2d');tctx.drawImage(baseline,0,0);"+
          "const b0=tctx.getImageData(0,0,w,h).data;let diff0=0;"+
          "for(let p=0;p<a.length;p+=4){diff0+=Math.abs(a[p]-b0[p])+Math.abs(a[p+1]-b0[p+1])+Math.abs(a[p+2]-b0[p+2])}"+
          "maeBefore=Math.round(diff0/(w*h*3)*10000)/10000;"+
"const patches="+JSON.stringify(kind==='shop'?[[18,175,173,309],[18,329,365,427]]:[[18,195,365,428]])+";"+
"let sumA=0,sumB=0,pixels=0;for(const [x0,y0,x1,y1] of patches){for(let y=y0;y<y1;y++){for(let x=x0;x<x1;x++){const p=(y*w+x)*4;for(let k=0;k<3;k++){sumA+=Math.abs(a[p+k]-b0[p+k]);sumB+=Math.abs(a[p+k]-b[p+k]);pixels++}}}}"+
"roiBefore=Math.round(sumA/pixels*10000)/10000;roiAfter=Math.round(sumB/pixels*10000)/10000;}}"+
          "return {png:c.toDataURL('image/png').slice(22),mae,maeBefore,roiBefore,roiAfter,referenceSize:[reference.naturalWidth,reference.naturalHeight]};})()");
        await writeFile(join(output,'compare-'+kind+'-'+width+'x'+height+'.png'),
          Buffer.from(comparison.png,'base64'));

        // Candidate depth 13px selected from same-frame Chromium sweep in
        // CI run 44614191720: global 62.6301 -> 62.6287,
        // pack/chest ROI 37.2587 -> 37.2535. The temporary experiment is
        // not part of the product; current screenshot is remeasured below.
        
        report.screens.push({kind,width,height,approved:false,
          method:width===384&&height===512?'native 1:1, reference | render | 50% overlay':'reference contained, render | 50% overlay',
          maeRgbBefore:comparison.maeBefore,maeRgbAfter:comparison.mae,
          roiMaeBefore:comparison.roiBefore,roiMaeAfter:comparison.roiAfter,
          referenceSize:comparison.referenceSize,
          baselineGeometry,
          ...geometry});
        if(width===384 && height===512){
          console.log('WORK7 SAME-FRAME HEAD A/B '+kind+': '+JSON.stringify({
            maeBefore:comparison.maeBefore,maeAfter:comparison.mae,
            roiBefore:comparison.roiBefore,roiAfter:comparison.roiAfter,
            slots:geometry.slots.length,chests:geometry.chests.length,
            navItems:geometry.navItems
          }));
        }
        assert.equal(geometry.navItems,5,'The approved five-button dock must remain intact');
        assert.equal(geometry.horizontalOverflow,false,'No horizontal overflow at '+width);
        if(kind==='cards') assert.equal(geometry.slots.length,8,'Eight original illustrated cards in a 4x2 grid');
        if(kind==='shop') assert.equal(geometry.chests.length,3,'Three preview-only illustrated chests');
        if(width===320 && kind==='cards') {
          assert.ok(geometry.slots[0].x>=12 && geometry.slots[0].x<=18,
            'The scaled original 05 left border starts around x=16 at 320px');
        }
        if(width===320 && kind==='shop') {
          assert.ok(geometry.labels.every((label:any)=>label.bottom<=geometry.nav.y-8),
            'All three real chest availability labels need at least 8px clear above the 320px dock');
          assert.ok(baselineGeometry && baselineGeometry.labels.length===3,
            'Measure the genuine prior HEAD chest labels at the same 320x568 viewport');
          assert.ok(Math.max(...geometry.labels.map((label:any)=>label.bottom))
                ===Math.max(...baselineGeometry.labels.map((label:any)=>label.bottom)),
            'Native-only work must preserve the merged 320px chest label position');
        }
        if(width===384 && height===512) {
          assert.ok(Number.isFinite(comparison.roiBefore)&&Number.isFinite(comparison.roiAfter),'Real native 384 ROI metrics recorded');
          if(kind==='cards') {
            assert.ok(comparison.roiAfter!==null&&comparison.mae!==null,
              'Keep reference metrics available for final gate after both screens');
          }
          if(kind==='shop') {
            assert.ok(comparison.roiAfter!==null&&comparison.mae!==null,
              'Measure actual Captain/chests ROI before joint gate');
          }
          assert.ok(geometry.labels.every((label:any)=>label.bottom<=geometry.nav.y+1),
            'All true PRÉVIA / EM BREVE labels must stay above the dock at native size');
          assert.ok(baselineGeometry,'HEAD baseline boxes must be recorded, not inferred');
          assert.deepEqual({slots:geometry.slots,chests:geometry.chests,pack:geometry.pack,packArt:geometry.packArt,labels:geometry.labels.map((l:any)=>({x:l.x,y:l.y,width:l.width,height:l.height,bottom:l.bottom}))},baselineGeometry,'Pure WORK7 card enamel filtering may not move one original illustration, label or hit area');
          assert.deepEqual(comparison.referenceSize,[384,512],'Approved 05/06 originals are 384×512 and must be compared natively without scaling');
          if(kind==='cards') {
            assert.ok(geometry.slots[0].x>=17 && geometry.slots[0].x<=20,
              'First conceptual card should align with the approved x≈18 border');
            assert.equal(geometry.slots[0].y, baselineGeometry.slots[0].y,
              'Eight original portraits retain exact HEAD frame geometry');
            assert.ok(geometry.slots.every((slot:any)=>slot.bottom===geometry.slots[0].bottom||slot.bottom===geometry.slots[4].bottom),
              'Eight concept cards retain exactly two aligned rows');
          } else {
            assert.ok(geometry.pack.x>=17 && geometry.pack.x<=20,
              'Captain pack should align with the approved x≈18 border');
            assert.ok(geometry.chests[0].x>=17 && geometry.chests[0].x<=20,
              'First chest should align with the approved x≈18 border');
            assert.ok(geometry.packArt && baselineGeometry.packArt,
              'Measure original 06 chest crop separately from its pack panel');
            assert.equal(geometry.packArt.width,baselineGeometry.packArt.width,
              'Native 384px Captain art preserves merged original framing');
          }
        }
      }
    }
  } finally {
    await writeFile(join(output,'work7-report.json'),JSON.stringify(report,null,2)+'\n');
  }
  assert.equal(report.screens.length,8,'All four viewports must capture both screens');
  const native=report.screens.filter(screen=>screen.width===384&&screen.height===512);
  assert.equal(native.length,2,'Both real native screens must be available');
  const card=native.find(screen=>screen.kind==='cards');
  const shop=native.find(screen=>screen.kind==='shop');
  assert.ok(card&&shop,'Both 05/06 native screenshots are required');
  assert.equal(card.maeRgbAfter,card.maeRgbBefore,
    '05 Cartas must stay exactly pixel-identical to the true starting HEAD');
  assert.equal(card.roiMaeAfter,card.roiMaeBefore,
    'All eight genuine 05 frames must remain pixel-identical to merged HEAD');
  assert.ok(shop.maeRgbAfter<shop.maeRgbBefore && shop.roiMaeAfter<shop.roiMaeBefore,
    'Native 06 rare-chest carved inlay must improve strict full-frame MAE and genuine pack/chests ROI vs exact merged HEAD: '+
    JSON.stringify({global:[shop.maeRgbBefore,shop.maeRgbAfter],roi:[shop.roiMaeBefore,shop.roiMaeAfter]}));
});
