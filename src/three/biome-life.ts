import * as T from 'three';
import type {Cover,World} from './world';
import type {Biome} from './terrain';
import {MUD} from './terrain';
import {QUAKE_CRACKS,VOLCANO} from './frontier-environment';
import {someCoverNear} from './cover-grid';
import {circleBox} from './rules';
import {geometryOf,mulberry32,place,smokeTexture} from './town-life';
import {coarsePointer,reducedMotion} from './media';

/** Small life that fits each battlefield, decoration only: butterflies over meadows, dragonflies over water and
 *  mud, embers over lava and burnt ground, steam from city manholes and factory vents, dust from the quake
 *  cracks, tumbleweeds across the desert and diamond-dust glints on snow. Each stage gets one kind, drawn as
 *  ONE instanced draw that never enters the shadow pass. Flyers and tumbleweeds steer on the CPU (a few dozen
 *  numbers per frame); particles and glints move entirely in the vertex shader. Nothing collides, blocks sight
 *  or touches the game's random numbers (placement is seeded per stage), and reduced motion shows none of it.
 *  Patterns after the lightweight-game-objects skill (living-swarm.js) and town-life.ts. */
export type LifeKind='butterflies'|'dragonflies'|'embers'|'steam'|'dust'|'tumbleweeds'|'glints';
export const BIOME_LIFE:Record<Biome,LifeKind>={grove:'butterflies',village:'butterflies',ridge:'butterflies',jungle:'butterflies',river:'dragonflies',marsh:'dragonflies',
 volcanic:'embers',wastes:'embers',industrial:'steam',city:'steam',quake:'dust',desert:'tumbleweeds',snow:'glints',glacier:'glints'};
const TAU=Math.PI*2;
const angleTo=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
/** Tumbleweeds live this far inside the map edge, clear of the boundary rocks. */
const WEED_EDGE=6;

/** Lambert flyer: per-vertex `aTint` picks instance colour (1) or the vertex colour as authored (0), so a wing
 *  can take the instance's colour while tips and bodies keep theirs; wings flap in the vertex shader. */
function flyerMaterial(key:string,uniforms:Record<string,{value:unknown}>,motion:string){
 const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aLife;\nattribute float aTint;\nuniform float uTime;')
   .replace('#include <color_vertex>','#include <color_vertex>\nvColor.xyz=mix(color.xyz,vColor.xyz,aTint);')
   .replace('#include <begin_vertex>',`#include <begin_vertex>\n{ ${motion} }`);};
 material.customProgramCacheKey=()=>key;return material;
}
type Tri=[number[],number[],number[],number[]];
/** Mirror the right-hand triangles to the left (wings are the vertices away from x = 0). */
const mirrored=(right:Tri[])=>[...right,...right.map(([a,b,c,k]):Tri=>[[-c[0],c[1],c[2]],[-b[0],b[1],b[2]],[-a[0],a[1],a[2]],k])];
function withTint(geometry:T.BufferGeometry,tints:number[]){const per:number[]=[];for(const t of tints)per.push(t,t,t);geometry.setAttribute('aTint',new T.Float32BufferAttribute(per,1));return geometry;}
/** A 0.9 m butterfly, drawn at 1.05-1.4x (about 10 px on a phone): forewing with a dark tip, a slightly paler hindwing, a dark body. 14 triangles. */
function butterflyGeometry(){
 const wing=[1,1,1],hind=[.86,.86,.86],tip=srgb('#3a2a1c'),body=srgb('#2b2220');
 const H1=[0,0,.1],H2=[0,0,-.02],H3=[0,0,-.12],M1=[.27,0,.17],M2=[.25,0,0],T1=[.45,0,.23],T2=[.42,0,.04],B1=[.3,0,-.06],B2=[.21,0,-.25];
 const right:Tri[]=[[H1,M1,H2,wing],[H2,M1,M2,wing],[M1,T1,T2,tip],[M1,T2,M2,tip],[H2,B1,H3,hind],[H3,B1,B2,hind]];
 const tris=[...mirrored(right),[[0,.02,.2],[-.03,.02,-.18],[.03,.02,-.18],body],[[0,.02,.2],[.03,.02,-.18],[-.03,.02,-.18],body]] as Tri[];
 return withTint(geometryOf(tris),tris.map(t=>t[3]===wing||t[3]===hind?1:0));
}
/** A 1.1 m dragonfly, drawn at 1.3-1.55x: a coloured body and four pale glassy wings. 20 triangles. */
function dragonflyGeometry(){
 const glass=[.74,.88,1],body=[1,1,1];
 const wing=(z:number,len:number,w:number):Tri[]=>[[[0,.03,z+w],[len,.03,z+w*1.2],[len,.03,z-w*.4],glass],[[0,.03,z+w],[len,.03,z-w*.4],[0,.03,z-w],glass]];
 const right=[...wing(.2,.5,.06),...wing(.04,.46,.06)];
 const tris:Tri[]=[...mirrored(right),
  [[0,0,.48],[-.06,0,.34],[.06,0,.34],body],[[-.06,0,.34],[0,.05,.12],[.06,0,.34],body],[[-.06,0,.34],[0,-.02,.1],[0,.05,.12],body],[[.06,0,.34],[0,.05,.12],[0,-.02,.1],body],
  [[-.035,.02,.12],[0,.02,-.62],[.035,.02,.12],body],[[.035,.02,.12],[0,.02,-.62],[-.035,.02,.12],body],
  [[-.1,.04,.44],[-.03,.04,.5],[-.04,.04,.38],[.1,.1,.12]],[[.1,.04,.44],[.04,.04,.38],[.03,.04,.5],[.1,.1,.12]]];
 return withTint(geometryOf(tris),tris.map(t=>t[3]===body?1:0));
}
/** Vertex colours are linear: author them as sRGB hex so they match the palette on screen. */
const srgb=(hex:string)=>new T.Color(hex).toArray() as number[];
/** A 1.2 m tumbleweed: a dark scruffy core wrapped in five crossing twig bands, so it reads as woven from the
 *  high camera at any roll angle. About 180 triangles. */
function tumbleweedGeometry(rng:()=>number){
 const tris:Tri[]=[],core=new T.IcosahedronGeometry(.4,1),p=core.attributes.position,jitter=new Map<string,number>();
 const coreTones=[srgb('#6e4f2a'),srgb('#806036')],twigTones=[srgb('#c99a56'),srgb('#a97c40'),srgb('#ddb36e')];
 const v=(i:number)=>{const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=`${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;let s=jitter.get(k);if(s===undefined){s=.8+rng()*.4;jitter.set(k,s);}return [x*s,y*s,z*s];};
 for(let i=0;i<p.count;i+=3)tris.push([v(i),v(i+1),v(i+2),coreTones[Math.floor(rng()*2)]]);
 core.dispose();
 const n=new T.Vector3(),u=new T.Vector3(),w=new T.Vector3(),up=new T.Vector3(0,1,0);
 for(let band=0;band<5;band++){
  n.set(rng()-.5,rng()-.5,rng()-.5).normalize();u.crossVectors(n,Math.abs(n.y)>.9?new T.Vector3(1,0,0):up).normalize();w.crossVectors(n,u);
  const r=.52+rng()*.12,half=.035,tone=twigTones[band%3],ring=(t:number,side:number)=>{const c=Math.cos(t)*r,s2=Math.sin(t)*r;return [u.x*c+w.x*s2+n.x*half*side,u.y*c+w.y*s2+n.y*half*side,u.z*c+w.z*s2+n.z*half*side];};
  for(let i=0;i<10;i++){const t0=i/10*TAU,t1=(i+1)/10*TAU;if(rng()<.15)continue;   // the odd gap reads as broken twigs
   tris.push([ring(t0,-1),ring(t1,-1),ring(t1,1),tone],[ring(t0,-1),ring(t1,1),ring(t0,1),tone]);}
 }
 return geometryOf(tris);
}
/** Soft additive dot (embers) and a four-point star (glints), drawn once per session. */
const textures:Record<string,T.CanvasTexture>={};
function sprite(kind:'dot'|'star'){
 if(textures[kind])return textures[kind];
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;
 if(kind==='dot'){const g=ctx.createRadialGradient(32,32,1,32,32,31);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);}
 else{const g=ctx.createRadialGradient(32,32,0,32,32,10);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  ctx.fillStyle='rgba(255,255,255,.9)';for(const [w,h] of [[3,60],[60,3]]){ctx.beginPath();ctx.ellipse(32,32,w/2,h/2,0,0,TAU);ctx.fill();}}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures[kind]=texture;return texture;   // shared for the session
}

/** GPU particles: every puff, ember or glint is a camera-facing quad whose whole life is a function of time.
 *  `aSeed` = base x, base z, phase, rate; `aBase` = base height, 1 if the base wraps around the camera target.
 *  Wrapping keeps a FIELD-sized patch centred a little ahead of what the camera looks at (the high camera sees
 *  far more ground ahead than behind), with no CPU work per frame; quads fade out near the patch edge, so the
 *  wrap never pops. */
const FIELD={x:110,z:96,ahead:16};
interface ParticleLook{color:string;additive:boolean;texture:T.Texture;opacity:number;life:number;rise:number;grow:[number,number];size:number;wind:[number,number];sway:number;twinkle?:boolean}
function particleMesh(look:ParticleLook,spots:{x:number;z:number;y:number;wrap:boolean}[],rng:()=>number,uniforms:{uTime:{value:number};uCenter:{value:T.Vector2}}){
 const quad=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
 geometry.index=quad.index;geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
 const seed=new Float32Array(spots.length*4),base=new Float32Array(spots.length*2);
 spots.forEach((s,i)=>{seed.set([s.x,s.z,rng(),.75+rng()*.5],i*4);base.set([s.y,s.wrap?1:0],i*2);});
 geometry.setAttribute('aSeed',new T.InstancedBufferAttribute(seed,4));geometry.setAttribute('aBase',new T.InstancedBufferAttribute(base,2));geometry.instanceCount=spots.length;
 const material=new T.MeshBasicMaterial({map:look.texture,color:look.color,transparent:true,opacity:look.opacity,depthWrite:false,blending:look.additive?T.AdditiveBlending:T.NormalBlending,fog:true});
 const settings={uLife:{value:look.life},uRise:{value:look.rise},uGrow:{value:new T.Vector2(...look.grow)},uSize:{value:look.size},uWind:{value:new T.Vector2(...look.wind)},uSway:{value:look.sway},uWrap:{value:new T.Vector2(FIELD.x,FIELD.z)}};
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms,settings);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 aSeed;attribute vec2 aBase;varying float vFade;
uniform float uTime,uLife,uRise,uSize,uSway;uniform vec2 uCenter,uGrow,uWind,uWrap;`)
   .replace('#include <project_vertex>',`
float age=fract(uTime*aSeed.w/uLife+aSeed.z);
vec2 at=aSeed.xy;float edge=1.;if(aBase.y>.5){vec2 rel=mod(at-uCenter+uWrap*.5,uWrap)-uWrap*.5;at=uCenter+rel;rel/=uWrap;edge=1.-smoothstep(.4,.5,max(abs(rel.x),abs(rel.y)));}
${look.twinkle?`float flash=pow(max(sin(uTime*aSeed.w*2.4+aSeed.z*6.2832),0.),14.);vec3 spot=vec3(at.x,aBase.x,at.y);float size=uSize*flash*edge;vFade=flash*edge;`
:`vec3 spot=vec3(at.x+uWind.x*age+sin(age*9.4+aSeed.z*40.)*uSway,aBase.x+uRise*age,at.y+uWind.y*age+cos(age*7.1+aSeed.z*31.)*uSway);
float size=uSize*mix(uGrow.x,uGrow.y,age);vFade=smoothstep(0.,.18,age)*(1.-smoothstep(.55,1.,age))*edge;`}
vec4 mvPosition=viewMatrix*vec4(spot,1.);mvPosition.xy+=position.xy*size;gl_Position=projectionMatrix*mvPosition;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFade;').replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=vFade;');};
 material.customProgramCacheKey=()=>`biome-particles-${look.twinkle?'twinkle':'rise'}`;
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;quad.dispose();
 return mesh;
}

interface Flyer{x:number;y:number;z:number;yaw:number;bank:number;hx:number;hz:number;gx:number;gz:number;gy:number;range:number;speed:number;timer:number;flee:number;hover:boolean;scale:number}
interface Weed{x:number;z:number;heading:number;speed:number;spin:number;hop:number;dodge:number;radius:number;bounces:number;freeRun:number}

export class BiomeLife{
 kind:LifeKind|null=null;mesh:T.Mesh|null=null;time=0;
 private flyers:Flyer[]=[];private weeds:Weed[]=[];private rng=mulberry32(1);private wind={x:1,z:0};private bounds={x:70,z:60};
 private readonly uniforms={uTime:{value:0},uCenter:{value:new T.Vector2()}};
 private readonly probe={x:0,z:0,r:0};
 private readonly blocks=(c:Cover)=>c.hp>0&&!c.boundary&&circleBox(this.probe,this.probe.r,c);
 /** Whether a ball of radius r at (x, z) touches standing cover (the map's boundary rocks excluded). */
 private touches(world:World,x:number,z:number,r:number){const p=this.probe;p.x=x;p.z=z;p.r=r;return someCoverNear(world,x-r,z-r,x+r,z+r,this.blocks);}
 private readonly q=new T.Quaternion();private readonly spin=new T.Quaternion();private readonly axis=new T.Vector3();private readonly m=new T.Matrix4();private readonly at=new T.Vector3();private readonly one=new T.Vector3(1,1,1);   // `one`: tumbleweed scale

 /** Forget the last stage; World.clear() calls this before emptying the arena. */
 reset(){if(this.mesh){this.mesh.removeFromParent();if(this.mesh instanceof T.InstancedMesh)this.mesh.dispose();this.mesh.geometry.dispose();(this.mesh.material as T.Material).dispose();}
  this.mesh=null;this.kind=null;this.flyers=[];this.weeds=[];this.time=0;}
 /** After a stage is built (covers final). */
 build(world:World,stage:number){
  this.reset();
  const biome=world.environment.biome,kind=BIOME_LIFE[biome];if(!kind||reducedMotion())return;
  this.rng=mulberry32(0xb10e+stage*7919);const rng=this.rng,share=(world.low?.6:1)*(coarsePointer()?.75:1);
  const angle=rng()*TAU;this.wind={x:Math.sin(angle),z:Math.cos(angle)};this.bounds={...world.bounds};
  const free=(x:number,z:number,r:number)=>Math.abs(x)<world.bounds.x-2&&Math.abs(z)<world.bounds.z-2&&!world.covers.some(c=>c.hp>0&&circleBox({x,z},r,c));
  // A home is clear of trees and buildings, so flyers are not hidden under a canopy and their fallback spot is open.
  const home=(x:number,z:number,range:number)=>{if(free(x,z,3.5))return {x,z,range};for(let i=0;i<8;i++){const a=rng()*TAU,d=rng()*range,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(free(px,pz,3.5))return {x:px,z:pz,range};}return null;};
  let mesh:T.Mesh|null=null;
  if(kind==='butterflies'||kind==='dragonflies'){
   const butterfly=kind==='butterflies',homes:{x:number;z:number;range:number}[]=[];
   if(butterfly){
    // Meadows beside the road the player drives, so they are met on the way, never on top of cover.
    const points=world.layout.points,want=Math.round((biome==='jungle'?9:7)*share);
    for(let i=0;i<want*6&&homes.length<want;i++){const k=Math.floor(rng()*Math.max(1,points.length-1)),a=points[k],b=points[Math.min(points.length-1,k+1)],side=rng()<.5?-1:1,d=5+rng()*9;
     const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,x=a.x+dz/l*d*side,z=a.z-dx/l*d*side;const h=home(x,z,0);if(h)homes.push({...h,range:6});}
   }else if(biome==='marsh'){for(const r of MUD){const h=home(r.x,r.z,Math.min(r.rx,r.rz)*.8);if(h)homes.push(h);}}
   else for(let x=-world.bounds.x+10;x<world.bounds.x-6;x+=world.bounds.x/3){const h=home(x+rng()*6,32,4);if(h)homes.push({...h,range:5});}   // the river strip (8 m wide, so a home stays over it)
   const count=homes.length?Math.round((butterfly?2:1.2)*homes.length*(butterfly?1:share)):0;
   if(count){
    const geometry=butterfly?butterflyGeometry():dragonflyGeometry(),life=new Float32Array(count*2);
    const motion=butterfly
     ?`float side=sign(position.x),span=abs(position.x);float flap=sin(uTime*13.*aLife.y+aLife.x)*.95+.3;transformed.x=side*span*cos(flap);transformed.y+=span*sin(flap);`
     :`float side=sign(position.x),span=abs(position.x);float flap=sin(uTime*46.*aLife.y+aLife.x)*.28;transformed.x=side*span*cos(flap);transformed.y+=span*sin(flap);`;
    const instanced=new T.InstancedMesh(geometry,flyerMaterial(`biome-${kind}`,this.uniforms,motion),count);instanced.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const palette=butterfly?(biome==='jungle'?['#2fa8ff','#ff6a1f','#ffe14a','#7dff8a','#ff4fa0']:['#ff8a1f','#ffd23a','#fff3d6','#4fb3ff','#ff5f9e']):['#19d3c5','#3d7bff','#ff4438','#a8f03a'];
    const color=new T.Color();
    for(let i=0;i<count;i++){const h=homes[i%homes.length],start=this.spot(world,h.x,h.z,h.range);
     const f:Flyer={x:start.x,y:butterfly?1+rng()*1.4:.7+rng()*.8,z:start.z,yaw:rng()*TAU,bank:0,hx:h.x,hz:h.z,gx:h.x,gz:h.z,gy:1.4,range:h.range,speed:butterfly?1.6+rng()*.8:9+rng()*3,timer:rng()*2,flee:0,hover:true,scale:butterfly?1.05+rng()*.35:1.3+rng()*.25};
     f.gy=f.y;this.flyers.push(f);life[i*2]=rng()*TAU;life[i*2+1]=.85+rng()*.3;instanced.setColorAt(i,color.set(palette[Math.floor(rng()*palette.length)]));
     place(instanced.instanceMatrix.array as Float32Array,i,f.x,f.y,f.z,f.yaw,f.scale);}
    geometry.setAttribute('aLife',new T.InstancedBufferAttribute(life,2));if(instanced.instanceColor)instanced.instanceColor.needsUpdate=true;
    // The flock stays near its homes, so one sphere around them all culls it correctly.
    const box=new T.Box3();for(const h of homes)box.expandByPoint(this.at.set(h.x,1.5,h.z));instanced.boundingSphere=box.getBoundingSphere(new T.Sphere());instanced.boundingSphere.radius+=16;
    mesh=instanced;
   }
  }
  else if(kind==='tumbleweeds'){
   const count=Math.max(2,Math.round(5*share)),instanced=new T.InstancedMesh(tumbleweedGeometry(rng),new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),count);instanced.instanceMatrix.setUsage(T.DynamicDrawUsage);
   // Already on their way when the stage opens: spread along their paths, not all at the edge.
   for(let i=0;i<count;i++){const w=this.spawnWeed(world);
    for(let t=0;t<6;t++){const d=rng()*Math.min(world.bounds.x,world.bounds.z)*1.6,x=w.x+Math.sin(w.heading)*d,z=w.z+Math.cos(w.heading)*d;if(!this.touches(world,x,z,w.radius)){w.x=x;w.z=z;break;}}
    this.weeds.push(w);}
   // Placed now, so neither the menu nor the first frame shows them piled at the origin.
   this.weeds.forEach((w,i)=>this.drawWeed(instanced,i,w));
   instanced.frustumCulled=false;mesh=instanced;
  }
  else{
   // Field counts are densities: per 1,000 m2 of the view-sized patch.
   const spots:{x:number;z:number;y:number;wrap:boolean}[]=[];
   const field=(per1000:number,y:number)=>{const n=Math.round(per1000*FIELD.x*FIELD.z/1000*share);for(let i=0;i<n;i++)spots.push({x:(rng()-.5)*FIELD.x,z:(rng()-.5)*FIELD.z,y,wrap:true});};
   const vents=(list:{x:number;z:number}[],per:number,y:number)=>{for(const v of list)for(let i=0;i<per;i++)spots.push({x:v.x+(rng()-.5)*.6,z:v.z+(rng()-.5)*.6,y,wrap:false});};
   let look:ParticleLook;
   if(kind==='embers'){
    look={color:'#ffa040',additive:true,texture:sprite('dot'),opacity:1,life:3.2,rise:7,grow:[1,.45],size:.58,wind:[this.wind.x*2.5,this.wind.z*2.5],sway:.5};
    field(16.5,.2);
    if(biome==='volcanic'){const crater=VOLCANO.height*VOLCANO.scale;for(let i=0;i<Math.round(20*share);i++){const a=rng()*TAU,r=rng()*2.2;spots.push({x:VOLCANO.x+Math.cos(a)*r,z:VOLCANO.z+Math.sin(a)*r,y:crater,wrap:false});}}
   }else if(kind==='glints'){
    // Additive white would vanish on bright snow: a cool blue star with normal blending reads on snow and roofs alike.
    look={color:'#7cc6ff',additive:false,texture:sprite('star'),opacity:1,life:1,rise:0,grow:[1,1],size:1.15,wind:[0,0],sway:0,twinkle:true};
    field(15.5,.12);
   }else{
    const steam=kind==='steam';
    look=steam?{color:'#e6edf0',additive:false,texture:smokeTexture(),opacity:.7,life:3.4,rise:3.6,grow:[.5,2.3],size:1,wind:[this.wind.x*1.4,this.wind.z*1.4],sway:.15}
     :{color:'#d2bc98',additive:false,texture:smokeTexture(),opacity:.72,life:2.8,rise:1.8,grow:[.6,2.8],size:1,wind:[this.wind.x*1.8,this.wind.z*1.8],sway:.2};
    let list:{x:number;z:number}[]=[];
    if(biome==='city')for(const x of [-34,0,34])for(const z of [-34,-10,14,38])list.push({x:x+3.2,z:z+1.6});   // manholes beside the crossings
    else if(biome==='quake')for(const c of QUAKE_CRACKS)list.push({x:c.x+Math.cos(c.angle)*c.length*.3,z:c.z-Math.sin(c.angle)*c.length*.3});
    else for(let i=0;i<60&&list.length<8;i++){const x=(rng()-.5)*(world.bounds.x*2-12),z=(rng()-.5)*(world.bounds.z*2-12);if(free(x,z,2))list.push({x,z});}
    list=list.filter(v=>free(v.x,v.z,1.25)).slice(0,Math.max(3,Math.round((biome==='quake'?9:8)*share)));
    vents(list,steam?5:4,.1);
   }
   if(spots.length)mesh=particleMesh(look,spots,rng,this.uniforms);
  }
  if(!mesh)return;
  mesh.name=`BiomeLife:${kind}`;mesh.castShadow=mesh.receiveShadow=false;mesh.userData.biomeLife=true;world.arena.add(mesh);
  this.mesh=mesh;this.kind=kind;
 }
 /** A random point within `range` of a home that is clear of trees and buildings, so a flyer is never hidden
  *  under a canopy or seen passing through a wall (a few tries, then the home itself). */
 private spot(world:World,x:number,z:number,range:number){
  for(let i=0;i<6;i++){const a=this.rng()*TAU,d=this.rng()*range,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(this.open(world,px,pz,3.5))return {x:px,z:pz};}
  return {x,z};
 }
 /** Inside the map and at least `r` from any standing tree or building. */
 private open(world:World,x:number,z:number,r:number){
  return Math.abs(x)<this.bounds.x-3&&Math.abs(z)<this.bounds.z-3&&!this.touches(world,x,z,r);
 }
 /** Where a startled flyer heads: away from the tank, turning up to 90 degrees to find open air, else a short hop. */
 private escape(world:World,f:Flyer,away:number){
  for(const turn of [0,.8,-.8,1.6,-1.6]){const x=f.x+Math.sin(away+turn)*8,z=f.z+Math.cos(away+turn)*8;if(this.open(world,x,z,2.5))return {x,z};}
  return {x:f.x+Math.sin(away)*3,z:f.z+Math.cos(away)*3};
 }
 /** Roll about the axis across its heading; grow in and shrink out over the last few metres before the edge. */
 private drawWeed(mesh:T.InstancedMesh,i:number,w:Weed){
  const b=this.bounds,room=Math.min(b.x-Math.abs(w.x),b.z-Math.abs(w.z));this.one.setScalar(Math.max(.05,Math.min(1,(room-WEED_EDGE)/3)));
  this.axis.set(Math.cos(w.heading),0,-Math.sin(w.heading));this.q.setFromAxisAngle(this.axis,w.spin).multiply(this.spin.setFromAxisAngle(this.at.set(0,1,0),w.heading));
  this.m.compose(this.at.set(w.x,w.radius+Math.abs(Math.sin(w.hop))*.45,w.z),this.q,this.one);this.m.toArray(mesh.instanceMatrix.array,i*16);
 }
 private spawnWeed(world:World):Weed{
  // Enter inside the upwind edge (clear of the boundary rocks and of any cover there), roll downwind with a little scatter.
  const b=this.bounds,w=this.wind,at=(lateral:number)=>Math.abs(w.x)>Math.abs(w.z)?{x:-Math.sign(w.x)*(b.x-WEED_EDGE),z:lateral*(b.z-10)}:{x:lateral*(b.x-10),z:-Math.sign(w.z)*(b.z-WEED_EDGE)};
  let edge=at(this.rng()*2-1);for(let t=0;t<8&&this.touches(world,edge.x,edge.z,.6);t++)edge=at(this.rng()*2-1);
  const heading=Math.atan2(w.x,w.z)+(this.rng()-.5)*.5;
  return {x:edge.x,z:edge.z,heading,speed:2.2+this.rng()*1.6,spin:0,hop:this.rng()*TAU,dodge:0,radius:.6,bounces:0,freeRun:0};
 }
 /** Every rendered frame with the frame's dt (0 while paused), the player position (flyers scatter from it)
  *  and the point the camera looks at (particle fields follow it). */
 update(dt:number,player:T.Vector3,center:T.Vector3,world:World){
  if(dt>0)this.time+=Math.min(dt,.05);
  this.uniforms.uTime.value=this.time;this.uniforms.uCenter.value.set(center.x,center.z-FIELD.ahead);
  const mesh=this.mesh;if(!mesh?.parent||dt<=0)return;dt=Math.min(dt,.05);
  if(this.flyers.length&&mesh instanceof T.InstancedMesh){
   const m=mesh.instanceMatrix.array as Float32Array,butterfly=this.kind==='butterflies';
   this.flyers.forEach((f,i)=>{
    const px=f.x-player.x,pz=f.z-player.z,near=px*px+pz*pz<(butterfly?49:36);
    if(near&&f.flee<=0){f.flee=1.4;f.hover=false;const to=this.escape(world,f,Math.atan2(px,pz));f.gx=to.x;f.gz=to.z;f.gy=butterfly?3+this.rng()*1.5:2;}
    f.flee-=dt;f.timer-=dt;
    const gx=f.gx-f.x,gz=f.gz-f.z,dist=Math.hypot(gx,gz);
    if(butterfly){
     if((dist<1||f.timer<=0)&&f.flee<=0){const s=this.spot(world,f.hx,f.hz,f.range);f.gx=s.x;f.gz=s.z;f.gy=.9+this.rng()*1.6;f.timer=2+this.rng()*3;}
     // A startled butterfly darts: it turns and flies three times as fast until it is clear.
     const limit=f.flee>0?7.8:2.6,turn=angleTo(f.yaw,Math.atan2(gx,gz)),rate=Math.max(-limit,Math.min(limit,turn*(f.flee>0?9:3))),speed=f.speed*(f.flee>0?3:1);
     f.yaw+=rate*dt;f.bank+=(-rate*.25-f.bank)*Math.min(1,dt*4);f.x+=Math.sin(f.yaw)*speed*dt;f.z+=Math.cos(f.yaw)*speed*dt;
     f.y+=(f.gy-f.y)*Math.min(1,dt*1.5);
     place(m,i,f.x,f.y+Math.sin(this.time*5+i*1.7)*.12,f.z,f.yaw,f.scale,f.bank);
    }else{
     // Dragonflies hover, then dart in a straight line to the next spot over their water.
     if(f.hover){if(f.timer<=0){const s=this.spot(world,f.hx,f.hz,f.range);f.gx=s.x;f.gz=s.z;f.gy=.7+this.rng()*.9;f.hover=false;}}
     else if(dist<.3){f.hover=true;f.timer=.5+this.rng()*1.6;}
     else{const step=Math.min(dist,f.speed*(f.flee>0?1.3:1)*dt);f.yaw+=angleTo(f.yaw,Math.atan2(gx,gz))*Math.min(1,dt*14);f.x+=gx/dist*step;f.z+=gz/dist*step;}
     f.y+=(f.gy-f.y)*Math.min(1,dt*4);
     place(m,i,f.x+(f.hover?Math.sin(this.time*3.1+i)*.05:0),f.y+(f.hover?Math.sin(this.time*4.3+i*2)*.06:0),f.z,f.yaw,f.scale);
    }
   });
   mesh.instanceMatrix.needsUpdate=true;
  }
  if(this.weeds.length&&mesh instanceof T.InstancedMesh){
   const b=this.bounds;
   this.weeds.forEach((w,i)=>{
    const gust=1+Math.sin(this.time*.8+i*2.1)*.35,step=w.speed*gust*dt,dx=Math.sin(w.heading)*step,dz=Math.cos(w.heading)*step;
    const nx=w.x+dx,nz=w.z+dz,r=w.radius,hit=(x:number,z:number)=>this.touches(world,x,z,r);
    // Bounce off cover sideways for a moment, then drift back to the wind. One already overlapping cover (a
    // wall rebuilt around it) rolls on out instead of searching forever.
    const blocked=hit(nx,nz)&&!hit(w.x,w.z);
    if(blocked){w.dodge=1.2;w.heading=Math.atan2(Math.sin(w.heading+(i%2?.9:-.9)),Math.cos(w.heading+(i%2?.9:-.9)));w.bounces++;w.freeRun=0;}
    else{w.x=nx;w.z=nz;w.spin+=step/r;w.hop+=step*1.6;w.freeRun+=dt;if(w.freeRun>2)w.bounces=0;}
    // Trapped in a corner of walls: start over upwind rather than jiggle there.
    if(w.bounces>12)Object.assign(w,this.spawnWeed(world));
    w.dodge-=dt;if(w.dodge<=0)w.heading+=angleTo(w.heading,Math.atan2(this.wind.x,this.wind.z))*Math.min(1,dt*.6);
    // Leave before the boundary rocks; grow in and shrink out over the last few metres so nothing pops.
    const room=Math.min(b.x-Math.abs(w.x),b.z-Math.abs(w.z));if(room<WEED_EDGE-1.5)Object.assign(w,this.spawnWeed(world));
    this.drawWeed(mesh,i,w);
   });
   mesh.instanceMatrix.needsUpdate=true;
  }
 }
}
