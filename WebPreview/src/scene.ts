import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Battle, predict, SHIPS, type BattleEvent } from './battle';
import { SoftwareRenderer } from './software-renderer';
import { PirateAudio } from './audio';
import { makeShip, type ShipArt } from './ships';
import { hullImpactPlacement } from './impact-visuals';
import { rippleState } from './water-vfx';
import { cannonFxState, CANNON_FX_DURATION } from './cannon-vfx';
import { battleCameraPose } from './battle-framing';
import { makeBattleDeck } from './battle-deck';
import { createBattleSkyTexture } from './battle-atmosphere';
export type Metrics = { fps: number; renderMs: number; calls: number; triangles: number; geometries: number; textures: number; effects: number; heapMB?: number };
export class OceanScene {
  renderer: T.WebGLRenderer | SoftwareRenderer; compatibility=false; scene=new T.Scene(); camera=new T.PerspectiveCamera(42,1,.1,220); controls: OrbitControls;
  ships: Record<'player'|'enemy',ShipArt>; private water: T.ShaderMaterial; private raf=0; private previous=0; private elapsed=0;
  private canvas: HTMLCanvasElement; private resizeObserver: ResizeObserver; private trail: T.Line;
  private pathGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(240*3),3)); private path: T.Line; private marker: T.Mesh;
  private ball: T.Mesh; private particleGeometry=new T.IcosahedronGeometry(1,0); private particleMaterial=new T.MeshBasicMaterial({color:'#fff'});
  private particles: { mesh:T.Mesh;velocity:T.Vector3;age:number;life:number;size:number;smoke:boolean }[]=[];
  private pool:T.Mesh[]=[]; private foam:T.Mesh[]=[]; private muzzleFlash:Partial<Record<'player'|'enemy',T.Mesh>>={}; private recoilAge:Record<'player'|'enemy',number>={player:Infinity,enemy:Infinity}; private ripplePool:T.Mesh[]=[]; private ripples:{mesh:T.Mesh;age:number;life:number}[]=[]; private impactCounts:Record<'player'|'enemy',number>={player:0,enemy:0}; private lastAim=''; private cameraMode:'battle'|'deck'|'harbour'='battle'; private harbourDock=new T.Group(); private worldScenery=new T.Group(); private battleBattery=new T.Group(); private batteryFlashes:T.Mesh[]=[]; private battleSky:T.CanvasTexture; private shake=0;
  private shipPointers=new Set<number>(); private shipStart: {x:number;y:number}|null=null; private shipMoved=false;
  private renderMs=0;private lastRender=0;private frameSamples:number[]=[];private metricsAt=0; private pirateAudio=new PirateAudio(); paused=false; disposed=false;
  private onContextLost=(event:Event)=>{event.preventDefault();this.paused=true;this.onError('The 3D view was interrupted. Reload to restore the ocean.');};
  private onVisibility=()=>{this.previous=0;this.pirateAudio.setHidden(document.hidden);};
  constructor(private host:HTMLElement, public battle:Battle, private onFrame:()=>void,private onMetrics:(m:Metrics)=>void,private onError:(message:string)=>void,private onShipSelection:(selected:boolean)=>void=()=>{}){
    const probe=document.createElement('canvas');const context=probe.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
    this.compatibility=!context;this.renderer=context?new T.WebGLRenderer({canvas:probe,context,antialias:true,alpha:false}):new SoftwareRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.canvas=this.renderer.domElement;host.append(this.canvas);this.canvas.setAttribute('aria-label','3D naval battlefield. Drag to orbit, pinch to zoom.');
    this.canvas.addEventListener('webglcontextlost',this.onContextLost);
    this.canvas.addEventListener('pointerdown',this.shipPointerDown,true);
    this.canvas.addEventListener('pointermove',this.shipPointerMove,true);
    this.canvas.addEventListener('pointerup',this.shipPointerUp,true);
    this.canvas.addEventListener('pointercancel',this.shipPointerUp,true);
    this.battleSky=createBattleSkyTexture();
    this.scene.background=this.battleSky;this.scene.fog=new T.FogExp2('#9ddff4',.0055);
    const hemi=new T.HemisphereLight('#e7f8ff','#497f8b',2.6);this.scene.add(hemi);
    const sun=new T.DirectionalLight('#ffe3af',3.6);sun.position.set(-24,40,15);this.scene.add(sun);
    const rim=new T.DirectionalLight('#97deff',1.4);rim.position.set(16,12,-18);this.scene.add(rim);
    this.water=new T.ShaderMaterial({uniforms:{time:{value:0},sun:{value:new T.Vector3(-24,40,15).normalize()},battleMode:{value:1}},vertexShader:`
      uniform float time; varying vec3 vWorld; varying vec3 vNormal; varying float vWave;
      float wave(vec2 p){return sin(p.x*.47+time*1.15)*.12+sin(p.y*.68-time*1.3)*.08+sin((p.x+p.y)*1.3-time*1.7)*.035;}
      void main(){vec3 p=position;p.z=wave(p.xy);float dx=(wave(p.xy+vec2(.05,0.))-p.z)/.05;float dy=(wave(p.xy+vec2(0.,.05))-p.z)/.05;vNormal=normalize(mat3(modelMatrix)*vec3(-dx,-dy,1.));vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vWave=p.z;gl_Position=projectionMatrix*viewMatrix*world;}
    `,fragmentShader:`
      uniform float time;uniform vec3 sun;uniform float battleMode;
      varying vec3 vWorld;varying vec3 vNormal;varying float vWave;
      void main(){
        vec3 view=normalize(cameraPosition-vWorld);
        vec3 n=normalize(vNormal);
        float fres=pow(1.-max(dot(view,n),0.),3.);
        float spec=pow(max(dot(n,normalize(sun+view)),0.),95.);
        float pattern=sin(vWorld.x*2.4+sin(vWorld.z*1.7+time)*1.5)*sin(vWorld.z*2.8-time*1.4);
        float chop=sin(vWorld.x*5.1+time*3.2)*sin(vWorld.z*4.7-time*2.4);
        float oldFoam=smoothstep(.86,1.,pattern)*.16+smoothstep(.91,1.,chop+vWave*.28)*.07;
        vec3 col=mix(vec3(.009,.30,.50),vec3(.025,.66,.86),clamp(.5+vWave*2.,0.,1.));
        col=mix(col,vec3(.38,.78,.83),fres*.7);
        col+=vec3(.72,.93,.91)*oldFoam+vec3(1.,.86,.55)*spec*.85;
        float fog=1.-exp(-length(cameraPosition-vWorld)*.008);
        col=mix(col,vec3(.6,.85,.87),fog);
        // Battle-only whitecaps: waves remain animated and ship collisions untouched.
        if(battleMode>.5){
          float swell=sin(vWorld.z*.51+sin(vWorld.x*.26+time*.37)*1.65-time*.87);
          float cross=sin(vWorld.x*.97-vWorld.z*.24+time*.68);
          float crest=sin(vWorld.x*3.6+vWorld.z*1.8+sin(vWorld.z*2.2-time)*.9-time*3.1);
          float flecks=sin(vWorld.x*8.2-vWorld.z*5.1+time*4.0);
          float ridge=smoothstep(.18,.78,swell*.56+cross*.29+crest*.38);
          float whiteCap=smoothstep(.30,.88,crest*.72+flecks*.28)*ridge;
          float distanceToEye=length(cameraPosition.xz-vWorld.xz);
          float proximity=1.-smoothstep(20.,88.,distanceToEye);
          float foam=clamp(ridge*.36+whiteCap*.81,0.,1.)*(.67+.33*proximity);
          // Animated surf around the actual battle hull locations. These white
          // wakes live in the water shader, not in an image over the controls.
          vec2 playerShip=vec2(-10.,3.);
          vec2 enemyShip=vec2(10.,-3.);
          float a=length((vWorld.xz-playerShip)/vec2(3.2,6.8));
          float b=length((vWorld.xz-enemyShip)/vec2(3.2,6.8));
          float hullSurf=max(exp(-pow((a-.88)*5.2,2.)),exp(-pow((b-.88)*5.2,2.)));
          float streamA=exp(-pow((vWorld.x+10.)/4.7,2.))
            *smoothstep(1.5,6.5,3.-vWorld.z)*(1.-smoothstep(12.,38.,3.-vWorld.z));
          float streamB=exp(-pow((vWorld.x-10.)/4.7,2.))
            *smoothstep(1.5,6.5,-3.-vWorld.z)*(1.-smoothstep(12.,38.,-3.-vWorld.z));
          float streamRipples=.54+.46*sin(vWorld.z*2.5-time*3.4+sin(vWorld.x*.92));
          foam=max(foam,clamp(hullSurf*.68+(streamA+streamB)*streamRipples*.33,0.,.83));
          vec3 deep=mix(vec3(.014,.20,.39),vec3(.012,.43,.63),
                        clamp(.52+vWave*1.7+swell*.22+cross*.09,0.,1.));
          deep=mix(deep,vec3(.27,.72,.83),fres*.34);
          col=mix(deep,vec3(.80,.95,.95),foam);
          col+=vec3(.89,.96,.82)*spec*.4;
          col=mix(col,vec3(.30,.66,.84),fog*.42);
        }
        gl_FragColor=vec4(col,1.);
      }
    `});
    const ocean=new T.Mesh(new T.PlaneGeometry(210,210,190,190),this.water);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.05;this.scene.add(ocean);
    this.ships={player:makeShip(false),enemy:makeShip(true)};
    for(const side of ['player','enemy'] as const){this.ships[side].root.position.set(SHIPS[side].x,0,SHIPS[side].z);this.scene.add(this.ships[side].root);
      const foam=new T.Mesh(new T.RingGeometry(1,1.09,40),new T.MeshBasicMaterial({color:'#b5f9ed',transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}));foam.rotation.x=-Math.PI/2;foam.scale.set(2.3,5.3,1);foam.position.set(SHIPS[side].x,.09,SHIPS[side].z);this.scene.add(foam);this.foam.push(foam);
    }
    // A single pooled flash per ship rides the correct firing-side centre gun.
    // No dynamic geometry or material allocations during a cannon shot.
    const flashGeometry=new T.SphereGeometry(1,10,8);
    const flashMaterial=new T.MeshBasicMaterial({color:'#ffda79',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
    for(const side of ['player','enemy'] as const){
      const direction=side==='player'?1:-1;
      const gun=this.ships[side].guns.find(g=>Math.sign(g.position.x)===direction&&Math.abs(g.position.z)<.1);
      if(!gun)continue;
      const flash=new T.Mesh(flashGeometry,flashMaterial.clone());
      flash.position.set(direction*1.15,0,0);flash.visible=false;gun.add(flash);this.muzzleFlash[side]=flash;
    }
    flashMaterial.dispose();
    this.environment();this.scene.add(this.worldScenery);this.buildHarbourDock();this.buildPortBackdrop();this.buildHarbourDetails();this.scene.add(this.harbourDock);
    // A real low-poly teak deck and pair of cannons frame the battle in portrait.
    // This geometry is never shown over the already-approved Porto scene.
    const battery=makeBattleDeck();this.battleBattery=battery.group;this.batteryFlashes=battery.flashes;this.battleBattery.visible=false;this.scene.add(this.battleBattery);
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=18;this.controls.maxDistance=110;this.controls.minPolarAngle=.32;this.controls.maxPolarAngle=1.28;this.controls.target.set(0,2,0);this.controls.rotateSpeed=.5;
    this.path=new T.Line(this.pathGeometry,new T.LineDashedMaterial({color:'#f9e5a4',dashSize:.35,gapSize:.2,transparent:true,opacity:.85}));this.scene.add(this.path);
    this.marker=new T.Mesh(new T.RingGeometry(.48,.58,36),new T.MeshBasicMaterial({color:'#ffdf7e',side:T.DoubleSide,transparent:true,opacity:.9,depthTest:false}));this.marker.rotation.x=-Math.PI/2;this.scene.add(this.marker);
    this.ball=new T.Mesh(new T.SphereGeometry(.22,12,8),new T.MeshStandardMaterial({color:'#262731',metalness:.8,roughness:.2,emissive:'#e87524',emissiveIntensity:.35}));this.ball.visible=false;this.scene.add(this.ball);
    this.trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#ffde8c',transparent:true,opacity:.9}));this.scene.add(this.trail);
    // All effects reuse a bounded mesh pool; no geometry/material allocation per shot.
    for(let i=0;i<160;i++){const mesh=new T.Mesh(this.particleGeometry,this.particleMaterial.clone());mesh.visible=false;this.scene.add(mesh);this.pool.push(mesh);}
    // Reuse eight foam shockwave rings: no allocations on cannon fire or impact.
    const rippleGeometry=new T.RingGeometry(.75,1,32);
    const rippleMaterial=new T.MeshBasicMaterial({color:'#d8faff',side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false});
    for(let i=0;i<8;i++){const ring=new T.Mesh(rippleGeometry,rippleMaterial.clone());ring.rotation.x=-Math.PI/2;ring.visible=false;this.scene.add(ring);this.ripplePool.push(ring);}
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.home();document.addEventListener('visibilitychange',this.onVisibility);this.raf=requestAnimationFrame(this.animate);
  }
  private environment(){
    const stone=new T.MeshStandardMaterial({color:'#7c9291',flatShading:true}),green=new T.MeshStandardMaterial({color:'#427e55',flatShading:true}),sand=new T.MeshStandardMaterial({color:'#d4c28a'});
    const rockGeo=new T.IcosahedronGeometry(1,1), trunkMat=new T.MeshStandardMaterial({color:'#805431'}), leafGeo=new T.SphereGeometry(1,6,4);
    for(const [x,z,size] of [[-30,-30,6],[10,-46,8],[37,-25,5],[-48,10,5]]){
      const beach=new T.Mesh(rockGeo,sand);beach.position.set(x,-1,z);beach.scale.set(size*1.7,2,size);this.worldScenery.add(beach);
      for(let i=0;i<4;i++){const rock=new T.Mesh(rockGeo,stone);rock.position.set(x+Math.sin(i*2)*size*.6,size*.35,z+Math.cos(i*2)*size*.3);rock.scale.set(size*.7,size*(.6+i*.12),size*.6);this.worldScenery.add(rock);
        const top=new T.Mesh(rockGeo,green);top.position.copy(rock.position);top.position.y+=size*.6;top.scale.set(size*.6,.65,size*.5);this.worldScenery.add(top);}
      for(let i=0;i<3;i++){const px=x+(i-1)*size*.75,pz=z+size*.6,py=1.3;const trunk=new T.Mesh(new T.CylinderGeometry(.12,.22,4,6),trunkMat);trunk.position.set(px,py+2,pz);trunk.rotation.z=(i-1)*.12;this.worldScenery.add(trunk);
        for(let j=0;j<6;j++){const leaf=new T.Mesh(leafGeo,green);const a=j*Math.PI/3;leaf.position.set(px+Math.cos(a)*.9,py+4,pz+Math.sin(a)*.9);leaf.scale.set(1.6,.12,.42);leaf.rotation.y=-a;leaf.rotation.z=.15;this.worldScenery.add(leaf);}}
    }
    // Distant lighthouse and clouds frame the arena without covering the vessels.
    const tower=new T.Mesh(new T.CylinderGeometry(.8,1.3,6,12),new T.MeshStandardMaterial({color:'#e3d4af'}));tower.position.set(10,12,-46);this.worldScenery.add(tower);
    const roof=new T.Mesh(new T.ConeGeometry(1.5,1.3,12),new T.MeshStandardMaterial({color:'#af5a42'}));roof.position.set(10,15.6,-46);this.worldScenery.add(roof);
    const cloudMat=new T.MeshBasicMaterial({color:'#e5f1ed',transparent:true,opacity:.7});
    for(let i=0;i<12;i++){const cloud=new T.Mesh(new T.SphereGeometry(1,10,6),cloudMat);cloud.position.set(-60+i*12,22+Math.sin(i)*3,-65-Math.cos(i)*10);cloud.scale.set(6,1.8,2.8);this.worldScenery.add(cloud);}
    const gullGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.6,0,0),new T.Vector3(0,-.2,0),new T.Vector3(.6,0,0)]);
    for(let i=0;i<6;i++){const gull=new T.Line(gullGeo,new T.LineBasicMaterial({color:'#456770'}));gull.position.set(-18+i*7,16+Math.sin(i)*2,-25);this.worldScenery.add(gull);}
  }
  /** Port furniture created from original geometry, with no new textures or downloaded assets. */
  private buildHarbourDock(){
    const plankMat=new T.MeshStandardMaterial({color:'#9d6038',roughness:.83});
    const postMat=new T.MeshStandardMaterial({color:'#5c3421',roughness:.82});
    const iron=new T.MeshStandardMaterial({color:'#253e49',metalness:.4,roughness:.57});
    const lit=new T.MeshStandardMaterial({color:'#ffda71',emissive:'#ffac2c',emissiveIntensity:1.25});
    const boardGeo=new T.BoxGeometry(3.3,.22,.56),postGeo=new T.CylinderGeometry(.21,.24,2.8,8);
    const railGeo=new T.CylinderGeometry(.055,.055,3.2,6),barrelGeo=new T.CylinderGeometry(.43,.4,.78,10);
    for(const side of [-1,1]){
      const x=SHIPS.player.x+side*9.2,z=SHIPS.player.z+2;
      for(let i=0;i<8;i++){
        const p=new T.Mesh(boardGeo,plankMat);p.position.set(x,.38,z+i*.6);this.harbourDock.add(p);
      }
      for(const dx of [-1.55,1.55])for(const dz of [0,3.7]){
        const p=new T.Mesh(postGeo,postMat);p.position.set(x+dx,.12,z+dz);this.harbourDock.add(p);
        const cap=new T.Mesh(new T.CylinderGeometry(.26,.26,.16,8),iron);cap.position.set(x+dx,1.56,z+dz);this.harbourDock.add(cap);
      }
      for(let i=0;i<2;i++){
        const barrel=new T.Mesh(barrelGeo,plankMat);barrel.position.set(x+(i?-.7:.8),1.16,z+1.4+i*1.3);this.harbourDock.add(barrel);
        const band=new T.Mesh(new T.TorusGeometry(.42,.055,5,12),iron);band.rotation.x=Math.PI/2;band.position.copy(barrel.position);band.position.y+=.24;this.harbourDock.add(band);
      }
      const lampPost=new T.Mesh(new T.CylinderGeometry(.07,.07,2,7),iron);lampPost.position.set(x+side*1.3,1.65,z+.4);this.harbourDock.add(lampPost);
      const lantern=new T.Mesh(new T.SphereGeometry(.26,10,8),lit);lantern.position.set(x+side*1.3,2.8,z+.4);this.harbourDock.add(lantern);
      // A small rail reinforces the silhouette without introducing physics colliders.
      const rail=new T.Mesh(railGeo,postMat);rail.rotation.x=Math.PI/2;rail.position.set(x+side*1.48,1.1,z+1.85);this.harbourDock.add(rail);
    }
    // Treasure chest anchored in world space on the left jetty, not a floating HUD badge.
    const chest=new T.Group();
    chest.position.set(SHIPS.player.x-9.2,.49,SHIPS.player.z+3.35);
    const chestTimber=new T.MeshStandardMaterial({color:'#85411e',roughness:.8});
    const chestLid=new T.MeshStandardMaterial({color:'#b36b31',roughness:.68});
    const chestGold=new T.MeshStandardMaterial({color:'#f0be58',metalness:.62,roughness:.35});
    const chestLock=new T.MeshStandardMaterial({color:'#5c351a',metalness:.22,roughness:.6});
    function chestPart(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){
      const part=new T.Mesh(geometry,material);part.position.set(x,y,z);chest.add(part);return part;
    }
    chestPart(new T.BoxGeometry(2.05,.85,1.24),chestTimber,0,.44,0);
    chestPart(new T.BoxGeometry(2.2,.34,1.36),chestLid,0,1.02,0);
    for(const x of [-.73,.73]){
      chestPart(new T.BoxGeometry(.15,1.25,1.43),chestGold,x,.66,0);
      chestPart(new T.BoxGeometry(.24,.20,1.42),chestGold,x,1.14,0);
    }
    chestPart(new T.BoxGeometry(2.18,.13,1.36),chestGold,0,.13,0);
    chestPart(new T.BoxGeometry(.37,.43,.12),chestGold,0,.79,.72);
    chestPart(new T.BoxGeometry(.16,.22,.15),chestLock,0,.76,.81);
    this.harbourDock.add(chest);
    this.harbourDock.visible=false;
  }
  /** Separate original low-poly town, palms and striped beacon, visible only in Porto.
   * Positioned behind the playable ship. The approved art is not used as a flat backdrop. */
  private buildPortBackdrop(){
    const port=this.harbourDock,ship=SHIPS.player;
    const stone=new T.MeshStandardMaterial({color:'#969f96',flatShading:true,roughness:.94});
    const grass=new T.MeshStandardMaterial({color:'#529458',flatShading:true,roughness:1});
    const sand=new T.MeshStandardMaterial({color:'#e6c98b',roughness:1});
    const plaster=[new T.MeshStandardMaterial({color:'#f5e8bf',roughness:1}),
      new T.MeshStandardMaterial({color:'#edcbaa',roughness:1}),
      new T.MeshStandardMaterial({color:'#f1e4cd',roughness:1})];
    const roofMat=new T.MeshStandardMaterial({color:'#b14c32',roughness:.8});
    const trimMat=new T.MeshStandardMaterial({color:'#5a4634',roughness:.88});
    const seaMat=new T.MeshStandardMaterial({color:'#fce8b5',emissive:'#f5d38d',emissiveIntensity:.3});
    const box=new T.BoxGeometry(1,1,1),isle=new T.IcosahedronGeometry(1,1);
    // City and hills behind the vessel: avoid occluding the foreground 3D hull.
    for(const [side,dx,dz] of [[-1,-8,-27],[1,25,-11]] as const){
      const x=ship.x+dx,z=ship.z+dz;
      const beach=new T.Mesh(isle,sand);beach.scale.set(7,2,4.5);beach.position.set(x,-.6,z);port.add(beach);
      const cliff=new T.Mesh(isle,stone);cliff.scale.set(6.2,4.8,4);cliff.position.set(x,1.1,z-1.2);port.add(cliff);
      const shrub=new T.Mesh(isle,grass);shrub.scale.set(5.9,1.2,3.7);shrub.position.set(x,4.5,z-1.2);port.add(shrub);
      for(let i=0;i<4;i++){
        const bx=x+(i-1.5)*2.15,bz=z-1.8+(i%2)*1.5;
        const height=2.1+(i%3)*.72;
        const building=new T.Mesh(box,plaster[i%3]);building.position.set(bx,5.2+height/2,bz);
        building.scale.set(1.75,height,1.65);port.add(building);
        const roof=new T.Mesh(new T.ConeGeometry(1.36,1.35,4),roofMat);
        roof.rotation.y=Math.PI/4;roof.position.set(bx,5.2+height+.5,bz);port.add(roof);
        const door=new T.Mesh(box,trimMat);door.scale.set(.4,.84,.06);
        door.position.set(bx,5.35,bz+.86);port.add(door);
      }
      // Layered palms on the green slopes, with 6 long curved leaves each.
      for(let p=0;p<3;p++){
        const px=x+(p-1)*2.65,pz=z+1.8+p%2;
        const trunk=new T.Mesh(new T.CylinderGeometry(.10,.19,3.5,7),trimMat);
        trunk.position.set(px,6.7,pz);trunk.rotation.z=(p-1)*.16;port.add(trunk);
        for(let j=0;j<6;j++){
          const theta=j*Math.PI/3;
          const leaf=new T.Mesh(new T.SphereGeometry(1,7,4),grass);
          leaf.position.set(px+Math.cos(theta)*.88,8.5,pz+Math.sin(theta)*.88);
          leaf.scale.set(1.25,.12,.37);leaf.rotation.y=-theta;leaf.rotation.z=.13;
          port.add(leaf);
        }
      }
      if(side===1){
        // A working harbor landmark: original white/red lighthouse and glowing beacon.
        const baseX=x+2.3,baseZ=z+.5;
        const white=new T.MeshStandardMaterial({color:'#f9f3dc',roughness:.8});
        const red=new T.MeshStandardMaterial({color:'#c95a42',roughness:.8});
        for(let j=0;j<5;j++){
          const tier=new T.Mesh(new T.CylinderGeometry(1-.10*(j+1),1-.10*j,1.65,12),j%2===0?white:red);
          tier.position.set(baseX,5.3+j*1.65+.82,baseZ);port.add(tier);
        }
        const gallery=new T.Mesh(new T.CylinderGeometry(.95,.95,.3,12),trimMat);
        gallery.position.set(baseX,13.8,baseZ);port.add(gallery);
        const bulb=new T.Mesh(new T.SphereGeometry(.45,10,8),seaMat);bulb.position.set(baseX,14.4,baseZ);port.add(bulb);
        const cap=new T.Mesh(new T.ConeGeometry(1.15,1.3,12),roofMat);cap.position.set(baseX,15.1,baseZ);port.add(cap);
        // Shadowed lantern gallery and four long window slits give the beacon
        // a clear maritime silhouette rather than a blank striped cylinder.
        const glass=new T.MeshStandardMaterial({color:'#154d69',metalness:.25,roughness:.36,
          emissive:'#ffd37b',emissiveIntensity:.2});
        for(let a=0;a<4;a++){
          const angle=a*Math.PI/2;
          const window=new T.Mesh(new T.BoxGeometry(.24,.76,.11),glass);
          window.position.set(baseX+Math.sin(angle)*.73,12.05,baseZ+Math.cos(angle)*.73);
          window.rotation.y=angle;port.add(window);
        }
      }
    }
  }

  /** Extra architectural layers for the approved tropical harbour.
   * Original 3D geometry is switched off outside Porto; nothing here is a screenshot.
   * Materials and primitive geometries are shared to keep mobile memory bounded.
   */
  private buildHarbourDetails(){
    const port=this.harbourDock,ship=SHIPS.player;
    const cream=new T.MeshStandardMaterial({color:'#f7dfad',roughness:.92});
    const ivory=new T.MeshStandardMaterial({color:'#fff2d2',roughness:.9});
    const coral=new T.MeshStandardMaterial({color:'#c66745',roughness:.82});
    const stone=new T.MeshStandardMaterial({color:'#a6a795',roughness:.95});
    const darkStone=new T.MeshStandardMaterial({color:'#747b78',roughness:.95});
    const leaf=new T.MeshStandardMaterial({color:'#348a4e',roughness:.94,side:T.DoubleSide});
    const palmWood=new T.MeshStandardMaterial({color:'#6f4c30',roughness:.92});
    const wood=new T.MeshStandardMaterial({color:'#81512d',roughness:.84});
    const gold=new T.MeshStandardMaterial({color:'#f9c75a',metalness:.5,roughness:.3});
    const windowMat=new T.MeshStandardMaterial({color:'#21546b',roughness:.64});
    const block=new T.BoxGeometry(1,1,1),cone=new T.ConeGeometry(1,1,4);
    const cylinder=new T.CylinderGeometry(1,1,1,8),rock=new T.IcosahedronGeometry(1,1);
    function add(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1){
      const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);port.add(mesh);
      return mesh;
    }
    // A layered Mediterranean fortress with staggered towers and battlements.
    // Located behind the player ship so sails remain a clear touch target.
    const castleX=ship.x+20,castleZ=ship.z-24;
    add(rock,darkStone,castleX,.8,castleZ,8,5.7,5.6);
    add(rock,leaf,castleX,4.0,castleZ,8,1.7,5.9);
    for(const [dx,dz,h] of [[-4.5,0,7],[2.9,-2,8.8],[-.6,-1.8,6.4]]){
      const x=castleX+dx,z=castleZ+dz;
      add(block,cream,x,3.5+h/2,z,2.4,h,2.25);
      add(block,stone,x,3.6+h,z,2.8,.46,2.6);
      for(const xx of [-1.03,0,1.03]){
        add(block,ivory,x+xx,4.05+h,z+1.08,.45,.76,.38);
      }
      const roof=add(cone,coral,x,4.65+h,z,1.95,1.75,1.95);
      roof.rotation.y=Math.PI/4;
      for(let j=0;j<2;j++){
        add(block,windowMat,x,4.9+j*1.65,z+1.17,.52,.78,.08);
        add(block,ivory,x,4.9+j*1.65-.47,z+1.24,.69,.12,.12);
      }
      // Golden heraldic banners add identifiable architecture without flat art.
      const banner=add(block,coral,x-.64,3.7+h*.44,z+1.23,.58,1.24,.075);
      banner.rotation.z=-.05;
      add(block,gold,x-.64,4.33+h*.44,z+1.28,.66,.10,.10);
    }
    // Sunlit whitewashed houses fill the coast, with readable coloured windows.
    const houses:[number,number,number,number][]=[
      [7,-19,3.0,2.6],[9,-22,3.8,2.2],[14,-24,4.2,2.9],
      [16,-27,2.8,2.5],[22,-13,3.1,2.9],[26,-15,4.3,3.2],
      [30,-17,3.6,2.8],[24,-9,2.5,2.4]
    ];
    for(let i=0;i<houses.length;i++){
      const [ox,oz,h,w]=houses[i],x=ship.x+ox,z=ship.z+oz,y=4.7+h*.5;
      add(block,i%3===0?ivory:cream,x,y,z,w,h,w*.78);
      const roof=add(cone,coral,x,y+h/2+.65,z,w*.86,1.5,w*.75);
      roof.rotation.y=Math.PI/4;
      for(const side of [-1,1]){
        add(block,windowMat,x+side*w*.23,y+.2,z+w*.39+.04,.36,.57,.08);
        add(block,ivory,x+side*w*.23,y+.2,z+w*.39+.09,.44,.07,.10);
      }
      add(block,wood,x,y-h*.26,z+w*.39+.06,.56,h*.46,.09);
      // Dark arched lintels, terracotta ledges and pale facade edging are
      // readable at phone size; only a handful of shared box geometries.
      add(block,coral,x,y+h*.34,z+w*.39+.10,w*.80,.12,.15);
      add(block,ivory,x-w*.42,y,z+w*.39+.08,.10,h*.85,.10);
      add(block,ivory,x+w*.42,y,z+w*.39+.08,.10,h*.85,.10);
    }
    // 3D tapered palm leaves, built as triangles with a curved drooping tip.
    const frondGeo=new T.BufferGeometry();
    frondGeo.setAttribute('position',new T.Float32BufferAttribute([
      0,0,0, 1.65,.16,.18, 2.7,-.30,0,
      0,0,0, 2.7,-.30,0, 1.50,.14,-.27
    ],3));
    frondGeo.computeVertexNormals();
    const palms:[number,number,number][]=[
      [-23,-23,5.7],[-13,-22,6.2],[-8,-29,5.0],[18,-11,5.6],
      [28,-11,6.8],[24,-18,5.0]
    ];
    for(const [ox,oz,h] of palms){
      const x=ship.x+ox,z=ship.z+oz;
      const trunk=add(cylinder,palmWood,x,h/2+4.8,z,.20,h,.24);
      trunk.rotation.z=ox<0?-.12:.12;
      for(let i=0;i<8;i++){
        const leafMesh=new T.Mesh(frondGeo,leaf);
        leafMesh.position.set(x,4.8+h,z);
        leafMesh.rotation.y=i*Math.PI/4;
        leafMesh.rotation.z=(i%2===0?.06:-.06);
        port.add(leafMesh);
      }
      add(rock,leaf,x,4.9,z,1.1,.26,1.1);
    }
    // Near-water pilings, rope rails and lanterns frame the bottom of the screen.
    // These remain to the sides; no decorative overlay may intercept ship touches.
    const railwood=new T.CylinderGeometry(.11,.14,2.4,8);
    for(const side of [-1,1]){
      const x=ship.x+side*11.5;
      for(let i=0;i<5;i++){
        const z=ship.z+9+i*1.9;
        add(railwood,wood,x,.65,z,1,1,1);
        add(new T.CylinderGeometry(.18,.18,.17,8),gold,x,1.94,z);
      }
    }
  }

  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.cameraMode==='battle')this.home();else if(this.cameraMode==='harbour')this.showHarbour();}
  home(){this.cameraMode='battle';this.scene.background=this.battleSky;this.water.uniforms.battleMode.value=1;
    // Cinematic battle-only art scale; the genuine physics ships and hit logic stay live.
    // Reset to the original size in Porto so its approved composition/touch remain identical.
    this.ships.player.root.scale.setScalar(1.25);this.ships.enemy.root.scale.setScalar(1.38);
    // Comparison at 390x844 showed that the tighter off-axis lens clips the
    // live player ship. Restore both hulls fully inside the playable viewport.
    this.camera.fov=42;this.camera.updateProjectionMatrix();
    const pose=battleCameraPose(this.host.clientWidth/Math.max(1,this.host.clientHeight));
    this.camera.position.set(...pose.position);
    this.controls.target.set(...pose.target);this.controls.maxPolarAngle=pose.showBattery?1.50:1.28;this.battleBattery.visible=pose.showBattery;this.battleBattery.position.z=pose.batteryOffsetZ;this.controls.update();}
  deck(){this.cameraMode='deck';this.camera.position.set(-17,7,12);this.controls.target.set(8,3,-2);this.controls.update();}
  /** A real, close-up 3D harbour view: the player's animated ship, not a static mockup. */
  showHarbour(){
    this.cameraMode='harbour';this.camera.fov=42;this.camera.updateProjectionMatrix();
    this.scene.background=new T.Color('#58baf1');this.water.uniforms.battleMode.value=0;
    this.ships.player.root.scale.setScalar(1);this.ships.enemy.root.scale.setScalar(1);
    this.shipPointers.clear();this.shipStart=null;this.battleBattery.visible=false;this.worldScenery.visible=true;this.ships.enemy.root.visible=false;this.foam[1].visible=false;this.harbourDock.visible=true;
    this.path.visible=false;this.marker.visible=false;this.ball.visible=false;this.trail.visible=false;
    this.controls.enableRotate=false;this.controls.enableZoom=false;this.controls.maxPolarAngle=1.28;
    const ship=SHIPS.player,portrait=this.host.clientWidth/Math.max(1,this.host.clientHeight)<.85;
    this.controls.target.set(ship.x,portrait?3.5:2.9,ship.z+(portrait?1:0));
    // Verified in the 390x844 Chromium capture: the old close camera cropped
    // the starboard bow, left flank and upper sails. Pull back in portrait so
    // all four live sails fit between the HUD columns and clear the battle CTA.
    // Keep the ship raycast-touchable; never substitute a flat hero picture.
    this.camera.position.set(ship.x-(portrait?26.4:18),portrait?11.4:9.4,ship.z+(portrait?23.3:17));
    this.controls.update();
  }
  /** Harbour only: activate OrbitControls if touch begins on real ship geometry. */
  private shipPointerDown=(event:PointerEvent)=>{
    if(this.cameraMode!=='harbour'||this.paused)return;
    const box=this.canvas.getBoundingClientRect();
    if(!box.width||!box.height)return;
    const p=new T.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);
    const ray=new T.Raycaster();ray.setFromCamera(p,this.camera);
    const hit=ray.intersectObject(this.ships.player.root,true).length>0;
    if(!hit&&!this.shipPointers.size){this.onShipSelection(false);return;}
    this.shipPointers.add(event.pointerId);
    if(!this.shipStart)this.shipStart={x:event.clientX,y:event.clientY};
    this.shipMoved=false;
    this.controls.enableRotate=true;this.controls.enableZoom=true;
  };
  private shipPointerMove=(event:PointerEvent)=>{
    if(this.cameraMode!=='harbour'||!this.shipPointers.has(event.pointerId)||!this.shipStart)return;
    if(Math.hypot(event.clientX-this.shipStart.x,event.clientY-this.shipStart.y)>6)this.shipMoved=true;
  };
  private shipPointerUp=(event:PointerEvent)=>{
    if(!this.shipPointers.has(event.pointerId))return;
    this.shipPointers.delete(event.pointerId);
    if(!this.shipMoved)this.onShipSelection(true);
    if(this.shipPointers.size===0){this.shipStart=null;this.controls.enableRotate=false;this.controls.enableZoom=false;}
  };
  /** Returns to the existing working battle camera, with both ships visible. */
  showBattle(){this.water.uniforms.battleMode.value=1;this.shipPointers.clear();this.shipStart=null;this.ships.enemy.root.visible=true;this.foam[1].visible=true;this.harbourDock.visible=false;this.worldScenery.visible=false;this.controls.enableRotate=true;this.controls.enableZoom=true;this.controls.minDistance=18;this.controls.maxDistance=110;this.home();}
  toggleMusic(){return this.pirateAudio.toggleMusic();}
  toggleEffects(){return this.pirateAudio.toggleEffects();}
  private effect(event:BattleEvent){
    this.pirateAudio.play(event);if(event.type==='fire')this.recoilAge[event.side]=0;if(event.type==='result')return;this.shake=event.type==='hit'?.18:.07;
    if(event.type==='splash'||event.type==='hit'){
      const ring=this.ripplePool.pop();
      if(ring){ring.position.set(event.position.x,.14,event.position.z);ring.scale.setScalar(.6);ring.visible=true;
        this.ripples.push({mesh:ring,age:0,life:event.type==='splash'?1.25:.85});}
    }
    if(event.type==='hit'){
      const marks=this.ships[event.side].scars;
      const index=this.impactCounts[event.side]++;
      if(index<marks.length){
        const pos=hullImpactPlacement(event.position,SHIPS[event.side]);
        const mark=marks[index];mark.position.set(pos.x,pos.y,pos.z);
        mark.rotation.y=pos.side*Math.PI/2;mark.visible=true;
      }
    }
    const count=event.type==='hit'?38:event.type==='splash'?30:18;
    for(let i=0;i<count && this.pool.length;i++){const mesh=this.pool.pop()!;const smoke=event.type!=='splash'&&i>count*.45;const angle=i*2.399;const speed=event.type==='fire'?1.5:3.4;
      const color=event.type==='splash'?'#c3fcfa':smoke?'#535c5e':i%3===0?'#ad6b39':'#ffc54a';(mesh.material as T.MeshBasicMaterial).color.set(color);(mesh.material as T.MeshBasicMaterial).transparent=true;(mesh.material as T.MeshBasicMaterial).opacity=1;
      mesh.position.set(event.position.x,event.position.y,event.position.z);mesh.visible=true;const size=smoke?.3:.07+Math.random()*.13;mesh.scale.setScalar(size);
      this.particles.push({mesh,velocity:new T.Vector3(Math.cos(angle)*speed*(.3+Math.random()),smoke?1.5:2+Math.random()*4,Math.sin(angle)*speed*(.3+Math.random())),age:0,life:smoke?2.4:1.1+Math.random()*.4,size,smoke});
    }
  }
  reset(){this.battle.reset();this.recoilAge={player:Infinity,enemy:Infinity};for(const flash of Object.values(this.muzzleFlash))flash.visible=false;this.impactCounts={player:0,enemy:0};for(const ship of Object.values(this.ships))ship.scars.forEach(m=>m.visible=false);for(const p of this.particles){p.mesh.visible=false;this.pool.push(p.mesh);}this.particles=[];for(const ripple of this.ripples){ripple.mesh.visible=false;this.ripplePool.push(ripple.mesh);}this.ripples=[];this.ball.visible=false;this.trail.visible=false;this.shake=0;this.lastAim='';for(const flare of this.batteryFlashes)flare.visible=false;this.home();}
  getMetrics():Metrics{const info=this.renderer.info;const perf=performance as Performance & {memory?:{usedJSHeapSize:number}};return{fps:this.frameSamples.length?Math.round(1000/(this.frameSamples.reduce((a,b)=>a+b,0)/this.frameSamples.length)):0,renderMs:Math.round(this.renderMs),calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,effects:this.particles.length,heapMB:perf.memory?Math.round(perf.memory.usedJSHeapSize/1048576):undefined};}
  private animate=(timestamp:number)=>{
    if(this.disposed)return;this.raf=requestAnimationFrame(this.animate);if(document.hidden||this.paused){this.previous=0;return;}
    if(this.compatibility&&timestamp-this.lastRender<45)return;this.lastRender=timestamp;
    const raw=this.previous?(timestamp-this.previous):16.7,dt=Math.min(raw/1000,.25);this.previous=timestamp;this.elapsed+=dt;this.frameSamples.push(raw);if(this.frameSamples.length>120)this.frameSamples.shift();
    if(this.cameraMode==='battle'||this.cameraMode==='deck'){this.battle.tick(dt);for(const event of this.battle.drainEvents())this.effect(event);}
    this.water.uniforms.time.value=this.elapsed;
    for(const [side,art] of Object.entries(this.ships) as ['player'|'enemy',ShipArt][]){const health=this.battle.health[side];const damage=1-health/100;
      art.root.position.y=Math.sin(this.elapsed*1.1+(side==='player'?0:2))*.075-(health===0?1.3:0);art.root.rotation.z=Math.sin(this.elapsed*.9)*.018+(health===0?(side==='enemy'?-.23:.23):damage*.035);
      art.root.rotation.x=Math.sin(this.elapsed*.75+2)*.014;art.rig.rotation.z=damage>.5?damage*.14:0;
      art.sails.forEach((s,i)=>{s.rotation.y=Math.sin(this.elapsed*1.3+i)*.035;s.scale.y=health<=42?.86:1;});art.flags.forEach((f,i)=>f.rotation.y=Math.sin(this.elapsed*3+i)*.18);
      if(this.recoilAge[side]<CANNON_FX_DURATION)this.recoilAge[side]+=dt;
      const cannonFx=cannonFxState(this.recoilAge[side]),flash=this.muzzleFlash[side],direction=side==='player'?1:-1;
      if(flash){flash.visible=cannonFx.visible;flash.scale.set(cannonFx.flashScale,cannonFx.flashScale*.58,cannonFx.flashScale*.58);
        (flash.material as T.MeshBasicMaterial).opacity=cannonFx.flashOpacity;}
      for(const gun of art.guns){
        const gunDirection=Math.sign(gun.position.x)||1;
        gun.position.x=gunDirection*1.62-(gunDirection===direction?direction*cannonFx.recoil:0);
        gun.position.y=1.56-(this.battle.shot?.age&&this.battle.shot.side===side?Math.max(0,.1-this.battle.shot.age)*1.2:0);
      }
    }
    // A live broadside briefly illuminates the real foreground cannon muzzles.
    const batteryFx=cannonFxState(this.recoilAge.player);
    for(const flare of this.batteryFlashes){flare.visible=this.battleBattery.visible&&batteryFx.visible;flare.scale.setScalar(Math.max(.05,batteryFx.flashScale*.75));(flare.material as T.MeshBasicMaterial).opacity=batteryFx.flashOpacity;}
    this.foam.forEach((f,i)=>{(f.material as T.MeshBasicMaterial).opacity=.3+Math.sin(this.elapsed*2+i)*.12;f.scale.x=2.25+Math.sin(this.elapsed)*.09;});
    for(let i=this.ripples.length-1;i>=0;i--){const ripple=this.ripples[i];ripple.age+=dt;const state=rippleState(ripple.age,ripple.life);
      if(state.finished){ripple.mesh.visible=false;this.ripplePool.push(ripple.mesh);this.ripples.splice(i,1);continue;}
      ripple.mesh.scale.setScalar(state.scale);ripple.mesh.position.y=state.surfaceY;(ripple.mesh.material as T.MeshBasicMaterial).opacity=state.opacity;
    }
    const aimKey=`${this.battle.yaw}:${this.battle.power}`;
    this.path.visible=this.marker.visible=(this.cameraMode==='battle'||this.cameraMode==='deck')&&this.battle.phase==='ready';
    if(aimKey!==this.lastAim){this.lastAim=aimKey;const points=predict(this.battle.yaw,this.battle.power).map(p=>new T.Vector3(p.x,p.y,p.z));const attr=this.pathGeometry.attributes.position;points.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;this.pathGeometry.setDrawRange(0,points.length);this.pathGeometry.computeBoundingSphere();this.path.computeLineDistances();this.marker.position.copy(points[points.length-1]);this.marker.position.y=Math.max(.16,this.marker.position.y);}
    this.marker.rotation.z+=dt*.4;
    if(this.battle.shot){const s=this.battle.shot;this.ball.visible=true;this.ball.position.set(s.position.x,s.position.y,s.position.z);this.trail.visible=true;const p=this.ball.position.clone(),v=new T.Vector3(s.velocity.x,s.velocity.y-12*s.age,s.velocity.z).normalize();this.trail.geometry.setFromPoints([p,p.clone().addScaledVector(v,-1.2)]);}else{this.ball.visible=false;this.trail.visible=false;}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){p.mesh.visible=false;this.pool.push(p.mesh);this.particles.splice(i,1);continue;}p.mesh.position.addScaledVector(p.velocity,dt);if(!p.smoke)p.velocity.y-=8*dt;const alpha=1-p.age/p.life;(p.mesh.material as T.MeshBasicMaterial).opacity=alpha;p.mesh.scale.setScalar(p.size*(p.smoke?1+p.age*2:Math.max(.2,alpha)));}
    this.controls.update();if(this.shake>0){this.camera.position.y+=Math.sin(timestamp*.1)*this.shake;this.shake*=.86;}
    const renderStart=performance.now();this.renderer.render(this.scene,this.camera);this.renderMs=performance.now()-renderStart;this.onFrame();if(timestamp-this.metricsAt>1000){this.metricsAt=timestamp;this.onMetrics(this.getMetrics());}
  };
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.canvas.removeEventListener('pointerdown',this.shipPointerDown,true);this.canvas.removeEventListener('pointermove',this.shipPointerMove,true);this.canvas.removeEventListener('pointerup',this.shipPointerUp,true);this.canvas.removeEventListener('pointercancel',this.shipPointerUp,true);this.controls.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());this.battleSky.dispose();this.renderer.dispose();this.canvas.remove();this.pirateAudio.dispose();}
}
