import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Box } from './rules';
import { Environment } from './environment';
import { CombatEffects } from './effects';
import { BOUNDS, buildActivities } from './activities';
import type { Activity } from './activities';
export interface TankVisual { root: T.Group; hull: T.Object3D; turret: T.Object3D; muzzle: T.Object3D; bar: T.Mesh; beam: T.Mesh; }
export interface Cover extends Box { kind: 'barricade' | 'crate' | 'barrel' | 'pine' | 'house' | 'stonewall' | 'steelwall' | 'hill'; hp: number; mesh: T.Group; }
interface Effect { mesh: T.Mesh; life: number; max: number; velocity: T.Vector3; }
const scratch = new T.Vector3();
export class World {
  scene = new T.Scene();
  environment=new Environment();
  fx=new CombatEffects(this.scene); activities:Activity[]=[]; wrecks:{root:T.Group;age:number;emit:number}[]=[];
  burnt=new T.MeshStandardMaterial({color:0x292b28,roughness:.96});
  scorchGeometry=new T.CircleGeometry(3,24); scorchMaterial=new T.MeshBasicMaterial({color:0x28251e,transparent:true,opacity:.6,depthWrite:false});
  camera = new T.PerspectiveCamera(43, 1, .1, 240);
  renderer: T.WebGLRenderer;
  arena = new T.Group();
  entities = new T.Group();
  templates = new Map<string, T.Group>();
  covers: Cover[] = [];
  effects: Effect[] = [];
  ring: T.Mesh;
  cursor: T.Mesh;
  shield: T.Mesh;
  sun: T.DirectionalLight;
  effectGeometry = new T.IcosahedronGeometry(1, 0);
  effectMaterials = [0xffba66,0xf67845,0x696657,0x75f5cf].map(color => new T.MeshBasicMaterial({ color, transparent: true }));
  low = false;
  target = new T.Vector3();
  constructor(container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','3D battlefield');
    this.scene.background = new T.Color('#b1ad90');
    this.scene.fog = new T.Fog('#b1ad90', 80, 150);
    this.scene.add(new T.HemisphereLight(0xd5eee8,0x61513d,2.7));
    this.sun = new T.DirectionalLight(0xffe4b4,3.1);
    this.sun.position.set(-28,48,20); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{ left:-50,right:50,top:45,bottom:-45,near:1,far:120 });
    this.sun.shadow.normalBias = .035; this.scene.add(this.sun,this.sun.target);
    this.scene.add(this.arena,this.entities);
    this.ring = new T.Mesh(new T.RingGeometry(6.6,6.9,64),new T.MeshBasicMaterial({color:0xffc272,side:T.DoubleSide,transparent:true,opacity:.85}));
    this.ring.rotation.x=-Math.PI/2; this.ring.position.set(0,.05,-13); this.scene.add(this.ring);
    this.cursor = new T.Mesh(new T.RingGeometry(.65,.78,24),new T.MeshBasicMaterial({color:0xc0ffdf,side:T.DoubleSide}));
    this.cursor.rotation.x=-Math.PI/2; this.cursor.position.y=.08; this.scene.add(this.cursor);
    this.shield = new T.Mesh(new T.SphereGeometry(2.6,20,12),new T.MeshBasicMaterial({color:0x76ffe0,transparent:true,opacity:.12,wireframe:true}));
    this.scene.add(this.shield); this.shield.visible=false;
    window.addEventListener('resize',()=>this.resize()); this.resize();
  }
  async load() {
    const loader=new GLTFLoader();
    await Promise.all(['tank','transport','barricade','crate','barrel','relay','pine','house','stonewall','steelwall','bridge','hill'].map(async name=>{
      const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
      const root=gltf.scene;
      root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true; o.receiveShadow=true;}});
      this.templates.set(name,root);
    }));
    // Tank pieces become a handful of material batches while the turret pivot and muzzle remain independent.
    const tank=this.templates.get('tank')!;
    tank.updateMatrixWorld(true);
    for (const part of [tank.getObjectByName('Hull')!,tank.getObjectByName('Turret')!,...['pine','house','stonewall','steelwall','bridge','hill'].map(name=>this.templates.get(name)!)]) {
      part.updateMatrixWorld(true);
      const inverse=part.matrixWorld.clone().invert();
      const buckets=new Map<T.Material,T.BufferGeometry[]>();
      const meshes:T.Mesh[]=[];
      part.traverse(o=>{if(o instanceof T.Mesh && !Array.isArray(o.material)){
        const g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
        const batch=buckets.get(o.material)||[]; batch.push(g); buckets.set(o.material,batch); meshes.push(o);
      }});
      for(const mesh of meshes) mesh.removeFromParent();
      for(const [material,geometries] of buckets){
        const merged=mergeGeometries(geometries); geometries.forEach(g=>g.dispose());
        if(merged){const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;part.add(mesh);}
      }
    }
  }
  clone(name:string):T.Group { return this.templates.get(name)!.clone(true); }
  tank(enemy=false,boss=false):TankVisual {
    const root=this.clone('tank');
    if(enemy) root.traverse(o=>{if(o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial){
      const name=o.material.name;
      // Reuse one enemy material per original material across all tanks.
      const key=`enemy:${name}`;
      let mat=this.enemyMaterials.get(key);
      if(!mat){mat=o.material.clone(); if(name==='Armor')mat.color.set(0x744b41);if(name==='Trim')mat.color.set(0xc08a68);if(name==='Signal')mat.color.set(0xff573e);this.enemyMaterials.set(key,mat);}
      o.material=mat;
    }});
    if(boss)root.scale.setScalar(1.55);
    const bar=new T.Mesh(new T.PlaneGeometry(2.8,.16),new T.MeshBasicMaterial({color:enemy?0xff795c:0x8efad6,depthTest:false}));
    bar.userData.owned=true;bar.rotation.x=-Math.PI/3;bar.position.y=boss?4.6:3;bar.renderOrder=5;root.add(bar);bar.visible=enemy;
    const beam=new T.Mesh(new T.BoxGeometry(.08,.02,1),new T.MeshBasicMaterial({color:0xff5849,transparent:true,opacity:.55}));
    beam.userData.owned=true;beam.visible=false;this.entities.add(beam);
    this.entities.add(root);
    return {root,hull:root.getObjectByName('Hull')!,turret:root.getObjectByName('Turret')!,muzzle:root.getObjectByName('Muzzle')!,bar,beam};
  }
  enemyMaterials=new Map<string,T.MeshStandardMaterial>();
  clear() { this.environment.clear();this.fx.clear();this.wrecks=[];this.activities=[];
    for(const effect of this.effects){effect.mesh.removeFromParent();(effect.mesh.material as T.Material).dispose();}
    this.effects=[];
    // Only dispose runtime-created resources; GLB geometry/materials are shared templates.
    for(const group of [this.arena,this.entities]){
      group.traverse(o=>{if(o instanceof T.Sprite && o.userData.activityLabel){o.material.map?.dispose();o.material.dispose();}if(o instanceof T.Mesh && o.userData.owned){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
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
      const material=mesh.material as T.MeshStandardMaterial,key=`${material.color.getHex()}:${mesh.castShadow}`;
      let bucket=buckets.get(key);if(!bucket){bucket={geometries:[],material:material.clone(),shadow:mesh.castShadow};buckets.set(key,bucket);}
      bucket.geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));mesh.removeFromParent();mesh.geometry.dispose();material.dispose();
    }
    for(const bucket of buckets.values()){
      const geometry=mergeGeometries(bucket.geometries);bucket.geometries.forEach(g=>g.dispose());
      if(!geometry){bucket.material.dispose();continue;}
      const mesh=new T.Mesh(geometry,bucket.material);mesh.castShadow=bucket.shadow;mesh.receiveShadow=true;mesh.userData.owned=true;this.arena.add(mesh);
    }
  }
  build(index:number,kind:string) {
    this.clear();
    const ground=this.box(164,.7,144,index===3?0x74776c:0xa69c78,0,-.4,0);ground.castShadow=false;
    this.box(8,.035,130,0x817e65,0,-.02,0);
    for(let z=-60;z<62;z+=5)this.box(.15,.025,2,0xc3b993,0,.01,z);
    for(let i=0;i<86;i++){
      const x=Math.sin(i*19.73)*72,z=Math.cos(i*8.2)*60;
      const patch=this.box(1.2+(i%4),.035,1.3+(i%3),i%2?0x98936f:0xb1a680,x,.005,z);patch.rotation.y=i;patch.castShadow=false;
    }
    // Keep the central convoy road clear. Every obstacle uses the same footprint for rendering and collision.
    const layout:[number,number,'barricade'|'crate'|'barrel'][]=[[-14,13,'barricade'],[12,8,'barricade'],[-15,-6,'barricade'],[15,-15,'barricade'],[-27,-15,'barricade'],[28,0,'barricade'],[-9,12,'crate'],[16,8,'crate'],[-20,-6,'crate'],[10,-16,'crate'],[-24,7,'barrel'],[20,-11,'barrel'],[-13,-18,'barrel'],[25,14,'crate']];
    for(const side of [-1,1])for(const z of [-43,-22,0,23,44]){layout.push([side*51,z,'barricade'],[side*56,z+4,'crate'],[side*47,z-5,'barrel']);}
    for(const [x,z,kind] of layout){
      const mesh=this.clone(kind);mesh.position.set(x,0,z);
      if(kind==='barricade')mesh.scale.set(2,1.3,1.5);
      this.arena.add(mesh);this.covers.push({x,z,w:kind==='barricade'?6.4:kind==='crate'?1.3:1,d:kind==='barricade'?1.8:kind==='crate'?1.3:1,kind,hp:kind==='barricade'?Infinity:kind==='crate'?55:25,mesh});
    }
    for(let i=0;i<60;i++){
      const side=i%2?-1:1,x=side*(76+(i%3)),z=-62+Math.floor(i/2)*4.2;
      const rock=this.box(2+(i%3),1.4+(i%4)*.8,3.5,0x6d7262,x,1,z);rock.rotation.y=i*.7;
    }
    for(let i=0;i<29;i++){const x=-75+i*5.4;this.box(3,2.8+(i%3),2.5,0x737762,x,1,-65);}
    this.ring.visible=['capture','defense','escort'].includes(kind);
    this.ring.position.set(0,.06,kind==='escort'?-50:-13);
    this.ring.scale.setScalar(kind==='escort'?.7:1);
    if(kind==='capture'||kind==='defense'){
      const relay=this.clone('relay');relay.position.set(0,0,-13);this.arena.add(relay);
    }
    // Extraction pylons frame the road.
    for(const x of [-4,4]){this.box(.45,3.2,.45,0x3e5751,x,1.6,-51);this.box(.65,.2,.65,0x98f3bf,x,3.3,-51);}
    this.environment.build(this,index);this.batchScenery();this.activities=buildActivities(this.arena);
    this.target.set(0,0,0);
  }
  settings(low:boolean){this.low=low;this.fx.low=low;this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.6));this.renderer.shadowMap.enabled=!low;this.resize();}
  resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  burst(position:T.Vector3,color=0,amount=12){
    for(let i=0;i<(this.low?Math.ceil(amount/2):amount)&&this.effects.length<100;i++){
      const material=this.effectMaterials[color].clone();
      const mesh=new T.Mesh(this.effectGeometry,material);mesh.position.copy(position);mesh.position.y+=.8;mesh.scale.setScalar(.25+Math.random()*.5);this.scene.add(mesh);
      const life=.35+Math.random()*.5;
      this.effects.push({mesh,life,max:life,velocity:new T.Vector3((Math.random()-.5)*9,Math.random()*6,(Math.random()-.5)*9)});
    }
  }
  destroyTank(visual:TankVisual){
    const root=this.clone('tank');root.position.copy(visual.root.position);root.scale.copy(visual.root.scale);
    root.getObjectByName('Hull')!.rotation.y=visual.hull.rotation.y;
    const turret=root.getObjectByName('Turret')!;turret.rotation.set(.28,visual.turret.rotation.y,.24);turret.position.y=.9;
    root.traverse(o=>{if(o instanceof T.Mesh)o.material=this.burnt;});this.entities.add(root);
    const scorch=new T.Mesh(this.scorchGeometry,this.scorchMaterial);scorch.rotation.x=-Math.PI/2;scorch.position.copy(root.position).y=.035;this.entities.add(scorch);
    root.add(scorch);scorch.position.set(0,.035,0);
    this.wrecks.push({root,age:0,emit:0});if(this.wrecks.length>14)this.wrecks.shift()!.root.removeFromParent();
    const p=root.position.clone();p.y=1;this.fx.impact(p,true);
  }
  update(dt:number,focus:T.Vector3,menu=false){
    const desired=menu?scratch.copy(focus):scratch.set(T.MathUtils.clamp(focus.x,-BOUNDS.x,BOUNDS.x),0,focus.z+(this.camera.aspect<1?8:-8));
    this.target.lerp(desired,1-Math.exp(-dt*3));
    const portrait=this.camera.aspect<1;
    this.camera.position.set(this.target.x+(menu?16:0),menu?18:portrait?62:54,this.target.z+(menu?24:portrait?51:43));
    this.camera.lookAt(this.target.x,0,this.target.z-(menu?0:3));
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){e.mesh.removeFromParent();(e.mesh.material as T.Material).dispose();this.effects.splice(i,1);continue;}e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*9;(e.mesh.material as T.MeshBasicMaterial).opacity=e.life/e.max;}
    this.sun.position.set(focus.x-28,48,focus.z+20);this.sun.target.position.set(focus.x,0,focus.z);
    for(const wreck of this.wrecks){wreck.age+=dt;wreck.emit-=dt;if(wreck.age<12&&wreck.emit<=0){wreck.emit=this.low?.4:.18;const p=wreck.root.position.clone();p.y=1.3;this.fx.smoke(p,1.8);if(wreck.age<4)this.fx.emit(p,'flash',0xff6b23,1.4,.35);}}
    this.environment.update(dt,this.low);this.fx.update(dt,this.camera);
    this.renderer.render(this.scene,this.camera);
  }
}
