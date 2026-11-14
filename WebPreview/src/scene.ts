import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Battle, predict, SHIPS, type BattleEvent } from './battle';
import { SoftwareRenderer } from './software-renderer';
import { PirateAudio } from './audio';
import { makeShip, type ShipArt } from './ships';
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
  private pool:T.Mesh[]=[]; private foam:T.Mesh[]=[]; private ripplePool:T.Mesh[]=[]; private ripples:{mesh:T.Mesh;age:number;life:number}[]=[]; private impactCounts:Record<'player'|'enemy',number>={player:0,enemy:0}; private lastAim=''; private cameraMode:'battle'|'deck'|'harbour'='battle'; private shake=0;
  private renderMs=0;private lastRender=0;private frameSamples:number[]=[];private metricsAt=0; private pirateAudio=new PirateAudio(); paused=false; disposed=false;
  private onContextLost=(event:Event)=>{event.preventDefault();this.paused=true;this.onError('The 3D view was interrupted. Reload to restore the ocean.');};
  private onVisibility=()=>{this.previous=0;this.pirateAudio.setHidden(document.hidden);};
  constructor(private host:HTMLElement, public battle:Battle, private onFrame:()=>void,private onMetrics:(m:Metrics)=>void,private onError:(message:string)=>void){
    const probe=document.createElement('canvas');const context=probe.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
    this.compatibility=!context;this.renderer=context?new T.WebGLRenderer({canvas:probe,context,antialias:true,alpha:false}):new SoftwareRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
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
    this.environment();
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
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.cameraMode==='battle')this.home();else if(this.cameraMode==='harbour')this.showHarbour();}
  home(){this.cameraMode='battle';const aspect=this.host.clientWidth/this.host.clientHeight;const distance=aspect<.75?55:aspect<1.2?43:34;if(aspect<.75){this.camera.position.set(-distance*.74,distance*.62,distance*.58);this.controls.target.set(0,1.6,0);}else{this.camera.position.set(distance*.20,distance*.56,distance*.88);this.controls.target.set(0,2,0);}this.controls.update();}
  deck(){this.cameraMode='deck';this.camera.position.set(-17,7,12);this.controls.target.set(8,3,-2);this.controls.update();}
  /** A real, close-up 3D harbour view: the player's animated ship, not a static mockup. */
  showHarbour(){
    this.cameraMode='harbour';this.ships.enemy.root.visible=false;this.foam[1].visible=false;
    this.path.visible=false;this.marker.visible=false;this.ball.visible=false;this.trail.visible=false;
    this.controls.enableRotate=false;this.controls.enableZoom=false;
    const ship=SHIPS.player,portrait=this.host.clientWidth/Math.max(1,this.host.clientHeight)<.85;
    this.controls.target.set(ship.x,portrait?3.5:2.9,ship.z);
    this.camera.position.set(ship.x+(portrait?2.5:5),portrait?10.8:10,ship.z+(portrait?24:19));
    this.controls.update();
  }
  /** Returns to the existing working battle camera, with both ships visible. */
  showBattle(){this.ships.enemy.root.visible=true;this.foam[1].visible=true;this.controls.enableRotate=true;this.controls.enableZoom=true;this.home();}
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
    if(this.cameraMode!=='harbour'){this.battle.tick(dt);for(const event of this.battle.drainEvents())this.effect(event);}
    this.water.uniforms.time.value=this.elapsed;
    for(const [side,art] of Object.entries(this.ships) as ['player'|'enemy',ShipArt][]){const health=this.battle.health[side];const damage=1-health/100;
      art.root.position.y=Math.sin(this.elapsed*1.1+(side==='player'?0:2))*.075-(health===0?1.3:0);art.root.rotation.z=Math.sin(this.elapsed*.9)*.018+(health===0?(side==='enemy'?-.23:.23):damage*.035);
      art.root.rotation.x=Math.sin(this.elapsed*.75+2)*.014;art.rig.rotation.z=damage>.5?damage*.14:0;
      art.sails.forEach((s,i)=>{s.rotation.y=Math.sin(this.elapsed*1.3+i)*.035;s.scale.y=health<=42?.86:1;});art.flags.forEach((f,i)=>f.rotation.y=Math.sin(this.elapsed*3+i)*.18);
      for(const gun of art.guns)gun.position.y=1.56-(this.battle.shot?.age&&this.battle.shot.side===side?Math.max(0,.1-this.battle.shot.age)*1.2:0);
    }
    this.foam.forEach((f,i)=>{(f.material as T.MeshBasicMaterial).opacity=.3+Math.sin(this.elapsed*2+i)*.12;f.scale.x=2.25+Math.sin(this.elapsed)*.09;});
    for(let i=this.ripples.length-1;i>=0;i--){const ripple=this.ripples[i];ripple.age+=dt;const state=rippleState(ripple.age,ripple.life);
      if(state.finished){ripple.mesh.visible=false;this.ripplePool.push(ripple.mesh);this.ripples.splice(i,1);continue;}
      ripple.mesh.scale.setScalar(state.scale);ripple.mesh.position.y=state.surfaceY;(ripple.mesh.material as T.MeshBasicMaterial).opacity=state.opacity;
    }
    const aimKey=`${this.battle.yaw}:${this.battle.power}`;
    this.path.visible=this.marker.visible=this.cameraMode!=='harbour'&&this.battle.phase==='ready';
    if(aimKey!==this.lastAim){this.lastAim=aimKey;const points=predict(this.battle.yaw,this.battle.power).map(p=>new T.Vector3(p.x,p.y,p.z));const attr=this.pathGeometry.attributes.position;points.forEach((p,i)=>attr.setXYZ(i,p.x,p.y,p.z));attr.needsUpdate=true;this.pathGeometry.setDrawRange(0,points.length);this.pathGeometry.computeBoundingSphere();this.path.computeLineDistances();this.marker.position.copy(points[points.length-1]);this.marker.position.y=Math.max(.16,this.marker.position.y);}
    this.marker.rotation.z+=dt*.4;
    if(this.battle.shot){const s=this.battle.shot;this.ball.visible=true;this.ball.position.set(s.position.x,s.position.y,s.position.z);this.trail.visible=true;const p=this.ball.position.clone(),v=new T.Vector3(s.velocity.x,s.velocity.y-12*s.age,s.velocity.z).normalize();this.trail.geometry.setFromPoints([p,p.clone().addScaledVector(v,-1.2)]);}else{this.ball.visible=false;this.trail.visible=false;}
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=p.life){p.mesh.visible=false;this.pool.push(p.mesh);this.particles.splice(i,1);continue;}p.mesh.position.addScaledVector(p.velocity,dt);if(!p.smoke)p.velocity.y-=8*dt;const alpha=1-p.age/p.life;(p.mesh.material as T.MeshBasicMaterial).opacity=alpha;p.mesh.scale.setScalar(p.size*(p.smoke?1+p.age*2:Math.max(.2,alpha)));}
    this.controls.update();if(this.shake>0){this.camera.position.y+=Math.sin(timestamp*.1)*this.shake;this.shake*=.86;}
    const renderStart=performance.now();this.renderer.render(this.scene,this.camera);this.renderMs=performance.now()-renderStart;this.onFrame();if(timestamp-this.metricsAt>1000){this.metricsAt=timestamp;this.onMetrics(this.getMetrics());}
  };
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.controls.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();this.canvas.remove();this.pirateAudio.dispose();}
}
