/*
 * WORK0 #104 — real GitHub BASE-SHA versus HEAD-SHA screenshot capture.
 * Both separately built apps run through the same actual browser paths.
 * This is NOT the retired ?work6ab=baseline|candidate switch within one build.
 * GPU waves and animation timing may differ: differences are review evidence,
 * never an automatic artistic approval.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('work0-qa');
const variants = [
  ['base', process.env.BASE_URL || 'http://127.0.0.1:5173/royal-pirate/'],
  ['head', process.env.HEAD_URL || 'http://127.0.0.1:5174/royal-pirate/']
];
const viewports = [[384,512],[390,844],[320,568]];
await mkdir(root, {recursive:true});
const browser = await chromium.launch({
  headless:true, executablePath:process.env.CHROME_BIN||undefined,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
        '--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const report = {kind:'real-separate-base-and-head-builds',
  source: 'assets/design-approved/01-porto.webp through 08-ranking-perfil.webp',
  approved:false, pairs:[],
  caution:'WebGL/ocean are animated; a changed pixel is not automatically a code-caused change.'};
try {
  for (const [width,height] of viewports) {
    for (const [variant,url] of variants) {
      const context = await browser.newContext({
        viewport:{width,height},deviceScaleFactor:1,
        reducedMotion:'reduce',hasTouch:true,isMobile:true
      });
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('.harbour-battle-button').waitFor({state:'visible',timeout:30000});
      const waitPaint=async()=>{
        await page.evaluate(async()=>{
          const images=Array.from(document.querySelectorAll('img')).filter(img=>{
            const r=img.getBoundingClientRect();
            return r.width>0 && r.height>0;
          });
          await Promise.all(images.map(async img=>{
            if(!img.complete||!img.naturalWidth)throw Error('Source image not loaded: '+img.src);
            await img.decode();
          }));
          await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
        });
        await page.waitForTimeout(350);
      };
      const record=async(screen)=>{
        await waitPaint();
        const geometry=await page.evaluate(()=>{
          const app=document.querySelector('.app');
          const dock=document.querySelector('.app-sheet > .harbour-nav')||
            document.querySelector('.harbour-screen .harbour-nav');
          const r=app?.getBoundingClientRect();
          const nav=dock?.getBoundingClientRect();
          return {width:innerWidth,height:innerHeight,
            appBottom:r?.bottom??null,dockBottom:nav?.bottom??null,
            dockButtons:dock?.querySelectorAll('button').length??null,
            scrollWidth:document.documentElement.scrollWidth,
            scrollHeight:document.documentElement.scrollHeight,
            shots:window.__royalShotFrames?.length??0};
        });
        if(geometry.scrollWidth>width+2)
          throw Error(screen+' horizontal overflow '+JSON.stringify(geometry));
        if(screen!=='battle' && screen!=='porto'){
          if(geometry.dockButtons!==5||!geometry.dockBottom||geometry.dockBottom>height+2)
            throw Error(screen+' five-button dock clipped: '+JSON.stringify(geometry));
        }
        const name=variant+'-'+screen+'-'+width+'x'+height+'.png';
        await page.screenshot({path:resolve(root,name),animations:'disabled'});
        report.pairs.push({variant,screen,width,height,file:name,geometry});
      };
      await waitPaint();
      await record('porto');
      await page.locator('.harbour-nav:not(.app-dock-porto) button').filter({hasText:'FROTA'}).click();
      await page.locator('.app-sheet').waitFor({state:'visible'});
      await record('frota');
      await page.locator('.w4-action-pair button').filter({hasText:'ABRIR MELHORIAS'}).click();
      await record('forja');
      await page.locator('.app-dock-porto button').filter({hasText:'CARTAS'}).click();
      await record('cartas');
      await page.locator('.app-dock-porto button').filter({hasText:'LOJA'}).click();
      await record('loja');
      await page.locator('.app-dock-porto button').filter({hasText:'PORTO'}).click();
      await page.locator('.harbour-flank-right button').filter({hasText:'MISSÕES'}).click();
      await record('missoes');
      await page.locator('.app-dock-porto button').filter({hasText:'RANKING'}).click();
      await record('ranking');
      await page.locator('.app-dock-porto button').filter({hasText:'PORTO'}).click();
      await page.locator('.harbour-battle-button').click();
      await page.locator('.battle-hud').waitFor({state:'visible',timeout:20000});
      await page.locator('.fire-button').waitFor({state:'visible',timeout:20000});
      await page.waitForTimeout(1300);
      await record('battle');
      if(errors.length)throw Error('Browser errors '+variant+' '+width+'x'+height+': '+errors.join('; '));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(resolve(root,'capture-manifest.json'),JSON.stringify(report,null,2));
console.log('WORK0_TRUE_BASE_HEAD_CAPTURES '+report.pairs.length+
  ' approved:false, separate checkouts, 384x512/390x844/320x568');
