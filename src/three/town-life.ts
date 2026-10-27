import * as T from 'three';
import type {Cover,World} from './world';
import {coarsePointer,reducedMotion} from './media';

/** Life around buildings, decoration only: flags on rooftops, smoke from house chimneys and a few birds
 *  circling over town. Each kind is ONE instanced draw that never enters the shadow pass; flags and wings move
 *  in the vertex shader, smoke is a small pool of billboard puffs. Nothing here collides, blocks sight or uses
 *  the game's random numbers (placement is seeded per stage), and a destroyed building loses its flag and
 *  smoke. Motion pattern after the lightweight-game-objects skill (templates/living-swarm.js). */
const HOUSE_CHIMNEY=new T.Vector3(1.8,4.95,-1.3),HOUSE_RIDGE=new T.Vector3(0,4.38,2.25);
const TAU=Math.PI*2;
export function mulberry32(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

/** Lambert with a vertex motion injected before instancing; the cache key keeps it out of other programs. */
function moving(key:string,uniforms:Record<string,{value:unknown}>,motion:string){
 const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aLife;\nuniform float uTime;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>\n{ ${motion} }`);};
 material.customProgramCacheKey=()=>key;return material;
}
export function geometryOf(tris:[number[],number[],number[],number[]][]){
 const pos:number[]=[],col:number[]=[];for(const [a,b,c,k] of tris){pos.push(...a,...b,...c);col.push(...k,...k,...k);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}
/** A 3 m pole with a 1.8 x 1.1 m cloth in 6 columns, so the ripple has somewhere to travel. Sized for the
 *  high camera: 1 m is about 9 px on a phone, so the cloth reads at ~16 px. */
const FLAG_W=1.8;
function flagGeometry(){
 const tris:[number[],number[],number[],number[]][]=[],pole=[.18,.18,.2],cloth=[1,1,1],w=FLAG_W,h=1.1,top=3,cols=6;
 for(const [x0,x1] of [[-.05,.05]])tris.push([[x0,0,0],[x1,0,0],[x1,top,0],pole],[[x0,0,0],[x1,top,0],[x0,top,0],pole]);
 for(let i=0;i<cols;i++){const a=i/cols*w,b=(i+1)/cols*w,y0=top-h;tris.push([[a,y0,0],[b,y0,0],[b,top,0],cloth],[[a,y0,0],[b,top,0],[a,top,0],cloth]);}
 return geometryOf(tris);
}
/** A 1.6 m gull: pale wedge body, two-part wings with dark tips (wings are the vertices with large |x|).
 *  Pale with dark tips reads against sand, grass and dark city roofs alike. */
function birdGeometry(){
 const s=1.6,body=[.93,.94,.96],wing=[.84,.86,.9],tip=[.22,.24,.28];
 const n=[0,0,s*.3],t=[0,0,-s*.3],l=[-s*.07,0,0],r=[s*.07,0,0],h=[0,s*.05,0],wb=[0,0,-s*.08];
 return geometryOf([[n,l,h,body],[n,h,r,body],[h,l,t,body],[h,t,r,body],[l,[-s*.27,0,s*.05],wb,wing],[[-s*.27,0,s*.05],[-s*.5,0,-s*.06],wb,tip],[r,wb,[s*.27,0,s*.05],wing],[[s*.27,0,s*.05],wb,[s*.5,0,-s*.06],tip],[t,[-s*.1,0,-s*.42],[s*.1,0,-s*.42],wing]]);
}
let puffTexture:T.CanvasTexture|null=null;
export function smokeTexture(){
 if(puffTexture)return puffTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,g=ctx.createRadialGradient(32,32,2,32,32,31);
 g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(.6,'rgba(255,255,255,0.45)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 puffTexture=new T.CanvasTexture(canvas);puffTexture.colorSpace=T.SRGBColorSpace;return puffTexture;   // shared for the session, never disposed
}
/** Writes yaw + uniform scale straight into an instance buffer (no allocation). */
export function place(m:ArrayLike<number>&{[i:number]:number},i:number,x:number,y:number,z:number,yaw:number,s:number,bank=0){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cb=Math.cos(bank)*s,sb=Math.sin(bank)*s,o=i*16;
 m[o]=cy*cb;m[o+1]=sb;m[o+2]=-sy*cb;m[o+3]=0;m[o+4]=-cy*sb;m[o+5]=cb;m[o+6]=sy*sb;m[o+7]=0;m[o+8]=sy*s;m[o+9]=0;m[o+10]=cy*s;m[o+11]=0;m[o+12]=x;m[o+13]=y;m[o+14]=z;m[o+15]=1;
}

interface Puff{age:number;life:number;x:number;y:number;z:number}
export class TownLife{
 time=0;
 flags:T.InstancedMesh|null=null;smoke:T.InstancedMesh|null=null;birds:T.InstancedMesh|null=null;
 private flagHosts:Cover[]=[];private flagShown:boolean[]=[];
 private chimneys:{host:Cover;x:number;y:number;z:number;next:number}[]=[];private puffs:Puff[]=[];private fade=new Float32Array(0);
 private flock:{x:Float32Array;y:Float32Array;z:Float32Array;yaw:Float32Array;bank:Float32Array;speed:Float32Array;cx:number;cz:number;r:number;y0:number}|null=null;
 private wind={x:1,z:0};private rng=mulberry32(1);
 private readonly uniforms={uTime:{value:0}};

 /** After a stage is built (covers final). Meshes go into the arena, so they hide and clear with it. */
 /** Forget the last stage and free its GPU resources; World.clear() calls this before emptying the arena.
  *  The meshes are not marked `owned`, so the arena's own clean-up accounting is unchanged; the shared smoke
  *  texture lives for the session. */
 reset(){for(const mesh of [this.flags,this.smoke,this.birds])if(mesh){mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
  this.flags=this.smoke=this.birds=null;this.flagHosts=[];this.flagShown=[];this.chimneys=[];this.puffs=[];this.flock=null;this.time=0;}
 build(world:World,stage:number){
  this.reset();
  const buildings=world.covers.filter(c=>(c.kind==='house'||c.kind==='cityblock')&&c.hp>0&&c.mesh);
  if(!buildings.length)return;
  this.rng=mulberry32(0x7a11+stage*977);const rng=this.rng;
  const angle=rng()*TAU;this.wind={x:Math.sin(angle),z:Math.cos(angle)};
  // Phones and Low detail get fewer flags, puffs and birds; reduced motion keeps only still flags.
  const share=(world.low?.6:1)*(coarsePointer()?.75:1),still=reducedMotion();
  const roof=this.roofPoint(world);
  const picked=buildings.filter(()=>rng()<.55).slice(0,Math.round(10*share));
  for(const host of picked){const p=host.kind==='house'?HOUSE_RIDGE:roof;if(p)this.flagHosts.push(host);}
  if(this.flagHosts.length){
   const geometry=flagGeometry(),life=new Float32Array(this.flagHosts.length*2);
   const mesh=new T.InstancedMesh(geometry,moving('town-flag',this.uniforms,still?'':`
    float along=clamp(position.x/1.8,0.,1.);
    float wave=sin(uTime*(5.*aLife.y)+aLife.x-position.x*2.8)*.3+sin(uTime*8.5+aLife.x*2.-position.x*5.)*.08;
    transformed.z+=wave*along;transformed.y-=along*along*.12;`),this.flagHosts.length);
   const palette=['#ff573e','#ffc53d','#f2f5f7','#ff8a3a'],color=new T.Color(),at=new T.Vector3();
   this.flagHosts.forEach((host,i)=>{host.mesh!.updateMatrixWorld(true);at.copy(host.kind==='house'?HOUSE_RIDGE:roof!);host.mesh!.localToWorld(at);
    // Every cloth streams downwind, with a little scatter.
    place(mesh.instanceMatrix.array as Float32Array,i,at.x,at.y,at.z,Math.atan2(this.wind.x,this.wind.z)-Math.PI/2+(rng()-.5)*.3,.9+rng()*.25);
    life[i*2]=rng()*TAU;life[i*2+1]=.85+rng()*.3;mesh.setColorAt(i,color.set(palette[Math.floor(rng()*palette.length)]));this.flagShown[i]=true;});
   geometry.setAttribute('aLife',new T.InstancedBufferAttribute(life,2));if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
   this.flags=this.adopt(world,mesh,'TownFlags');
  }
  const houses=buildings.filter(c=>c.kind==='house');
  if(!still&&houses.length){
   for(const host of houses)if(rng()<.65&&this.chimneys.length<Math.round(6*share)){host.mesh!.updateMatrixWorld(true);const p=host.mesh!.localToWorld(HOUSE_CHIMNEY.clone());this.chimneys.push({host,x:p.x,y:p.y,z:p.z,next:rng()*.8});}
   const count=this.chimneys.length*7;
   if(count){
    const material=new T.MeshBasicMaterial({map:smokeTexture(),color:'#c8cdd1',transparent:true,depthWrite:false,fog:true});
    this.fade=new Float32Array(count);
    material.onBeforeCompile=shader=>{
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aFade;\nvarying float vFade;')
      // Camera-facing quads: scale from the instance matrix, orientation from the view.
      .replace('#include <project_vertex>','vec4 mvPosition=modelViewMatrix*vec4(instanceMatrix[3].xyz,1.);mvPosition.xy+=position.xy*length(instanceMatrix[0].xyz);gl_Position=projectionMatrix*mvPosition;vFade=aFade;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFade;').replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=vFade;');
    };
    material.customProgramCacheKey=()=>'town-smoke';
    const geometry=new T.PlaneGeometry(1,1);geometry.setAttribute('aFade',new T.InstancedBufferAttribute(this.fade,1).setUsage(T.DynamicDrawUsage));
    const mesh=new T.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.renderOrder=2;
    // The live puff count changes every frame, so a bounding sphere computed once would cull them wrongly.
    mesh.frustumCulled=false;
    this.puffs=Array.from({length:count},()=>({age:0,life:0,x:0,y:0,z:0}));
    this.smoke=this.adopt(world,mesh,'TownSmoke');
   }
  }
  // Birds circle over the town centre when there is a town to circle.
  const birdCount=still||buildings.length<3?0:Math.max(3,Math.round(8*share));
  if(birdCount){
   let cx=0,cz=0;for(const b of buildings){cx+=b.x;cz+=b.z;}cx/=buildings.length;cz/=buildings.length;
   const r=Math.min(26,Math.max(12,Math.sqrt(buildings.reduce((s,b)=>s+(b.x-cx)**2+(b.z-cz)**2,0)/buildings.length)));
   const geometry=birdGeometry(),life=new Float32Array(birdCount*2);
   const mesh=new T.InstancedMesh(geometry,moving('town-birds',this.uniforms,`
    float span=clamp(abs(position.x)/.8,0.,1.);float beat=sin(uTime*8.*aLife.y+aLife.x)*(.3+.7*step(.0,sin(uTime*.4+aLife.x)));
    transformed.y+=span*span*.8*beat*.8;`),birdCount);
   mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   const f={x:new Float32Array(birdCount),y:new Float32Array(birdCount),z:new Float32Array(birdCount),yaw:new Float32Array(birdCount),bank:new Float32Array(birdCount),speed:new Float32Array(birdCount),cx,cz,r,y0:9};
   for(let i=0;i<birdCount;i++){const a=rng()*TAU,d=r*(.5+rng()*.5);f.x[i]=cx+Math.cos(a)*d;f.z[i]=cz+Math.sin(a)*d;f.y[i]=10+rng()*5;f.yaw[i]=a+Math.PI/2;f.speed[i]=3+rng()*1.5;life[i*2]=rng()*TAU;life[i*2+1]=.85+rng()*.3;
    place(mesh.instanceMatrix.array as Float32Array,i,f.x[i],f.y[i],f.z[i],f.yaw[i],1);}
   geometry.setAttribute('aLife',new T.InstancedBufferAttribute(life,2));
   mesh.boundingSphere=new T.Sphere(new T.Vector3(cx,12,cz),r*1.6+8);
   this.flock=f;this.birds=this.adopt(world,mesh,'TownBirds');
  }
 }
 private adopt(world:World,mesh:T.InstancedMesh,name:string){mesh.name=name;mesh.castShadow=mesh.receiveShadow=false;mesh.userData.townLife=true;world.arena.add(mesh);return mesh;}
 /** A flat spot on a city block roof, found once from the template in its own space. */
 private roofPoint(world:World){
  const template=world.templates.get('cityblock');if(!template)return null;
  template.updateMatrixWorld(true);const box=new T.Box3().setFromObject(template);if(box.isEmpty())return null;
  const ray=new T.Raycaster(new T.Vector3(box.max.x-1.2,box.max.y+5,box.max.z-1.2),new T.Vector3(0,-1,0));
  const hit=ray.intersectObject(template,true)[0];return hit?new T.Vector3(hit.point.x,hit.point.y-.02,hit.point.z):null;
 }

 /** Every rendered frame with the frame's dt (0 while paused). */
 update(dt:number){
  if(dt>0)this.time+=Math.min(dt,.05);
  this.uniforms.uTime.value=this.time;
  const flags=this.flags;
  if(flags?.parent)this.flagHosts.forEach((host,i)=>{if(host.hp<=0&&this.flagShown[i]){this.flagShown[i]=false;place(flags.instanceMatrix.array as Float32Array,i,0,-50,0,0,0);flags.instanceMatrix.needsUpdate=true;}});
  if(dt<=0)return;dt=Math.min(dt,.05);
  const smoke=this.smoke;
  if(smoke?.parent){
   for(const c of this.chimneys){c.next-=dt;if(c.next>0||c.host.hp<=0)continue;c.next=.45+this.rng()*.25;
    const free=this.puffs.find(p=>p.age>=p.life);if(free){free.age=0;free.life=3+this.rng()*.8;free.x=c.x;free.y=c.y;free.z=c.z;}}
   let n=0;const m=smoke.instanceMatrix.array as Float32Array;
   for(const p of this.puffs){if(p.age>=p.life)continue;p.age+=dt;const k=Math.min(1,p.age/p.life);
    // Rise, drift downwind, grow, and fade in then out.
    p.y+=dt*(1.1-k*.5);p.x+=this.wind.x*dt*(.35+k*.7);p.z+=this.wind.z*dt*(.35+k*.7);
    place(m,n,p.x,p.y,p.z,0,.6+k*2);this.fade[n]=Math.min(1,k*5)*(1-k)*.75;n++;}
   smoke.count=n;smoke.instanceMatrix.needsUpdate=true;(smoke.geometry.getAttribute('aFade') as T.InstancedBufferAttribute).needsUpdate=true;
  }
  const birds=this.birds,f=this.flock;
  if(birds?.parent&&f){
   const m=birds.instanceMatrix.array as Float32Array;
   for(let i=0;i<f.x.length;i++){
    // Orbit the town: steer toward the tangent of the circle, nudged back toward its radius.
    const dx=f.x[i]-f.cx,dz=f.z[i]-f.cz,d=Math.hypot(dx,dz)||1,tangent=Math.atan2(-dz/d,dx/d)-(d-f.r)*.04;
    const turn=Math.atan2(Math.sin(tangent-f.yaw[i]),Math.cos(tangent-f.yaw[i])),rate=Math.max(-1.2,Math.min(1.2,turn*1.5));
    f.yaw[i]+=rate*dt;f.bank[i]+=(-rate*.5-f.bank[i])*Math.min(1,dt*3);
    f.x[i]+=Math.sin(f.yaw[i])*f.speed[i]*dt;f.z[i]+=Math.cos(f.yaw[i])*f.speed[i]*dt;
    place(m,i,f.x[i],f.y[i]+Math.sin(this.time*.7+i)*.4,f.z[i],f.yaw[i],1,f.bank[i]);
   }
   birds.instanceMatrix.needsUpdate=true;
  }
 }
}
