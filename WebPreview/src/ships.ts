import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original procedural preview art, inspired by the approved direction. No third-party models.
const mat = (color: string, metalness = 0, roughness = .65) => new T.MeshStandardMaterial({ color, metalness, roughness, flatShading: false });
const wood = mat('#69361f'), honey = mat('#a35e2e'), darkWood = mat('#3e251a'), deck = mat('#bc8550');
const gold = mat('#ffce64', .62, .29), metal = mat('#263645', .7, .3), rope = mat('#e0b77b'), black = mat('#121b22');
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
  statue.position.set(0,2.55,5.05);
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
  for(let i=0;i<12;i++){
    const angle=Math.PI*2*i/12;
    const curl=new T.Mesh(cone,i%3===0?bright:gilt);
    curl.scale.set(.22,.63,.25);
    curl.position.set(Math.sin(angle)*.54,Math.cos(angle)*.52,-.06);
    curl.rotation.z=-angle;curl.castShadow=true;statue.add(curl);
  }
  oval(0,0,-.10,.69,.77,.44,shade);
  oval(0,.06,.27,.49,.56,.35,gilt);
  oval(-.42,.48,.25,.19,.26,.13,bright);oval(.42,.48,.25,.19,.26,.13,bright);
  oval(-.18,.12,.56,.18,.12,.07,shade);oval(.18,.12,.56,.18,.12,.07,shade);
  oval(-.19,.15,.62,.069,.079,.029,ink);oval(.19,.15,.62,.069,.079,.029,ink);
  oval(0,-.20,.57,.26,.28,.27,bright);
  oval(-.15,-.28,.74,.16,.13,.12,gilt);oval(.15,-.28,.74,.16,.13,.12,gilt);
  oval(0,-.20,.85,.12,.09,.05,ink);
  oval(0,-.48,.59,.28,.09,.10,shade);
  for(const side of [-1,1]){
    const scroll=new T.Mesh(new T.TorusGeometry(.27,.068,6,16,Math.PI*1.45),bright);
    scroll.position.set(side*.57,-.59,-.2);scroll.rotation.z=side*.5;statue.add(scroll);
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
  for(let i=0;i<7;i++){const y0=-.5+i*.35,y1=y0+.32;hullStrip(y0,y1,.53+i*.065,.53+(i+1)*.065,i%2?honey:wood);}
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
  const sails:T.Mesh[]=[],flags:T.Mesh[]=[];
  const sailMat=new T.MeshStandardMaterial({map:sealTexture(red),side:T.DoubleSide,roughness:.9});
  const flagMat=new T.MeshStandardMaterial({map:sealTexture(red,true),side:T.DoubleSide,roughness:1});
  for(const [z,h,w] of [[.9,8.3,4.5],[-2.1,7.1,3.5]]){
    // Rig is a separate group for damage. Static ropes stay attached to the hull.
    const mast=new T.Mesh(new T.CylinderGeometry(.09,.16,h-2,10),honey);mast.position.set(0,(h+2)/2,z);rig.add(mast);
    for(const y of [3,h-.8]){const band=new T.Mesh(new T.CylinderGeometry(.18,.18,.13,10),gold);band.position.set(0,y,z);rig.add(band);}
    const yard=new T.Mesh(new T.CylinderGeometry(.065,.085,w+.5,10),darkWood);yard.rotation.z=Math.PI/2;yard.position.set(0,h-.5,z);rig.add(yard);
    const g=new T.PlaneGeometry(w,3.6,7,7);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i)/w+.5,y=p.getY(i)/3.6+.5;p.setZ(i,Math.sin(x*Math.PI)*Math.sin(y*Math.PI)*.8);p.setX(i,p.getX(i)*(1-.13*Math.cos(y*Math.PI*2)));}
    g.computeVertexNormals();const sail=new T.Mesh(g,sailMat);sail.position.set(0,h-2.3,z);rig.add(sail);sails.push(sail);
    const crow=new T.Mesh(new T.CylinderGeometry(.52,.3,.4,12),gold);crow.position.set(0,h-.05,z);rig.add(crow);
    const flag=new T.Mesh(new T.PlaneGeometry(1.4,.8,4,2),flagMat);flag.position.set(.7,h+.6,z);rig.add(flag);flags.push(flag);
    for(const side of [-1,1])for(const az of [z-1.3,z+1.3])beam(new T.Vector3(side*1.55,2.6,az),new T.Vector3(0,h-.1,z),.016,rope);
    for(const side of [-1,1])beam(new T.Vector3(side*w*.48,h-.5,z),new T.Vector3(side*1.4,2.5,z+1.4),.014,rope);
    for(let i=0;i<12;i++){const y=2.7+i*.36;beam(new T.Vector3(-.28,y,z+.12),new T.Vector3(.28,y,z+.12),.014,rope);}
    for(const x of [-.28,.28])beam(new T.Vector3(x,2.5,z+.12),new T.Vector3(x,h,z+.12),.014,rope);
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
