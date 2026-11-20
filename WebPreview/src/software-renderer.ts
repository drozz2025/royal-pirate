import * as T from 'three';
/** CPU Canvas compatibility renderer. Same scene/camera/simulation, reduced ocean shading.
 * Used only when WebGL2 is unavailable; never represented as a WebGL validation.
 */
type Face={ax:number;ay:number;bx:number;by:number;cx:number;cy:number;depth:number;fill:string;opacity:number;texture?:CanvasImageSource;uv?:number[]};
export class SoftwareRenderer {
 domElement=document.createElement('canvas');private ctx=this.domElement.getContext('2d',{alpha:false})!;
 outputColorSpace:T.ColorSpace=T.SRGBColorSpace;toneMapping:T.ToneMapping=T.NoToneMapping;toneMappingExposure=1;
 info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};
 private width=1;private height=1;private ratio=1;private matrix=new T.Matrix4();private normal=new T.Matrix3();
 private projected=new WeakMap<T.BufferGeometry,Float64Array>();private faces:Face[]=[];private used=0;private geometries=new Set<T.BufferGeometry>();private textures=new Set<T.Texture>();
 private sun=new T.Vector3(-.5,.8,.3).normalize();private point=new T.Vector3();
 setPixelRatio(ratio:number){this.ratio=Math.min(1,ratio);}
 setSize(w:number,h:number){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
 private screen(x:number,y:number,z:number,m:T.Matrix4){const e=m.elements,w=e[3]*x+e[7]*y+e[11]*z+e[15];return [(e[0]*x+e[4]*y+e[8]*z+e[12])/w*this.width*.5+this.width*.5, -(e[1]*x+e[5]*y+e[9]*z+e[13])/w*this.height*.5+this.height*.5,(e[2]*x+e[6]*y+e[10]*z+e[14])/w,w];}
 render(scene:T.Scene,camera:T.Camera){
  const c=this.ctx;c.setTransform(this.ratio,0,0,this.ratio,0,0);this.used=0;this.info.render.calls=0;scene.updateMatrixWorld();camera.updateMatrixWorld();
  const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const sky=c.createLinearGradient(0,0,0,this.height);sky.addColorStop(0,'#88cddd');sky.addColorStop(.5,'#b2e5e5');sky.addColorStop(1,'#0a8a9b');c.fillStyle=sky;c.fillRect(0,0,this.width,this.height);
  const horizon=Math.max(0,this.screen(0,0,-105,vp)[1]);const sea=c.createLinearGradient(0,horizon,0,this.height);sea.addColorStop(0,'#74c4ce');sea.addColorStop(.4,'#1699ab');sea.addColorStop(1,'#076b82');c.fillStyle=sea;c.fillRect(0,horizon,this.width,this.height-horizon);
  const time=performance.now()/1000;
  // Project real wave crests onto the same ocean plane, using the WebGL wave equation.
  c.lineWidth=.75;
  for(let z=-75;z<60;z+=2.4){c.beginPath();for(let x=-90;x<=90;x+=1.8){const y=Math.sin(x*.47+time*1.15)*.12+Math.sin(z*.68-time*1.3)*.08;const p=this.screen(x,y,z,vp);if(p[3]<=0)continue;const sx=p[0]+Math.sin(z*2+x*.5+time)*1.2; if(x===-90)c.moveTo(sx,p[1]);else c.lineTo(sx,p[1]);}c.strokeStyle=`rgba(155,236,231,${.10+(Math.sin(z*4)+1)*.05})`;c.stroke();}
  scene.traverseVisible(o=>{
   if(!(o instanceof T.Mesh)||o.material instanceof T.ShaderMaterial)return;
   const g=o.geometry,pos=g.attributes.position;if(!pos)return;this.geometries.add(g);this.info.render.calls++;
   const material=(Array.isArray(o.material)?o.material[0]:o.material) as T.MeshStandardMaterial;if(material.opacity===0)return;
   this.matrix.multiplyMatrices(vp,o.matrixWorld);this.normal.getNormalMatrix(o.matrixWorld);
   let projected=this.projected.get(g);if(!projected||projected.length<pos.count*4){projected=new Float64Array(pos.count*4);this.projected.set(g,projected);}
   const e=this.matrix.elements;
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),w=e[3]*x+e[7]*y+e[11]*z+e[15],j=i*4;projected[j]=(e[0]*x+e[4]*y+e[8]*z+e[12])/w*this.width*.5+this.width*.5;projected[j+1]=-(e[1]*x+e[5]*y+e[9]*z+e[13])/w*this.height*.5+this.height*.5;projected[j+2]=(e[2]*x+e[6]*y+e[10]*z+e[14])/w;projected[j+3]=w;}
   const index=g.index, count=index?index.count:pos.count, uv=g.attributes.uv, normals=g.attributes.normal;
   const texture=material.map?.image as CanvasImageSource|undefined;if(material.map)this.textures.add(material.map);
   for(let i=0;i<count;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2,a=ia*4,b=ib*4,d=ic*4;
    if(projected[a+3]<.1||projected[b+3]<.1||projected[d+3]<.1)continue;
    const ax=projected[a],ay=projected[a+1],bx=projected[b],by=projected[b+1],cx=projected[d],cy=projected[d+1];
    const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<1.4||(material.side===T.FrontSide&&area>=0))continue;
    if(Math.max(ax,bx,cx)<-20||Math.min(ax,bx,cx)>this.width+20||Math.max(ay,by,cy)<-20||Math.min(ay,by,cy)>this.height+20)continue;
    let shade=1;
    if(normals){this.point.set(normals.getX(ia),normals.getY(ia),normals.getZ(ia)).applyMatrix3(this.normal).normalize();let dot=this.point.dot(this.sun);if(material.side===T.DoubleSide)dot=Math.abs(dot);shade=.66+Math.max(0,dot)*.45;}
    const color=material.color??new T.Color('#bba878');const srgb=color.clone().convertLinearToSRGB();const fill=`rgb(${Math.min(255,Math.round(srgb.r*255*shade))},${Math.min(255,Math.round(srgb.g*255*shade))},${Math.min(255,Math.round(srgb.b*255*shade))})`;
    const f=this.faces[this.used]??(this.faces[this.used]={ax:0,ay:0,bx:0,by:0,cx:0,cy:0,depth:0,fill:'',opacity:1});this.used++;
    Object.assign(f,{ax,ay,bx,by,cx,cy,depth:(projected[a+2]+projected[b+2]+projected[d+2])/3,fill,opacity:material.opacity,texture:undefined,uv:undefined});
    if(texture&&uv){f.fill=material.map?.userData.backgroundColor??'#304b5f';f.texture=texture;f.uv=[uv.getX(ia)*512,(1-uv.getY(ia))*512,uv.getX(ib)*512,(1-uv.getY(ib))*512,uv.getX(ic)*512,(1-uv.getY(ic))*512];}
   }
  });
  const sorted=this.faces.slice(0,this.used).sort((a,b)=>b.depth-a.depth);
  for(const f of sorted){c.globalAlpha=f.opacity;c.beginPath();const mx=(f.ax+f.bx+f.cx)/3,my=(f.ay+f.by+f.cy)/3;const expand=(x:number,y:number)=>{const d=Math.hypot(x-mx,y-my)||1;return [x+(x-mx)/d*.4,y+(y-my)/d*.4];};const aa=expand(f.ax,f.ay),bb=expand(f.bx,f.by),cc=expand(f.cx,f.cy);c.moveTo(aa[0],aa[1]);c.lineTo(bb[0],bb[1]);c.lineTo(cc[0],cc[1]);c.closePath();c.fillStyle=f.fill;c.fill();
    if(f.texture&&f.uv){const [u0,v0,u1,v1,u2,v2]=f.uv;const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(den)<1e-7)continue;const a=(f.ax*(v1-v2)+f.bx*(v2-v0)+f.cx*(v0-v1))/den,b=(f.ay*(v1-v2)+f.by*(v2-v0)+f.cy*(v0-v1))/den,d=(f.ax*(u2-u1)+f.bx*(u0-u2)+f.cx*(u1-u0))/den,e=(f.ay*(u2-u1)+f.by*(u0-u2)+f.cy*(u1-u0))/den,tx=(f.ax*(u1*v2-u2*v1)+f.bx*(u2*v0-u0*v2)+f.cx*(u0*v1-u1*v0))/den,ty=(f.ay*(u1*v2-u2*v1)+f.by*(u2*v0-u0*v2)+f.cy*(u0*v1-u1*v0))/den;c.save();c.clip();c.transform(a,b,d,e,tx,ty);c.drawImage(f.texture,0,0,512,512);c.restore();}
  }
  c.globalAlpha=1;
  scene.traverseVisible(o=>{if(!(o instanceof T.Line))return;const g=o.geometry,pos=g.attributes.position;if(!pos)return;this.matrix.multiplyMatrices(vp,o.matrixWorld);c.beginPath();const count=Math.min(pos.count,g.drawRange.count);for(let i=0;i<count;i++){const p=this.screen(pos.getX(i),pos.getY(i),pos.getZ(i),this.matrix);if(p[3]<=0)continue;if(i===0)c.moveTo(p[0],p[1]);else c.lineTo(p[0],p[1]);}const m=o.material as T.LineBasicMaterial;c.strokeStyle='#'+m.color.getHexString();c.globalAlpha=m.opacity;c.lineWidth=o instanceof T.Line&&m instanceof T.LineDashedMaterial?1.5:2;c.setLineDash(m instanceof T.LineDashedMaterial?[5,5]:[]);c.stroke();});c.setLineDash([]);c.globalAlpha=1;
  this.info.render.triangles=this.used;this.info.memory.geometries=this.geometries.size;this.info.memory.textures=this.textures.size;
 }
 dispose(){this.faces=[];this.geometries.clear();this.textures.clear();this.domElement.remove();}
}
