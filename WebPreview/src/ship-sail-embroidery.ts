import * as T from 'three';
import type { ShipClass } from './ship-modules';

/**
 * Original curved sail seam and embroidered insignia for the isolated 3D fleet editor.
 * One physically raised triangle-buffer for BOTH mainsails; never touches battle rig,
 * ship statistics, progression, ownership, canvas textures, or purchases.
 *
 * Coordinates match the existing cambered PlaneGeometry in ships.ts (two masts).
 */
export type PreviewSailModule = 'sails-cream'|'sails-crimson'|'sails-night';
type UV = readonly [number,number];
const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const SAILS:readonly PreviewSailModule[]=['sails-cream','sails-crimson','sails-night'];
const EMBROIDERY:Record<PreviewSailModule,string>={
 'sails-cream':'#8b6239',
 'sails-crimson':'#f5c879',
 'sails-night':'#eddbac'
};

export function createPreviewSailEmbroidery(
 shipClass:ShipClass,sailModule:PreviewSailModule
):T.Mesh {
 if(!CLASSES.includes(shipClass))throw new Error('Unknown preview sail class');
 if(!SAILS.includes(sailModule))throw new Error('Unknown preview sail module');

 const vertices:number[]=[];
 let stitchedRuns=0;
 // Triangle strips (not WebGL lines) retain a readable physical width on
 // high-density mobile screens, including iPhones with 1px line-width limits.
 function curvePoint(u:number,v:number,mastZ:number,mastH:number,width:number):[number,number,number]{
  const x=(u-.5)*width*(1-.13*Math.cos(v*Math.PI*2));
  const y=mastH-2.3+(v-.5)*3.6;
  const z=mastZ+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.8+.045;
  return [x,y,z];
 }
 function ribbon(
  from:UV,to:UV,thickness:number,mastZ:number,mastH:number,width:number
 ){
  const dx=(to[0]-from[0])*width,dy=(to[1]-from[1])*3.6;
  const length=Math.hypot(dx,dy);
  if(length<1e-6)return;
  const offsetU=-dy/length*thickness/(2*width);
  const offsetV= dx/length*thickness/(2*3.6);
  // Short connected quads follow sail billow rather than cutting through cloth.
  for(let step=0;step<6;step++){
   const t0=step/6,t1=(step+1)/6;
   const u0=from[0]+(to[0]-from[0])*t0,v0=from[1]+(to[1]-from[1])*t0;
   const u1=from[0]+(to[0]-from[0])*t1,v1=from[1]+(to[1]-from[1])*t1;
   const a=curvePoint(u0-offsetU,v0-offsetV,mastZ,mastH,width);
   const b=curvePoint(u0+offsetU,v0+offsetV,mastZ,mastH,width);
   const c=curvePoint(u1-offsetU,v1-offsetV,mastZ,mastH,width);
   const d=curvePoint(u1+offsetU,v1+offsetV,mastZ,mastH,width);
   vertices.push(...a,...b,...c,...b,...d,...c);
  }
  stitchedRuns++;
 }
 function path(points:readonly UV[],thickness:number,z:number,h:number,w:number){
  for(let i=0;i<points.length-1;i++)ribbon(points[i],points[i+1],thickness,z,h,w);
 }
 // Two existing mast stations and widths from makeShip(); the mesh is a
 // disposable child of modular-ship-accessories, not a modification to rig.
 for(const [z,h,w] of [[.9,8.3,4.5],[-2.1,7.1,3.5]] as const){
  // Original rope-coloured selvedge and transverse stitching.
  path([[.09,.88],[.91,.88]],.040,z,h,w);
  path([[.09,.12],[.91,.12]],.032,z,h,w);
  path([[.09,.12],[.09,.88]],.018,z,h,w);
  path([[.91,.12],[.91,.88]],.018,z,h,w);
  for(const v of [.29,.48,.67])path([[.13,v],[.87,v]],.012,z,h,w);

  if(shipClass==='scout'){
   // Swift asymmetric wind ribbons: thin, lightly embroidered diagonals.
   path([[.22,.20],[.60,.77]],.060,z,h,w);
   path([[.42,.20],[.80,.77]],.038,z,h,w);
  }else if(shipClass==='fighter'){
   // Broadside frigate: layered naval chevrons and a rigid centre stripe.
   path([[.20,.65],[.50,.36],[.80,.65]],.074,z,h,w);
   path([[.24,.77],[.50,.51],[.76,.77]],.035,z,h,w);
   path([[.50,.19],[.50,.84]],.024,z,h,w);
  }else{
   // Flagship-only royal diamond, crossed crest and three crown peaks.
   path([[.50,.79],[.76,.52],[.50,.23],[.24,.52],[.50,.79]],.062,z,h,w);
   path([[.30,.41],[.70,.63]],.036,z,h,w);
   path([[.30,.63],[.70,.41]],.036,z,h,w);
   path([[.34,.78],[.40,.88],[.50,.78],[.60,.88],[.66,.78]],.038,z,h,w);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({
  color:EMBROIDERY[sailModule],roughness:.68,metalness:.06,
  side:T.DoubleSide
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='shipyard-'+shipClass+'-'+sailModule+'-embroidery';
 mesh.castShadow=false;
 mesh.receiveShadow=false;
 mesh.userData={
  shipClass,sailModule,previewOnly:true,drawCallObjects:1,
  stitchedRuns,triangles:vertices.length/9
 };
 return mesh;
}
