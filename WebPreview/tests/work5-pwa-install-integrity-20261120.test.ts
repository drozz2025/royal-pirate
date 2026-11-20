/**
 * WORK 5 — independent mobile/PWA install asset integrity checks.
 * Tests only; validates local manifest, version lock and generated PNG bytes.
 * No production/Unity/UI changes and no claims of physical iPhone testing.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {renderIconPng} from '../scripts/generate-icons.mjs';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const pkg=JSON.parse(read('../package.json'));
const lock=JSON.parse(read('../package-lock.json'));
const manifest=JSON.parse(read('../public/manifest.webmanifest'));
const html=read('../index.html');
const worker=read('../public/sw.js');
const root='https://preview.example.test/royal-pirate/';

test('WORK5: install metadata, npm lock and visible release share one version',()=>{
  assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
  assert.equal(lock.name,pkg.name);
  assert.equal(lock.version,pkg.version,'package-lock release diverges from package');
  assert.equal(lock.packages[''].version,pkg.version,'npm ci root lock does not match release');
  assert.ok(html.includes('ROYAL PIRATE — v'+pkg.version+'</title>'),'browser tab shows a stale release');
  assert.ok(html.includes('>v'+pkg.version+'</span>'),'in-game version badge is stale');
  assert.ok(worker.includes("const CACHE='royal-pirate-web-v"+pkg.version+"';"),'offline cache serves another release');
  assert.match(html,/rel="manifest" href="%BASE_URL%manifest\.webmanifest"/);
  assert.match(html,/rel="apple-touch-icon" href="%BASE_URL%icon-192\.png"/);
  assert.match(html,/name="viewport"[^>]*viewport-fit=cover/);
});

test('WORK5: portrait PWA manifest icon URLs stay inside the deployed subpath',()=>{
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.orientation,'portrait-primary');
  assert.ok(manifest.name&&manifest.short_name);
  assert.equal(new URL(manifest.start_url,root+'manifest.webmanifest').href,root);
  assert.equal(new URL(manifest.scope,root+'manifest.webmanifest').href,root);
  const sizes=new Set<number>();
  for(const item of manifest.icons){
    assert.equal(item.type,'image/png','unsupported install icon encoding');
    assert.match(item.src,/^\.\/icon-(192|512)\.png$/,'icon URL escaped the app scope');
    const size=Number(item.sizes.split('x')[0]);
    assert.equal(item.sizes,size+'x'+size);
    sizes.add(size);
    const resolved=new URL(item.src,root+'manifest.webmanifest');
    assert.equal(resolved.origin,new URL(root).origin);
    assert.ok(resolved.href.startsWith(root),'install icon resolves outside /royal-pirate/');
    assert.match(item.purpose,/\bmaskable\b/,'install icon should support adaptive masks');
  }
  assert.deepEqual([...sizes].sort((a,b)=>a-b),[192,512]);
});

function crc32(bytes:Buffer):number {
  let crc=0xffffffff;
  for(const b of bytes){
    crc^=b;
    for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}

test('WORK5: generated 192/512px app icons are intact, decodable RGBA PNGs with distinct artwork',()=>{
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  for(const size of [192,512]){
    const png:Buffer=renderIconPng(size);
    assert.ok(png.length>100,'empty icon '+size);
    assert.ok(png.subarray(0,8).equals(signature),'invalid PNG signature '+size);
    let offset=8;
    const chunks=new Map<string,Buffer[]>();
    while(offset<png.length){
      assert.ok(offset+12<=png.length,'truncated PNG chunk header');
      const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
      assert.ok(offset+12+length<=png.length,'truncated '+type+' chunk');
      const payload=png.subarray(offset+8,offset+8+length);
      const expected=png.readUInt32BE(offset+8+length);
      assert.equal(crc32(png.subarray(offset+4,offset+8+length)),expected,
        'corrupt '+type+' CRC at '+size+'px');
      chunks.set(type,[...(chunks.get(type)||[]),payload]);
      offset+=12+length;
      if(type==='IEND')break;
    }
    assert.equal(offset,png.length,'unexpected trailing bytes in icon '+size);
    const ihdr=chunks.get('IHDR')?.[0];
    assert.ok(ihdr,'missing PNG image header');
    assert.equal(ihdr.readUInt32BE(0),size);
    assert.equal(ihdr.readUInt32BE(4),size);
    assert.equal(ihdr[8],8,'must use 8-bit channel values');
    assert.equal(ihdr[9],6,'must be RGBA for install compatibility');
    const compressed=chunks.get('IDAT')||[];
    assert.ok(compressed.length>0,'missing image data');
    const pixels=inflateSync(Buffer.concat(compressed));
    const stride=1+size*4;
    assert.equal(pixels.length,stride*size,'wrong decompressed icon size');
    for(let y=0;y<size;y++){
      assert.equal(pixels[y*stride],0,'unexpected PNG scanline filter');
      for(let x=0;x<size;x++)assert.equal(pixels[y*stride+1+x*4+3],255,'transparent pixel in mask-safe icon');
    }
    const rgb=(x:number,y:number)=>[...pixels.subarray(y*stride+1+x*4,y*stride+1+x*4+3)];
    assert.notDeepEqual(rgb(0,0),rgb(Math.round(size*.51),Math.round(size*.5)),
      'icon emblem is missing or flat-coloured');
  }
  assert.throws(()=>renderIconPng(1024),RangeError,'oversized install icons must be rejected');
});
