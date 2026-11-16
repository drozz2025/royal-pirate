import * as T from 'three';

/** Original live Three.js cannon deck for the Batalha portrait camera.
 * Decorative geometry only: aiming, damage and shots remain in Battle.
 * Never displayed in Porto, never replaces the real moving ships.
 */
export function makeBattleDeck(): {group: T.Group; flashes: T.Mesh[]} {
  const group = new T.Group();
  group.name = 'battle-foreground-cannons';
  const wood = new T.MeshStandardMaterial({color:'#834823',roughness:.87});
  const plank = new T.MeshStandardMaterial({color:'#b27740',roughness:.89});
  const darkWood = new T.MeshStandardMaterial({color:'#392b28',roughness:.88});
  const metal = new T.MeshStandardMaterial({color:'#1b2734',metalness:.76,roughness:.30});
  const bronze = new T.MeshStandardMaterial({color:'#e0ae61',metalness:.74,roughness:.27});
  const bore = new T.MeshBasicMaterial({color:'#071019'});
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
  const boreFace=new T.MeshBasicMaterial({color:'#050d13',side:T.DoubleSide});
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
    const darkMuzzle=new T.Mesh(new T.CircleGeometry(1.10,32),boreFace);
    darkMuzzle.position.copy(muzzlePoint).addScaledVector(direction,.045);
    darkMuzzle.quaternion.copy(rimOrientation);group.add(darkMuzzle);
    for(const t of [.20,.48,.75]){
      const hoop=new T.Mesh(new T.TorusGeometry(1.48-t*.34,.09,8,28),bronze);
      hoop.position.copy(breechPoint).lerp(muzzlePoint,t);
      hoop.quaternion.copy(rimOrientation);
      group.add(hoop);
    }
    const breech=new T.Mesh(new T.SphereGeometry(1.40,16,12),metal);
    breech.position.copy(breechPoint);group.add(breech);
    const flash=new T.Mesh(new T.SphereGeometry(1.15,10,8),fire.clone());
    flash.position.copy(muzzlePoint).addScaledVector(direction,.22);
    flash.visible=false;group.add(flash);flashes.push(flash);
  }
  boreFace.dispose();
  fire.dispose();
  // Rebalance the foreground after moving the portrait camera toward the ships.
  // Keep both real muzzles inside the lower third, rather than letting them
  // swell over the ships or the five functional touch controls.
  // This group is never visible in Porto.
  group.position.z=-15;
  return {group,flashes};
}
