import * as T from 'three';
import type {Game} from './game';
import type {Point} from './rules';
import {clamp,distance,circleBox} from './rules';
import {VOLCANO} from './frontier-environment';
const ORIGIN=new T.Vector3(VOLCANO.x,VOLCANO.height,VOLCANO.z);
export const ROCKFALL={radius:4.5,damage:95,warning:2.6,grace:6,interval:5,maxActive:3,maxScars:8};
interface FallingRock extends Point {age:number;duration:number;trail:number;marker:T.Mesh;rock:T.Group;}
export class BiomeHazards{
 quakePhase:'calm'|'warning'|'active'='calm';quakeRemaining=8;dustClock=0;
 get quaking(){return this.quakePhase==='active';}
 get quakeWarning(){return this.quakePhase==='warning';}
 rocks:FallingRock[]=[];scars:{mesh:T.Mesh;age:number}[]=[];clock=ROCKFALL.grace;sequence=0;seed=1;
 ring=new T.RingGeometry(ROCKFALL.radius-.2,ROCKFALL.radius,48);scar=new T.CircleGeometry(2.1,24);
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(seed:number){this.clear();this.clock=ROCKFALL.grace;this.sequence=0;this.seed=seed+413;}
 clear(){this.quakePhase='calm';this.quakeRemaining=8;this.dustClock=0;for(const r of this.rocks){r.marker.removeFromParent();(r.marker.material as T.Material).dispose();r.rock.removeFromParent();}this.rocks=[];for(const s of this.scars){s.mesh.removeFromParent();(s.mesh.material as T.Material).dispose();}this.scars=[];}
 warn(g:Game,p:Point,duration=ROCKFALL.warning){
  if(this.rocks.length>=ROCKFALL.maxActive)return false;
  const x=clamp(p.x,-67,67),z=clamp(p.z,-55,55);
  if(g.world.covers.some(c=>c.kind==='volcano'&&circleBox({x,z},ROCKFALL.radius,c)))return false;
  const marker=new T.Mesh(this.ring,new T.MeshBasicMaterial({color:0xff553b,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(x,.13,z);g.world.entities.add(marker);
  const rock=g.world.clone('volcanic-rock');rock.scale.setScalar(1.1);rock.position.copy(ORIGIN);g.world.entities.add(rock);
  this.rocks.push({x,z,age:0,duration:Math.max(ROCKFALL.warning,duration),trail:0,marker,rock});return true;
 }
 danger(p:Point){return this.rocks.some(r=>distance(r,p)<ROCKFALL.radius+1.25);}
 updateQuake(g:Game,dt:number){
  this.quakeRemaining-=dt;
  if(this.quakeRemaining<=0){
   if(this.quakePhase==='calm'){this.quakePhase='warning';this.quakeRemaining=1.4;g.radioMessage('SEISMIC WARNING / Take cover. Tracks will lock briefly.',2);}
   else if(this.quakePhase==='warning'){this.quakePhase='active';this.quakeRemaining=1.6;g.radioMessage('EARTHQUAKE / Tracks locked · weapons ready.',1.6);}
   else{this.quakePhase='calm';this.quakeRemaining=12;g.radioMessage('GROUND STABLE / Keep moving.',2);}
  }
  this.dustClock-=dt;
  if(this.quaking&&this.dustClock<=0){this.dustClock=g.world.low?.35:.16;const focus=g.player.visual.root.position;
   for(let i=0;i<(g.world.low?6:16);i++){const angle=i*2.399+g.elapsed,x=clamp(focus.x+Math.cos(angle)*(4+i*2),-70,70),z=clamp(focus.z+Math.sin(angle)*(4+i*2),-58,58);g.world.fx.emit(new T.Vector3(x,.3,z),'smoke',0xa79274,2.2,1.2,new T.Vector3(0,3,0));}
  }
 }
 update(g:Game,dt:number){
  if(g.phase!=='playing'||dt<=0)return;
  if(g.world.environment.biome==='quake'){this.updateQuake(g,dt);return;}
  if(g.world.environment.biome!=='volcanic')return;
  this.clock-=dt;
  if(this.clock<=0){
   this.clock=ROCKFALL.interval;
   const living=g.enemies.filter(e=>!e.dead),focus=this.sequence%3===0?g.player:living[this.sequence%Math.max(1,living.length)]??g.player;
   const p=focus.visual.root.position;
   const target=this.sequence%3===2?{x:(this.random()-.5)*120,z:(this.random()-.5)*100}:{x:p.x+(this.random()-.5)*7,z:p.z+(this.random()-.5)*7};
   this.warn(g,target);
   const other=living.find(e=>distance(e.visual.root.position,target)>14);
   if(other){const p=other.visual.root.position;this.warn(g,{x:p.x+(this.random()-.5)*5,z:p.z+(this.random()-.5)*5});}
   this.sequence++;
   g.world.fx.emit(ORIGIN,'flash',0xffa234,9,.45,new T.Vector3(0,2,0));
  }
  for(let i=this.rocks.length-1;i>=0;i--){
   const r=this.rocks[i];r.age+=dt;r.trail-=dt;const t=Math.min(1,r.age/r.duration);
   r.rock.position.set(T.MathUtils.lerp(ORIGIN.x,r.x,t),T.MathUtils.lerp(ORIGIN.y,.7,t)+Math.sin(Math.PI*t)*21,T.MathUtils.lerp(ORIGIN.z,r.z,t));r.rock.rotation.set(t*7,t*4,t*3);
   (r.marker.material as T.MeshBasicMaterial).opacity=.68+Math.sin(r.age*8)*.22;
   if(r.trail<=0){r.trail=g.world.low?.32:.10;g.world.fx.emit(r.rock.position,'smoke',0x615252,1.5,1.1,new T.Vector3(0,1,0));g.world.fx.emit(r.rock.position,'flash',0xff7c30,1.8,.16);}
   if(t>=1){
    // Remove the event before applying damage: fuel chains and kills cannot replay it.
    this.rocks.splice(i,1);r.marker.removeFromParent();(r.marker.material as T.Material).dispose();r.rock.removeFromParent();
    g.world.fx.surface(new T.Vector3(r.x,.7,r.z),'stone',true);g.world.fx.impact(new T.Vector3(r.x,.8,r.z),true);g.explode(r,ROCKFALL.radius,ROCKFALL.damage);
    const mesh=new T.Mesh(this.scar,new T.MeshBasicMaterial({color:0x241e20,transparent:true,opacity:.7,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(r.x,.075,r.z);g.world.arena.add(mesh);this.scars.push({mesh,age:0});
    if(this.scars.length>ROCKFALL.maxScars){const old=this.scars.shift()!;old.mesh.removeFromParent();(old.mesh.material as T.Material).dispose();}
   }
  }
  for(let i=this.scars.length-1;i>=0;i--){const s=this.scars[i];s.age+=dt;(s.mesh.material as T.MeshBasicMaterial).opacity=.7*Math.max(0,1-s.age/30);if(s.age>=30){s.mesh.removeFromParent();(s.mesh.material as T.Material).dispose();this.scars.splice(i,1);}}
 }
}
