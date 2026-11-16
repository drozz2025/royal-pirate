import * as T from 'three';

/**
 * Battle-only 3D foreground of the player's black galleon, framed at the
 * approved 01/02 art's left edge. This is actual textured-by-geometry canvas,
 * not a screenshot, HTML overlay, fake additional target or a gameplay ship.
 * The real ship, hit positions, cannons and all battle inputs remain unchanged.
 * Hidden completely in the approved Porto and other screens.
 */
export const BATTLE_SAIL_BOUNDS = {
  left: -7.10, right: -.90, bottom: 5.20, top: 12.50, depth: 42,
} as const;

function cord(group:T.Group, from:T.Vector3, to:T.Vector3, radius:number, material:T.Material) {
  const dir=to.clone().sub(from);
  const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,dir.length(),7),material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
  group.add(mesh);
  return mesh;
}

export function makeBattleForegroundSail(): T.Group {
  const group=new T.Group();
  group.name='battle-only-black-foreground-sail';
  group.position.set(-4,0,BATTLE_SAIL_BOUNDS.depth);

  const canvas=new T.MeshStandardMaterial({color:'#121c26',roughness:.9,metalness:0,side:T.DoubleSide});
  const edge=new T.MeshStandardMaterial({color:'#a77a3b',roughness:.82});
  const rope=new T.MeshStandardMaterial({color:'#d0b279',roughness:.91});
  const ebony=new T.MeshStandardMaterial({color:'#342418',roughness:.86});
  const bone=new T.MeshStandardMaterial({color:'#f2e7cc',roughness:.94,side:T.DoubleSide});
  const ink=new T.MeshStandardMaterial({color:'#142129',roughness:1,side:T.DoubleSide});

  // A real curved, segmented black sail. The entire panel sits in the left
  // viewport column, below the HP HUD and above the working cannon row.
  const width=6.2, height=7.3, centerY=8.85;
  const geo=new T.PlaneGeometry(width,height,12,12);
  const vertices=geo.attributes.position as T.BufferAttribute;
  for(let i=0;i<vertices.count;i++){
    const u=vertices.getX(i)/width+.5, v=vertices.getY(i)/height+.5;
    vertices.setX(i,vertices.getX(i)*(.89+.11*Math.sin(v*Math.PI)));
    vertices.setZ(i,.12+.4*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)
      +.085*Math.sin(u*Math.PI*5)*Math.sin(v*Math.PI));
  }
  geo.computeVertexNormals();
  const cloth=new T.Mesh(geo,canvas);
  cloth.name='curved-foreground-canvas';
  cloth.position.y=centerY;
  cloth.castShadow=true;
  group.add(cloth);

  // The visible spar and cordage continue to the genuine wooden battle deck;
  // no extra floating duplicate galleon is introduced.
  const xL=-width*.445, xR=width*.445;
  cord(group,new T.Vector3(-3.05,2.5,-.18),new T.Vector3(-3.05,13.12,-.18),.12,ebony);
  cord(group,new T.Vector3(xL,12.48,.12),new T.Vector3(xR,12.48,.12),.095,ebony);
  cord(group,new T.Vector3(xL,12.42,.25),new T.Vector3(xL,5.33,.25),.036,edge);
  cord(group,new T.Vector3(xR,12.42,.25),new T.Vector3(xR,5.33,.25),.036,edge);
  cord(group,new T.Vector3(xL,5.24,.25),new T.Vector3(xR,5.24,.25),.052,edge);
  cord(group,new T.Vector3(-3.05,12.95,-.10),new T.Vector3(2.1,2.7,-.43),.03,rope);
  cord(group,new T.Vector3(-3.05,12.95,-.10),new T.Vector3(-3.8,2.4,-.43),.025,rope);

  // Bold sculpted Jolly Roger motif readable from the mobile battle viewpoint.
  // The emblem is geometry on the sail, not a UI layer over firing controls.
  const emblem=new T.Group();
  emblem.name='foreground-jolly-roger';
  emblem.position.set(-.15,8.95,.72);
  const skull=new T.Mesh(new T.SphereGeometry(.70,16,12),bone);
  skull.scale.set(1,.81,.19);emblem.add(skull);
  const jaw=new T.Mesh(new T.BoxGeometry(.68,.38,.19),bone);
  jaw.position.set(0,-.52,.02);emblem.add(jaw);
  const eyes=new T.CircleGeometry(.21,16);
  for(const side of [-1,1]){
    const eye=new T.Mesh(eyes,ink);
    eye.position.set(side*.32,.12,.17);
    eye.scale.set(.9,1.09,1);
    emblem.add(eye);
  }
  const nose=new T.Mesh(new T.ConeGeometry(.14,.23,3),ink);
  nose.rotation.z=Math.PI;nose.position.set(0,-.20,.18);emblem.add(nose);
  for(let i=-1;i<=1;i++){
    const tooth=new T.Mesh(new T.BoxGeometry(.055,.19,.035),ink);
    tooth.position.set(i*.18,-.58,.135);emblem.add(tooth);
  }
  for(const angle of [-Math.PI/4,Math.PI/4]){
    const across=new T.Group();across.rotation.z=angle;
    const boneBar=new T.Mesh(new T.CylinderGeometry(.092,.092,2.9,9),bone);
    boneBar.position.y=-.9;across.add(boneBar);
    for(const end of [-2.32,.52]){
      for(const side of [-1,1]){
        const knuckle=new T.Mesh(new T.SphereGeometry(.17,9,8),bone);
        knuckle.position.set(side*.10,end,0);across.add(knuckle);
      }
    }
    emblem.add(across);
  }
  group.add(emblem);
  group.userData.battleOnly=true;
  return group;
}
