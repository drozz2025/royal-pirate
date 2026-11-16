import * as T from 'three';

/**
 * Deterministic, battle-only painted teak. Real UV texture on the existing
 * deck meshes: no screenshot overlay, network fetch or new interaction.
 * In Node's headless geometry tests the original flat material remains valid.
 */
function paintedDeckTimber(base:string, seed:number): T.MeshStandardMaterial {
  const material=new T.MeshStandardMaterial({color:base,roughness:.82,metalness:0});
  material.userData.battleTimber=true;
  if(typeof document==='undefined')return material;
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx)return material;
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  // Alternating warm oak light and tarred seams follow the LENGTH of each plank.
  const glaze=ctx.createLinearGradient(0,0,512,0);
  glaze.addColorStop(0,'#24130c6b');glaze.addColorStop(.10,'#ffdda034');
  glaze.addColorStop(.49,'#f6c07818');glaze.addColorStop(.88,'#23120935');
  glaze.addColorStop(1,'#21110a70');
  ctx.fillStyle=glaze;ctx.fillRect(0,0,512,512);
  for(let i=0;i<195;i++){
    const x=random()*512, swing=(random()-.5)*13;
    ctx.strokeStyle=random()>.52?'rgba(47,23,14,.18)':'rgba(255,222,153,.13)';
    ctx.lineWidth=.6+random()*3.2;
    ctx.beginPath();ctx.moveTo(x,0);
    ctx.bezierCurveTo(x+swing,120,x-swing*.7,360,x+(random()-.5)*12,512);
    ctx.stroke();
  }
  // Small hand-painted knots, never a repeated generic wood-gradient rectangle.
  for(let i=0;i<7;i++){
    const x=25+random()*460,y=36+random()*438;
    ctx.strokeStyle='rgba(48,22,13,.20)';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,y,4+random()*8,13+random()*19,random()*.24,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,218,152,.14)';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x+4,y,7+random()*8,17+random()*15,.1,0,Math.PI*2);ctx.stroke();
  }
  const tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  tex.anisotropy=4;
  tex.userData.backgroundColor=base;
  material.map=tex;
  material.color.set('#ffffff');
  return material;
}


/** Original live Three.js cannon deck for the Batalha portrait camera.
 * Decorative geometry only: aiming, damage and shots remain in Battle.
 * Never displayed in Porto, never replaces the real moving ships.
 */
export function makeBattleDeck(): {group: T.Group; flashes: T.Mesh[]} {
  const group = new T.Group();
  group.name = 'battle-foreground-cannons';
  const wood = paintedDeckTimber('#91522f',73);
  const plank = paintedDeckTimber('#bc8250',39);
  const darkWood = new T.MeshStandardMaterial({color:'#392b28',roughness:.88});
  // The approved guns read as blue-black forged steel with sunlit facets, not
  // pitch-black tubes against a dark rectangle. Geometry and shot origins stay
  // untouched: this material belongs only to the decorative first-person deck.
  const metal = new T.MeshStandardMaterial({color:'#354b5d',metalness:.64,roughness:.30});
  const gunRope = new T.MeshStandardMaterial({color:'#d2b585',roughness:.92});
  const cheekOak = new T.MeshStandardMaterial({color:'#744022',roughness:.83});
  const bronze = new T.MeshStandardMaterial({color:'#e0ae61',metalness:.74,roughness:.27});
  const bore = new T.MeshBasicMaterial({color:'#071019',side:T.DoubleSide});
  const fire = new T.MeshBasicMaterial({color:'#ffe09b',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
  const box = new T.BoxGeometry(1,1,1);
  const addBox = (x:number,y:number,z:number,sx:number,sy:number,sz:number,material:T.Material) => {
    const mesh = new T.Mesh(box,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    group.add(mesh);
    return mesh;
  };

  // Separate teak planks and cross braces give actual perspective and highlights.
  for (let i=0;i<9;i++) addBox((i-4)*1.29,.32,74,1.25,.38,18,i%3===0?wood:plank);
  for(const z of [65.7,78.7]) addBox(0,.53,z,11.9,.22,.45,darkWood);
  for(const x of [-5.9,5.9]){
    addBox(x,1.18,72.6,.24,1.55,15,wood);
    for(const z of [66.2,73.5,80.1]) addBox(x,1.9,z,.35,1.1,.4,bronze);
  }

  // Bigger bronze-rimmed cannon silhouettes, still rendered in real Three.js.
  // Meshes stay behind the working touch controls and do not enter the Porto.
  const wheelGeo = new T.CylinderGeometry(.82,.82,.30,14);
  const wheelHub = new T.CylinderGeometry(.28,.28,.33,12);
  // Two EXISTING decorative cannon silhouettes, now long and heavy enough
  // to read as a player's broadside in a 384x512 first-person crop. The live
  // Battle cannon ball, shot origin, recoil logic and HP are not touched.
  const flashes: T.Mesh[] = [];
  const axisUp=new T.Vector3(0,1,0);
  const axisFace=new T.Vector3(0,0,1);
  for(const x of [-3.15,3.15]){
    // Reuse the original two gun carriages and four spoked wheels.
    addBox(x,1.0,74.2,2.3,.62,5.3,wood);
    addBox(x,1.40,74.8,1.75,.26,3.0,bronze);
    for(const offset of [-1.25,1.25]){
      const wheel=new T.Mesh(wheelGeo,darkWood);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x+offset,.94,74.3);group.add(wheel);
      const hub=new T.Mesh(wheelHub,bronze);
      hub.rotation.z=Math.PI/2;hub.position.set(x+offset+Math.sign(offset)*.18,.94,74.3);
      group.add(hub);
    }
    // The flared wrought-iron barrel now projects from the near carriage
    // into the exposed sea: real tapered cylinder + concentric bronze rims,
    // not a 2D gun decal or another gameplay projectile.
    const breechPoint=new T.Vector3(x,1.90,78.6);
    const muzzlePoint=new T.Vector3(x,4.86,65.35);
    const direction=muzzlePoint.clone().sub(breechPoint).normalize();
    const axisOrientation=new T.Quaternion().setFromUnitVectors(axisUp,direction);
    const rimOrientation=new T.Quaternion().setFromUnitVectors(axisFace,direction);
    const length=breechPoint.distanceTo(muzzlePoint);
    const barrel=new T.Mesh(new T.CylinderGeometry(1.14,1.48,length,24,1),metal);
    barrel.name='first-person-broadside-cannon';
    barrel.position.copy(breechPoint).add(muzzlePoint).multiplyScalar(.5);
    barrel.quaternion.copy(axisOrientation);group.add(barrel);
    const muzzle=new T.Mesh(new T.TorusGeometry(1.25,.18,12,32),bronze);
    muzzle.name='first-person-broadside-muzzle';
    muzzle.position.copy(muzzlePoint);
    muzzle.quaternion.copy(rimOrientation);group.add(muzzle);
    const darkMuzzle=new T.Mesh(new T.CircleGeometry(1.10,32),bore);
    darkMuzzle.position.copy(muzzlePoint).addScaledVector(direction,.045);
    darkMuzzle.quaternion.copy(rimOrientation);group.add(darkMuzzle);
    for(const t of [.20,.48,.75]){
      const hoop=new T.Mesh(new T.TorusGeometry(1.48-t*.34,.09,8,28),bronze);
      hoop.position.copy(breechPoint).lerp(muzzlePoint,t);
      hoop.quaternion.copy(rimOrientation);
      group.add(hoop);
    }
    // Two broad cast-bronze reinforcement collars show the tube's tapered
    // volume at 384x512, rather than another small 2D stripe on a black mesh.
    // They run along the SAME real decorative gun axis.
    for(const t of [.30,.67]){
      const radius=1.48-t*.34;
      const collar=new T.Mesh(new T.CylinderGeometry(radius+.055,radius+.095,.31,24),bronze);
      collar.name='first-person-cannon-bronze-collar';
      collar.quaternion.copy(axisOrientation);
      collar.position.copy(breechPoint).lerp(muzzlePoint,t);
      group.add(collar);
      const shadowRing=new T.Mesh(new T.TorusGeometry(radius+.065,.055,8,24),metal);
      shadowRing.quaternion.copy(rimOrientation);
      shadowRing.position.copy(breechPoint).lerp(muzzlePoint,t+.014);
      group.add(shadowRing);
    }
    // Recessed, timber cheek-plates and diagonal recoil breeching ropes follow
    // the cannon carriage into the deck. These are sculptural, never colliders,
    // game controls, projectiles or interactive overlays.
    for(const side of [-1,1]){
      const cheek=new T.Mesh(new T.BoxGeometry(.23,.72,3.7),cheekOak);
      cheek.name='first-person-carriage-cheek';
      cheek.position.set(x+side*1.01,1.44,74.36);
      group.add(cheek);
      for(const z of [73.05,75.75]){
        const bolt=new T.Mesh(new T.SphereGeometry(.14,10,8),bronze);
        bolt.scale.set(.35,1,1);
        bolt.position.set(x+side*1.15,1.52,z);
        group.add(bolt);
      }
      const cable=new T.CatmullRomCurve3([
        new T.Vector3(x+side*.48,1.96,78.05),
        new T.Vector3(x+side*1.00,1.45,77.30),
        new T.Vector3(x+side*1.58,1.02,76.35),
        new T.Vector3(x+side*2.17,.77,76.00)
      ]);
      const breeching=new T.Mesh(new T.TubeGeometry(cable,16,.088,7,false),gunRope);
      breeching.name='first-person-cannon-breeching-rope';
      group.add(breeching);
    }
    const breech=new T.Mesh(new T.SphereGeometry(1.40,16,12),metal);
    breech.position.copy(breechPoint);group.add(breech);
    const flash=new T.Mesh(new T.SphereGeometry(1.15,10,8),fire.clone());
    flash.position.copy(muzzlePoint).addScaledVector(direction,.22);
    flash.visible=false;group.add(flash);flashes.push(flash);
  }
  fire.dispose();
  // Rebalance the foreground after moving the portrait camera toward the ships.
  // Keep both real muzzles inside the lower third, rather than letting them
  // swell over the ships or the five functional touch controls.
  // This group is never visible in Porto.
  group.position.z=-15;
  return {group,flashes};
}
