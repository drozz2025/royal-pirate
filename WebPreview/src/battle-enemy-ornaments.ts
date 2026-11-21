/** Battle-only original opponent dressing. One existing enemy rig; no physics,
 * cannon, Porto or HUD changes. All ornaments follow the live rig's transform.
 * Purpose: replace the rectangular red silhouette with a sculpted broadside
 * and restore the skull heraldry to the billowed canvas which masked it.
 */
import * as T from 'three';

export function makeBattleEnemyOrnaments(): T.Group {
  const art=new T.Group();
  art.name='battle-only-crimson-galleon-art';
  const oak=new T.MeshStandardMaterial({color:'#69302a',roughness:.75,side:T.DoubleSide});
  const lower=new T.MeshStandardMaterial({color:'#362433',roughness:.79,side:T.DoubleSide});
  const gold=new T.MeshStandardMaterial({color:'#e7b962',metalness:.48,roughness:.39});
  const shadow=new T.MeshStandardMaterial({color:'#3a2324',roughness:.82});
  const parchment=new T.MeshBasicMaterial({color:'#f6e7bb',side:T.DoubleSide});
  const ink=new T.MeshBasicMaterial({color:'#3d1d25',side:T.DoubleSide});
  const stations=[-4.9,-4.3,-3.2,-1.6,0,1.8,3.2,4.3,5];
  const widths=[.25,1.10,1.55,1.78,1.83,1.65,1.30,.75,.08];
  function ribbon(side:number,top:number,bottom:number, material:T.Material, name:string) {
    const verts:number[]=[],faces:number[]=[];
    for(let i=0;i<stations.length;i++){
      const endTaper=Math.abs(stations[i])>4.2?.22:0;
      const x=side*widths[i]*1.045;
      verts.push(x,top-endTaper,stations[i],x,bottom+endTaper*.12,stations[i]);
      if(i>0){const k=(i-1)*2;faces.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    geo.setIndex(faces);geo.computeVertexNormals();
    const mesh=new T.Mesh(geo,material);mesh.name=name;mesh.castShadow=true;art.add(mesh);
  }
  function tube(name:string,pts:T.Vector3[],radius:number,material:T.Material) {
    const curve=new T.CatmullRomCurve3(pts);
    const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(20,pts.length*4),radius,6,false),material);
    mesh.name=name;mesh.castShadow=true;art.add(mesh);
  }
  // Two shaped real broadside bands, swept into the tapered bows. The upper
  // gunports remain open (guns and hit coordinates are unchanged).
  for(const side of [-1,1]){
    ribbon(side,.88,.17,oak,'battle-crimson-upper-strake');
    ribbon(side,.12,-.49,lower,'battle-crimson-sculpted-keel');
    for(const y of [.97,.18]){
      tube('battle-gold-sheer-line',
        stations.map((z,i)=>new T.Vector3(side*(widths[i]*1.065+.018),
          y-.23*Math.pow(Math.abs(z)/5,2),z)),.043,gold);
    }
    // Five small gilded rosettes break up the formerly blank, blocky flank.
    for(const z of [-3.25,-1.35,.5,2.3]){
      const width=z< -3?1.55:z>2?1.4:1.82;
      const medallion=new T.Mesh(new T.TorusGeometry(.16,.044,7,14),gold);
      medallion.name='battle-gold-port-rosette';
      medallion.position.set(side*(width*1.09),.57,z);
      medallion.rotation.y=Math.PI/2;art.add(medallion);
    }
  }
  // WORK0/#104 — the approved Batalha shows a recognisable broadside of
  // open gunports, not a flat red rectangular hull. Sculpt four recessed ports
  // per live side with bronze rims and short iron muzzle lips; each follows the
  // existing enemy render root. Four instanced GPU draws serve all eight ports.
  // Decorative ONLY: no new guns, shots, physics, simulation, collisions,
  // currency, UI, dock or changes to the Porto model.
  const gunportInk=new T.MeshBasicMaterial({color:'#13161e',side:T.DoubleSide});
  const gunportIron=new T.MeshStandardMaterial({color:'#39404b',roughness:.54,metalness:.52});
  const portZ=[-3.2,-1.25,.9,2.85];
  const hullHalfWidthAt=(z:number):number=>{
    for(let i=1;i<stations.length;i++){
      if(z<=stations[i]){
        const t=(z-stations[i-1])/(stations[i]-stations[i-1]);
        return widths[i-1]+(widths[i]-widths[i-1])*t;
      }
    }
    return widths[widths.length-1];
  };
  const portMats:T.Matrix4[]=[],rimMats:T.Matrix4[]=[],barrelMats:T.Matrix4[]=[],mouthMats:T.Matrix4[]=[];
  for(const side of [-1,1]){
    for(const z of portZ){
      const outer=side*(hullHalfWidthAt(z)*1.045+.095);
      const pose=new T.Object3D();
      pose.position.set(outer,.59,z);
      pose.rotation.y=side*Math.PI/2;
      pose.updateMatrix();portMats.push(pose.matrix.clone());
      pose.position.x+=side*.018;
      pose.updateMatrix();rimMats.push(pose.matrix.clone());
      // A short lip emerging from the cut-out, but not an extra functional
      // cannon: this geometry belongs exclusively to the opponent's hull.
      pose.position.set(outer+side*.22,.59,z);
      pose.rotation.set(0,0,Math.PI/2);
      pose.updateMatrix();barrelMats.push(pose.matrix.clone());
      pose.position.set(outer+side*.46,.59,z);
      pose.rotation.set(0,side*Math.PI/2,0);
      pose.updateMatrix();mouthMats.push(pose.matrix.clone());
    }
  }
  const portParts=[
    ['battle-broadside-gunport-bore',new T.CircleGeometry(.237,16),gunportInk,portMats],
    ['battle-broadside-gunport-brass',new T.TorusGeometry(.245,.040,7,18),gold,rimMats],
    ['battle-broadside-gunport-iron',new T.CylinderGeometry(.105,.138,.46,10),gunportIron,barrelMats],
    ['battle-broadside-gunport-mouth',new T.CircleGeometry(.090,12),gunportInk,mouthMats]
  ] as const;
  for(const [name,geometry,material,matrices] of portParts){
    const batch=new T.InstancedMesh(geometry,material,matrices.length);
    batch.name=name;
    matrices.forEach((matrix,index)=>batch.setMatrixAt(index,matrix));
    batch.instanceMatrix.needsUpdate=true;
    batch.computeBoundingSphere();
    batch.castShadow=name==='battle-broadside-gunport-iron';
    art.add(batch);
  }

  // Curved quarter-gallery at the actual stern, not another vessel.
  for(const y of [2.54,3.25,3.91]){
    tube('battle-stern-gallery-gold',[
      new T.Vector3(-1.50,y,-4.40),
      new T.Vector3(-1.06,y+.16,-4.54),
      new T.Vector3(0,y+.23,-4.65),
      new T.Vector3(1.06,y+.16,-4.54),
      new T.Vector3(1.50,y,-4.40)
    ],.07,gold);
  }
  for(const x of [-1.15,-.55,0,.55,1.15]){
    tube('battle-stern-carved-column',[
      new T.Vector3(x,2.56,-4.52),new T.Vector3(x*.98,3.12,-4.60),
      new T.Vector3(x*.91,3.75,-4.51)
    ],.051,x===0?gold:shadow);
  }
  // The billowed sails belong to the enemy rig. These two readable emblems
  // follow its FRONT and BACK main panels point-for-point instead of floating
  // as a 2D HUD overlay, or hiding the dynamic cloth.
  const cols=22;
  for(const sign of [-1,1]){
    const panel=sign===1?0:1;
    const extension=sign===1?1.28:.97;
    const point=(u:number,v:number):T.Vector3=>{
      const belly=.62+.38*Math.pow(Math.max(0,Math.sin(Math.PI*v)),.62)
        +.055*Math.sin(v*Math.PI*4+panel*.75);
      const sag=.13*Math.sin(Math.PI*u)*(1-v);
      return new T.Vector3(
        sign*(2.20+extension*u*belly)+sign*.065,
        4.16+3.67*v-sag,
        .90+.09+.48*u*Math.sin(Math.PI*v)
          +.20*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)
          +.105*Math.sin(u*Math.PI*5+.35*Math.sin(v*Math.PI))*Math.sin(v*Math.PI)
          +.038
      );
    };
    const ellipse=(name:string,u:number,v:number,ru:number,rv:number,material:T.Material)=>{
      const pts:number[]=[],indices:number[]=[];
      const center=point(u,v);pts.push(center.x,center.y,center.z);
      for(let i=0;i<=cols;i++){
        const a=i*Math.PI*2/cols,p=point(u+Math.cos(a)*ru,v+Math.sin(a)*rv);
        pts.push(p.x,p.y,p.z);
        if(i>0)indices.push(0,i,i+1);
      }
      const geom=new T.BufferGeometry();
      geom.setAttribute('position',new T.Float32BufferAttribute(pts,3));
      geom.setIndex(indices);geom.computeVertexNormals();
      const mesh=new T.Mesh(geom,material);mesh.name=name;art.add(mesh);
    };
    ellipse('battle-sail-skull-brow',.58,.59,.25,.16,parchment);
    ellipse('battle-sail-skull-jaw',.58,.47,.17,.085,parchment);
    ellipse('battle-sail-skull-eye',.48,.58,.060,.051,ink);
    ellipse('battle-sail-skull-eye',.68,.58,.060,.051,ink);
    ellipse('battle-sail-skull-nose',.58,.505,.034,.030,ink);
    for(const u of [.52,.56,.60,.64]){
      ellipse('battle-sail-skull-tooth',u,.445,.012,.030,ink);
    }
    // Crossed sword bones pass behind the skull and curve with the canvas.
    for(const diagonal of [-1,1]){
      const points:T.Vector3[]=[];
      for(let i=0;i<8;i++){
        const t=i/7;points.push(point(.29+.58*t,.32+.34*(diagonal===1?t:1-t)));
      }
      tube('battle-sail-crossed-cutlass',points,.029,parchment);
    }
  }
  art.userData.battleOnly=true;
  return art;
}
