import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Battle, predict, SHIPS, type BattleEvent } from './battle';
import { SoftwareRenderer } from './software-renderer';
import { PirateAudio } from './audio';
import { makeShip, type ShipArt } from './ships';
import { type ShipLoadout, type ModuleSlot } from './ship-modules';
import { syncShipyardPreview } from './shipyard-preview-sync';
import { animateShipyardWind } from './shipyard-wind';
import { shipyardCameraOffset, shipyardPartTarget, shipyardPartCameraOffset, type ShipyardView } from './shipyard-camera';
import { releaseShipyardResources } from './shipyard-resources';
import { preferredShipyardPixelRatio, adjustedShipyardPixelRatio } from './shipyard-render-budget';
import { updateShipyardDetailLOD } from './shipyard-detail-lod';
import { SHIPYARD_TOUR_SPEED, shouldAutoRotateShipyard } from './shipyard-auto-orbit';
import { hullImpactPlacement } from './impact-visuals';
import { rippleState } from './water-vfx';
export type Metrics = { fps: number; renderMs: number; calls: number; triangles: number; geometries: number; textures: number; effects: number; heapMB?: number };
export class OceanScene {
  renderer: T.WebGLRenderer | SoftwareRenderer; compatibility=false; scene=new T.Scene(); camera=new T.PerspectiveCamera(42,1,.1,220); controls: OrbitControls;
  ships: Record<'player'|'enemy',ShipArt>; private water: T.ShaderMaterial; private raf=0; private previous=0; private elapsed=0;
  private canvas: HTMLCanvasElement; private resizeObserver: ResizeObserver; private trail: T.Line;
  private pathGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(240*3),3)); private path: T.Line; private marker: T.Mesh;
  private ball: T.Mesh; private particleGeometry=new T.IcosahedronGeometry(1,0); private particleMaterial=new T.MeshBasicMaterial({color:'#fff'});
  private particles: { mesh:T.Mesh;velocity:T.Vector3;age:number;life:number;size:number;smoke:boolean }[]=[];
  private pool:T.Mesh[]=[]; private foam:T.Mesh[]=[]; private ripplePool:T.Mesh[]=[]; private ripples:{mesh:T.Mesh;age:number;life:number}[]=[]; private impactCounts:Record<'player'|'enemy',number>={player:0,enemy:0}; private lastAim=''; private cameraMode:'battle'|'deck'|'harbour'|'inspect'|'shipyard'='battle'; private shipyardView:ShipyardView='quarter'; private shipyardFocusSlot:ModuleSlot|null=null; private shipyardArt:ShipArt|null=null; private harbourDock=new T.Group(); private shake=0;
  private renderMs=0;private lastRender=0;private frameSamples:number[]=[];private metricsAt=0;
  private normalPixelRatio=1;private shipyardPixelRatio=1;private shipyardAdjustmentAt=0;private shipyardRenderSamples:number[]=[];
  private pirateAudio=new PirateAudio(); paused=false; disposed=false;
  private shipyardTourRequested=false;private tourInterrupted:(()=>void)|null=null;
  private motionPreference:MediaQueryList|null=null;
  private onTourUserInput=()=>{
    if(this.cameraMode!=='shipyard'||!this.shipyardTourRequested)return;
    const notify=this.tourInterrupted;this.setShipyardTour(false);notify?.();
  };
  private onMotionPreferenceChange=()=>{
    if(this.motionPreference?.matches&&this.shipyardTourRequested){
      const notify=this.tourInterrupted;this.setShipyardTour(false);notify?.();
    }else this.syncShipyardTour();
  };
  private onContextLost=(event:Event)=>{event.preventDefault();this.paused=true;this.onError('The 3D view was interrupted. Reload to restore the ocean.');};
  private onVisibility=()=>{this.previous=0;this.pirateAudio.setHidden(document.hidden);this.syncShipyardTour();};
  constructor(private host:HTMLElement, public battle:Battle, private onFrame:()=>void,private onMetrics:(m:Metrics)=>void,private onError:(message:string)=>void){
    const probe=document.createElement('canvas');const context=probe.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
    this.compatibility=!context;this.renderer=context?new T.WebGLRenderer({canvas:probe,context,antialias:true,alpha:false}):new SoftwareRenderer();
    this.normalPixelRatio=Math.min(window.devicePixelRatio||1,1.5);
    this.renderer.setPixelRatio(this.normalPixelRatio);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.canvas=this.renderer.domElement;host.append(this.canvas);this.canvas.setAttribute('aria-label','3D naval battlefield. Drag to orbit, pinch to zoom.');
    this.canvas.addEventListener('webglcontextlost',this.onContextLost);
    this.scene.background=new T.Color('#93d8ed');this.scene.fog=new T.FogExp2('#9ad8df',.008);
    const hemi=new T.HemisphereLight('#d9f5ff','#497079',2.3);this.scene.add(hemi);
    const sun=new T.DirectionalLight('#ffe3af',3.6);sun.position.set(-24,40,15);this.scene.add(sun);
    const rim=new T.DirectionalLight('#97deff',1.4);rim.position.set(16,12,-18);this.scene.add(rim);
    this.water=new T.ShaderMaterial({uniforms:{time:{value:0},sun:{value:new T.Vector3(-24,40,15).normalize()}},vertexShader:`
      uniform float time; varying vec3 vWorld; varying vec3 vNormal; varying float vWave;
      float wave(vec2 p){return sin(p.x*.47+time*1.15)*.12+sin(p.y*.68-time*1.3)*.08+sin((p.x+p.y)*1.3-time*1.7)*.035;}
      void main(){vec3 p=position;p.z=wave(p.xy);float dx=(wave(p.xy+vec2(.05,0.))-p.z)/.05;float dy=(wave(p.xy+vec2(0.,.05))-p.z)/.05;vNormal=normalize(mat3(modelMatrix)*vec3(-dx,-dy,1.));vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vWave=p.z;gl_Position=projectionMatrix*viewMatrix*world;}
    `,fragmentShader:`
      uniform float time;uniform vec3 sun;varying vec3 vWorld;varying vec3 vNormal;varying float vWave;
      void main(){vec3 view=normalize(cameraPosition-vWorld);vec3 n=normalize(vNormal);float fres=pow(1.-max(dot(view,n),0.),3.);float spec=pow(max(dot(n,normalize(sun+view)),0.),95.);float pattern=sin(vWorld.x*2.4+sin(vWorld.z*1.7+time)*1.5)*sin(vWorld.z*2.8-time*1.4);float foam=smoothstep(.86,1.,pattern)*.18;vec3 col=mix(vec3(.015,.32,.43),vec3(.025,.63,.7),clamp(.5+vWave*2.,0.,1.));col=mix(col,vec3(.38,.78,.83),fres*.7);col+=vec3(.72,.93,.91)*foam+vec3(1.,.86,.55)*spec*.85;float fog=1.-exp(-length(cameraPosition-vWorld)*.008);gl_FragColor=vec4(mix(col,vec3(.6,.85,.87),fog),1.);}
    `});
    const ocean=new T.Mesh(new T.PlaneGeometry(210,210,190,190),this.water);ocean.rotation.x=-Math.PI/2;ocean.position.y=-.05;this.scene.add(ocean);
    this.ships={player:makeShip(false),enemy:makeShip(true)};
    for(const side of ['player','enemy'] as const){this.ships[side].root.position.set(SHIPS[side].x,0,SHIPS[side].z);this.scene.add(this.ships[side].root);
      const foam=new T.Mesh(new T.RingGeometry(1,1.09,40),new T.MeshBasicMaterial({color:'#b5f9ed',transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false}));foam.rotation.x=-Math.PI/2;foam.scale.set(2.3,5.3,1);foam.position.set(SHIPS[side].x,.09,SHIPS[side].z);this.scene.add(foam);this.foam.push(foam);
    }
    this.environment();this.buildHarbourDock();this.scene.add(this.harbourDock);
    this.controls=new OrbitControls(this.camera,this.canvas);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=18;this.controls.maxDistance=110;this.controls.minPolarAngle=.32;this.controls.maxPolarAngle=1.28;this.controls.target.set(0,2,0);this.controls.rotateSpeed=.5;
    this.controls.addEventListener('start',this.onTourUserInput);
    this.motionPreference=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
    this.motionPreference?.addEventListener('change',this.onMotionPreferenceChange);
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
      const beach=new T.Mesh(rockGeo,sand);beach.position.set(x,-1,z);beach.scale.set(size*1.7,2,size);this.scene.add(beach);
      for(let i=0;i<4;i++){const rock=new T.Mesh(rockGeo,stone);rock.position.set(x+Math.sin(i*2)*size*.6,size*.35,z+Math.cos(i*2)*size*.3);rock.scale.set(size*.7,size*(.6+i*.12),size*.6);this.scene.add(rock);
        const top=new T.Mesh(rockGeo,green);top.position.copy(rock.position);top.position.y+=size*.6;top.scale.set(size*.6,.65,size*.5);this.scene.add(top);}
      for(let i=0;i<3;i++){const px=x+(i-1)*size*.75,pz=z+size*.6,py=1.3;const trunk=new T.Mesh(new T.CylinderGeometry(.12,.22,4,6),trunkMat);trunk.position.set(px,py+2,pz);trunk.rotation.z=(i-1)*.12;this.scene.add(trunk);
        for(let j=0;j<6;j++){const leaf=new T.Mesh(leafGeo,green);const a=j*Math.PI/3;leaf.position.set(px+Math.cos(a)*.9,py+4,pz+Math.sin(a)*.9);leaf.scale.set(1.6,.12,.42);leaf.rotation.y=-a;leaf.rotation.z=.15;this.scene.add(leaf);}}
    }
    // Distant lighthouse and clouds frame the arena without covering the vessels.
    const tower=new T.Mesh(new T.CylinderGeometry(.8,1.3,6,12),new T.MeshStandardMaterial({color:'#e3d4af'}));tower.position.set(10,12,-46);this.scene.add(tower);
    const roof=new T.Mesh(new T.ConeGeometry(1.5,1.3,12),new T.MeshStandardMaterial({color:'#af5a42'}));roof.position.set(10,15.6,-46);this.scene.add(roof);
    const cloudMat=new T.MeshBasicMaterial({color:'#e5f1ed',transparent:true,opacity:.7});
    for(let i=0;i<12;i++){const cloud=new T.Mesh(new T.SphereGeometry(1,10,6),cloudMat);cloud.position.set(-60+i*12,22+Math.sin(i)*3,-65-Math.cos(i)*10);cloud.scale.set(6,1.8,2.8);this.scene.add(cloud);}
    const gullGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.6,0,0),new T.Vector3(0,-.2,0),new T.Vector3(.6,0,0)]);
    for(let i=0;i<6;i++){const gull=new T.Line(gullGeo,new T.LineBasicMaterial({color:'#456770'}));gull.position.set(-18+i*7,16+Math.sin(i)*2,-25);this.scene.add(gull);}
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
      const x=SHIPS.player.x+side*9.2,z=SHIPS.player.z+6;
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
    this.harbourDock.visible=false;
  }
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;
    // Orientation changes may lower the preview cap, never the battle resolution.
    if(this.shipyardArt&&this.cameraMode==='shipyard'){
      const cap=preferredShipyardPixelRatio(w,window.devicePixelRatio||1);
      if(this.shipyardPixelRatio>cap){this.shipyardPixelRatio=cap;this.renderer.setPixelRatio(cap);}
    }
    this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.cameraMode==='battle')this.home();else if(this.cameraMode==='harbour')this.showHarbour();else if(this.cameraMode==='inspect')this.inspectShip();else if(this.cameraMode==='shipyard')this.setShipyardCamera();}
  home(){this.cameraMode='battle';const aspect=this.host.clientWidth/this.host.clientHeight;const distance=aspect<.75?55:aspect<1.2?43:34;if(aspect<.75){this.camera.position.set(-distance*.74,distance*.62,distance*.58);this.controls.target.set(0,1.6,0);}else{this.camera.position.set(distance*.20,distance*.56,distance*.88);this.controls.target.set(0,2,0);}this.controls.update();}
  deck(){this.cameraMode='deck';this.camera.position.set(-17,7,12);this.controls.target.set(8,3,-2);this.controls.update();}
  /** A real, close-up 3D harbour view: the player's animated ship, not a static mockup. */
  showHarbour(){
    this.cameraMode='harbour';this.ships.player.root.visible=true;this.releaseShipyardPreview();this.ships.enemy.root.visible=false;this.foam[1].visible=false;this.harbourDock.visible=true;
    this.path.visible=false;this.marker.visible=false;this.ball.visible=false;this.trail.visible=false;
    this.controls.enableRotate=false;this.controls.enableZoom=false;
    const ship=SHIPS.player,portrait=this.host.clientWidth/Math.max(1,this.host.clientHeight)<.85;
    this.controls.target.set(ship.x,portrait?3.5:2.9,ship.z);
    this.camera.position.set(ship.x+(portrait?2.5:5),portrait?10.8:10,ship.z+(portrait?24:19));
    this.controls.update();
  }
  /** Active 3D inspection: orbit and pinch-zoom the real ship without starting a fight. */
  inspectShip(){
    this.cameraMode='inspect';this.ships.player.root.visible=true;this.releaseShipyardPreview();
    this.ships.enemy.root.visible=false;this.foam[1].visible=false;this.harbourDock.visible=true;
    this.path.visible=false;this.marker.visible=false;this.ball.visible=false;this.trail.visible=false;
    this.controls.enableRotate=true;this.controls.enableZoom=true;
    this.controls.minDistance=10;this.controls.maxDistance=34;
    const ship=SHIPS.player,portrait=this.host.clientWidth/Math.max(1,this.host.clientHeight)<.85;
    this.controls.target.set(ship.x,3.8,ship.z);
    this.camera.position.set(ship.x+(portrait?8:11),portrait?10:8,ship.z+(portrait?20:17));
    this.controls.update();
  }
  /** Returns to the existing working battle camera, with both ships visible. */
  showBattle(){this.ships.player.root.visible=true;this.releaseShipyardPreview();this.ships.enemy.root.visible=true;this.foam[1].visible=true;this.harbourDock.visible=false;this.controls.enableRotate=true;this.controls.enableZoom=true;this.controls.minDistance=18;this.controls.maxDistance=110;this.home();}
  /** Release isolated preview assets on exit; shared battle geometry survives. */
  private releaseShipyardPreview(){
    this.setShipyardTour(false);
    if(!this.shipyardArt)return;
    releaseShipyardResources(this.scene,this.shipyardArt.root);
    this.shipyardArt=null;
    this.shipyardFocusSlot=null;
    this.shipyardRenderSamples.length=0;
    // Battle and harbour always retain their original renderer resolution.
    this.shipyardPixelRatio=this.normalPixelRatio;
    this.renderer.setPixelRatio(this.normalPixelRatio);
  }
  /** Harbour-only sandbox: the battle ship, damage and ownership are untouched. */
  showShipyard(loadout:ShipLoadout){
    if(!this.shipyardArt){
      // Isolated editor quality budget: no effects on battle, purchases or fleet.
      this.shipyardPixelRatio=preferredShipyardPixelRatio(this.host.clientWidth,window.devicePixelRatio||1);
      this.renderer.setPixelRatio(this.shipyardPixelRatio);
      this.shipyardAdjustmentAt=performance.now();
      this.shipyardRenderSamples.length=0;
      this.frameSamples.length=0;
      this.shipyardArt=makeShip(false);
      this.shipyardArt.root.position.set(SHIPS.player.x,0,SHIPS.player.z);
      this.scene.add(this.shipyardArt.root);
    }
    // Slider-only demo level changes update metadata instead of rebuilding GPU meshes.
    syncShipyardPreview(this.shipyardArt.root,this.shipyardArt.rig,loadout);
    this.ships.player.root.visible=false;this.shipyardArt.root.visible=true;
    this.ships.enemy.root.visible=false;this.foam[1].visible=false;
    this.harbourDock.visible=true;this.path.visible=false;this.marker.visible=false;
    this.ball.visible=false;this.trail.visible=false;
    if(this.cameraMode!=='shipyard'){this.shipyardView='quarter';this.shipyardFocusSlot=null;this.cameraMode='shipyard';this.setShipyardCamera();}
  }
  /** Isolated fleet inspection camera presets. Orbit and pinch remain enabled. */
  setShipyardView(view:ShipyardView){
    this.shipyardView=view;
    if(this.cameraMode==='shipyard')this.setShipyardCamera();
  }
  /** Focus a selected slot with real 3D geometry; preview only, never battle. */
  setShipyardFocus(slot:ModuleSlot|null){
    this.shipyardFocusSlot=slot;
    if(this.cameraMode==='shipyard')this.setShipyardCamera();
  }
  /** Auto-orbit only previews isolated art; manual drag stops and reports the change to UI. */
  setShipyardTour(requested:boolean,onInterrupted?:()=>void):boolean{
    this.shipyardTourRequested=requested&&this.cameraMode==='shipyard';
    this.tourInterrupted=this.shipyardTourRequested?(onInterrupted??null):null;
    this.syncShipyardTour();
    return this.controls.autoRotate;
  }
  private syncShipyardTour(){
    if(!this.controls)return;
    this.controls.autoRotate=shouldAutoRotateShipyard(
      this.shipyardTourRequested,this.cameraMode,!!this.motionPreference?.matches,document.hidden
    );
    this.controls.autoRotateSpeed=SHIPYARD_TOUR_SPEED;
  }
  private setShipyardCamera(){
    this.controls.enableRotate=true;this.controls.enableZoom=true;
    this.controls.enablePan=false;
    const portrait=this.host.clientWidth/Math.max(1,this.host.clientHeight)<.85,ship=SHIPS.player;
    const focus=this.shipyardFocusSlot&&this.shipyardArt
      ?this.shipyardArt.root.localToWorld(new T.Vector3(
        shipyardPartTarget(this.shipyardFocusSlot).x,
        shipyardPartTarget(this.shipyardFocusSlot).y,
        shipyardPartTarget(this.shipyardFocusSlot).z
      )):null;
    this.controls.minDistance=focus?6:11;this.controls.maxDistance=focus?25:35;
    const offset=focus?shipyardPartCameraOffset(this.shipyardView,portrait):shipyardCameraOffset(this.shipyardView,portrait);
    const target=focus??new T.Vector3(ship.x,4,ship.z);
    this.controls.target.copy(target);
    this.camera.position.set(target.x+offset.x,target.y+offset.y,target.z+offset.z);
    this.controls.update();
  }
  toggleMusic(){return this.pirateAudio.toggleMusic();}
  toggleEffects(){return this.pirateAudio.toggleEffects();}
  private effect(event:BattleEvent){
    this.pirateAudio.play(event);if(event.type==='result')return;this.shake=event.type==='hit'?.18:.07;
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
  reset(){this.battle.reset();this.impactCounts={player:0,enemy:0};for(const ship of Object.values(this.ships))ship.scars.forEach(m=>m.visible=false);for(const p of this.particles){p.mesh.visible=false;this.pool.push(p.mesh);}this.particles=[];for(const ripple of this.ripples){ripple.mesh.visible=false;this.ripplePool.push(ripple.mesh);}this.ripples=[];this.ball.visible=false;this.trail.visible=false;this.shake=0;this.lastAim='';this.home();}
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
      for(const gun of art.guns)gun.position.y=1.56-(this.battle.shot?.age&&this.battle.shot.side===side?Math.max(0,.1-this.battle.shot.age)*1.2:0);
    }
    if(this.shipyardArt?.root.visible){
       const art=this.shipyardArt;
       art.root.position.y=Math.sin(this.elapsed*1.1)*.075;
       art.root.rotation.z=Math.sin(this.elapsed*.9)*.018;
       art.sails.forEach((s,i)=>{s.rotation.y=Math.sin(this.elapsed*1.3+i)*.035;});
       art.flags.forEach((f,i)=>{f.rotation.y=Math.sin(this.elapsed*3+i)*.18;});
       animateShipyardWind(art.root,this.elapsed);
     }
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
    this.controls.update(this.controls.autoRotate?dt:undefined);if(this.shake>0){this.camera.position.y+=Math.sin(timestamp*.1)*this.shake;this.shake*=.86;}
    // Narrow-phone distant views omit only tiny preview-owned deck ornaments.
    // The same meshes return on zoom-in; never change battle objects or assets.
    if(this.cameraMode==='shipyard'&&this.shipyardArt?.root.visible){
      const accessories=this.shipyardArt.root.children.find(child=>child.name==='modular-ship-accessories');
      updateShipyardDetailLOD(accessories,
        this.camera.position.distanceTo(this.shipyardArt.root.position),
        this.host.clientWidth);
    }
    const renderStart=performance.now();this.renderer.render(this.scene,this.camera);this.renderMs=performance.now()-renderStart;
    if(this.cameraMode==='shipyard'&&this.shipyardArt?.root.visible){
      this.shipyardRenderSamples.push(this.renderMs);
      if(this.shipyardRenderSamples.length>90)this.shipyardRenderSamples.shift();
      // Average visible frames and CPU render times; never adjust every frame.
      if(timestamp-this.shipyardAdjustmentAt>=8000&&this.frameSamples.length>=60&&this.shipyardRenderSamples.length>=60){
        const average=(samples:number[])=>samples.reduce((sum,value)=>sum+value,0)/samples.length;
        const ceiling=preferredShipyardPixelRatio(this.host.clientWidth,window.devicePixelRatio||1);
        const next=adjustedShipyardPixelRatio(this.shipyardPixelRatio,ceiling,average(this.frameSamples),average(this.shipyardRenderSamples));
        if(next!==this.shipyardPixelRatio){this.shipyardPixelRatio=next;this.renderer.setPixelRatio(next);}
        this.shipyardAdjustmentAt=timestamp;
      }
    }
    this.onFrame();if(timestamp-this.metricsAt>1000){this.metricsAt=timestamp;this.onMetrics(this.getMetrics());}
  };
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.motionPreference?.removeEventListener('change',this.onMotionPreferenceChange);this.controls.removeEventListener('start',this.onTourUserInput);this.controls.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();this.canvas.remove();this.pirateAudio.dispose();}
}
