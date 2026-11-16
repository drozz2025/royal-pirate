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
  const barrelGeo = new T.CylinderGeometry(.81,1.07,6.6,20);
  const muzzleGeo = new T.TorusGeometry(.84,.16,9,28);
  const boreGeo = new T.CircleGeometry(.70,24);
  const breechGeo = new T.SphereGeometry(.96,14,12);
  const bandGeo = new T.TorusGeometry(.94,.085,8,24);
  const flashes: T.Mesh[] = [];
  for(const x of [-2.65,2.65]){
    addBox(x,1.0,71.7,2.0,.57,4.0,wood);
    addBox(x,1.40,72.5,1.55,.22,2.2,bronze);
    for(const offset of [-1.25,1.25]){
      const wheel = new T.Mesh(wheelGeo,darkWood);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x+offset,.94,72.5);group.add(wheel);
      const hub=new T.Mesh(wheelHub,bronze);
      hub.rotation.z=Math.PI/2;hub.position.set(x+offset+Math.sign(offset)*.18,.94,72.5);group.add(hub);
    }
    const barrel=new T.Mesh(barrelGeo,metal);
    barrel.rotation.x=1.72;barrel.position.set(x,2.11,69.2);group.add(barrel);
    const muzzle=new T.Mesh(muzzleGeo,bronze);
    muzzle.position.set(x,2.59,65.95);group.add(muzzle);
    const darkMuzzle=new T.Mesh(boreGeo,bore);
    darkMuzzle.position.set(x,2.59,65.99);group.add(darkMuzzle);
    for(const [dz,dy] of [[-2.05,.30],[-.35,.07],[1.6,-.24]]){
      const hoop=new T.Mesh(bandGeo,bronze);
      hoop.position.set(x,2.11+dy,69.2+dz);group.add(hoop);
    }
    const breech=new T.Mesh(breechGeo,metal);
    breech.position.set(x,1.65,72.4);group.add(breech);
    const flash=new T.Mesh(new T.SphereGeometry(.92,10,8),fire.clone());
    flash.position.set(x,2.59,65.73);flash.visible=false;group.add(flash);flashes.push(flash);
  }
  fire.dispose();
  // Rebalance the foreground after moving the portrait camera toward the ships.
  // Keep both real muzzles inside the lower third, rather than letting them
  // swell over the ships or the five functional touch controls.
  // This group is never visible in Porto.
  group.position.z=-15;
  return {group,flashes};
}
