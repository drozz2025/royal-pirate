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
  await mkdir(output, { recursive: true });
  // Vite dev does not serve approved WEBP references outside its source root.
  // Build exactly as production before capturing; otherwise illustrations
  // falsely appear as empty dark cards/chests in QA screenshots.
  const productionBuild = spawnSync('npm',
    ['run', 'build', '--', '--base=/royal-pirate/'],
    { cwd:process.cwd(),encoding:'utf8',timeout:120_000,maxBuffer:10_000_000 });
  assert.equal(productionBuild.status,0,
    'Production assets required for real Chromium QA: ' +
      (productionBuild.stderr || productionBuild.stdout).slice(-3000));
  const cssText = (await readFile(join(process.cwd(),'src','work7-cards-shop.css'))).toString();
  const marker = '/* WORK7 / #104 — native 05/06 composition: pack silhouette + 320px framing, 17 Nov 04h. */';
  assert.ok(cssText.includes(marker),'WORK7 local composition marker exists');
  // Undo solely this PR while keeping every merged HEAD change (#190–#252).
  // The same Chromium session, true 384x512 viewport and real assets measure
  // before/after, rather than comparing against a stale old PR.
  const cssBaseline = `
    /* Restore the exact already-merged #257 transform at 384x512:
       comparison must isolate THIS PR, not incorrectly undo #257. */
    @media (min-width:355px) and (max-width:430px){
      .w7-screen[data-work7-screen="shop"] .w7-captain-pack-art .w7-approved-crop{
        transform:translate(-2px,5px) scale(1.07)!important;
      }
    }`;
  const server = spawn(join(process.cwd(), 'node_modules', '.bin', 'vite'),
    ['preview', '--host', '127.0.0.1', '--port', '4287', '--strictPort', '--base=/royal-pirate/'],
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
    '--remote-debugging-port=9337', '--user-data-dir='+temp, 'about:blank'
  ], { stdio: 'ignore' });
  let target: any;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (browser.exitCode !== null) throw new Error('Chromium stopped before CDP connection');
    try {
      const response = await fetch('http://127.0.0.1:9337/json/list', { signal: AbortSignal.timeout(600) });
      if (response.ok) {
        const pages = await response.json() as Array<{type:string;webSocketDebuggerUrl:string}>;
        target = pages.find(page => page.type === 'page');
        if (target) break;
      }
    } catch { /* browser is starting */ }
    await sleep(150);
  }
  assert.ok(target, 'A real Chromium page must be available');
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
    for (let n=0;n<75;n++) {
      if (await evaluate(expression)) return;
      await sleep(120);
    }
    throw new Error('Timed out waiting for React screen: '+expression);
  };
  await command('Page.enable');
  await command('Runtime.enable');

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
        const clicked = await evaluate(
          "(()=>{const tab=document.querySelector('.harbour-screen .harbour-nav-item:nth-child("+tab+")');if(!tab)return false;tab.click();return true})()");
        assert.ok(clicked, 'Open '+kind+' through actual Porto navigation');
        await waitFor("!!document.querySelector('[data-work7-screen=\""+kind+"\"]')");
        // A nonempty crop element is insufficient: all 8 + 4 image URLs must
        // actually decode on the production build before screenshots count.
        await waitFor("(()=>{const images=[...document.querySelectorAll('[data-work7-screen=\""+kind+"\"] .w7-approved-crop img')];return images.length==="+(kind==='cards'?8:4)+"&&images.every(i=>i.complete&&i.naturalWidth>0)})()");
        await evaluate('document.fonts.ready.then(()=>true)');
        await sleep(350);

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
        let baselineGeometry: any = null;
        if (width===384 && height===512) {
          // Temporarily undo only this PR's four CSS properties via precise
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
            "return {slots:[...root.querySelectorAll('.w7-approved-slot')].map(rect),chests:[...root.querySelectorAll('.w7-chest')].map(rect),pack:rect(root.querySelector('.w7-captain-pack')),packArt:rect(root.querySelector('.w7-captain-pack-art .w7-approved-crop'))};})()");
          const baseline = await command('Page.captureScreenshot', {
            format:'png',fromSurface:true,captureBeyondViewport:false
          });
          baselineScreenshotData = baseline.data;
          await writeFile(join(output,'before-'+kind+'-384x512.png'),
            Buffer.from(baseline.data,'base64'));
          await evaluate("(()=>{document.getElementById('work7-css-baseline')?.remove();return true})()");
          await sleep(200);
        }
        const screen = await command('Page.captureScreenshot', {
          format:'png',fromSurface:true,captureBeyondViewport:false
        });
        await writeFile(join(output, kind+'-'+width+'x'+height+'.png'),
          Buffer.from(screen.data, 'base64'));
        const refUrl = 'data:image/webp;base64,'+references[kind].toString('base64');
        const liveUrl = 'data:image/png;base64,'+screen.data;
        const beforeUrl = baselineScreenshotData ? 'data:image/png;base64,'+baselineScreenshotData : null;
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
          "let mae=null,maeBefore=null;if(w===384&&h===512){"+
          "const first=document.createElement('canvas'),second=document.createElement('canvas');"+
          "first.width=second.width=w;first.height=second.height=h;"+
          "first.getContext('2d').drawImage(reference,0,0);second.getContext('2d').drawImage(live,0,0);"+
          "const a=first.getContext('2d').getImageData(0,0,w,h).data,b=second.getContext('2d').getImageData(0,0,w,h).data;"+
          "let diff=0;for(let p=0;p<a.length;p+=4){diff+=Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])}"+
          "mae=Math.round(diff/(w*h*3)*100)/100;"+
          "const baselineUrl="+JSON.stringify(beforeUrl)+";"+
          "if(baselineUrl){const baseline=await load(baselineUrl);"+
          "const third=document.createElement('canvas');third.width=w;third.height=h;"+
          "const tctx=third.getContext('2d');tctx.drawImage(baseline,0,0);"+
          "const b0=tctx.getImageData(0,0,w,h).data;let diff0=0;"+
          "for(let p=0;p<a.length;p+=4){diff0+=Math.abs(a[p]-b0[p])+Math.abs(a[p+1]-b0[p+1])+Math.abs(a[p+2]-b0[p+2])}"+
          "maeBefore=Math.round(diff0/(w*h*3)*100)/100;}}"+
          "return {png:c.toDataURL('image/png').slice(22),mae,maeBefore,referenceSize:[reference.naturalWidth,reference.naturalHeight]};})()");
        await writeFile(join(output,'compare-'+kind+'-'+width+'x'+height+'.png'),
          Buffer.from(comparison.png,'base64'));
        report.screens.push({kind,width,height,approved:false,
          method:width===384&&height===512?'native 1:1, reference | render | 50% overlay':'reference contained, render | 50% overlay',
          maeRgbBefore:comparison.maeBefore,maeRgbAfter:comparison.mae,
          referenceSize:comparison.referenceSize,
          baselineGeometry,
          ...geometry});
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
        }
        if(width===384 && height===512) {
          assert.ok(geometry.labels.every((label:any)=>label.bottom<=geometry.nav.y+1),
            'All true PRÉVIA / EM BREVE labels must stay above the dock at native size');
          assert.ok(baselineGeometry,'HEAD baseline boxes must be recorded, not inferred');
          if(kind==='cards') {
            assert.ok(geometry.slots[0].x>=17 && geometry.slots[0].x<=20,
              'First conceptual card should align with the approved x≈18 border');
            assert.ok(geometry.slots.every((slot:any)=>slot.bottom===geometry.slots[0].bottom||slot.bottom===geometry.slots[4].bottom),
              'Eight concept cards retain exactly two aligned rows');
          } else {
            assert.ok(geometry.pack.x>=17 && geometry.pack.x<=20,
              'Captain pack should align with the approved x≈18 border');
            assert.ok(geometry.chests[0].x>=17 && geometry.chests[0].x<=20,
              'First chest should align with the approved x≈18 border');
            assert.ok(geometry.packArt && baselineGeometry.packArt,
              'Measure original 06 chest crop separately from its pack panel');
            assert.ok(geometry.packArt.width>=baselineGeometry.packArt.width+4,
              'Original 06 treasure artwork must be visibly enlarged vs HEAD');
          }
        }
      }
    }
  } finally {
    await writeFile(join(output,'work7-report.json'),JSON.stringify(report,null,2)+'\n');
  }
  assert.equal(report.screens.length,8,'All four viewports must capture both screens');
});
