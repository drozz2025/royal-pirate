import * as T from 'three';
import type { ShipClass } from './ship-modules';

/**
 * Original sewn flag insignia for the TWO existing harbour preview banners.
 * No flag texture edits, scene economy, hitboxes or battle rig modifications.
 * Double-faced triangle ribbons remain legible on high-DPI mobile WebGL.
 */
export type PreviewFlagModule = 'flag-navy'|'flag-red'|'flag-black';
type Point = readonly [number,number];
const CLASSES:readonly ShipClass[]=['scout','fighter','warship'];
const FLAGS:readonly PreviewFlagModule[]=['flag-navy','flag-red','flag-black'];
const THREAD:Record<PreviewFlagModule,string>={
 'flag-navy':'#f2d99e',
 'flag-red':'#ffe0ad',
 'flag-black':'#e4b960'
};

export function createPreviewFlagHeraldry(
 shipClass:ShipClass,flagModule:PreviewFlagModule
):T.Mesh {
 if(!CLASSES.includes(shipClass))throw new Error('Unknown preview flag class');
 if(!FLAGS.includes(flagModule))throw new Error('Unknown preview flag module');

 const points:number[]=[];
 let embroideredRuns=0;
 // makeShip() places 1.4 x 0.8 flags at (0.7,h+0.6,z), one on
 // each of the existing masts. The flag cloth stays owned by the rig.
 const flags= [[.7,8.9,.9],[.7,7.7,-2.1]] as const;
 function run(a:Point,b:Point,width:number){
  const dx=(b[0]-a[0])*1.4,dy=(b[1]-a[1])*.8;
  const length=Math.hypot(dx,dy);
  if(length<1e-6)return;
  const nx=-dy/length*width/2/1.4,ny=dx/length*width/2/.8;
  for(const [cx,cy,cz] of flags){
   // Both physical cloth faces, separated slightly from the original plane.
   for(const face of [-1,1]){
    const z=cz+face*.036;
    const vertex=(u:number,v:number):[number,number,number]=>[cx+u*1.4,cy+v*.8,z];
    const p=vertex(a[0]-nx,a[1]-ny),q=vertex(a[0]+nx,a[1]+ny);
    const r=vertex(b[0]-nx,b[1]-ny),s=vertex(b[0]+nx,b[1]+ny);
    points.push(...p,...q,...r,...q,...s,...r);
   }
  }
  embroideredRuns++;
 }
 function path(vertices:readonly Point[],width:number){
  for(let i=0;i<vertices.length-1;i++)run(vertices[i],vertices[i+1],width);
 }
 // Maritime stitched border common to every flag (never a 2D UI element).
 path([[-.42,-.35],[.42,-.35],[.42,.35],[-.42,.35],[-.42,-.35]],.018);
 if(shipClass==='scout'){
  // Fast scout: compass rose with four long points, a small centre diamond.
  const ring:Point[]=Array.from({length:13},(_,i)=>{
   const t=2*Math.PI*i/12;return [Math.cos(t)*.235,Math.sin(t)*.265];
  });
  path(ring,.025);
  path([[0,-.33],[0,.33]],.039);
  path([[-.28,0],[.28,0]],.035);
  path([[-.095,0],[0,.145],[.095,0],[0,-.145],[-.095,0]],.033);
 }else if(shipClass==='fighter'){
  // Broadside frigate: two curved cutlasses, crossguards and a sharp shield.
  path([[-.28,-.25],[-.13,-.08],[.09,.13],[.27,.30]],.058);
  path([[.28,-.25],[.13,-.07],[-.09,.14],[-.27,.30]],.058);
  path([[-.31,-.13],[-.19,-.25],[-.08,-.27]],.034);
  path([[.31,-.13],[.19,-.25],[.08,-.27]],.034);
  path([[-.18,.07],[0,.30],[.18,.07],[0,-.24],[-.18,.07]],.025);
 }else{
  // Royal warship: five-point ceremonial crown, base rails and three jewels.
  path([[-.31,-.21],[-.33,.14],[-.18,.02],[-.10,.29],[0,.08],
   [.10,.29],[.18,.02],[.33,.14],[.31,-.21],[-.31,-.21]],.058);
  path([[-.30,-.10],[.30,-.10]],.042);
  path([[-.30,-.24],[.30,-.24]],.036);
  for(const x of [-.19,0,.19])
   path([[x-.055,-.08],[x,.005],[x+.055,-.08],[x,-.16],[x-.055,-.08]],.022);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({
  color:THREAD[flagModule],roughness:.73,metalness:.08,side:T.DoubleSide
 });
 const mesh=new T.Mesh(geometry,material);
 mesh.name='shipyard-'+shipClass+'-'+flagModule+'-flag-heraldry';
 mesh.castShadow=false;
 mesh.receiveShadow=false;
 mesh.userData={
  previewOnly:true,shipClass,flagModule,drawCallObjects:1,
  embroideredRuns,triangles:points.length/9
 };
 return mesh;
}
