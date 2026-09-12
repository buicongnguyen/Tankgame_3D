import * as T from 'three';
import type {Game,Unit} from './game';
import {BOUNDS} from './activities';
import {clamp,distance} from './rules';
import type {Point} from './rules';

export const BARRAGE={count:6,range:64,blast:6,damage:90,warning:1,flight:1.15,stagger:.12,cooldown:28,maxPerTarget:2} as const;
export interface GuidedMissile {target:Unit|null;point:T.Vector3;from:T.Vector3;age:number;delay:number;marker:T.Mesh;bomb:T.Mesh;}
export type GuidanceConfig={[K in keyof typeof BARRAGE]:number};
export class GuidedBarrage {
 readonly config:GuidanceConfig;readonly vehiclesOnly:boolean;
 constructor(config:GuidanceConfig=BARRAGE,vehiclesOnly=false){this.config=config;this.vehiclesOnly=vehiclesOnly;}
 strikes:GuidedMissile[]=[];locks=new Map<Unit,number>();origin:Point={x:0,z:0};
 candidates(g:Game){
  return g.enemies.filter(u=>!u.dead&&u.hp>0&&(!this.vehiclesOnly||!g.isInfantry(u))&&distance(this.origin,u.visual.root.position)<=this.config.range&&Math.abs(u.visual.root.position.x)<=BOUNDS.x&&Math.abs(u.visual.root.position.z)<=BOUNDS.z)
   .sort((a,b)=>Number(!!b.encounter?.active)-Number(!!a.encounter?.active)||distance(a.visual.root.position,this.origin)-distance(b.visual.root.position,this.origin));
 }
 reserve(unit:Unit){this.locks.set(unit,(this.locks.get(unit)??0)+1);}
 call(g:Game){
  if(g.phase!=='playing'||g.player.dead||g.player.hp<=0||g.artilleryCooldown>0||this.strikes.length||g.save.strikeCharges<=0)return false;
  this.origin={x:g.player.visual.root.position.x,z:g.player.visual.root.position.z};const candidates=this.candidates(g);
  if(!candidates.length){g.radioMessage('AIR SUPPORT / No hostiles within 64 m. Radio ready.',3);return false;}
  this.locks.clear();const targets=candidates.slice(0,this.config.count);
  // One pass across the squad first; spare missiles reinforce armored targets only.
  for(const unit of candidates){if(targets.length>=this.config.count)break;if(!g.isInfantry(unit)&&unit.role!=='jeep')targets.push(unit);}
  this.launch(g,targets);g.save.strikeCharges--;g.persist();g.artilleryCooldown=this.config.cooldown;g.radioMessage(`STRIKE / ${targets.length} guided missiles inbound. Fuel may chain-react.`,3);return true;
 }
 launch(g:Game,targets:Unit[]){
  for(const [i,target] of targets.entries()){
   this.reserve(target);const point=target.visual.root.position.clone();point.y=Math.max(.8,point.y+1);
   const marker=new T.Mesh(new T.RingGeometry(this.config.blast-.16,this.config.blast,32),new T.MeshBasicMaterial({color:0xffb458,side:T.DoubleSide,transparent:true,opacity:.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));marker.rotation.x=-Math.PI/2;marker.position.set(point.x,.15,point.z);g.world.entities.add(marker);
   const from=new T.Vector3(clamp(this.origin.x+(i%2?18:-18),-BOUNDS.x,BOUNDS.x),34+i%3*3,clamp(this.origin.z+14,-BOUNDS.z,BOUNDS.z));
   if(this.vehiclesOnly)from.copy(g.player.visual.root.position).setY(2.2);
   const bomb=g.world.rocket();bomb.name='GuidedSupportMissile';bomb.scale.setScalar(.95);bomb.position.copy(from);bomb.visible=false;g.world.entities.add(bomb);
   this.strikes.push({target,point,from,age:0,delay:this.config.warning+i*this.config.stagger,marker,bomb});
  }

 }
 remove(s:GuidedMissile){s.bomb.removeFromParent();s.marker.removeFromParent();s.marker.geometry.dispose();(s.marker.material as T.Material).dispose();}
 clear(){for(const s of this.strikes)this.remove(s);this.strikes=[];this.locks.clear();}
 update(g:Game,dt:number){
  if(g.phase!=='playing'||g.player.dead||dt<=0)return;
  for(let i=this.strikes.length-1;i>=0;i--){const s=this.strikes[i];s.age+=dt;
   if(s.target&&(s.target.dead||s.target.hp<=0||distance(this.origin,s.target.visual.root.position)>this.config.range||Math.abs(s.target.visual.root.position.x)>BOUNDS.x||Math.abs(s.target.visual.root.position.z)>BOUNDS.z)){
    s.target=this.candidates(g).find(u=>(this.locks.get(u)??0)<this.config.maxPerTarget)??null;if(s.target)this.reserve(s.target);
   }
   if(s.target){s.point.copy(s.target.visual.root.position);s.point.y=Math.max(.8,s.point.y+1);}
   s.marker.position.set(s.point.x,.15,s.point.z);(s.marker.material as T.MeshBasicMaterial).opacity=.6+Math.sin(s.age*12)*.18;
   if(s.age<s.delay)continue;
   const t=clamp((s.age-s.delay)/this.config.flight,0,1),previous=s.bomb.position.clone();s.bomb.visible=true;s.bomb.position.lerpVectors(s.from,s.point,t);s.bomb.position.y+=Math.sin(t*Math.PI)*(this.vehiclesOnly?18:6);
   const forward=s.bomb.position.clone().sub(previous);if(forward.lengthSq()>.0001)s.bomb.lookAt(s.bomb.position.clone().add(forward));if(g.trailClock<=0)g.world.rocketTrail(s.bomb);
   if(t>=1){
    // Remove before damage/chain reactions so a kill cannot replay a missile.
    this.strikes.splice(i,1);this.remove(s);g.world.fx.impact(s.point,true);g.explode(s.point,this.config.blast,this.config.damage,true,true);g.tone(38,.22,.055);
   }
  }
  if(!this.strikes.length)this.locks.clear();
 }
}
