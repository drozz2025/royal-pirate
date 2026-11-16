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
  const metal = new T.MeshStandardMaterial({color:'#263039',metalness:.68,roughness:.34});
  const bronze = new T.MeshStandardMaterial({color:'#d5a559',metalness:.65,roughness:.32});
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

  const wheelGeo = new T.CylinderGeometry(.68,.68,.24,12);
  const wheelHub = new T.CylinderGeometry(.24,.24,.28,10);
  const barrelGeo = new T.CylinderGeometry(.48,.72,5.7,14);
  const muzzleGeo = new T.TorusGeometry(.5,.105,6,16);
  const breechGeo = new T.SphereGeometry(.66,10,8);
  const flashes: T.Mesh[] = [];
  for(const x of [-2.45,2.45]){
    addBox(x,1.0,71.5,1.6,.45,3.1,wood);
    for(const offset of [-1.05,1.05]){
      const wheel = new T.Mesh(wheelGeo,darkWood);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x+offset,.96,72.1);group.add(wheel);
      const hub=new T.Mesh(wheelHub,bronze);
      hub.rotation.z=Math.PI/2;hub.position.set(x+offset+Math.sign(offset)*.15,.96,72.1);group.add(hub);
    }
    const barrel=new T.Mesh(barrelGeo,metal);
    barrel.rotation.x=Math.PI/2;barrel.position.set(x,1.85,68.9);group.add(barrel);
    const muzzle=new T.Mesh(muzzleGeo,bronze);
    muzzle.position.set(x,1.85,66.0);group.add(muzzle);
    const breech=new T.Mesh(breechGeo,metal);
    breech.position.set(x,1.85,71.75);group.add(breech);
    const flash=new T.Mesh(new T.SphereGeometry(.66,9,7),fire.clone());
    flash.position.set(x,1.85,65.75);flash.visible=false;group.add(flash);flashes.push(flash);
  }
  fire.dispose();
  // Rebalance the foreground after moving the portrait camera toward the ships.
  // Keep both real muzzles inside the lower third, rather than letting them
  // swell over the ships or the five functional touch controls.
  // This group is never visible in Porto.
  group.position.z=-15;
  return {group,flashes};
}
