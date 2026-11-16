import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original procedural preview art, inspired by the approved direction. No third-party models.
const mat = (color: string, metalness = 0, roughness = .65) => new T.MeshStandardMaterial({ color, metalness, roughness, flatShading: false });
const wood = mat('#69361f'), honey = mat('#a35e2e'), darkWood = mat('#3e251a'), deck = mat('#bc8550');
// Dark, varied strakes give the playable royal hull a black-and-gold broadside;
// the enemy keeps its existing warm timber for instant combat recognition.
const royalHull = mat('#293039'), royalPlank = mat('#493625');
const gold = mat('#f5bd50', .62, .29), metal = mat('#263645', .7, .3), rope = mat('#e0b77b'), black = mat('#121b22');
const light = new T.MeshStandardMaterial({ color: '#fff1a8', emissive: '#ffab35', emissiveIntensity: 1.5 });
deck.side=T.DoubleSide;
const geometryCache = new Map<string, T.BufferGeometry>();
function cached(key: string, create: () => T.BufferGeometry) { if (!geometryCache.has(key)) geometryCache.set(key, create()); return geometryCache.get(key)!; }
const cube = cached('box', () => new T.BoxGeometry(1, 1, 1));
const cylinder = cached('cylinder', () => new T.CylinderGeometry(1, 1, 1, 10));
const sphere = cached('sphere', () => new T.SphereGeometry(1, 10, 8));
function sealTexture(red: boolean, flag = false) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = flag ? '#151923' : red ? '#a7342f' : '#101923'; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = red ? '#d6634d' : '#303741'; c.lineWidth = 2;
  for (let x = 16; x < 512; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 512); c.stroke(); }
  c.strokeStyle = '#d5bf8c'; c.lineWidth = 4; c.strokeRect(12, 12, 488, 488);
  if(!red && !flag){
    // Fine woven seams and gold-edged corner stitching stay on the actual
    // curved sail mesh: no transparent art overlay blocks interaction.
    c.strokeStyle='#8f7c5b';c.lineWidth=1.5;
    for(let y=62;y<500;y+=96){c.beginPath();c.moveTo(18,y);c.quadraticCurveTo(256,y+13,494,y);c.stroke();}
    c.strokeStyle='#d5a65e';c.lineWidth=3;
    for(const side of [26,486])for(let y=44;y<500;y+=36){
      c.beginPath();c.moveTo(side-6,y);c.lineTo(side+6,y+8);c.stroke();
    }
  }
  // Original skull & crossed cutlasses emblem drawn as a texture, not a copied asset.
  c.save(); c.translate(256, 266); c.strokeStyle = '#f5e5b7'; c.lineWidth = 18; c.lineCap = 'round';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-105, s * 78); c.quadraticCurveTo(20, -s * 10, 116, -s * 84); c.stroke(); }
  c.fillStyle = '#f5e5b7'; c.beginPath(); c.ellipse(0, -25, 75, 79, 0, 0, Math.PI * 2); c.fill(); c.fillRect(-38, 10, 76, 58);
  c.fillStyle = red ? '#a7342f' : '#101923';
  for (const x of [-28, 28]) { c.beginPath(); c.ellipse(x, -29, 20, 25, x * .008, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.moveTo(0, 1); c.lineTo(-11, 22); c.lineTo(11, 22); c.fill();
  for (const x of [-20, 0, 20]) c.fillRect(x - 3, 48, 6, 23);
  // Royal gold crown above the skull remains readable on a phone.
  if(!red){
    c.fillStyle='#f5c65c';c.strokeStyle='#764618';c.lineWidth=7;
    c.beginPath();c.moveTo(-77,-111);c.lineTo(-81,-154);c.lineTo(-42,-133);
    c.lineTo(0,-177);c.lineTo(42,-133);c.lineTo(81,-154);
    c.lineTo(77,-111);c.closePath();c.fill();c.stroke();
    c.fillRect(-72,-113,144,16);c.strokeRect(-72,-113,144,16);
    for(const x of [-43,0,43]){c.beginPath();c.arc(x,-121,5,0,Math.PI*2);c.fillStyle='#fff3ab';c.fill();}
  }
  c.restore();
  const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; tex.userData.backgroundColor=red?'#a7342f':'#203952';return tex;
}

/** Sculpted lion figurehead: real meshes attached to the player hull. */
function addLionFigurehead(root:T.Group){
  const statue=new T.Group();
  // Slightly larger sculptural ornament gives the prow a readable royal silhouette on mobile.
  statue.position.set(0,2.58,5.05);statue.scale.setScalar(1.16);
  const gilt=new T.MeshStandardMaterial({color:'#eeb85b',metalness:.6,roughness:.31});
  const bright=new T.MeshStandardMaterial({color:'#ffdc79',metalness:.57,roughness:.29});
  const shade=new T.MeshStandardMaterial({color:'#a86b27',metalness:.55,roughness:.4});
  const ink=new T.MeshStandardMaterial({color:'#241b16',metalness:.1,roughness:.65});
  const globe=new T.SphereGeometry(1,12,10);
  const cone=new T.ConeGeometry(1,1,7);
  function oval(x:number,y:number,z:number,sx:number,sy:number,sz:number,material:T.Material){
    const m=new T.Mesh(globe,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=true;statue.add(m);
  }
  // Layered swept mane, pointed feline ears and a projecting muzzle.
  // All parts are merged by material below to avoid many draw calls on mobile.
  for(let i=0;i<16;i++){
    const angle=Math.PI*2*i/16;
    const curl=new T.Mesh(cone,i%4===0?bright:i%3===0?shade:gilt);
    curl.scale.set(.20,.49,.23);
    curl.position.set(Math.sin(angle)*.61,Math.cos(angle)*.62,-.17);
    curl.rotation.z=-angle;curl.castShadow=true;statue.add(curl);
  }
  oval(0,.01,-.12,.71,.76,.48,shade); // mane behind the face
  oval(0,.07,.28,.52,.53,.35,gilt);
  for(const side of [-1,1]){
    const ear=new T.Mesh(cone,bright);
    ear.scale.set(.18,.35,.16);ear.rotation.z=-side*.23;
    ear.position.set(side*.45,.56,.22);statue.add(ear);
    // Hooded eyes and strong brows make this a lion rather than a teddy bear.
    oval(side*.205,.19,.576,.145,.070,.043,shade);
    oval(side*.205,.15,.617,.079,.050,.035,ink);
    oval(side*.20,.16,.646,.020,.020,.012,bright);
    oval(side*.16,-.24,.61,.225,.18,.20,bright);
    oval(side*.22,-.30,.76,.085,.067,.06,gilt);
    for(let i=0;i<2;i++){
      const whisker=new T.Mesh(new T.CylinderGeometry(.012,.012,.34,5),shade);
      whisker.position.set(side*.36,-.28-i*.095,.78);
      whisker.rotation.z=side*(.65+i*.20);statue.add(whisker);
    }
    const scroll=new T.Mesh(new T.TorusGeometry(.27,.068,6,16,Math.PI*1.45),bright);
    scroll.position.set(side*.57,-.59,-.2);scroll.rotation.z=side*.5;statue.add(scroll);
  }
  oval(0,-.19,.72,.21,.20,.27,gilt); // tapered bridge of muzzle
  const nose=new T.Mesh(new T.ConeGeometry(.17,.19,3),ink);
  nose.rotation.z=Math.PI;nose.position.set(0,-.24,.955);statue.add(nose);
  // Open jaws, lower lip and four pointed fangs: the gilded figurehead now
  // reads as a roaring lion rather than a rounded toy on the bow.
  oval(0,-.48,.65,.31,.16,.12,ink);
  oval(0,-.61,.66,.31,.075,.15,bright);
  for(const x of [-.20,-.08,.08,.20]){
    const fang=new T.Mesh(new T.ConeGeometry(.055,.17,5),bright);
    fang.position.set(x,-.46,.78);
    fang.rotation.z=Math.PI;statue.add(fang);
  }
  // Merge lion details by material: 4 draw calls, not 30 independent meshes.
  const mergedByMaterial=new Map<T.Material,T.BufferGeometry[]>();
  for(const child of [...statue.children]){
    if(!(child instanceof T.Mesh))continue;
    child.updateMatrix();
    const geometry=child.geometry.clone().applyMatrix4(child.matrix);
    const material=child.material as T.Material;
    if(!mergedByMaterial.has(material))mergedByMaterial.set(material,[]);
    mergedByMaterial.get(material)!.push(geometry);
    statue.remove(child);
  }
  for(const [material,parts] of mergedByMaterial){
    const united=mergeGeometries(parts,false);
    if(united){const mesh=new T.Mesh(united,material);mesh.castShadow=true;statue.add(mesh);}
    parts.forEach(g=>g.dispose());
  }
  root.add(statue);
}

export type ShipArt = { root: T.Group; rig: T.Group; sails: T.Mesh[]; flags: T.Mesh[]; guns: T.Group[]; scars: T.Mesh[]; trim: T.MeshStandardMaterial; health: number };
export function makeShip(red = false): ShipArt {
  const root = new T.Group(), rig = new T.Group(); root.add(rig);
  const trim = mat(red ? '#8f3530' : '#5b321f', .05, .47);
  const bins = new Map<T.Material, T.BufferGeometry[]>();
  function put(geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number, sx=1, sy=1, sz=1, rotation?: T.Euler) {
    const m = new T.Matrix4().compose(new T.Vector3(x,y,z), new T.Quaternion().setFromEuler(rotation ?? new T.Euler()), new T.Vector3(sx,sy,sz));
    const g = geometry.clone().applyMatrix4(m);g.deleteAttribute('uv'); if (!bins.has(material)) bins.set(material, []); bins.get(material)!.push(g);
  }
  function beam(a: T.Vector3, b: T.Vector3, radius: number, material: T.Material) {
    const delta = b.clone().sub(a), center = a.clone().add(b).multiplyScalar(.5);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0), delta.clone().normalize());
    put(cylinder, material, center.x, center.y, center.z, radius, delta.length(), radius, new T.Euler().setFromQuaternion(q));
  }
  // Rounded plank-built hull: nine stations, four stepped cross sections, tapered bow.
  const stations = [-4.9,-4.3,-3.2,-1.6,0,1.8,3.2,4.3,5];
  const widths = [.25,1.1,1.55,1.78,1.83,1.65,1.3,.75,.08];
  function hullStrip(y0: number, y1: number, factor0: number, factor1: number, material: T.Material) {
    const positions: number[] = [], indices: number[] = [];
    for (const side of [-1,1]) {
      const start = positions.length / 3;
      stations.forEach((z,i) => { positions.push(side*widths[i]*factor0,y0,z, side*widths[i]*factor1,y1,z); });
      for(let i=0;i<stations.length-1;i++){const k=start+i*2; if(side===1) indices.push(k,k+1,k+2,k+1,k+3,k+2); else indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const g = new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();put(g,material,0,0,0);g.dispose();
  }
  for(let i=0;i<7;i++){
    const y0=-.5+i*.35,y1=y0+.32;
    hullStrip(y0,y1,.53+i*.065,.53+(i+1)*.065,
      red?(i%2?honey:wood):(i%2?royalPlank:royalHull));
  }
  hullStrip(1.97,2.35,1,1.01,trim); hullStrip(2.36,2.49,1.035,1.035,gold);
  hullStrip(.35,.48,.78,.8,gold);hullStrip(1.6,1.73,.96,.98,gold);
  // Close seams and deck with custom outline.
  const shape = new T.Shape();stations.forEach((z,i)=>i===0?shape.moveTo(widths[i],z):shape.lineTo(widths[i],z));for(let i=stations.length-1;i>=0;i--)shape.lineTo(-widths[i],stations[i]);shape.closePath();
  const deckGeo=new T.ShapeGeometry(shape);deckGeo.rotateX(Math.PI/2);put(deckGeo,deck,0,1.97,0);deckGeo.dispose();
  for(let i=1;i<stations.length-1;i++)for(const side of [-1,1]){
    const z=stations[i],w=widths[i];put(cube,darkWood,side*w*.96,1,z,.10,1.9,.12);put(sphere,gold,side*w*1.025,2.24,z,.07,.07,.07);
    put(cylinder,gold,side*w,2.62,z,.045,.35,.045);
  }
  for(const side of [-1,1])for(let i=0;i<stations.length-1;i++)beam(new T.Vector3(side*widths[i],2.82,stations[i]),new T.Vector3(side*widths[i+1],2.82,stations[i+1]),.06,gold);
  // Stern cabin, stepped quarterdeck, framed windows.
  put(cube,wood,0,2.67,-3.5,2.55,1.4,1.6);put(cube,trim,0,3.45,-3.5,2.85,.22,1.95);put(cube,gold,0,3.6,-3.5,2.96,.12,2.05);
  for(const side of [-1,1])for(const z of [-3.9,-3.2]){put(cube,gold,side*1.3,2.8,z,.09,.75,.5);put(cube,light,side*1.36,2.8,z,.02,.56,.31);put(cube,wood,side*1.38,2.8,z,.02,.06,.35);}
  for(const x of [-.8,0,.8]){put(cube,gold,x,2.8,-4.33,.54,.78,.08);put(cube,light,x,2.8,-4.39,.36,.57,.02);}
  for(let i=0;i<5;i++)put(cube,deck,0,2.05+i*.18,-2.1-i*.14,1.1,.15,.28);
  beam(new T.Vector3(0,2.35,4),new T.Vector3(0,3.8,6.2),.11,honey);
  // v0.1.4 original figurehead: a gilded anchor and crown on the forward bowsprit.
  // All details join the existing material bins to avoid extra draw calls on phones.
  beam(new T.Vector3(0,3.55,6.03),new T.Vector3(0,4.7,6.03),.105,gold);
  beam(new T.Vector3(-.44,4.38,6.03),new T.Vector3(.44,4.38,6.03),.082,gold);
  for(const side of [-1,1]){
    beam(new T.Vector3(0,3.62,6.03),new T.Vector3(side*.35,3.51,6.03),.075,gold);
    beam(new T.Vector3(side*.35,3.51,6.03),new T.Vector3(side*.55,3.87,6.03),.075,gold);
    beam(new T.Vector3(side*.55,3.87,6.03),new T.Vector3(side*.50,3.72,6.03),.065,gold);
    beam(new T.Vector3(side*.42,4.74,6.03),new T.Vector3(side*.60,4.97,6.03),.05,gold);
    beam(new T.Vector3(side*.12,4.74,6.03),new T.Vector3(side*.28,5.1,6.03),.05,gold);
    beam(new T.Vector3(side*.25,3.9,5.75),new T.Vector3(side*1.05,2.75,4.15),.018,rope);
  }
  put(sphere,gold,0,4.73,6.03,.17,.17,.14);
  beam(new T.Vector3(-.60,4.73,6.03),new T.Vector3(.60,4.73,6.03),.055,gold);
  for(const x of [-.54,-.27,0,.27,.54])put(sphere,gold,x,x===0?5.12:4.92,6.03,.08,.08,.08);
  // Stern cabin scrollwork: ornamental crest, separate from hit boxes and ship stats.
  for(const x of [-1,1]){
    beam(new T.Vector3(x*.23,3.1,-4.48),new T.Vector3(x*.77,3.22,-4.48),.065,gold);
    beam(new T.Vector3(x*.77,3.22,-4.48),new T.Vector3(x*1.06,3.02,-4.48),.055,gold);
    beam(new T.Vector3(x*.23,3.1,-4.48),new T.Vector3(x*.14,2.92,-4.48),.045,gold);
  }
  put(sphere,gold,0,3.16,-4.48,.17,.17,.075);
  for(const z of [-1.9,1.2]){put(cube,darkWood,0,2.02,z,1.25,.08,.8);for(let i=-2;i<=2;i++)put(cube,gold,i*.22,2.08,z,.04,.04,.8);}
  // Barrels, cannon carriages and iron hoops.
  for(const [x,z] of [[-.9,-2.3],[.85,-2.6],[-1,2.6]]){
    put(cylinder,honey,x,2.35,z,.27,.65,.27);for(const y of [2.1,2.55])put(cylinder,metal,x,y,z,.29,.055,.29);
  }
  const guns:T.Group[]=[];
  for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
    put(cube,darkWood,side*1.5,1.45,z,.15,.68,.68);put(cube,gold,side*1.6,1.47,z,.12,.82,.84);put(cube,black,side*1.69,1.47,z,.12,.62,.64);
    const gun=new T.Group();gun.position.set(side*1.62,1.56,z);root.add(gun);guns.push(gun);
    const barrel=new T.Mesh(new T.CylinderGeometry(.21,.29,1.08,12),metal);barrel.rotation.z=-side*Math.PI/2;barrel.position.x=side*.42;gun.add(barrel);
    const rim=new T.Mesh(new T.TorusGeometry(.21,.05,6,12),gold);rim.rotation.y=Math.PI/2;rim.position.x=side*.98;gun.add(rim);
    const bore=new T.Mesh(new T.CircleGeometry(.18,12),black);bore.rotation.y=side*Math.PI/2;bore.position.x=side*1.035;gun.add(bore);
  }
  // The enemy's gilded gunport surrounds and high stern rails add visible
  // broadside depth at phone resolution. All are batched with existing hull
  // materials; no new objects intercept cannon hit positions.
  if(red){
    for(const side of [-1,1]){
      for(const z of [-2.7,-.9,.9,2.65]){
        const halfWidth=z>2?1.38:z< -2.4?1.48:1.76;
        put(cube,gold,side*(halfWidth+.035),1.48,z,.075,.76,.88);
        put(cube,black,side*(halfWidth+.095),1.49,z,.06,.48,.59);
        put(sphere,gold,side*(halfWidth+.12),1.91,z,.11,.10,.12);
      }
    }
    // Tall carved stern rail and gold brackets, visible on the red vessel.
    for(const x of [-.90,-.45,0,.45,.90]){
      put(cube,gold,x,3.85,-4.34,.07,.43,.10);
    }
    beam(new T.Vector3(-1.32,4.10,-4.35),
      new T.Vector3(1.32,4.10,-4.35),.062,gold);
  }
  // Royal galleon detailing is real 3D geometry, merged by material with the
  // existing hull. The enemy remains lightweight and visually distinct.
  if(!red){
    // Reuse existing physically based materials so decorative detail adds
    // geometry but ZERO new draw calls to the mobile ship model.
    const bronze=honey, antique=gold, deckSeam=darkWood;
    // Subtle hardwood caulking: separate seams, not a flat deck decal.
    for(let i=-5;i<=5;i++){
      const x=i*.225;
      put(cube,deckSeam,x,1.989,-.05,.017,.014,5.45);
    }
    // Each cannon aperture has carved corner plates and polished rivets.
    // Coordinates are just outside the broadside skin, not painted over it.
    for(const side of [-1,1])for(const z of [-1.8,0,1.8]){
      const face=side*1.95;
      for(const dy of [-.46,.46])put(cube,gold,face,1.47+dy,z,.075,.09,1.03);
      for(const dz of [-.50,.50])put(cube,bronze,face,1.47,z+dz,.075,1.0,.09);
      for(const dy of [-.41,.41])for(const dz of [-.42,.42])
        put(sphere,antique,face+side*.045,1.47+dy,z+dz,.069,.069,.069);
      // Bronze lower apron gives the guns a substantial framed gun deck.
      put(cube,bronze,face,1.02,z,.09,.08,.94);
    }
    // Upper carved side ribbons and warm gold rosettes break up the flat hull.
    for(const side of [-1,1])for(let i=0;i<9;i++){
      const z=-3.5+i*.86;
      const width=1.55+Math.sin((z+3.5)/7*Math.PI)*.30;
      put(sphere,i%2===0?gold:bronze,side*(width+.10),2.39,z,.10,.10,.10);
    }
    // Decorative raised scrollwork at the aft castle and a crown-shaped prow
    // collar. These remain visible when the ship is rotated by touch.
    const scroll=cached('galleon-royal-scroll',()=>new T.TorusGeometry(.31,.065,7,18,Math.PI*1.68));
    for(const side of [-1,1]){
      put(scroll,gold,side*1.47,3.04,-3.72,.90,1.05,.90,
        new T.Euler(0,side*Math.PI/2,side*.28));
      put(cube,antique,side*1.45,3.58,-3.45,.065,.085,1.30);
      for(const z of [-4.03,-3.64,-3.25])put(sphere,gold,side*1.49,3.63,z,.10,.10,.10);
    }
    for(const side of [-1,1]){
      beam(new T.Vector3(side*.18,2.66,4.7),new T.Vector3(side*.80,3.17,5.2),.082,antique);
      beam(new T.Vector3(side*.80,3.17,5.2),new T.Vector3(side*.37,3.72,5.62),.067,gold);
    }
    // More pronounced gilded taffrail on the quarterdeck.
    for(let i=0;i<8;i++){
      const x=-1.15+i*.33;
      put(cube,bronze,x,3.65,-4.37,.065,.31,.075);
      put(sphere,antique,x,3.84,-4.37,.075,.075,.075);
    }
  }
  const sails:T.Mesh[]=[],flags:T.Mesh[]=[];
  const sailMat=new T.MeshStandardMaterial({map:sealTexture(red),side:T.DoubleSide,roughness:.9});
  const flagMat=new T.MeshStandardMaterial({map:sealTexture(red,true),side:T.DoubleSide,roughness:1});
  // The smaller topsails are dark woven cloth. Keep the crowned skull emblem
  // on the two full main sails and on the flags, not repeated four times.
  const topsailMat=new T.MeshStandardMaterial({color:red?'#713331':'#19232d',side:T.DoubleSide,roughness:.88});
  for(const [z,h,w] of [[.9,8.3,4.5],[-2.1,7.1,3.5]]){
    // Rig is a separate group for damage. Static ropes stay attached to the hull.
    const mast=new T.Mesh(new T.CylinderGeometry(.07,.16,h-.6,10),honey);
    mast.position.set(0,(h+2.6)/2,z);rig.add(mast);
    for(const y of [3,h-.8]){const band=new T.Mesh(new T.CylinderGeometry(.18,.18,.13,10),gold);band.position.set(0,y,z);rig.add(band);}
    const yard=new T.Mesh(new T.CylinderGeometry(.065,.085,w+.5,10),darkWood);yard.rotation.z=Math.PI/2;yard.position.set(0,h-.5,z);rig.add(yard);
    // Royal two-tier canvas: a separate curved topsail makes both masts read
    // as a tall galleon instead of a pair of flat rectangular banners.
    const upperYard=new T.Mesh(new T.CylinderGeometry(.055,.075,w*.76,10),darkWood);
    upperYard.rotation.z=Math.PI/2;upperYard.position.set(0,h+1.08,z);rig.add(upperYard);
    const upperGeometry=new T.PlaneGeometry(w*.70,1.55,7,5);
    const upperPositions=upperGeometry.attributes.position;
    for(let i=0;i<upperPositions.count;i++){
      const u=upperPositions.getX(i)/(w*.70)+.5;
      const v=upperPositions.getY(i)/1.55+.5;
      // Taper the hem while leaving the yard full-width. Layered folds and
      // canvas bulge read as cloth rather than a rigid rectangular billboard.
      upperPositions.setZ(i,red
        ? .045+.11*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)+.017*Math.sin(u*6*Math.PI)*Math.sin(v*Math.PI)
        : .12+Math.sin(u*Math.PI)*(.24+.35*Math.sin(v*Math.PI))
          +.045*Math.sin(u*6*Math.PI)*Math.sin(v*Math.PI));
      upperPositions.setX(i,upperPositions.getX(i)*(red ? (.96+.035*Math.sin(v*Math.PI)) : (.77+.19*Math.sin(v*Math.PI)+.04*v)));
    }
    upperGeometry.computeVertexNormals();
    const upperSail=new T.Mesh(upperGeometry,topsailMat);
    upperSail.position.set(0,h+.28,z);rig.add(upperSail);sails.push(upperSail);
    const g=new T.PlaneGeometry(w,3.6,7,7);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const u=p.getX(i)/w+.5,v=p.getY(i)/3.6+.5;
      const belly=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
      // Rounded shoulders, narrowed foot and alternating curved canvas
      // panels create a three-dimensional galleon silhouette from either side.
      p.setX(i,p.getX(i)*(.84+.13*Math.sin(v*Math.PI)+.03*v));
      p.setZ(i,.05+.74*belly+.10*Math.sin(u*Math.PI)
        +.065*Math.sin(u*6*Math.PI)*Math.sin(v*Math.PI));
    }
    g.computeVertexNormals();const sail=new T.Mesh(g,sailMat);sail.position.set(0,h-2.3,z);rig.add(sail);sails.push(sail);
    // A slender rope along the lower canvas edge gives a readable curved
    // silhouette without creating a HUD overlay or changing the hit boxes.
    beam(new T.Vector3(-w*.42,h-4.10,z+.06),
      new T.Vector3(w*.42,h-4.10,z+.06),.029,rope);
    const crow=new T.Mesh(new T.CylinderGeometry(.52,.3,.4,12),gold);crow.position.set(0,h-.05,z);rig.add(crow);
    const flag=new T.Mesh(new T.PlaneGeometry(1.4,.8,4,2),flagMat);flag.position.set(.7,h+1.93,z);rig.add(flag);flags.push(flag);
    for(const side of [-1,1])for(const az of [z-1.3,z+1.3])beam(new T.Vector3(side*1.55,2.6,az),new T.Vector3(0,h-.1,z),.016,rope);
    for(const side of [-1,1])beam(new T.Vector3(side*w*.48,h-.5,z),new T.Vector3(side*1.4,2.5,z+1.4),.014,rope);
    for(let i=0;i<12;i++){const y=2.7+i*.36;beam(new T.Vector3(-.28,y,z+.12),new T.Vector3(.28,y,z+.12),.014,rope);}
    for(const x of [-.28,.28])beam(new T.Vector3(x,2.5,z+.12),new T.Vector3(x,h,z+.12),.014,rope);
  }
  // Small third foremast with batched timber, a single animated dark sail,
  // and genuine stays. Only ONE extra mesh/draw call on the flagship, preserving
  // the mobile geometry budget and the approved ship collision dimensions.
  if(!red){
    put(cylinder,honey,0,4.45,3.45,.10,4.7,.10);
    put(cylinder,darkWood,0,6.04,3.45,.075,3.1,.075,new T.Euler(0,0,Math.PI/2));
    const foreGeo=new T.PlaneGeometry(2.8,2.35,6,5);
    const points=foreGeo.attributes.position;
    for(let i=0;i<points.count;i++){
      const ux=points.getX(i)/2.8+.5,vy=points.getY(i)/2.35+.5;
      points.setZ(i,Math.sin(ux*Math.PI)*Math.sin(vy*Math.PI)*.42);
    }
    foreGeo.computeVertexNormals();
    const foresail=new T.Mesh(foreGeo,topsailMat);
    foresail.position.set(0,4.85,3.45);rig.add(foresail);sails.push(foresail);
    // A live, wind-filled triangular jib connects the third foremast to the
    // bowsprit. Its real 3D mesh stays on the same ship; no flat screenshot,
    // extra collider, camera movement or touch interception is introduced.
    const jibGeo=new T.BufferGeometry();
    jibGeo.setAttribute('position',new T.Float32BufferAttribute([
      -.08,6.45,3.40, // mast stay
      -.05,3.07,6.05, // bowsprit attachment
      -.08,3.47,3.78, // aft lower corner
      -.38,4.45,4.65  // billowed cloth centre
    ],3));
    jibGeo.setIndex([0,1,3,1,2,3,2,0,3]);
    jibGeo.computeVertexNormals();
    const jib=new T.Mesh(jibGeo,topsailMat);
    rig.add(jib);sails.push(jib);
    beam(new T.Vector3(-.08,6.45,3.40),new T.Vector3(-.05,3.07,6.05),.020,rope);
    beam(new T.Vector3(-.05,3.07,6.05),new T.Vector3(-.08,3.47,3.78),.016,rope);
    for(const side of [-1,1]){
      beam(new T.Vector3(side*1.4,2.65,3.15),new T.Vector3(0,6.7,3.45),.018,rope);
      beam(new T.Vector3(side*1.35,6.0,3.45),new T.Vector3(side*1.6,2.65,4.2),.018,rope);
    }
  }
  // Additional red foremast and curved, tapered cloth: the opponent reads
  // as a multi-masted galleon in the battle-only red vessel, not a tiny box
  // with two flat rectangular flags. The playable hull/physics are unchanged.
  if(red){
    put(cylinder,honey,0,4.48,3.42,.10,4.75,.10);
    put(cylinder,darkWood,0,6.54,3.42,.070,3.15,.070,new T.Euler(0,0,Math.PI/2));
    const redForeGeometry=new T.PlaneGeometry(2.95,2.48,8,7);
    const verts=redForeGeometry.attributes.position;
    for(let i=0;i<verts.count;i++){
      const u=verts.getX(i)/2.95+.5;
      const v=verts.getY(i)/2.48+.5;
      // The loose foot and rounded belly expand the visible red silhouette.
      verts.setX(i,verts.getX(i)*(.79+.17*Math.sin(v*Math.PI)+.04*v));
      verts.setZ(i,.09+.26*Math.sin(u*Math.PI)
        +.36*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)
        +.045*Math.sin(u*5*Math.PI)*Math.sin(v*Math.PI));
    }
    redForeGeometry.computeVertexNormals();
    // Put the existing Jolly Roger cloth on the *visible* forward canvas.
    // The old unmarked brown foresail obscured the skull on the main canvas
    // in portrait; no new image, mesh, draw call or hit region is introduced.
    const redForesail=new T.Mesh(redForeGeometry,sailMat);
    redForesail.name='enemy-billowed-foresail';
    redForesail.position.set(0,5.45,3.42);
    rig.add(redForesail);sails.push(redForesail);
    // The fore-and-aft stays shape the sail but never create a new collider.
    for(const side of [-1,1]){
      beam(new T.Vector3(side*1.18,6.70,3.48),
        new T.Vector3(side*1.38,2.68,4.65),.019,rope);
    }
  }
  // Warm lanterns at bow and stern, an original anchor-shaped bow ornament.
  for(const [x,z] of [[-1.18,-4.15],[1.18,-4.15],[0,4.95]]){put(cube,metal,x,3.1,z,.30,.50,.30);put(cube,light,x,3.12,z,.23,.34,.23);put(cylinder,gold,x,3.43,z,.23,.1,.23);}
  // Tiny crew silhouettes give the deck a sense of scale.
  for(const [x,z] of [[.85,.8],[-.6,-2.5],[.5,2.6]]){put(sphere,mat('#e5ae78'),x,2.84,z,.18,.19,.18);put(cylinder,red?trim:mat('#315b80'),x,2.45,z,.17,.48,.17);put(sphere,mat('#b33c2f'),x,3,z,.21,.09,.21);put(cube,darkWood,x,2.12,z,.3,.25,.25);}
  for(const [material,geos] of bins){const g=mergeGeometries(geos);if(g){const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}geos.forEach(g=>g.dispose());}
  const scars:T.Mesh[]=[];
  const scarMat=mat('#211c1a');
  for(const side of [-1,1])for(const z of [-2,0,2]){const m=new T.Mesh(new T.CircleGeometry(.6,8),scarMat);m.rotation.y=side*Math.PI/2;m.position.set(side*1.82,1.05,z);m.visible=false;root.add(m);scars.push(m);}
  if(!red)addLionFigurehead(root);
  root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,rig,sails,flags,guns,scars,trim,health:100};
}
