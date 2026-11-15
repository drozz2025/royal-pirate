/**
 * Generate royalty-free ROYAL PIRATE icon PNGs using Node built-ins.
 * No npm, network or image library dependency; run before Vite build/dev.
 */
import {deflateSync} from 'node:zlib';
import {Buffer} from 'node:buffer';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

function crc32(data){
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
  const label=Buffer.from(type,'ascii'),len=Buffer.alloc(4),sum=Buffer.alloc(4);
  len.writeUInt32BE(data.length,0);
  sum.writeUInt32BE(crc32(Buffer.concat([label,data])),0);
  return Buffer.concat([len,label,data,sum]);
}
/** Original navy/gold frigate emblem with mask-safe internal margins. */
export function renderIconPng(size){
  if(size!==192&&size!==512)throw new RangeError('Only 192 and 512 px icons are supported.');
  const stride=1+size*4,pixels=Buffer.alloc(stride*size);
  const blue=[7,27,57],gold=[242,195,105],sail=[255,237,188],copper=[178,111,62];
  for(let y=0;y<size;y++){
    const row=y*stride;pixels[row]=0;
    for(let x=0;x<size;x++){
      const u=(x+.5)/size,v=(y+.5)/size,dx=u-.5,dy=v-.5,r=Math.hypot(dx,dy);
      let c=blue;
      if(r>.414&&r<.43)c=gold;
      if(r>.37&&r<.39)c=copper;
      // A rigged mast, two sails and the hull stay within the mask-safe circle.
      if(v>.23&&v<.7&&Math.abs(u-.51)<.009)c=gold;
      const sailHeight=(v-.29)/.34;
      if(sailHeight>=0&&sailHeight<=1){
        if(u<.49&&u>(.49-.24*sailHeight))c=sail;
        if(u>.532&&u<(.532+.16*sailHeight))c=copper;
      }
      const width=v<.72?.28:.28-(v-.72)*.8;
      if(v>=.67&&v<.77&&Math.abs(u-.5)<width)c=gold;
      if(v>=.76&&v<.785&&Math.abs(u-.5)<.16)c=copper;
      // Two small stylized waves.
      if(v>.805&&v<.815&&u>.31&&u<.69)c=gold;
      if(v>.83&&v<.84&&u>.40&&u<.61)c=gold;
      const i=row+1+x*4;pixels[i]=c[0];pixels[i+1]=c[1];pixels[i+2]=c[2];pixels[i+3]=255;
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(pixels,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const out=resolve(dirname(fileURLToPath(import.meta.url)),'../public');mkdirSync(out,{recursive:true});
  for(const n of [192,512]){writeFileSync(resolve(out,'icon-'+n+'.png'),renderIconPng(n));}
  console.log('ROYAL PIRATE local PNG icons generated (192, 512).');
}
