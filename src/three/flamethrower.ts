import * as T from 'three';
import type {Game,Unit} from './game';
import type {Cover} from './world';
import {clamp,segmentBox} from './rules';
import type {Point} from './rules';
import {WEAPONS} from './armory';

export const FLAME={weapon:8,range:12,halfAngle:35*Math.PI/180,burnSeconds:2,burnDps:18};
const WOOD=new Set<Cover['kind']>(['pine','white-pine','jungle-tree','palm','house','crate','barrel','fuelcrate']);
type Victim=Unit|Cover;
interface Burn {remaining:number;accum:number;dps:number;source:Point;}
interface Tongue {p:T.Vector3;heading:number;age:number;life:number;travel:number;limit:number;speed:number;size:number;rise:boolean;seed:number;}
const unit=(v:Victim):v is Unit=>'role' in v;
const alive=(v:Victim)=>v.hp>0&&(!unit(v)||!v.dead);
export function flameExposure(origin:Point,heading:number,target:Point){
 const dx=target.x-origin.x,dz=target.z-origin.z,r=Math.hypot(dx,dz);
 if(r>FLAME.range||r>0&&(dx*Math.sin(heading)+dz*Math.cos(heading))/r<Math.cos(FLAME.halfAngle))return 0;
 return 1-.55*r/FLAME.range;
}
export class Flamethrower {
 burns=new Map<Victim,Burn>();tongues:Tongue[]=[];mesh:T.InstancedMesh|null=null;
 dummy=new T.Object3D();color=new T.Color();sequence=0;
 fade=new T.InstancedBufferAttribute(new Float32Array(96),1).setUsage(T.DynamicDrawUsage);
 clear(){this.burns.clear();this.tongues=[];if(this.mesh){this.mesh.removeFromParent();this.mesh.dispose();(this.mesh.material as T.Material).dispose();this.mesh=null;}}
 ensure(g:Game){
  if(this.mesh)return;
  let source:T.Mesh|undefined;g.world.templates.get('flame')!.traverse(o=>{if(o instanceof T.Mesh)source=o;});
  if(!source)throw new Error('Missing Blender flame geometry');
  const material=new T.MeshBasicMaterial({color:0xffdfa0,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,blending:T.NormalBlending,side:T.DoubleSide,toneMapped:false});
  // Fade transparency per instance; fading RGB would turn cooling flames black.
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float flameFade; varying float vFlameFade;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFlameFade = flameFade;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFlameFade;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vFlameFade;');
  };
  material.customProgramCacheKey=()=> 'blender-flame-fade-v1';
  this.mesh=new T.InstancedMesh(source.geometry,material,96);this.mesh.name='FlameStream';this.mesh.userData={...source.userData};
  this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=0;g.world.entities.add(this.mesh);
 }
 add(g:Game,p:T.Vector3,heading:number,limit:number,rise=false){
  const cap=g.world.low?36:96;if(this.tongues.length>=cap||rise&&this.tongues.filter(t=>t.rise).length>=cap/3)return;this.ensure(g);
  const seed=this.sequence++*.93,speed=18+(Math.sin(seed*7)+1)*3;
  this.tongues.push({p:p.clone(),heading,age:0,life:rise?.48:Math.min(.65,limit/speed),travel:0,limit,speed,size:rise?.5:.62,rise,seed});
 }
 fire(g:Game){
  if(g.phase!=='playing'||g.player.dead)return;
  const origin={x:g.player.visual.root.position.x,z:g.player.visual.root.position.z},heading=g.player.aim,cover=g.world.covers.filter(c=>c.hp>0);
  // Freeze visibility before fuel chain reactions remove any of this burst's cover.
  const exposed=(p:Point,ignore?:Cover)=>!cover.some(c=>c!==ignore&&segmentBox(origin,p,c,.03)!==null);
  const hits:{victim:Victim;factor:number}[]=[];
  for(const e of g.enemies){if(e.dead||g.airborne(e))continue;const p=e.visual.root.position,factor=flameExposure(origin,heading,p);if(factor&&exposed(p))hits.push({victim:e,factor});}
  for(const c of cover){if(!WOOD.has(c.kind))continue;
   const along=clamp((c.x-origin.x)*Math.sin(heading)+(c.z-origin.z)*Math.cos(heading),0,FLAME.range);
   const p={x:clamp(origin.x+Math.sin(heading)*along,c.x-c.w/2,c.x+c.w/2),z:clamp(origin.z+Math.cos(heading)*along,c.z-c.d/2,c.z+c.d/2)};
   const factor=flameExposure(origin,heading,p);if(factor&&exposed(p,c))hits.push({victim:c,factor});
  }
  const multiplier=g.playerDamageMultiplier(FLAME.weapon);
  for(const {victim,factor} of hits){
   if(!alive(victim))continue;this.damage(g,victim,WEAPONS[FLAME.weapon].damage*multiplier*factor,origin);
   if(alive(victim)){const previous=this.burns.get(victim);this.burns.set(victim,{remaining:FLAME.burnSeconds,accum:previous?.accum??0,dps:Math.max(previous?.dps??0,FLAME.burnDps*multiplier*factor),source:{...origin}});}
  }
  // Visual rays use the same obstacles as damage and never travel beyond the cone.
  const lanes=g.world.low?5:9,height=Math.max(.5,g.player.visual.root.position.y+1.4);
  for(let i=0;i<lanes;i++){
   const a=heading+clamp((i/(lanes-1)-.5)*FLAME.halfAngle*2+Math.sin(this.sequence*7+i*3)*.045,-FLAME.halfAngle,FLAME.halfAngle),end={x:origin.x+Math.sin(a)*FLAME.range,z:origin.z+Math.cos(a)*FLAME.range};let limit=FLAME.range;
   for(const c of cover){const t=segmentBox(origin,end,c,.12);if(t!==null)limit=Math.min(limit,t*FLAME.range);}
   if(limit<.3)continue;const start=Math.min(2.3,limit*.5),p=new T.Vector3(origin.x+Math.sin(heading)*start,height,origin.z+Math.cos(heading)*start);
   const tip={x:origin.x+Math.sin(a)*limit,z:origin.z+Math.cos(a)*limit};let visible=Math.hypot(tip.x-p.x,tip.z-p.z);
   for(const c of cover){const t=segmentBox(p,tip,c,.12);if(t!==null)visible=Math.min(visible,t*Math.hypot(tip.x-p.x,tip.z-p.z));}
   this.add(g,p,Math.atan2(tip.x-p.x,tip.z-p.z),Math.max(.05,visible-.15));
  }
  g.tone(90,.11,.025);
 }
 damage(g:Game,victim:Victim,amount:number,source:Point){
  if(unit(victim))g.damageUnit(victim,amount,source,false,false);else g.hitCover(victim,amount,false,false);
 }
 update(g:Game,dt:number){
  if(g.phase!=='playing'||dt<=0)return;
  for(const [victim,burn] of this.burns){
   if(!alive(victim)){this.burns.delete(victim);continue;}
   const step=Math.min(dt,burn.remaining);burn.remaining-=step;burn.accum+=step;
   if(burn.accum>=.2-1e-8||burn.remaining<=1e-8){
    // Tick burn damage, not every rendered flame: damage is independent of quality/FPS.
    this.damage(g,victim,burn.dps*burn.accum,burn.source);burn.accum=0;
    const p=unit(victim)?victim.visual.root.position:new T.Vector3(victim.x,0,victim.z);
    if(alive(victim)){this.add(g,p.clone().add(new T.Vector3(0,.5,0)),0,2,true);if(this.sequence%3===0)g.world.fx.smoke(p.clone().setY(p.y+1.2),.7);}
   }
   if(burn.remaining<=1e-8||!alive(victim))this.burns.delete(victim);
  }
 }
 render(g:Game,dt:number){
  const cap=g.world.low?36:96;if(this.tongues.length>cap)this.tongues.length=cap;
  for(let i=this.tongues.length-1;i>=0;i--){const t=this.tongues[i];t.age+=dt;
   if(t.age>=t.life){this.tongues.splice(i,1);continue;}
   const move=Math.min(t.limit-t.travel,dt*(t.rise?0:t.speed));t.travel+=move;t.p.x+=Math.sin(t.heading)*move;t.p.z+=Math.cos(t.heading)*move;t.p.y+=dt*(t.rise?2:1.3);
  }
  if(!this.mesh)return;
  this.mesh.geometry.setAttribute('flameFade',this.fade);
  this.mesh.count=this.tongues.length;this.mesh.visible=this.mesh.count>0;
  this.tongues.forEach((t,i)=>{
   const life=t.age/t.life,fade=Math.sin(Math.PI*life)**.45,size=t.size*(1+life*2)*fade;
   this.dummy.position.copy(t.p);this.dummy.rotation.set(t.rise?-Math.PI/2:0,t.heading,Math.sin(t.seed+t.age*8)*.3);
   // Shorten tongues at solid obstacles so the visible stream agrees with cover tests.
   this.dummy.scale.set(size,size,Math.min(size,t.rise?size:Math.max(.01,(t.limit-t.travel)/1.9)));this.dummy.updateMatrix();this.mesh!.setMatrixAt(i,this.dummy.matrix);
   this.color.setRGB(1,1-life*.15,1-life*.4);this.mesh!.setColorAt(i,this.color);this.fade.setX(i,Math.min(1,life*12)*(1-life)**.65);
  });
  this.fade.needsUpdate=true;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
 }
}
