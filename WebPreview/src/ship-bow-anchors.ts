import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShipClass } from './ship-modules';
import type { PreviewHullModule } from './ship-hull-relief';

/**
 * Original three-dimensional bow anchors for the isolated fleet editor.
 * Two merged PBR meshes cover the forging and the gilt fittings. Nothing here
 * affects ship physics, hitboxes, weapons, player level, or ownership.
 */
export function createPreviewBowAnchors(shipClass: ShipClass, hullModule: PreviewHullModule): T.Group {
 const profiles: Record<ShipClass, { count: number; size: number; links: number; position: number }> = {
  scout: { count: 1, size: .69, links: 3, position: 3.94 },
  fighter: { count: 2, size: .87, links: 4, position: 3.70 },
  warship: { count: 2, size: 1.05, links: 5, position: 3.76 }
 };
 const profile=profiles[shipClass];
 if(!profile)throw new Error('Unknown ship class for bow anchors');
 if(!['hull-oak','hull-ironwood','hull-royal'].includes(hullModule))
  throw new Error('Unknown hull module for bow anchors');

 const forged:T.BufferGeometry[]=[], gilded:T.BufferGeometry[]=[];
 const reinforced=hullModule!=='hull-oak', royal=hullModule==='hull-royal';
 function place(bin:T.BufferGeometry[],g:T.BufferGeometry,x:number,y:number,z:number,
  rotation?:T.Euler):void{
  if(rotation)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(rotation));
  g.translate(x,y,z);bin.push(g);
 }
 function rod(bin:T.BufferGeometry[],a:T.Vector3,b:T.Vector3,r:number,sides=7):void{
  const direction=b.clone().sub(a),length=direction.length();
  const geo=new T.CylinderGeometry(r*.88,r,length,sides);
  const mid=a.clone().add(b).multiplyScalar(.5);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
  geo.applyMatrix4(new T.Matrix4().compose(mid,q,new T.Vector3(1,1,1)));bin.push(geo);
 }
 const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 // Port and starboard are independent sculptures; the small scout carries
 // one starboard anchor, the frigate/flagship carry a matched pair.
 const sides=profile.count===1?[1]:[-1,1];
 for(const side of sides){
  const s=profile.size, x=side*(shipClass==='warship'?1.64:1.31);
  const z=profile.position, top=2.27, bottom=top-1.27*s;
  const anchorX=x+side*.16;
  // Vertical shank, cross-stock, curved flukes and facing palms.
  rod(forged,V(anchorX,bottom+.17*s,z),V(anchorX,top,z),.083*s);
  rod(forged,V(anchorX,top-.26*s,z-.53*s),V(anchorX,top-.26*s,z+.53*s),.066*s);
  for(const direction of [-1,1]){
   const tip=V(anchorX,bottom+.50*s,z+direction*.59*s);
   const elbow=V(anchorX,bottom,z+direction*.39*s);
   rod(forged,V(anchorX,bottom+.18*s,z),elbow,.075*s);
   rod(forged,elbow,tip,.069*s);
   const fluke=new T.ConeGeometry(.175*s,.27*s,5);
   fluke.applyMatrix4(new T.Matrix4().makeRotationX(direction*Math.PI/3));
   place(forged,fluke,tip.x,tip.y,tip.z);
  }
  // The ring is a true torus, viewed broadside; the chain rises from it to
  // the bow hawse fitting and is not a flat projected texture.
  place(forged,new T.TorusGeometry(.17*s,.048*s,5,12),anchorX,top+.12*s,z,
   new T.Euler(0,Math.PI/2,0));
  for(let i=0;i<profile.links;i++){
   const t=i/(profile.links-1);
   place(forged,new T.TorusGeometry(.12*s,.032*s,4,9),
    anchorX-side*.05*t,top+.31*s+i*.21*s,z-.11*i*s,
    new T.Euler((i%2)*Math.PI/2,Math.PI/2,0));
  }
  // Hawse opening and ornamental bolted plate visible from port/starboard.
  place(gilded,new T.TorusGeometry(.20*s,.053*s,5,12),
   x,2.76, z-.40*s,new T.Euler(0,Math.PI/2,0));
  for(const dy of [-.25,.25])for(const dz of [-.25,.25]){
   place(gilded,new T.SphereGeometry(.055*s,6,4),
    x+side*.018,2.76+dy*s,z-.40*s+dz*s);
  }
  if(reinforced){
   rod(gilded,V(anchorX,top-.45*s,z-.42*s),V(anchorX,top-.45*s,z+.42*s),.046*s,6);
   place(gilded,new T.TorusGeometry(.10*s,.032*s,4,9),
    anchorX,top-.58*s,z,new T.Euler(0,Math.PI/2,0));
  }
  if(royal){
   for(const direction of [-1,1]){
    const tip=V(anchorX,bottom+.54*s,z+direction*.59*s);
    place(gilded,new T.ConeGeometry(.082*s,.25*s,6),
     tip.x,tip.y+.11*s,tip.z);
   }
   place(gilded,new T.SphereGeometry(.115*s,7,5),anchorX,top+.04*s,z);
  }
 }
 const group=new T.Group();
 group.name='shipyard-'+shipClass+'-'+hullModule+'-bow-anchors';
 const bins:readonly [T.BufferGeometry[],string,string,number][]=[
  [forged,'forged-anchor',royal?'#49566a':'#536575',.73],
  [gilded,'hawse-fittings',royal?'#efc36a':reinforced?'#c39c65':'#a27851',.67]
 ];
 for(const [parts,name,color,metalness] of bins){
  const combined=mergeGeometries(parts,false);
  for(const geo of parts)geo.dispose();
  if(!combined)throw new Error('Cannot batch bow-anchor geometry');
  combined.computeBoundingSphere();
  const mesh=new T.Mesh(combined,new T.MeshStandardMaterial({
   color,metalness,roughness:royal?.29:.44
  }));
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 group.userData={previewOnly:true,shipClass,hullModule,
  anchors:profile.count,chainLinks:profile.links*profile.count,
  drawCallObjects:group.children.length};
 return group;
}
