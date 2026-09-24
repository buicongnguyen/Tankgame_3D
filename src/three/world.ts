import {compactLayout,TRAINING} from './training';
import {EnemyBatches} from './enemy-batches';
import {mode} from './difficulty';
import {crewMaterial,packCrewSurfaces} from './crew-material';
import {buildRouteScenery} from './route-scenery';
import {buildGuardLandmarks} from './enemy-posts';
import {stageLayout,overlapsReservation,roadDistance,projectRoute,routeSample} from './stage-layout';
import {terrainAt,terrainSpeed} from './terrain';
import {groundTexture} from './frontier-surfaces';
import {buildRockBoundary} from './rock-boundary';
import {GROUND_COLORS} from './frontier-environment';
import MODEL_NAMES from './model-catalog.json';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {SkinMarkings} from './skin-markings';
import {StableShadow} from './stable-shadow';
import { skinPalette } from './skins';
import { TEAMS } from './skirmish';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Box } from './rules';
import { BIOMES, Environment } from './environment';
import { CombatEffects } from './effects';
import { BOUNDS, buildActivities, loadPickupModels } from './activities';
import type { Activity } from './activities';
export interface TankVisual { root: T.Group; hull: T.Object3D; turret: T.Object3D; muzzle: T.Object3D; bar: T.Mesh; beam: T.Mesh; }
export interface Cover extends Box { kind: 'barricade' | 'crate' | 'barrel' | 'pine' | 'house' | 'stonewall' | 'steelwall' | 'hill' | 'concrete-block' | 'fuelcrate' | 'glacier' | 'volcano' | 'volcanic-rock' | 'palm' | 'jungle-tree' | 'cityblock' | 'white-pine'; hp: number; mesh: T.Group; boundary?:boolean; scenery?:{parts:T.InstancedMesh[];index:number;maxHP:number}; section?: {parts:T.InstancedMesh[];index:number;wall:object}; }
/** Square precast landmarks (formerly indestructible hills and basalt outcrops). */
export const LANDMARK_BLOCK_HP=1000;
interface Effect { mesh: T.Mesh; life: number; max: number; velocity: T.Vector3; }
const scratch = new T.Vector3();
export class World {
  bounds={...BOUNDS};
  scene = new T.Scene();
  enemyBatches=new EnemyBatches(this.scene);
  environment=new Environment();
  fx=new CombatEffects(this.scene); activities:Activity[]=[]; wrecks:{root:T.Group;scorch:T.Mesh;age:number;emit:number}[]=[];
  burnt=new T.MeshStandardMaterial({color:0x292b28,roughness:.96});
  scorchGeometry=new T.PlaneGeometry(7,7); scorchMaterial=new T.MeshBasicMaterial({color:0x28251e,map:this.fx.texture,transparent:true,opacity:.78,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  camera = new T.PerspectiveCamera(43, 1, .5, 240);
  renderer: T.WebGLRenderer;
  arena = new T.Group();
  entities = new T.Group();
  templates = new Map<string, T.Group>();
  private modelPacks = new Map<boolean, Map<string, T.Group>>();
  covers: Cover[] = [];
  missionKind='assault';
  layout=stageLayout(0);navigationRevision=0;loopReverse=false;
  firmRoad(p:Box|{x:number;z:number}){return this.missionKind==='escort'&&['snow','glacier','desert','marsh'].includes(this.environment.biome)&&roadDistance(this.layout.points,p)<=3.2;}
  terrainKind(p:{x:number;z:number}){return this.firmRoad(p)?undefined:terrainAt(this.environment.biome,p);}
  groundSpeed(p:{x:number;z:number}){return this.firmRoad(p)?1:terrainSpeed(this.environment.biome,p.x,p.z);}
  effects: Effect[] = [];
  ring: T.Mesh;
  cursor: T.Mesh;
  shield: T.Mesh;
  sun: T.DirectionalLight;
  private stableShadow: StableShadow;
  effectGeometry = new T.IcosahedronGeometry(1, 0);
  effectMaterials = [0xffba66,0xf67845,0x696657,0x75f5cf].map(color => new T.MeshBasicMaterial({ color, transparent: true }));
  low = false;
  crewMaterial=crewMaterial();
  studioEnvironment:T.Texture;
  target = new T.Vector3();
  private smoothLead=new T.Vector3();private leadReady=false;
  constructor(container: HTMLElement,low=false) {
    this.low=low;
    this.renderer = new T.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);
    this.studioEnvironment=pmrem.fromScene(room,.04,.1,100,{size:64}).texture;this.scene.environment=this.studioEnvironment;this.scene.environmentIntensity=.45;
    room.dispose();pmrem.dispose();
    container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','3D battlefield');
    this.scene.background = new T.Color('#b1ad90');
    this.scene.fog = new T.Fog('#b1ad90', 80, 150);
    this.scene.add(new T.HemisphereLight(0xd5eee8,0x61513d,1.6));
    this.sun = new T.DirectionalLight(0xffe4b4,3.1);
    this.sun.position.set(-28,48,20); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{ left:-50,right:50,top:45,bottom:-45,near:1,far:120 });
    this.sun.shadow.normalBias = .035; this.scene.add(this.sun,this.sun.target);
    this.stableShadow = new StableShadow(this.sun);
    this.scene.add(this.arena,this.entities);
    this.ring = new T.Mesh(new T.RingGeometry(6.6,6.9,64),new T.MeshBasicMaterial({color:0xffc272,side:T.DoubleSide,transparent:true,opacity:.85}));
    this.ring.rotation.x=-Math.PI/2; this.ring.position.set(0,.05,-13); this.scene.add(this.ring);
    this.cursor = new T.Mesh(new T.RingGeometry(.65,.78,24),new T.MeshBasicMaterial({color:0xc0ffdf,side:T.DoubleSide,transparent:true,depthWrite:false}));
    this.cursor.renderOrder=4;this.cursor.rotation.x=-Math.PI/2; this.cursor.position.y=.08; this.scene.add(this.cursor);
    this.shield = new T.Mesh(new T.SphereGeometry(2.6,20,12),new T.MeshBasicMaterial({color:0x76ffe0,transparent:true,opacity:.12,wireframe:true}));
    this.scene.add(this.shield); this.shield.visible=false;
    this.scene.onBeforeRender=(_renderer,_scene,camera)=>this.enemyBatches.update(camera);
    window.addEventListener('resize',()=>this.resize()); this.settings(low);
  }
  async load(low=false) {
    await loadPickupModels();
    let templates=this.modelPacks.get(low);
    if(!templates){
      templates=new Map<string,T.Group>();
      const loader=new GLTFLoader();
      await Promise.all(MODEL_NAMES.map(async name=>{
        const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${low?'low/':''}${name}.glb`);
        const root=gltf.scene;
        if(['rifleman','rocketeer','scout-jeep'].includes(name))packCrewSurfaces(root,this.crewMaterial);
        root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true; o.receiveShadow=true;}});
        templates!.set(name,root);
      }));
      // Batch by material within each animated pivot, preserving all moving limbs.
      const parts:T.Object3D[]=[];
      for(const root of templates.values()){
        root.updateMatrixWorld(true);
        const hull=root.getObjectByName('Hull'),turret=root.getObjectByName('Turret');
        if(hull&&turret){parts.push(hull,turret);root.traverse(o=>{if(/^(Leg[0-9]|LeftLeg|RightLeg|Wheel[FR][LR]|Arm[LR]$|Launcher[LR]$|LightGun$|Rotor|TailRotor)/.test(o.name))parts.push(o);});}
        else parts.push(root);
      }
      for (const part of parts) {
        part.updateMatrixWorld(true);
        const inverse=part.matrixWorld.clone().invert();
        const buckets=new Map<string,{material:T.Material;geometries:T.BufferGeometry[];sources:T.Mesh[]}>();
        part.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){
          if(o.name==='Core')return; // Boss weak-point visibility remains independent.
          let parent=o.parent;while(parent&&parent!==part){if(parts.includes(parent))return;parent=parent.parent;}
          const g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
          const key=o.material.uuid+':'+Object.keys(g.attributes).sort().join(',')+':'+!!g.index;
          let bucket=buckets.get(key);if(!bucket){bucket={material:o.material,geometries:[],sources:[]};buckets.set(key,bucket);}
          bucket.geometries.push(g);bucket.sources.push(o);
        }});
        for(const {material,geometries,sources} of buckets.values()){
          const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
          // Only replace originals after a successful merge. UV-less fins must never disappear.
          if(merged){for(const mesh of sources)mesh.removeFromParent();const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.surfaceKey=`${part.name}:${material.name}:${Object.keys(merged.attributes).sort().join(',')}:${!!merged.index}`;part.add(mesh);}
        }
      }
      for(const [name,root] of templates)root.traverse(o=>{if(o instanceof T.Mesh){
        o.userData.modelAsset=name;
        o.userData.surfaceKey??=`node:${o.name}`;
      }});
      // Both Blender tiers retain matching surfaces and animation pivots.
      // Validate before touching the live scene so a bad pack cannot hide objects.
      if(this.templates.size)for(const [name,root] of templates){
        const keys=(group:T.Group)=>{const result:string[]=[];group.traverse(o=>{if(o instanceof T.Mesh)result.push(o.userData.surfaceKey);});return result.sort().join('|');};
        if(keys(root)!==keys(this.templates.get(name)!))throw new Error(`Incompatible detail model: ${name}`);
      }
      this.modelPacks.set(low,templates);
    }
    const surfaces=new Map<string,T.BufferGeometry>();
    for(const [name,root] of templates)root.traverse(o=>{if(o instanceof T.Mesh)surfaces.set(`${name}/${o.userData.surfaceKey}`,o.geometry);});
    // Swap geometry only: keep positions, damage, skins, weak-point visibility,
    // live projectile attachments and the exact rig objects held by the game.
    this.scene.traverse(o=>{if(o instanceof T.Mesh&&o.userData.modelAsset){
      const geometry=surfaces.get(`${o.userData.modelAsset}/${o.userData.surfaceKey}`);
      if(geometry){o.geometry=geometry;if(o instanceof T.InstancedMesh)o.computeBoundingSphere();}
    }});
    this.templates=templates;
  }
  clone(name:string):T.Group { return this.templates.get(name)!.clone(true); }
  tank(enemy=false,boss=false,model='tank'):TankVisual {
    const root=this.clone(model);root.userData.model=model;
    if(enemy) root.traverse(o=>{if(o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial){
      const name=o.material.name;if(name==='CrewSurface')return;
      // Reuse one enemy material per original material across all tanks.
      const key=`enemy:${name}`;
      let mat=this.enemyMaterials.get(key);
      if(!mat){mat=o.material.clone(); if(name==='Armor')mat.color.set(0x744b41);if(name==='Trim')mat.color.set(0xc08a68);if(name==='Signal')mat.color.set(0xff573e);this.enemyMaterials.set(key,mat);}
      o.material=mat;
    }});
    if(boss&&model==='tank')root.scale.setScalar(1.55);
    const bar=new T.Mesh(new T.PlaneGeometry(2.8,.16),new T.MeshBasicMaterial({color:enemy?0xff795c:0x8efad6,depthTest:false}));
    bar.userData.owned=true;bar.rotation.x=-Math.PI/3;bar.position.y=model==='scout-jeep'?3.4:model.includes('mech')?7.4:boss?4.6:3;bar.renderOrder=5;root.add(bar);bar.visible=enemy;
    const beam=new T.Mesh(new T.BoxGeometry(.08,.02,1),new T.MeshBasicMaterial({color:0xff5849,transparent:true,opacity:.55}));
    beam.userData.owned=true;beam.visible=false;this.entities.add(beam);
    this.entities.add(root);
    if(enemy&&!boss)this.enemyBatches.add(root);
    const turret=root.getObjectByName('Turret')!;turret.userData.restY=turret.position.y; // recoil settles back to each rig's own height
    return {root,hull:root.getObjectByName('Hull')!,turret,muzzle:root.getObjectByName('Muzzle')!,bar,beam};
  }
  rocketGeometry=new T.BufferGeometry();rocketMaterial=new T.MeshBasicMaterial({color:0xff9538});
  rocket(){const mesh=new T.Mesh(this.rocketGeometry,this.rocketMaterial);mesh.add(this.clone('rocket'));mesh.userData.rocket=true;mesh.userData.shared=true;return mesh;}
  rocketTrail(mesh:T.Object3D){
    mesh.updateMatrixWorld(true);const exhaust=mesh.getObjectByName('Exhaust');if(!exhaust)return;const tail=new T.Vector3();exhaust.getWorldPosition(tail);
    const size=mesh.scale.x,backward=new T.Vector3(0,0,-1).applyQuaternion(mesh.quaternion);
    this.fx.emit(tail,'flash',0xffc76b,.55*size,.07,backward.clone().multiplyScalar(3));
    this.fx.emit(tail,'smoke',0x69737b,.95*size,1.5,backward.multiplyScalar(1.4).add(new T.Vector3(0,.7,0)));
  }
  skinMarkings=new SkinMarkings();
  skinMaterials=new Map<string,T.MeshStandardMaterial>();
  applySkin(root:T.Object3D,id:string,flag:import('./tank-flags').TankFlag='none'){const palette:Record<string,string>=skinPalette(id);
    root.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial)||!palette[o.material.name])return;
      const key=id+':'+o.material.name;let material=this.skinMaterials.get(key);
      if(!material){material=o.material.clone();material.color.set('#'+palette[material.name]);this.skinMaterials.set(key,material);}o.material=material;
    });this.skinMarkings.apply(root,id,flag);root.userData.skin=id;root.userData.flag=flag;
  }
  enemyMaterials=new Map<string,T.MeshStandardMaterial>();
  /** Skirmish teams: repaint Armor/Trim/Signal and the health bar. Team 0 keeps the campaign enemy paint. */
  paintTeam(visual:TankVisual,team:number){
    const colors=TEAMS[team];if(!colors)return;(visual.bar.material as T.MeshBasicMaterial).color.set(colors.css);if(!team)return;
    visual.root.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial))return;
      const name=o.material.name,color=name==='Armor'?colors.armor:name==='Trim'?colors.trim:name==='Signal'?colors.signal:null;if(color===null)return;
      const key=`team${team}:${name}`;let mat=this.enemyMaterials.get(key);if(!mat){mat=o.material.clone();mat.color.set(color);this.enemyMaterials.set(key,mat);}o.material=mat;
    });
  }
  clear() { this.leadReady=false;this.enemyBatches.clear();this.environment.clear();this.fx.clear();this.wrecks=[];this.activities=[];this.pendingLandmarks=[];
    for(const effect of this.effects){effect.mesh.removeFromParent();(effect.mesh.material as T.Material).dispose();}
    this.effects=[];
    // Only dispose runtime-created resources; GLB geometry/materials are shared templates.
    for(const group of [this.arena,this.entities]){
      group.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();if(o instanceof T.Sprite && o.userData.activityLabel){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh && o.userData.owned){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
      group.clear();
    }
    this.covers=[];
  }
  private box(w:number,h:number,d:number,color:number,x:number,y:number,z:number,group=this.arena){
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.95}));
    mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;mesh.userData.owned=true;mesh.userData.staticBatch=true;group.add(mesh);return mesh;
  }
  private batchScenery(){
    // Merge static scenery by material/shadow behavior. Cover remains independent and destructible.
    const buckets=new Map<string,{geometries:T.BufferGeometry[];material:T.Material;shadow:boolean}>();
    this.arena.updateMatrixWorld(true);
    const meshes:T.Mesh[]=[];
    this.arena.traverse(o=>{if(o instanceof T.Mesh&&o.userData.staticBatch&&o.material instanceof T.MeshStandardMaterial)meshes.push(o);});
    for(const mesh of meshes){
      const material=mesh.material as T.MeshStandardMaterial,key=`${material.color.getHex()}:${mesh.castShadow}:${material.map?.uuid??''}`;
      let bucket=buckets.get(key);if(!bucket){bucket={geometries:[],material:material.clone(),shadow:mesh.castShadow};buckets.set(key,bucket);}
      bucket.geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.removeFromParent();mesh.geometry.dispose();material.dispose();
    }
    for(const bucket of buckets.values()){
      const geometry=mergeGeometries(bucket.geometries);bucket.geometries.forEach(g=>g.dispose());
      if(!geometry){bucket.material.dispose();continue;}
      const mesh=new T.Mesh(geometry,bucket.material);mesh.castShadow=bucket.shadow;mesh.receiveShadow=true;mesh.userData.owned=true;this.arena.add(mesh);
    }
  }
  build(index:number,kind:string,level=0,difficulty='normal') {
    this.bounds={...BOUNDS};this.clear();this.missionKind=kind;this.navigationRevision++;this.layout=stageLayout(index,level,kind,difficulty);
    const frontier=GROUND_COLORS[BIOMES[index]]!==undefined;
    const ground=this.box(frontier?184:164,.7,frontier?164:144,GROUND_COLORS[BIOMES[index]]??(BIOMES[index]==='snow'?0xc6d5d5:index===3?0x74776c:0xa69c78),0,-.4,0);ground.castShadow=false;if(GROUND_COLORS[BIOMES[index]]!==undefined)(ground.material as T.MeshStandardMaterial).map=groundTexture(BIOMES[index]);
    // Winter snow replaces dirt detail; nearly coplanar patches underneath can shimmer.
    for(let i=0;i<(BIOMES[index]==='snow'||frontier?0:86);i++){
      const x=Math.sin(i*19.73)*72,z=Math.cos(i*8.2)*60;
      const patch=this.box(1.2+(i%4),.035,1.3+(i%3),GROUND_COLORS[BIOMES[index]]??(i%2?0x98936f:0xb1a680),x,.005,z);patch.rotation.y=i;patch.castShadow=false;
    }
    // Reserve the stage route before adding scenery. Every obstacle uses the same footprint for rendering and collision.
    const layout:[number,number,'barricade'|'crate'|'barrel'][]=[[-14,13,'barricade'],[12,8,'barricade'],[-15,-6,'barricade'],[15,-15,'barricade'],[-27,-15,'barricade'],[28,0,'barricade'],[-9,12,'crate'],[16,8,'crate'],[-20,-6,'crate'],[10,-16,'crate'],[-24,7,'barrel'],[20,-11,'barrel'],[-13,-18,'barrel'],[25,14,'crate']];
    for(const side of [-1,1])for(const z of [-43,-22,0,23,44]){layout.push([side*51,z,'barricade'],[side*56,z+4,'crate'],[side*47,z-5,'barrel']);}
    for(const [x,z,kind] of layout){
      if(kind==='barrel'&&this.layout.supplies.some(p=>Math.hypot(x-p.x,z-p.z)<9))continue;
      if(overlapsReservation(this.layout,{x,z,w:kind==='barricade'?6.4:1.3,d:kind==='barricade'?1.8:1.3}))continue;
      const mesh=this.clone(kind);mesh.position.set(x,0,z);
      if(kind==='barricade')mesh.scale.set(2,1.3,1.5);
      this.arena.add(mesh);this.covers.push({x,z,w:kind==='barricade'?6.4:kind==='crate'?1.3:1,d:kind==='barricade'?1.8:kind==='crate'?1.3:1,kind,hp:kind==='barricade'?176:kind==='crate'?55:25,mesh});
    }
    for(const [x,z] of [[-20,9],[24,-8],[-41,-32],[39,22]]){if(overlapsReservation(this.layout,{x,z,w:2.2,d:1.55})||this.layout.supplies.some(p=>Math.hypot(x-p.x,z-p.z)<9))continue;const mesh=this.clone('fuelcrate');mesh.position.set(x,0,z);this.arena.add(mesh);this.covers.push({x,z,w:2.2,d:1.55,kind:'fuelcrate',hp:35,mesh});}
    this.routeLandmarks();
    this.concreteBarriers(this.layout.barriers);
    buildRockBoundary(this,BIOMES[index]);
    this.ring.visible=true;
    const exit=this.layout.points.at(-1)!;this.ring.position.set(['capture','defense'].includes(kind)?0:exit.x,.12,['capture','defense'].includes(kind)?-13:exit.z);
    this.ring.scale.setScalar(['capture','defense'].includes(kind)?1:.7);
    if(kind==='capture'||kind==='defense'){
      const relay=this.clone('relay');relay.position.set(0,0,-13);this.arena.add(relay);
    }
    // Extraction pylons frame the road.
    const previous=this.layout.points.at(-2)!,angle=Math.atan2(exit.x-previous.x,exit.z-previous.z);
    for(const side of [-4,4]){const x=exit.x+Math.cos(angle)*side,z=exit.z-Math.sin(angle)*side;this.box(.45,3.2,.45,0x3e5751,x,1.6,z);this.box(.65,.2,.65,0x98f3bf,x,3.3,z);}
    this.environment.build(this,index);this.buildLandmarkBlocks();buildRouteScenery(this);buildGuardLandmarks(this,kind);for(const cover of this.covers)if(cover.kind==='stonewall')cover.hp=176;this.buildRoad(kind);this.batchScenery();this.activities=buildActivities(this.arena,this.layout.supplies);for(const a of this.activities)if(a.kind==='repair')a.remaining=Math.max(40,mode(difficulty).repairCapacity-level*20);
    this.target.set(0,0,0);
  }
  buildCompact(id:number){
    this.clear();this.navigationRevision++;this.layout=compactLayout(id);this.bounds=id===3?{x:36,z:32}:{...TRAINING[id].bounds};this.missionKind=id===2?'defense':'assault';this.environment.biome='grove';
    this.scene.background=new T.Color(0xa7b5a2);this.scene.fog=new T.Fog(0xa7b5a2,85,160);this.sun.color.setHex(0xffe4b4);
    this.box(this.bounds.x*2+16,.7,this.bounds.z*2+16,0x83946a,0,-.4,0);
    this.concreteBarriers(this.layout.barriers);buildRockBoundary(this,'grove');
    for(const side of [-1,1]){const x=side*(this.bounds.x-5),z=id===1?8:4,mesh=this.clone('pine');mesh.position.set(x,0,z);this.arena.add(mesh);this.covers.push({x,z,w:2.6,d:2.6,kind:'pine',hp:65,mesh});}
    const exit=this.layout.points.at(-1)!;this.ring.visible=true;this.ring.position.set(exit.x,.12,exit.z);this.ring.scale.setScalar(.7);
    if(id===2){const relay=this.clone('relay');relay.position.set(0,0,-13);this.arena.add(relay);}
    this.buildRoad(this.missionKind);this.batchScenery();this.activities=buildActivities(this.arena,this.layout.supplies);this.target.set(0,0,0);
  }
  /** Landmarks join collision immediately; their shared instanced draw is built once every one is known. */
  addLandmarkBlock(box:Box){
    const mesh=new T.Group();mesh.name='ConcreteLandmark';mesh.position.set(box.x,0,box.z);this.arena.add(mesh);
    const cover:Cover={x:box.x,z:box.z,w:box.w,d:box.d,kind:'concrete-block',hp:LANDMARK_BLOCK_HP,mesh};this.covers.push(cover);this.pendingLandmarks.push(cover);return cover;
  }
  private pendingLandmarks:Cover[]=[];
  private routeLandmarks(){for(const p of this.layout.landforms)this.addLandmarkBlock(p);}
  /** One InstancedMesh per template surface for every landmark on the map; damage darkens and destruction hides each instance. */
  private buildLandmarkBlocks(){
    const blocks=this.pendingLandmarks;this.pendingLandmarks=[];if(!blocks.length)return;
    const template=this.templates.get('concrete-block')!;template.updateMatrixWorld(true);
    const root=new T.Group();root.name='RouteLandforms';this.arena.add(root);const parts:T.InstancedMesh[]=[];
    template.traverse(o=>{if(!(o instanceof T.Mesh))return;
      const instances=new T.InstancedMesh(o.geometry,o.material,blocks.length);instances.userData={...o.userData};instances.castShadow=true;instances.receiveShadow=true;
      // The template spans the historic 14 x 10 m landform footprint.
      blocks.forEach((b,i)=>{const matrix=new T.Matrix4().makeScale(b.w/14,1,b.d/10);matrix.setPosition(b.x,0,b.z);matrix.multiply(o.matrixWorld);instances.setMatrixAt(i,matrix);instances.setColorAt(i,new T.Color(0xffffff));});
      instances.computeBoundingSphere();root.add(instances);parts.push(instances);
    });
    blocks.forEach((cover,index)=>cover.scenery={parts,index,maxHP:cover.hp});
  }
  concreteBarrier(box:Box){this.concreteBarriers([box]);}
  private concreteBarriers(boxes:Box[]){
    const panels=boxes.flatMap(box=>{
      const vertical=box.d>box.w,length=vertical?box.d:box.w,count=Math.ceil(length/6.4),width=length/count,wall={};
      return Array.from({length:count},(_,i)=>{const offset=-length/2+width*(i+.5);return {x:box.x+(vertical?0:offset),z:box.z+(vertical?offset:0),vertical,width,wall};});
    });
    if(!panels.length)return;
    const root=new T.Group();root.name='RouteConcrete';this.arena.add(root);
    const template=this.templates.get('barricade')!;template.updateMatrixWorld(true);const parts:T.InstancedMesh[]=[];
    template.traverse(o=>{if(!(o instanceof T.Mesh))return;
      const instances=new T.InstancedMesh(o.geometry,o.material,panels.length);instances.userData={...o.userData};instances.castShadow=true;instances.receiveShadow=true;
      panels.forEach(({x,z,vertical,width},i)=>{
        const matrix=new T.Matrix4().compose(new T.Vector3(x,0,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),vertical?Math.PI/2:0),new T.Vector3(width/3.2,1.3,1.5)).multiply(o.matrixWorld);
        instances.setMatrixAt(i,matrix);instances.setColorAt(i,new T.Color(0xffffff));
      });
      instances.computeBoundingSphere();root.add(instances);parts.push(instances);
    });
    panels.forEach(({x,z,vertical,width,wall},index)=>{
      const mesh=new T.Group();mesh.position.set(x,0,z);mesh.name='ConcreteSection';this.arena.add(mesh);
      this.covers.push({x,z,w:vertical?1.8:width,d:vertical?width:1.8,kind:'barricade',hp:176,mesh,section:{parts,index,wall}});
    });
  }
  updateConcrete(cover:Cover){
    const placement=cover.section??cover.scenery;if(!placement)return;const {parts,index}=placement;
    for(const part of parts){
      if(cover.hp<=0){part.setMatrixAt(index,new T.Matrix4().makeScale(0,0,0));part.instanceMatrix.needsUpdate=true;}
      else{part.setColorAt(index,new T.Color().setScalar(.45+.55*cover.hp/(cover.scenery?.maxHP??176)));if(part.instanceColor)part.instanceColor.needsUpdate=true;}
    }
  }
  private buildRoad(kind:string){
    for(let i=1;i<this.layout.points.length;i++){
      const a=this.layout.points[i-1],b=this.layout.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z);
      if(kind==='escort')for(const side of [-1,1]){const trace=this.box(.22,.008,length,0x9f9d82,(a.x+b.x)/2+Math.cos(angle)*side*.7,.105,(a.z+b.z)/2-Math.sin(angle)*side*.7);trace.name='ConvoyWheelTrace';trace.rotation.y=angle;trace.castShadow=false;}
      for(let d=6;d<length-2;d+=12){const x=a.x+(b.x-a.x)*d/length,z=a.z+(b.z-a.z)*d/length;
        const stroke=(px:number,pz:number,rotation:number,width:number,length:number)=>{
          // Dark border stays visible on snow/sand; bright inset reads on forest and lava.
          for(const [w,l,y,color] of [[width+.22,length+.22,.16,0x101b24],[width,length,.185,0xffdf38]]){
            const mark=this.box(w,.012,l,color,px,y,pz);mark.name='RouteDirectionMarker';mark.rotation.y=rotation;mark.castShadow=false;mark.receiveShadow=false;
            (mark.material as T.Material).dispose();(mark as T.Mesh).material=new T.MeshBasicMaterial({color,toneMapped:false,fog:false});
          }
        };
        if(this.layout.closed)stroke(x,z,angle,.24,1.4);
        else for(const side of [-1,1])stroke(x+Math.cos(angle)*side*.36,z-Math.sin(angle)*side*.36,angle-side*.65,.22,1.2);
      }
    }

    for(const color of [0x101b24,0xffdf38]){
      const pieces:T.BufferGeometry[]=[];const material=new T.MeshBasicMaterial({color,toneMapped:false,fog:false});
      for(const o of [...this.arena.children])if(o instanceof T.Mesh&&o.name==='RouteDirectionMarker'&&(o.material as T.MeshBasicMaterial).color.getHex()===color){o.updateMatrix();pieces.push(o.geometry.clone().applyMatrix4(o.matrix));o.geometry.dispose();(o.material as T.Material).dispose();o.removeFromParent();}
      if(pieces.length){const geometry=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());if(geometry){const markers=new T.Mesh(geometry,material);markers.name='RouteDirectionBatch';markers.userData.owned=true;this.arena.add(markers);}else material.dispose();}else material.dispose();
    }
  }
  settings(low:boolean){this.scene.environment=low?null:this.studioEnvironment;this.low=low;this.fx.low=low;this.renderer.shadowMap.enabled=!low;document.body.dataset.graphics=low?'low':'detailed';this.resize();}
  resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setPixelRatio(this.low?Math.min(devicePixelRatio,.8,960/Math.max(w,h)):Math.min(devicePixelRatio,1.6));this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  burst(position:T.Vector3,color=0,amount=12){
    for(let i=0;i<(this.low?Math.ceil(amount/2):amount)&&this.effects.length<(this.low?24:100);i++){
      const material=this.effectMaterials[color].clone();
      const mesh=new T.Mesh(this.effectGeometry,material);mesh.position.copy(position);mesh.position.y+=.8;mesh.scale.setScalar(.25+Math.random()*.5);this.scene.add(mesh);
      const life=.35+Math.random()*.5;
      this.effects.push({mesh,life,max:life,velocity:new T.Vector3((Math.random()-.5)*9,Math.random()*6,(Math.random()-.5)*9)});
    }
  }
  retireTank(visual:TankVisual){
    this.enemyBatches.remove(visual.root);visual.root.removeFromParent();visual.beam.removeFromParent();
    // Only the per-unit health bar and aim beam are owned here; model surfaces are shared.
    for(const mesh of [visual.bar,visual.beam]){mesh.removeFromParent();mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
  }
  destroyTank(visual:TankVisual){
    const root=this.clone(visual.root.userData.model||'tank');root.position.copy(visual.root.position);root.position.y=Math.max(0,root.position.y);root.scale.copy(visual.root.scale);
    root.getObjectByName('Hull')!.rotation.y=visual.hull.rotation.y;
    const turret=root.getObjectByName('Turret')!;turret.rotation.set(.28,visual.turret.rotation.y,.24);turret.position.y=.9;
    root.traverse(o=>{if(o instanceof T.Mesh){o.material=this.burnt;o.receiveShadow=false;}});const core=root.getObjectByName('Core');if(core)core.visible=false;this.entities.add(root);
    // World-space ground mark: ice/snow and boss rig scaling must not bury it.
    const scorch=new T.Mesh(this.scorchGeometry,this.scorchMaterial);scorch.name='WreckScorch';scorch.rotation.x=-Math.PI/2;scorch.position.set(root.position.x,.14,root.position.z);scorch.renderOrder=-1;this.entities.add(scorch);
    this.wrecks.push({root,scorch,age:0,emit:0});if(this.wrecks.length>(this.low?6:14)){const old=this.wrecks.shift()!;old.root.removeFromParent();old.scorch.removeFromParent();}
    const p=root.position.clone();p.y=1;this.fx.impact(p,true);
  }
  cameraOffset(focus=this.layout.spawn){
    const points=this.layout.closed&&this.loopReverse?[...this.layout.points].reverse():this.layout.points;
    const meters=projectRoute(points,focus).progress,a=routeSample(points,meters),next=this.layout.closed?(meters+12)%this.layout.length:Math.min(this.layout.length,meters+12),b=routeSample(points,next),d=Math.hypot(b.x-a.x,b.z-a.z);
    // Preview the approaching bend; the camera target still eases smoothly each frame.
    return {x:(d>1e-6?(b.x-a.x)/d:b.dx)*8,z:(this.camera.aspect<1?16:0)+(d>1e-6?(b.z-a.z)/d:b.dz)*8};
  }
  cameraLead(){return this.cameraOffset().z;}
  update(dt:number,focus:T.Vector3,menu=false){
    const raw=this.cameraOffset(focus);
    if(!this.leadReady){this.smoothLead.set(raw.x,0,raw.z);this.leadReady=true;}
    else if(dt>0){
      // Nearest route segments / O-loop direction can flip the lead by 16 m.
      // Bound its travel speed as well as easing it; paused frames never reset it.
      scratch.set(raw.x,0,raw.z).sub(this.smoothLead);
      const distance=scratch.length();
      if(distance>0)this.smoothLead.addScaledVector(scratch,Math.min(1-Math.exp(-dt*6),8*dt/distance));
    }
    const offset=this.smoothLead,desired=menu?scratch.copy(focus):scratch.set(T.MathUtils.clamp(focus.x+offset.x,-this.bounds.x,this.bounds.x),0,T.MathUtils.clamp(focus.z+offset.z,-this.bounds.z,this.bounds.z));
    this.target.lerp(desired,1-Math.exp(-dt*3));
    const portrait=this.camera.aspect<1;
    this.camera.position.set(this.target.x+(menu?16:0),menu?18:(portrait?62:54)*(this.bounds.x<40?.78:1),this.target.z+(menu?24:(portrait?51:43)*(this.bounds.x<40?.78:1)));
    this.camera.lookAt(this.target.x,0,this.target.z-(menu?0:3));
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){e.mesh.removeFromParent();(e.mesh.material as T.Material).dispose();this.effects.splice(i,1);continue;}e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*9;(e.mesh.material as T.MeshBasicMaterial).opacity=e.life/e.max;}
    // Track the ground, not the tank's vertical bob/sinking animation.
    this.stableShadow.update(scratch.set(focus.x,0,focus.z));
    while(this.wrecks.length>(this.low?6:14)){const old=this.wrecks.shift()!;old.root.removeFromParent();old.scorch.removeFromParent();}
    for(let i=this.wrecks.length-1;i>=0;i--){const wreck=this.wrecks[i];wreck.age+=dt;if(wreck.age>(this.low?20:60)){wreck.root.removeFromParent();wreck.scorch.removeFromParent();this.wrecks.splice(i,1);continue;}wreck.root.position.y=Math.max(0,wreck.root.position.y-dt*(4+wreck.age*12));wreck.emit-=dt;if(wreck.age<(this.low?5:12)&&wreck.emit<=0){wreck.emit=this.low?.4:.18;const p=wreck.root.position.clone();p.y+=1.3;this.fx.smoke(p,1.8);if(wreck.age<4)this.fx.emit(p,'flash',0xff6b23,1.4,.35);}}
    for(const a of this.activities)if(a.hover!==undefined&&!a.spent&&!a.airborne){a.hoverTime=(a.hoverTime??0)+dt;a.mesh.position.y=a.hover+Math.sin(a.hoverTime*2)*.2;}
    this.environment.update(dt,this.low);this.fx.update(dt,this.camera);
    this.renderer.render(this.scene,this.camera);
  }
}
